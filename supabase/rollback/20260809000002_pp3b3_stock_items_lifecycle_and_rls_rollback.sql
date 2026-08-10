-- Rollback: 20260809000002_pp3b3_stock_items_lifecycle_and_rls_rollback
-- GSI ONE | PP3-B.3 — Desfaz exatamente o que a migration 20260809000002 criou.
--
-- O que este rollback faz (ordem inversa a migracao):
--   R0a. Valida atributos e MD5 do corpo pos-migration de fn_estoque_aplicar_movimentacao,
--        depois restaura a funcao ao baseline exato (remove v_ativo).
--   R0b. Remove trigger trg_protect_quantidade_inicial.
--   R0c. Remove funcao fn_protect_quantidade_inicial.
--   R1.  Restaura as 2 policies antigas de estoque_itens ao baseline exato.
--   R2.  Remove vinculos perfil_permissao de estoque.cadastrar.
--   R3.  Remove permission estoque.cadastrar.
--   R4.  Remove coluna ativo (SOMENTE se nenhuma linha tiver ativo=false).
--   R5.  Remove trigger trg_block_delete_estoque_itens.
--   R6.  Remove funcao fn_block_delete_estoque_itens.
--   R7.  Restaura FK estoque_movimentacoes.item_id com ON DELETE CASCADE.
--
-- O que este rollback NAO faz:
--   - Nao altera dados clinicos.
--   - Nao altera tabelas clinicas.
--   - Nao altera policies PP3-B.1/B.2.
--   - Nao concede DELETE grant a authenticated.
--
-- Guardioes:
--   R-G1. As 3 novas policies existem antes de remover.
--   R-G2. Coluna ativo existe em estoque_itens.
--   R-G3. FK atual e NO ACTION (confdeltype='a').
--   R-G4. Nenhuma linha com ativo=false — previne perda de estado de inativacao.
--   R-G5. Bindings de estoque.cadastrar somente para Farmacia e Administracao.
--   R-G6. Trigger trg_protect_quantidade_inicial existe (confirma GAP 1 aplicado).
--   R-G7. Atributos estruturais e MD5 do corpo pos-migration identicos ao esperado.
--         Atributos: schema=public, args vazio, retorno=trigger, lang=plpgsql,
--         SECURITY DEFINER=true, owner=postgres, volatilidade=v,
--         proconfig={search_path=public}, sem authenticated EXECUTE.
--         MD5 esperado: 9c33736e459f95d7629c24f32a7c9005
--         Este hash corresponde ao corpo pos-migration definido pela migration 20260809000002.
--         Qualquer desvio: RAISE EXCEPTION.
--
-- AVISO: este rollback restaura policies com predicados genericos identificados
-- como menos seguros no inventario PP3-B.3.
-- Executar somente em desenvolvimento ou com autorizacao expressa.

-- =========================================================================
-- GUARDIAO DE ROLLBACK (R-G1..R-G7)
-- =========================================================================

do $rguard$
declare
  v_count            integer;
  v_text             text;
  v_unexpected_count integer;

  -- atributos estruturais da funcao critica (pos-migration)
  v_fn_args      text;
  v_fn_retorno   text;
  v_fn_lang      text;
  v_fn_vol       char(1);
  v_fn_config    text[];
  v_fn_owner     text;
  v_fn_secdef    boolean;
  v_fn_md5       text;

  -- MD5 do corpo normalizado esperado apos a migration PP3-B.3.
  -- Normalizacao: strip comentarios de linha (--...\n), lowercase,
  -- collapse \s+ para ' ', trim.
  -- Computado via Python/md5 do corpo exato escrito pela migration 20260809000002.
  v_postmig_md5 constant text := '9c33736e459f95d7629c24f32a7c9005';
begin

  -- R-G1: as 3 novas policies devem existir antes de remover
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'estoque_itens'
    and policyname in (
      'estoque_itens_select_operacional',
      'estoque_itens_insert_cadastro',
      'estoque_itens_update_cadastro'
    );
  if v_count < 3 then
    raise exception
      'pp3b3_rollback_guard [R-G1]: apenas % de 3 policies novas encontradas em '
      'estoque_itens. Estado inconsistente — a migration pode nao ter sido aplicada '
      'ou ja foi revertida. Nao prosseguir sem investigacao.', v_count;
  end if;

  -- R-G2: coluna ativo deve existir
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'estoque_itens'
    and column_name  = 'ativo';
  if v_count = 0 then
    raise exception
      'pp3b3_rollback_guard [R-G2]: coluna ativo nao encontrada em estoque_itens. '
      'Estado inconsistente — nao prosseguir sem investigacao.';
  end if;

  -- R-G3: FK deve ser NO ACTION (confdeltype='a') para este rollback ser correto
  select confdeltype into v_text
  from pg_constraint
  where conrelid = 'public.estoque_movimentacoes'::regclass
    and conname  = 'estoque_movimentacoes_item_id_fkey';
  if not found then
    raise exception
      'pp3b3_rollback_guard [R-G3]: constraint estoque_movimentacoes_item_id_fkey '
      'nao encontrada. Estado inconsistente — nao prosseguir.';
  end if;
  if v_text <> 'a' then
    raise exception
      'pp3b3_rollback_guard [R-G3]: FK item_id nao e NO ACTION (confdeltype="%"). '
      'Estado inesperado — investigar antes de prosseguir.', v_text;
  end if;

  -- R-G4: nenhuma linha com ativo=false — garantia de nao-perda de estado
  select count(*) into v_count
  from public.estoque_itens
  where ativo = false;
  if v_count > 0 then
    raise exception
      'pp3b3_rollback_guard [R-G4]: % item(s) com ativo=false detectado(s) em '
      'estoque_itens. Reverter agora descartaria o estado de inativacao registrado. '
      'Investigar e tratar os itens inativos antes de executar o rollback.', v_count;
  end if;

  -- R-G5: bindings de estoque.cadastrar somente para Farmacia e Administracao
  select count(*) into v_unexpected_count
  from public.perfil_permissao pp
  join public.permissoes pe on pe.id = pp.permissao_id
  join public.perfis_acesso pa on pa.id = pp.perfil_id
  where pe.chave = 'estoque.cadastrar'
    and pa.nome not in ('Farmácia', 'Administração');
  if v_unexpected_count > 0 then
    raise exception
      'pp3b3_rollback_guard [R-G5]: % vinculo(s) de estoque.cadastrar para perfis '
      'fora da matriz aprovada detectados. Investigar antes de prosseguir.', v_unexpected_count;
  end if;

  -- R-G6: trigger trg_protect_quantidade_inicial deve existir (GAP 1 foi aplicado)
  select count(*) into v_count
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table  = 'estoque_itens'
    and trigger_name        = 'trg_protect_quantidade_inicial';
  if v_count = 0 then
    raise exception
      'pp3b3_rollback_guard [R-G6]: trigger trg_protect_quantidade_inicial nao '
      'encontrado em estoque_itens. O GAP 1 pode nao ter sido aplicado ou este '
      'rollback ja foi executado. Estado inconsistente — nao prosseguir.';
  end if;

  -- R-G7: validar atributos estruturais e MD5 do corpo pos-migration da funcao.
  -- Garante que o que estamos substituindo e exatamente o que a migration criou.
  -- Qualquer desvio indica modificacao nao autorizada -> fail-closed.
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'fn_estoque_aplicar_movimentacao'
    and n.nspname = 'public';
  if v_count = 0 then
    raise exception
      'pp3b3_rollback_guard [R-G7]: fn_estoque_aplicar_movimentacao nao encontrada '
      'em public. Estado inesperado — nao prosseguir.';
  end if;

  select
    pg_get_function_identity_arguments(p.oid),
    pg_get_function_result(p.oid),
    l.lanname,
    p.provolatile,
    p.proconfig,
    pg_get_userbyid(p.proowner),
    p.prosecdef
  into v_fn_args, v_fn_retorno, v_fn_lang, v_fn_vol, v_fn_config, v_fn_owner, v_fn_secdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l  on l.oid = p.prolang
  where p.proname = 'fn_estoque_aplicar_movimentacao'
    and n.nspname = 'public';

  if v_fn_args <> '' then
    raise exception
      'pp3b3_rollback_guard [R-G7]: assinatura pos-migration diverge — '
      'args=[%], esperado vazio.', v_fn_args;
  end if;
  if v_fn_retorno <> 'trigger' then
    raise exception
      'pp3b3_rollback_guard [R-G7]: retorno pos-migration diverge — '
      'retorno=[%], esperado trigger.', v_fn_retorno;
  end if;
  if v_fn_lang <> 'plpgsql' then
    raise exception
      'pp3b3_rollback_guard [R-G7]: linguagem pos-migration diverge — '
      'lang=[%], esperado plpgsql.', v_fn_lang;
  end if;
  if v_fn_vol <> 'v' then
    raise exception
      'pp3b3_rollback_guard [R-G7]: volatilidade pos-migration diverge — '
      'vol=[%], esperado v.', v_fn_vol;
  end if;
  if v_fn_config is null
     or array_length(v_fn_config, 1) <> 1
     or v_fn_config[1] <> 'search_path=public'
  then
    raise exception
      'pp3b3_rollback_guard [R-G7]: proconfig pos-migration diverge — '
      'config=[%], esperado {search_path=public}.',
      array_to_string(v_fn_config, ',');
  end if;
  if v_fn_owner <> 'postgres' then
    raise exception
      'pp3b3_rollback_guard [R-G7]: owner pos-migration diverge — '
      'owner=[%], esperado postgres.', v_fn_owner;
  end if;
  if not v_fn_secdef then
    raise exception
      'pp3b3_rollback_guard [R-G7]: fn_estoque_aplicar_movimentacao pos-migration '
      'nao e SECURITY DEFINER — drift critico detectado.';
  end if;

  -- MD5 do corpo pos-migration: 9c33736e459f95d7629c24f32a7c9005
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

  if v_fn_md5 <> v_postmig_md5 then
    raise exception
      'pp3b3_rollback_guard [R-G7]: MD5 do corpo pos-migration diverge do esperado. '
      'Calculado:[%] Esperado:[%]. '
      'A funcao pode ter sido modificada apos a aplicacao da migration 20260809000002. '
      'Investigar antes de reverter.',
      v_fn_md5, v_postmig_md5;
  end if;

  raise notice 'pp3b3_rollback_guard: validacoes R-G1..R-G7 passaram. '
    'MD5 pos-migration confirmado: %.', v_postmig_md5;
end $rguard$;

-- =========================================================================
-- R0a: RESTAURAR fn_estoque_aplicar_movimentacao AO BASELINE (GAP 2 revert)
-- =========================================================================
-- Remove: v_ativo boolean, leitura de ativo no SELECT FOR UPDATE,
--         verificacao IF NOT v_ativo.
-- Preserva: assinatura, SECURITY DEFINER, SET search_path = public, owner,
--            language, toda a logica de delta/tipos/saldo/gsi flag.
-- O corpo abaixo e exatamente o baseline cujo MD5 normalizado e:
--   c7331f52125366292592168b2649ea26
-- Verificado contra pg_proc.prosrc do banco local em 2026-08-09.

create or replace function public.fn_estoque_aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
  v_quantidade_resultante numeric;
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

  select quantidade_atual + v_delta into v_quantidade_resultante
  from estoque_itens
  where id = NEW.item_id
  for update;

  if v_quantidade_resultante is null then
    raise exception 'estoque_itens % nao encontrado para aplicar movimentacao.', NEW.item_id;
  end if;

  if v_quantidade_resultante < 0 then
    raise exception
      'Movimentacao recusada: estoque resultante (%) seria negativo para o item %. Nao ha regra autorizada para permitir estoque negativo.',
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
-- R0b: REMOVER TRIGGER DE PROTECAO DE SALDO INICIAL (GAP 1 revert)
-- =========================================================================

drop trigger if exists trg_protect_quantidade_inicial on public.estoque_itens;

-- =========================================================================
-- R0c: REMOVER FUNCAO DE PROTECAO DE SALDO INICIAL (GAP 1 revert)
-- =========================================================================

drop function if exists public.fn_protect_quantidade_inicial();

-- =========================================================================
-- R1: RESTAURAR POLICIES ANTIGAS DE estoque_itens
-- =========================================================================

drop policy if exists estoque_itens_select_operacional on public.estoque_itens;
drop policy if exists estoque_itens_insert_cadastro    on public.estoque_itens;
drop policy if exists estoque_itens_update_cadastro    on public.estoque_itens;

-- SELECT baseline: Farmacia + Admin + Auditoria (sem filtro ativo)
create policy estoque_itens_select_farmacia on public.estoque_itens
  for select to authenticated
  using (
    has_permission('prescricao.dispensar'::text)
    or has_permission('estoque.movimentar'::text)
    or is_admin()
    or is_auditoria()
  );

comment on policy estoque_itens_select_farmacia on public.estoque_itens is
  'Rollback PP3-B.3 (20260809000002): restaurada ao baseline pre-PP3-B.3. '
  'Reaplicar migration 20260809000002 para politica com filtro ativo.';

-- ALL baseline: write/admin
create policy estoque_itens_write_farmacia_admin on public.estoque_itens
  for all to authenticated
  using    (has_permission('estoque.movimentar'::text) or is_admin())
  with check (has_permission('estoque.movimentar'::text) or is_admin());

comment on policy estoque_itens_write_farmacia_admin on public.estoque_itens is
  'Rollback PP3-B.3 (20260809000002): restaurada ao baseline pre-PP3-B.3.';

-- =========================================================================
-- R2: REMOVER VINCULOS perfil_permissao DE estoque.cadastrar
-- =========================================================================

delete from public.perfil_permissao
where permissao_id in (
  select id from public.permissoes where chave = 'estoque.cadastrar'
);

-- =========================================================================
-- R3: REMOVER PERMISSION estoque.cadastrar
-- =========================================================================
-- Seguro: vinculos ja removidos em R2. R-G5 confirmou ausencia de bindings externos.

delete from public.permissoes
where chave = 'estoque.cadastrar';

-- =========================================================================
-- R4: REMOVER COLUNA ativo
-- =========================================================================
-- R-G4 ja confirmou que nenhuma linha tem ativo=false.

alter table public.estoque_itens
  drop column if exists ativo;

-- =========================================================================
-- R5: REMOVER TRIGGER DE BLOQUEIO DELETE
-- =========================================================================

drop trigger if exists trg_block_delete_estoque_itens on public.estoque_itens;

-- =========================================================================
-- R6: REMOVER FUNCAO DE BLOQUEIO DELETE
-- =========================================================================

drop function if exists public.fn_block_delete_estoque_itens();

-- =========================================================================
-- R7: RESTAURAR FK CASCADE
-- =========================================================================

alter table public.estoque_movimentacoes
  drop constraint if exists estoque_movimentacoes_item_id_fkey;

alter table public.estoque_movimentacoes
  add constraint estoque_movimentacoes_item_id_fkey
  foreign key (item_id)
  references public.estoque_itens(id)
  on delete cascade;

-- =========================================================================
-- FIM DO ROLLBACK 20260809000002
-- fn_estoque_aplicar_movimentacao: restaurada ao baseline MD5 c7331f52125366292592168b2649ea26
-- Trigger removido:        trg_protect_quantidade_inicial (GAP 1)
-- Funcao removida:         fn_protect_quantidade_inicial (GAP 1)
-- Policies restauradas:    2 (SELECT e ALL — baseline pre-PP3-B.3)
-- Vinculos removidos:      ate 2 (Farmacia e Administracao -> estoque.cadastrar)
-- Permission removida:     estoque.cadastrar
-- Coluna removida:         estoque_itens.ativo
-- Trigger removido:        trg_block_delete_estoque_itens
-- Funcao removida:         fn_block_delete_estoque_itens
-- FK restaurada:           estoque_movimentacoes.item_id NO ACTION -> CASCADE
-- =========================================================================
