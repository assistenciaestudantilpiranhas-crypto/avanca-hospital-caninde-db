-- Migration: 20260809000002_pp3b3_stock_items_lifecycle_and_rls
-- GSI ONE | PP3-B.3 — Ciclo de vida, bloqueio de exclusao, RLS granular e integridade de saldo
--
-- O que esta migration faz:
--   B.  Cria permission estoque.cadastrar (modulo Estoque) e vincula a Farmacia e Administracao.
--   C.  Adiciona coluna ativo boolean NOT NULL DEFAULT true em estoque_itens.
--       Linhas existentes recebem ativo = true automaticamente (ADD COLUMN com DEFAULT).
--   D.  Substitui FK item_id ON DELETE CASCADE por ON DELETE NO ACTION.
--       ON DELETE NO ACTION e equivalente a RESTRICT para constraints nao-deferraveis.
--       A FK funciona como backstop secundario caso o trigger seja removido indevidamente.
--   E1. Cria trigger BEFORE DELETE em estoque_itens (fn_block_delete_estoque_itens).
--       Bloqueia DELETE fisico independente de grants ou RLS.
--   E2. GAP 1: Cria trigger BEFORE INSERT em estoque_itens (fn_protect_quantidade_inicial).
--       Impede criar estoque_item com quantidade_atual != 0.
--       Todo saldo inicial deve ser registrado via estoque_movimentacoes.
--   E3. GAP 2: Modifica fn_estoque_aplicar_movimentacao para verificar ativo = true.
--       Item com ativo=false nao pode receber nova movimentacao.
--       A funcao e SECURITY DEFINER (postgres), portanto esta verificacao cobre tambem
--       operacoes que bypassam RLS. Apenas v_ativo e adicionado; toda a logica existente
--       (delta, tipos, saldo negativo, flag gsi.allow_quantidade_update) permanece intacta.
--       SET search_path = public preservado conforme baseline (proconfig={search_path=public}).
--   F.  Substitui as 2 policies existentes de estoque_itens por 3 policies granulares:
--         SELECT operacional: (ativo=true AND movimentar|dispensar) OU admin|auditoria
--         INSERT:             estoque.cadastrar OU admin
--         UPDATE:             estoque.cadastrar OU admin
--
-- O que esta migration NAO faz:
--   - Nao altera grants de estoque_movimentacoes.
--   - Nao concede DELETE grant a authenticated.
--   - Nao altera tabelas clinicas nem policies PP3-B.1/B.2.
--   - Nao altera quantidade_atual por DML direto.
--   - Nao usa TRUNCATE, DROP TABLE, CASCADE novo nem service_role operacional.
--   - Nao cria fixture de dados.
--
-- Nota de seguranca:
--   fn_estoque_aplicar_movimentacao e SECURITY DEFINER (postgres): seu UPDATE em
--   estoque_itens.quantidade_atual bypassa RLS. A nova policy UPDATE para authenticated
--   nao interfere no fluxo de movimentacao de saldo. A verificacao de ativo=false
--   adicionada na funcao cobre este caminho de forma definitiva.
--
-- Ordem de validacao em fn_estoque_aplicar_movimentacao (apos modificacao):
--   1. Validar quantidade != 0 e tipo_movimentacao valido.
--   2. SELECT FOR UPDATE em estoque_itens (lock + leitura de ativo e quantidade_atual).
--   3. Se item nao encontrado -> RAISE EXCEPTION.
--   4. Se ativo = false -> RAISE EXCEPTION (GAP 2).
--   5. Se saldo resultante < 0 -> RAISE EXCEPTION.
--   6. Aplicar movimentacao (UPDATE com flag de sessao).
--
-- Guardioes:
--   G-1.  estoque_itens existe.
--   G-2.  Coluna ativo ausente (previne reaplicacao).
--   G-3.  Policy estoque_itens_select_farmacia existe com USING exato (normalizado).
--   G-4.  Policy estoque_itens_write_farmacia_admin: cmd=ALL, USING e WITH CHECK exatos.
--   G-5.  authenticated nao tem DELETE grant em estoque_itens.
--   G-6.  Trigger trg_audit_estoque_itens existe.
--   G-7.  Trigger trg_protect_quantidade_atual existe.
--   G-8.  Trigger trg_updated_at_estoque_itens existe.
--   G-9.  FK estoque_movimentacoes_item_id_fkey existe, aponta para estoque_itens(id) e CASCADE.
--   G-10. Permission estoque.cadastrar ausente ou compativel (modulo=Estoque).
--   G-11. Perfil Farmacia existe exatamente uma vez.
--   G-12. Perfil Administracao existe exatamente uma vez.
--   G-13. Trigger trg_block_delete_estoque_itens ausente (previne reaplicacao).
--   G-14. fn_estoque_aplicar_movimentacao existe exatamente uma vez em public.
--   G-15. Atributos estruturais completos da funcao identicos ao baseline:
--         schema=public, args vazio (trigger function), retorno=trigger,
--         linguagem=plpgsql, SECURITY DEFINER=true, owner=postgres,
--         volatilidade=v, proconfig={search_path=public},
--         authenticated sem EXECUTE grant.
--   G-16. MD5 do corpo normalizado da funcao = hash do baseline versionado.
--         Normalizacao: strip comentarios de linha, lowercase, collapse whitespace, trim.
--         Hash esperado: c7331f52125366292592168b2649ea26
--         Qualquer mudanca semantica ou textual no corpo muda o hash -> RAISE EXCEPTION.
--   G-17. Trigger trg_protect_quantidade_inicial ausente (previne reaplicacao).

-- =========================================================================
-- GUARDIAO DE SCHEMA DRIFT (G-1..G-17)
-- =========================================================================

do $guard$
declare
  v_count        integer;
  v_text         text;
  v_cmd          text;
  v_wcheck       text;
  v_secdef       boolean;
  v_norm_actual  text;
  v_norm_expect  text;

  -- atributos estruturais da funcao critica
  v_fn_args      text;
  v_fn_retorno   text;
  v_fn_lang      text;
  v_fn_vol       char(1);
  v_fn_config    text[];
  v_fn_owner     text;
  v_fn_md5       text;

  -- MD5 do corpo normalizado do baseline versionado.
  -- Normalizacao: strip comentarios de linha (--...\n), lowercase,
  -- collapse \s+ para ' ', trim.
  -- Computado via md5(trim(regexp_replace(lower(regexp_replace(
  --   prosrc,'--[^\n]*','','g')),'\s+',' ','g')))
  -- Verificado contra pg_proc.prosrc do banco local em 2026-08-09.
  v_baseline_md5 constant text := 'c7331f52125366292592168b2649ea26';

  v_exp_sel_using text :=
    '(has_permission(''prescricao.dispensar''::text) OR '
    'has_permission(''estoque.movimentar''::text) OR '
    'is_admin() OR is_auditoria())';

  v_exp_write_qual text :=
    '(has_permission(''estoque.movimentar''::text) OR is_admin())';
begin

  -- G-1: tabela estoque_itens existe
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public' and table_name = 'estoque_itens';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-1]: tabela public.estoque_itens nao encontrada.';
  end if;

  -- G-2: coluna ativo deve estar AUSENTE (previne reaplicacao)
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'estoque_itens'
    and column_name  = 'ativo';
  if v_count > 0 then
    raise exception 'pp3b3_schema_drift [G-2]: coluna ativo ja existe em estoque_itens — '
      'a migration pode ter sido aplicada anteriormente. Nao reaplicar.';
  end if;

  -- G-3: policy SELECT baseline deve existir com USING exato (comparacao normalizada)
  select qual into v_text
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'estoque_itens'
    and policyname = 'estoque_itens_select_farmacia';
  if not found then
    raise exception 'pp3b3_schema_drift [G-3]: policy estoque_itens_select_farmacia '
      'nao encontrada em public.estoque_itens.';
  end if;
  v_norm_actual := trim(regexp_replace(regexp_replace(regexp_replace(
    lower(coalesce(v_text, '')), '::[a-z_.]+', '', 'g'),
    'public\.', '', 'g'), '\s+', ' ', 'g'));
  v_norm_expect := trim(regexp_replace(regexp_replace(regexp_replace(
    lower(v_exp_sel_using), '::[a-z_.]+', '', 'g'),
    'public\.', '', 'g'), '\s+', ' ', 'g'));
  if v_norm_actual <> v_norm_expect then
    raise exception 'pp3b3_schema_drift [G-3]: USING de estoque_itens_select_farmacia '
      'diverge do baseline. Atual:[%] Esperado:[%]', v_norm_actual, v_norm_expect;
  end if;

  -- G-4: policy ALL baseline com cmd=ALL, USING e WITH CHECK exatos
  select p.cmd, p.qual, p.with_check
  into v_cmd, v_text, v_wcheck
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename  = 'estoque_itens'
    and p.policyname = 'estoque_itens_write_farmacia_admin';
  if not found then
    raise exception 'pp3b3_schema_drift [G-4]: policy estoque_itens_write_farmacia_admin '
      'nao encontrada.';
  end if;
  if v_cmd <> 'ALL' then
    raise exception 'pp3b3_schema_drift [G-4]: cmd de estoque_itens_write_farmacia_admin '
      'e "%" — esperado ALL.', v_cmd;
  end if;
  v_norm_actual := trim(regexp_replace(regexp_replace(regexp_replace(
    lower(coalesce(v_text, '')), '::[a-z_.]+', '', 'g'),
    'public\.', '', 'g'), '\s+', ' ', 'g'));
  v_norm_expect := trim(regexp_replace(regexp_replace(regexp_replace(
    lower(v_exp_write_qual), '::[a-z_.]+', '', 'g'),
    'public\.', '', 'g'), '\s+', ' ', 'g'));
  if v_norm_actual <> v_norm_expect then
    raise exception 'pp3b3_schema_drift [G-4]: USING de estoque_itens_write_farmacia_admin '
      'diverge. Atual:[%] Esperado:[%]', v_norm_actual, v_norm_expect;
  end if;
  v_norm_actual := trim(regexp_replace(regexp_replace(regexp_replace(
    lower(coalesce(v_wcheck, '')), '::[a-z_.]+', '', 'g'),
    'public\.', '', 'g'), '\s+', ' ', 'g'));
  if v_norm_actual <> v_norm_expect then
    raise exception 'pp3b3_schema_drift [G-4]: WITH CHECK de estoque_itens_write_farmacia_admin '
      'diverge. Atual:[%] Esperado:[%]', v_norm_actual, v_norm_expect;
  end if;

  -- G-5: authenticated nao deve ter DELETE grant em estoque_itens
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema   = 'public'
    and table_name     = 'estoque_itens'
    and grantee        = 'authenticated'
    and privilege_type = 'DELETE';
  if v_count > 0 then
    raise exception 'pp3b3_schema_drift [G-5]: authenticated tem DELETE grant em '
      'estoque_itens — estado inesperado, investigar antes de prosseguir.';
  end if;

  -- G-6: trigger trg_audit_estoque_itens existe
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_audit_estoque_itens';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-6]: trigger trg_audit_estoque_itens '
      'nao encontrado em estoque_itens.';
  end if;

  -- G-7: trigger trg_protect_quantidade_atual existe
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_protect_quantidade_atual';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-7]: trigger trg_protect_quantidade_atual '
      'nao encontrado em estoque_itens.';
  end if;

  -- G-8: trigger trg_updated_at_estoque_itens existe
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_updated_at_estoque_itens';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-8]: trigger trg_updated_at_estoque_itens '
      'nao encontrado em estoque_itens.';
  end if;

  -- G-9: FK item_id existe, aponta para estoque_itens(id) e CASCADE (confdeltype='c')
  select pg_get_constraintdef(oid), confdeltype
  into v_text, v_cmd
  from pg_constraint
  where conrelid = 'public.estoque_movimentacoes'::regclass
    and conname  = 'estoque_movimentacoes_item_id_fkey';
  if not found then
    raise exception 'pp3b3_schema_drift [G-9]: constraint '
      'estoque_movimentacoes_item_id_fkey nao encontrada.';
  end if;
  if lower(v_text) not like '%estoque_itens(id)%' then
    raise exception 'pp3b3_schema_drift [G-9]: FK item_id nao aponta para '
      'estoque_itens(id). Definicao atual: [%]', v_text;
  end if;
  if v_cmd <> 'c' then
    raise exception 'pp3b3_schema_drift [G-9]: FK item_id nao e CASCADE '
      '(confdeltype="%"). Drift detectado.', v_cmd;
  end if;

  -- G-10: permission estoque.cadastrar ausente ou compativel (modulo=Estoque)
  select modulo into v_text
  from public.permissoes
  where chave = 'estoque.cadastrar';
  if found and v_text <> 'Estoque' then
    raise exception 'pp3b3_schema_drift [G-10]: permission estoque.cadastrar ja existe '
      'com modulo "%" incompativel (esperado: Estoque).', v_text;
  end if;

  -- G-11: perfil Farmacia existe exatamente uma vez
  select count(*) into v_count
  from public.perfis_acesso
  where nome = 'Farmácia';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-11]: perfil "Farmácia" nao encontrado '
      'em perfis_acesso.';
  end if;
  if v_count > 1 then
    raise exception 'pp3b3_schema_drift [G-11]: perfil "Farmácia" encontrado % vezes '
      '(esperado: exatamente 1).', v_count;
  end if;

  -- G-12: perfil Administracao existe exatamente uma vez
  select count(*) into v_count
  from public.perfis_acesso
  where nome = 'Administração';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-12]: perfil "Administração" nao encontrado '
      'em perfis_acesso.';
  end if;
  if v_count > 1 then
    raise exception 'pp3b3_schema_drift [G-12]: perfil "Administração" encontrado % vezes '
      '(esperado: exatamente 1).', v_count;
  end if;

  -- G-13: trigger block-delete ainda nao existe (previne reaplicacao)
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_block_delete_estoque_itens';
  if v_count > 0 then
    raise exception 'pp3b3_schema_drift [G-13]: trigger trg_block_delete_estoque_itens '
      'ja existe — drift detectado, nao reaplicar.';
  end if;

  -- G-14: fn_estoque_aplicar_movimentacao existe exatamente uma vez em public
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'fn_estoque_aplicar_movimentacao'
    and n.nspname = 'public';
  if v_count = 0 then
    raise exception 'pp3b3_schema_drift [G-14]: fn_estoque_aplicar_movimentacao '
      'nao encontrada em public — estado inesperado.';
  end if;
  if v_count > 1 then
    raise exception 'pp3b3_schema_drift [G-14]: fn_estoque_aplicar_movimentacao '
      'encontrada % vezes em public — ambiguidade detectada.', v_count;
  end if;

  -- G-15: atributos estruturais completos identicos ao baseline
  -- Valida: schema, args (vazio — trigger function), retorno, linguagem,
  -- security_definer, owner, volatilidade, proconfig, grants (sem authenticated EXECUTE).
  select
    pg_get_function_identity_arguments(p.oid),
    pg_get_function_result(p.oid),
    l.lanname,
    p.provolatile,
    p.proconfig,
    pg_get_userbyid(p.proowner),
    p.prosecdef
  into v_fn_args, v_fn_retorno, v_fn_lang, v_fn_vol, v_fn_config, v_fn_owner, v_secdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l  on l.oid = p.prolang
  where p.proname = 'fn_estoque_aplicar_movimentacao'
    and n.nspname = 'public';

  if v_fn_args <> '' then
    raise exception 'pp3b3_schema_drift [G-15]: assinatura de '
      'fn_estoque_aplicar_movimentacao diverge do baseline — '
      'argumentos=[%], esperado vazio (trigger function).', v_fn_args;
  end if;

  if v_fn_retorno <> 'trigger' then
    raise exception 'pp3b3_schema_drift [G-15]: tipo de retorno de '
      'fn_estoque_aplicar_movimentacao diverge — retorno=[%], esperado trigger.', v_fn_retorno;
  end if;

  if v_fn_lang <> 'plpgsql' then
    raise exception 'pp3b3_schema_drift [G-15]: linguagem de '
      'fn_estoque_aplicar_movimentacao diverge — lang=[%], esperado plpgsql.', v_fn_lang;
  end if;

  if v_fn_vol <> 'v' then
    raise exception 'pp3b3_schema_drift [G-15]: volatilidade de '
      'fn_estoque_aplicar_movimentacao diverge — vol=[%], esperado v (volatile).', v_fn_vol;
  end if;

  -- proconfig deve ser exatamente {search_path=public}
  if v_fn_config is null
     or array_length(v_fn_config, 1) <> 1
     or v_fn_config[1] <> 'search_path=public'
  then
    raise exception 'pp3b3_schema_drift [G-15]: proconfig de '
      'fn_estoque_aplicar_movimentacao diverge — config=[%], '
      'esperado exatamente {search_path=public}.',
      array_to_string(v_fn_config, ',');
  end if;

  if v_fn_owner <> 'postgres' then
    raise exception 'pp3b3_schema_drift [G-15]: owner de '
      'fn_estoque_aplicar_movimentacao diverge — owner=[%], esperado postgres.', v_fn_owner;
  end if;

  if not v_secdef then
    raise exception 'pp3b3_schema_drift [G-15]: fn_estoque_aplicar_movimentacao '
      'nao e SECURITY DEFINER — drift critico de seguranca detectado.';
  end if;

  -- G-15 (grants): authenticated nao deve ter EXECUTE na funcao critica
  select count(*) into v_count
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and routine_name    = 'fn_estoque_aplicar_movimentacao'
    and grantee         = 'authenticated'
    and privilege_type  = 'EXECUTE';
  if v_count > 0 then
    raise exception 'pp3b3_schema_drift [G-15]: authenticated tem EXECUTE grant em '
      'fn_estoque_aplicar_movimentacao — estado inesperado, investigar.';
  end if;

  -- G-16: MD5 do corpo normalizado deve ser exatamente o baseline versionado.
  -- Normalizacao: strip comentarios de linha, lowercase, collapse whitespace, trim.
  -- Hash c7331f52125366292592168b2649ea26 detecta qualquer mudanca no corpo.
  -- Mudancas que alteram o hash: delta, FOR UPDATE, saldo negativo, gsi flag,
  -- qualquer logica nova, troca de comparadores, etc.
  select md5(
    trim(regexp_replace(
      lower(regexp_replace(p.prosrc, '--[^\n]*', '', 'g')),
      '\s+', ' ', 'g'
    ))
  ) into v_fn_md5
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'fn_estoque_aplicar_movimentacao'
    and n.nspname = 'public';

  if v_fn_md5 <> v_baseline_md5 then
    raise exception 'pp3b3_schema_drift [G-16]: MD5 do corpo normalizado de '
      'fn_estoque_aplicar_movimentacao diverge do baseline versionado. '
      'Calculado:[%] Esperado:[%]. '
      'A funcao pode ter sido modificada fora do ciclo PP3-B.3. '
      'Investigar antes de substituir.',
      v_fn_md5, v_baseline_md5;
  end if;

  -- G-17: trigger trg_protect_quantidade_inicial ainda nao existe (previne reaplicacao)
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_protect_quantidade_inicial';
  if v_count > 0 then
    raise exception 'pp3b3_schema_drift [G-17]: trigger trg_protect_quantidade_inicial '
      'ja existe — drift detectado, nao reaplicar.';
  end if;

  raise notice 'pp3b3_schema_drift: todas as validacoes passaram (G-1..G-17). '
    'Baseline MD5 confirmado: %.', v_baseline_md5;
end $guard$;

-- =========================================================================
-- B1: CRIAR PERMISSION estoque.cadastrar
-- =========================================================================

insert into public.permissoes (chave, descricao, modulo)
values (
  'estoque.cadastrar',
  'Cadastrar e editar itens do catalogo de estoque hospitalar '
  '(nome, local, validade, quantidade_minima, status ativo). '
  'Separado de estoque.movimentar, que controla entradas e saidas de saldo.',
  'Estoque'
)
on conflict (chave) do nothing;

-- =========================================================================
-- B2: VINCULAR estoque.cadastrar A Farmacia E Administracao
-- =========================================================================

insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, pe.id
from public.perfis_acesso pa
cross join public.permissoes pe
where pa.nome in ('Farmácia', 'Administração')
  and pe.chave = 'estoque.cadastrar'
on conflict do nothing;

-- =========================================================================
-- C: ADICIONAR COLUNA ativo
-- =========================================================================
-- ADD COLUMN NOT NULL DEFAULT aplica o default a todas as linhas existentes
-- internamente no PostgreSQL — nenhum DML explicito e executado por esta migration.

alter table public.estoque_itens
  add column ativo boolean not null default true;

comment on column public.estoque_itens.ativo is
  'PP3-B.3: indica se o item esta ativo no catalogo. '
  'Use ativo = false para desativar medicamentos descontinuados sem apagar o historico. '
  'Admin e Auditoria visualizam todos os itens independente deste campo. '
  'Itens com ativo=false nao aceitam novas movimentacoes (entrada, saida ou ajuste).';

-- =========================================================================
-- D: SUBSTITUIR FK CASCADE POR NO ACTION
-- =========================================================================

alter table public.estoque_movimentacoes
  drop constraint estoque_movimentacoes_item_id_fkey;

alter table public.estoque_movimentacoes
  add constraint estoque_movimentacoes_item_id_fkey
  foreign key (item_id)
  references public.estoque_itens(id)
  on delete no action;

-- =========================================================================
-- E1: FUNCAO E TRIGGER DE BLOQUEIO FISICO DE DELETE
-- =========================================================================

create or replace function public.fn_block_delete_estoque_itens()
returns trigger
language plpgsql
security invoker
as $$
begin
  raise exception
    'DELETE em public.estoque_itens nao e permitido. '
    'Itens de estoque sao permanentes para preservar historico de movimentacoes '
    'e rastreabilidade financeira. '
    'Para retirar um item do catalogo operacional use: '
    'UPDATE public.estoque_itens SET ativo = false WHERE id = <id>;';
end;
$$;

create trigger trg_block_delete_estoque_itens
  before delete on public.estoque_itens
  for each row
  execute function public.fn_block_delete_estoque_itens();

-- =========================================================================
-- E2: GAP 1 — PROTECAO DE SALDO INICIAL (quantidade_atual = 0 obrigatorio no INSERT)
-- =========================================================================
-- Todo estoque_item novo deve nascer com quantidade_atual = 0.
-- Qualquer saldo inicial deve ser registrado via estoque_movimentacoes
-- (tipo: entrada ou ajuste), garantindo rastreabilidade no livro razao.
--
-- Justificativa para trigger em vez de WITH CHECK:
--   Um trigger BEFORE INSERT e mais forte que WITH CHECK da RLS porque cobre
--   tambem inserções feitas por postgres/service_role que bypassam RLS.
--   WITH CHECK so protegeria o caminho de usuarios autenticados.
--
-- SECURITY INVOKER: o trigger nao precisa de privilegios elevados.

create or replace function public.fn_protect_quantidade_inicial()
returns trigger
language plpgsql
security invoker
as $$
begin
  if NEW.quantidade_atual is distinct from 0 then
    raise exception
      'estoque_itens.quantidade_atual deve ser 0 no cadastro (valor recebido: %). '
      'O saldo inicial deve ser registrado via estoque_movimentacoes '
      '(tipo: entrada ou ajuste). Isso garante rastreabilidade no livro razao.',
      NEW.quantidade_atual;
  end if;
  return NEW;
end;
$$;

create trigger trg_protect_quantidade_inicial
  before insert on public.estoque_itens
  for each row
  execute function public.fn_protect_quantidade_inicial();

-- =========================================================================
-- E3: GAP 2 — ITEM INATIVO NAO MOVIMENTA
--     (modificacao de fn_estoque_aplicar_movimentacao)
-- =========================================================================
-- Adiciona verificacao de ativo = true antes de aplicar qualquer movimentacao.
-- A funcao e SECURITY DEFINER (postgres): sua execucao bypassa RLS, portanto
-- esta e a barreira definitiva independente de policies ou grants do chamador.
--
-- Mudancas minimas em relacao ao baseline:
--   - Declaracao: adiciona v_ativo boolean.
--   - SELECT: adiciona ", ativo" e "INTO v_quantidade_resultante, v_ativo".
--   - Logica: adiciona IF NOT v_ativo apos verificacao de NULL.
--   - Tudo mais: identico ao baseline.
--
-- Atributos do baseline preservados explicitamente:
--   - sem argumentos, returns trigger
--   - language plpgsql
--   - security definer
--   - set search_path = public (baseline tinha proconfig={search_path=public};
--     CREATE OR REPLACE redefine proconfig — deve ser especificado explicitamente)
--   - owner: postgres (CREATE OR REPLACE preserva owner quando executado como postgres)
--   - nenhum grant novo adicionado
--
-- Ordem de validacao (deterministica):
--   1. Validar quantidade e tipo.
--   2. SELECT FOR UPDATE (lock + leitura de quantidade_atual e ativo).
--   3. Se item nao encontrado -> erro (comportamento existente).
--   4. Se ativo = false -> erro (GAP 2 — novo).
--   5. Se saldo resultante < 0 -> erro (comportamento existente).
--   6. Aplicar (UPDATE via flag de sessao gsi.allow_quantidade_update).

create or replace function public.fn_estoque_aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta                 numeric;
  v_quantidade_resultante numeric;
  v_ativo                 boolean;
begin
  if NEW.quantidade is null or NEW.quantidade = 0 then
    raise exception 'estoque_movimentacoes.quantidade deve ser diferente de zero.';
  end if;

  if NEW.tipo_movimentacao = 'entrada' then
    if NEW.quantidade < 0 then
      raise exception 'Movimentacao de entrada deve ter quantidade positiva.';
    end if;
    v_delta := NEW.quantidade;
  elsif NEW.tipo_movimentacao = 'saida' then
    if NEW.quantidade < 0 then
      raise exception 'Movimentacao de saida deve ter quantidade positiva (o sinal de subtracao e aplicado automaticamente).';
    end if;
    v_delta := -NEW.quantidade;
  elsif NEW.tipo_movimentacao = 'ajuste' then
    -- 'ajuste' carrega o proprio sinal (ver limitacao documentada na secao 3).
    v_delta := NEW.quantidade;
  else
    raise exception 'tipo_movimentacao % nao reconhecido.', NEW.tipo_movimentacao;
  end if;

  select quantidade_atual + v_delta, ativo
  into v_quantidade_resultante, v_ativo
  from estoque_itens
  where id = NEW.item_id
  for update;

  if v_quantidade_resultante is null then
    raise exception 'estoque_itens % nao encontrado para aplicar movimentacao.', NEW.item_id;
  end if;

  if not v_ativo then
    raise exception
      'Movimentacao recusada: item % esta inativo (ativo = false). '
      'Itens inativos nao aceitam novas entradas, saidas ou ajustes. '
      'Reative o item antes de movimentar.',
      NEW.item_id;
  end if;

  if v_quantidade_resultante < 0 then
    raise exception
      'Movimentacao recusada: estoque resultante (%) seria negativo para o item %. '
      'Nao ha regra autorizada para permitir estoque negativo.',
      v_quantidade_resultante, NEW.item_id;
  end if;

  perform set_config('gsi.allow_quantidade_update', 'on', true);

  update estoque_itens
  set quantidade_atual = v_quantidade_resultante,
      updated_by = NEW.responsavel_id
  where id = NEW.item_id;

  perform set_config('gsi.allow_quantidade_update', 'off', true);

  return NEW;
end;
$$;

-- =========================================================================
-- F: SUBSTITUIR POLICIES DE estoque_itens
-- =========================================================================

drop policy if exists estoque_itens_select_farmacia on public.estoque_itens;
drop policy if exists estoque_itens_write_farmacia_admin on public.estoque_itens;

-- SELECT: ramo operacional ve somente itens ativos.
--         Admin e Auditoria veem todos (ativos e inativos).
create policy estoque_itens_select_operacional on public.estoque_itens
  for select to authenticated
  using (
    (
      ativo = true
      and (
        has_permission('estoque.movimentar'::text)
        or has_permission('prescricao.dispensar'::text)
      )
    )
    or is_admin()
    or is_auditoria()
  );

comment on policy estoque_itens_select_operacional on public.estoque_itens is
  'PP3-B.3 (20260809000002): Farmacia e Dispensacao veem somente itens ativos. '
  'Admin e Auditoria veem todos.';

-- INSERT: exige estoque.cadastrar OU admin.
-- trg_protect_quantidade_inicial garante adicionalmente que quantidade_atual = 0.
create policy estoque_itens_insert_cadastro on public.estoque_itens
  for insert to authenticated
  with check (
    has_permission('estoque.cadastrar'::text)
    or is_admin()
  );

comment on policy estoque_itens_insert_cadastro on public.estoque_itens is
  'PP3-B.3 (20260809000002): cadastro de novo item exige permissao estoque.cadastrar ou admin.';

-- UPDATE: exige estoque.cadastrar OU admin.
-- NOTA: quantidade_atual continua protegida por trg_protect_quantidade_atual.
--       fn_estoque_aplicar_movimentacao e SECURITY DEFINER (postgres) e bypassa
--       esta policy ao atualizar quantidade_atual via INSERT em estoque_movimentacoes.
create policy estoque_itens_update_cadastro on public.estoque_itens
  for update to authenticated
  using (
    has_permission('estoque.cadastrar'::text)
    or is_admin()
  )
  with check (
    has_permission('estoque.cadastrar'::text)
    or is_admin()
  );

comment on policy estoque_itens_update_cadastro on public.estoque_itens is
  'PP3-B.3 (20260809000002): edicao cadastral exige estoque.cadastrar ou admin. '
  'quantidade_atual continua protegida por trg_protect_quantidade_atual.';

-- Nenhuma policy DELETE criada. authenticated nao possui grant DELETE.
-- trg_block_delete_estoque_itens bloqueia DELETE a nivel de trigger para todos os roles.

-- =========================================================================
-- FIM DA MIGRATION 20260809000002
-- Permission criada:       1 (estoque.cadastrar, modulo Estoque)
-- Vinculos criados:        2 (Farmacia, Administracao)
-- Colunas adicionadas:     1 (estoque_itens.ativo boolean NOT NULL DEFAULT true)
-- FK alterada:             estoque_movimentacoes.item_id CASCADE -> NO ACTION
-- Funcoes criadas:         fn_block_delete_estoque_itens, fn_protect_quantidade_inicial
-- Funcao modificada:       fn_estoque_aplicar_movimentacao (GAP 2: adiciona v_ativo)
--                          SET search_path = public preservado (baseline proconfig)
-- Triggers criados:        trg_block_delete_estoque_itens, trg_protect_quantidade_inicial
-- Policies substituidas:   2 antigas -> 3 novas (SELECT, INSERT, UPDATE)
-- Tabelas clinicas:        inalteradas
-- Policies PP3-B.1/B.2:   inalteradas
-- Baseline MD5 validado:   c7331f52125366292592168b2649ea26
-- =========================================================================
