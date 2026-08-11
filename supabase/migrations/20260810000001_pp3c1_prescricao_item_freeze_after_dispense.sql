-- Migration: 20260810000001_pp3c1_prescricao_item_freeze_after_dispense
-- GSI ONE | PP3-C.1 -- Protecao de prescricao_itens apos dispensacao confirmada
--
-- Contexto (SEC-15):
--   A auditoria SEC-15 confirmou que prescricao_itens.medicamento_id,
--   medicamento_nome, dose, via, prescricao_id e deleted_at permanecem
--   mutaveis apos dispensacao (estoque_movimentacoes com tipo='saida' e
--   prescricao_item_id preenchido). Como estoque_movimentacoes nao possui
--   snapshot farmacologico proprio, a identidade do medicamento dispensado
--   depende inteiramente do prescricao_item -- que ate esta migration podia
--   ser reescrito silenciosamente por Farmacia ou Admin.
--
-- O que esta migration faz:
--   A. Cria funcao BEFORE UPDATE fn_protect_prescricao_item_after_dispense().
--      SECURITY DEFINER: a deteccao de dispensacao historica e INVARIANTE DO BANCO.
--      Ela nao pode depender de o usuario que executa UPDATE ter SELECT em
--      estoque_movimentacoes por sua policy RLS -- o congelamento deve operar
--      independentemente de perfil e de visibilidade de linhas.
--      SET search_path = public (padrao aprovado do projeto).
--      Sem SQL dinamico. Sem is_admin(). Sem flag de sessao de bypass.
--      Todos os objetos referenciados sao schema-qualified (public.*).
--      Short-circuit: retorna NEW imediatamente se nenhum campo historico
--      mudou, evitando SELECT desnecessario em estoque_movimentacoes.
--      Condicao HAS_EVER_BEEN_DISPENSED: EXISTS tipo_movimentacao='saida'
--      com prescricao_item_id=OLD.id. Estorno (tipo='ajuste') NAO descongela.
--   B. Cria trigger BEFORE UPDATE trg_protect_prescricao_item_post_dispense
--      em public.prescricao_itens, FOR EACH ROW.
--   C. Cria indice parcial idx_estoque_movimentacoes_prescricao_item_saida
--      em public.estoque_movimentacoes (prescricao_item_id)
--      WHERE tipo_movimentacao = 'saida' AND prescricao_item_id IS NOT NULL.
--      Sem este indice, HAS_EVER_BEEN_DISPENSED faria varredura sequencial
--      em estoque_movimentacoes a cada UPDATE de prescricao_item (nenhum
--      indice anterior cobre esta coluna).
--   D. Aplica REVOKE EXECUTE da funcao para public, anon e authenticated,
--      seguindo o padrao de hardening de 20260623100016.
--
-- Campos congelados apos HAS_EVER_BEEN_DISPENSED (tipo='saida' vinculado):
--   medicamento_id   -- FK para o item de estoque real dispensado
--   medicamento_nome -- snapshot textual do medicamento na prescricao
--   dose             -- dado clinico do que foi entregue ao paciente
--   via              -- via de administracao define o risco clinico
--   prescricao_id    -- revinculacao retroativa a outro episodio clinico
--   deleted_at       -- soft-delete pos-dispensacao ocultaria evento consumado
--   created_at       -- timestamp de criacao historico
--   created_by       -- autoria de criacao historica
--
-- Nota sobre created_at/created_by (OPCAO A -- METADATA_IMMUTABILITY_ALWAYS = PENDING):
--   Esta migration protege created_at e created_by somente apos dispensacao
--   porque o escopo e exclusivamente SEC-15. A protecao pre-dispensacao e
--   uma segunda invariante registrada como pendente para etapa futura.
--
-- Campos que permanecem mutaveis (workflow legitimo):
--   status_id             -- lifecycle: pendente -> separado -> administrado
--   hora_administracao_ts -- registrado no ato da administracao
--   updated_at            -- gerenciado por trg_updated_at_prescricao_itens
--   updated_by            -- rastreabilidade de quem alterou campo de workflow
--
-- Definicao de dispensacao adotada:
--   HAS_EVER_BEEN_DISPENSED(item_id) :=
--     EXISTS (SELECT 1 FROM public.estoque_movimentacoes
--             WHERE prescricao_item_id = item_id AND tipo_movimentacao = 'saida')
--   Estorno posterior (tipo='ajuste') NAO reverte esta condicao.
--
-- O que esta migration NAO faz:
--   - Nao altera grants em nenhuma tabela.
--   - Nao cria, altera ou remove policies de RLS.
--   - Nao altera schema de nenhuma tabela (nenhuma coluna/constraint).
--   - Nao insere ou altera dados.
--   - Nao toca em prescricoes (cabecalho) -- escopo de SEC-15B.
--   - Nao altera fn_audit_trigger, trg_audit_prescricao_itens nem audit_log.
--
-- Contrato backend (BACKEND_CONTRACT_CHANGE = YES):
--   SQLSTATE: P0001
--   Codigo: GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE
--
-- Atributos estruturais da funcao criada:
--   schema:        public
--   name:          fn_protect_prescricao_item_after_dispense
--   args:          (nenhum -- trigger function)
--   retorno:       trigger
--   language:      plpgsql
--   security:      SECURITY DEFINER
--   owner:         postgres (definido explicitamente via ALTER FUNCTION OWNER TO)
--   volatilidade:  v (VOLATILE -- padrao plpgsql)
--   proconfig:     {search_path=public}
--   EXECUTE grant: nenhum para public / anon / authenticated
--   MD5 (prosrc):  e85bd11fd7f1ef07e921c6b1a588ea43
--     Normalizacao: strip comentarios de linha, lowercase, collapse whitespace, trim.
--     Nota: SECURITY DEFINER e atributo prosecdef, nao integra prosrc nem o MD5.
--
-- Baseline validado por guards (pre e pos):
--   FK:        estoque_movimentacoes.prescricao_item_id -> prescricao_itens(id) NO ACTION
--   Policy:    prescricao_itens_update_farmacia_admin (UPDATE, authenticated,
--              USING/WITH CHECK: has_permission('prescricao.dispensar') OR is_admin())
--   Audit:     trg_audit_prescricao_itens -> fn_audit_trigger
--   Estoque:   trg_block_update_estoque_movimentacoes -> fn_block_update_delete
--   Updated_at: trg_updated_at_prescricao_itens -> fn_set_updated_at
--
-- Rollback: supabase/rollback/20260810000001_pp3c1_prescricao_item_freeze_after_dispense_rollback.sql

-- =========================================================================
-- GUARDIAO DE SCHEMA DRIFT (G-1..G-19)
-- =========================================================================

do $guard$
declare
  v_count  integer;
  v_text   text;
  v_text2  text;
begin

  -- G-1: tabela prescricao_itens existe
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public' and table_name = 'prescricao_itens';
  if v_count = 0 then
    raise exception 'pp3c1 [G-1]: tabela public.prescricao_itens nao encontrada.';
  end if;

  -- G-2: tabela estoque_movimentacoes existe
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public' and table_name = 'estoque_movimentacoes';
  if v_count = 0 then
    raise exception 'pp3c1 [G-2]: tabela public.estoque_movimentacoes nao encontrada.';
  end if;

  -- G-3: prescricao_itens.medicamento_id existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'medicamento_id';
  if v_count = 0 then
    raise exception 'pp3c1 [G-3]: coluna prescricao_itens.medicamento_id ausente.';
  end if;

  -- G-4: prescricao_itens.medicamento_nome existe, tipo text, NOT NULL
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'medicamento_nome'
    and data_type   = 'text'
    and is_nullable = 'NO';
  if v_count = 0 then
    raise exception 'pp3c1 [G-4]: prescricao_itens.medicamento_nome ausente ou tipo/nullable incorreto.';
  end if;

  -- G-5: prescricao_itens.dose existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'dose';
  if v_count = 0 then
    raise exception 'pp3c1 [G-5]: coluna prescricao_itens.dose ausente.';
  end if;

  -- G-6: prescricao_itens.via existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'via';
  if v_count = 0 then
    raise exception 'pp3c1 [G-6]: coluna prescricao_itens.via ausente.';
  end if;

  -- G-7: prescricao_itens.deleted_at existe (requer 20260709170000)
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'deleted_at';
  if v_count = 0 then
    raise exception 'pp3c1 [G-7]: prescricao_itens.deleted_at ausente. '
      'Requer 20260709170000_block_delete_assistencial_audit_append_only.';
  end if;

  -- G-8: prescricao_itens.created_at existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'created_at';
  if v_count = 0 then
    raise exception 'pp3c1 [G-8]: coluna prescricao_itens.created_at ausente.';
  end if;

  -- G-9: prescricao_itens.created_by existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prescricao_itens'
    and column_name = 'created_by';
  if v_count = 0 then
    raise exception 'pp3c1 [G-9]: coluna prescricao_itens.created_by ausente.';
  end if;

  -- G-10a: estoque_movimentacoes.prescricao_item_id existe
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'estoque_movimentacoes'
    and column_name = 'prescricao_item_id';
  if v_count = 0 then
    raise exception 'pp3c1 [G-10a]: estoque_movimentacoes.prescricao_item_id ausente.';
  end if;

  -- G-10b: FK prescricao_item_id -> prescricao_itens(id) existe, ON DELETE NO ACTION
  -- confdeletetype: 'a' = NO ACTION (padrao quando ON DELETE nao declarado)
  select count(*) into v_count
  from pg_constraint  c
  join pg_class       src on src.oid = c.conrelid
  join pg_class       tgt on tgt.oid = c.confrelid
  join pg_namespace   ns  on ns.oid  = src.relnamespace
  join pg_attribute   a   on a.attrelid = src.oid and a.attnum = any(c.conkey)
  where ns.nspname        = 'public'
    and src.relname       = 'estoque_movimentacoes'
    and tgt.relname       = 'prescricao_itens'
    and c.contype         = 'f'
    and a.attname         = 'prescricao_item_id'
    and c.confdeltype     = 'a';
  if v_count = 0 then
    raise exception 'pp3c1 [G-10b]: FK estoque_movimentacoes.prescricao_item_id -> '
      'prescricao_itens(id) ON DELETE NO ACTION nao encontrada. '
      'Requer 20260623100010_prescricoes.';
  end if;

  -- G-11: check constraint de tipo_movimentacao inclui 'saida'
  select count(*) into v_count
  from pg_constraint c
  join pg_class      r on r.oid = c.conrelid
  join pg_namespace  n on n.oid = r.relnamespace
  where n.nspname  = 'public'
    and r.relname  = 'estoque_movimentacoes'
    and c.contype  = 'c'
    and pg_get_constraintdef(c.oid) like '%saida%';
  if v_count = 0 then
    raise exception 'pp3c1 [G-11]: check constraint de tipo_movimentacao com ''saida'' nao encontrado.';
  end if;

  -- G-12: funcao nova ainda nao existe (prevenir reaplicacao)
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count > 0 then
    raise exception 'pp3c1 [G-12]: fn_protect_prescricao_item_after_dispense ja existe. '
      'Migration ja aplicada? Nao reaplicar.';
  end if;

  -- G-13: trigger novo ainda nao existe
  select count(*) into v_count
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_count > 0 then
    raise exception 'pp3c1 [G-13]: trigger trg_protect_prescricao_item_post_dispense ja existe.';
  end if;

  -- G-14: indice parcial ainda nao existe (prevenir reaplicacao)
  select count(*) into v_count
  from pg_class     ic
  join pg_namespace n on n.oid = ic.relnamespace
  where n.nspname = 'public'
    and ic.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
    and ic.relkind = 'i';
  if v_count > 0 then
    raise exception 'pp3c1 [G-14]: idx_estoque_movimentacoes_prescricao_item_saida ja existe.';
  end if;

  -- G-15: audit trigger de prescricao_itens intacto e aponta para fn_audit_trigger
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_audit_prescricao_itens';
  if v_text is null or v_text <> 'fn_audit_trigger' then
    raise exception 'pp3c1 [G-15]: trg_audit_prescricao_itens ausente ou aponta para % '
      '(esperado fn_audit_trigger). Requer 20260623100013_audit_triggers.',
      coalesce(v_text, 'NULL');
  end if;

  -- G-16: trigger de bloqueio de UPDATE em estoque_movimentacoes intacto e aponta para fn_block_update_delete
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'estoque_movimentacoes'
    and t.tgname  = 'trg_block_update_estoque_movimentacoes';
  if v_text is null or v_text <> 'fn_block_update_delete' then
    raise exception 'pp3c1 [G-16]: trg_block_update_estoque_movimentacoes ausente ou aponta para % '
      '(esperado fn_block_update_delete). Requer 20260623100014_updated_at_estoque_triggers.',
      coalesce(v_text, 'NULL');
  end if;

  -- G-17a: policy prescricao_itens_update_farmacia_admin existe (baseline RLS)
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'prescricao_itens'
    and policyname = 'prescricao_itens_update_farmacia_admin';
  if v_count = 0 then
    raise exception 'pp3c1 [G-17a]: policy prescricao_itens_update_farmacia_admin ausente. '
      'Requer 20260623100012_rls_policies.';
  end if;

  -- G-17b: policy semanticamente correta (UPDATE, authenticated, USING/WITH CHECK esperados)
  select cmd, qual
  into   v_text, v_text2
  from   pg_policies
  where  schemaname = 'public'
    and  tablename  = 'prescricao_itens'
    and  policyname = 'prescricao_itens_update_farmacia_admin';
  if v_text <> 'UPDATE' then
    raise exception 'pp3c1 [G-17b]: policy cmd=% (esperado UPDATE).', v_text;
  end if;
  if lower(coalesce(v_text2, '')) not like '%prescricao.dispensar%'
     or lower(coalesce(v_text2, '')) not like '%is_admin%' then
    raise exception 'pp3c1 [G-17b]: policy USING diverge do esperado '
      '(esperado: has_permission(''prescricao.dispensar'') OR is_admin()). Encontrado: [%]', v_text2;
  end if;

  -- G-18: authenticated possui UPDATE grant em prescricao_itens
  select count(*) into v_count
  from information_schema.role_table_grants
  where grantee        = 'authenticated'
    and table_schema   = 'public'
    and table_name     = 'prescricao_itens'
    and privilege_type = 'UPDATE';
  if v_count = 0 then
    raise exception 'pp3c1 [G-18]: authenticated nao possui UPDATE grant em prescricao_itens. '
      'Requer 20260722100030_grant_tabelas_clinicas_estendidas.';
  end if;

  -- G-19: trigger de updated_at em prescricao_itens existe e aponta para fn_set_updated_at
  -- (criado dinamicamente por 20260623100014_updated_at_estoque_triggers.sql)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_updated_at_prescricao_itens';
  if v_text is null or v_text <> 'fn_set_updated_at' then
    raise exception 'pp3c1 [G-19]: trg_updated_at_prescricao_itens ausente ou aponta para % '
      '(esperado fn_set_updated_at). Requer 20260623100014_updated_at_estoque_triggers.',
      coalesce(v_text, 'NULL');
  end if;

  raise notice 'pp3c1 guardiao pre: G-1..G-19 passaram. Prosseguindo.';

end $guard$;

-- =========================================================================
-- A. FUNCAO DE PROTECAO
-- =========================================================================
-- SECURITY DEFINER: a verificacao de dispensacao historica e invariante de
-- banco, nao de perfil. Deve funcionar independentemente de o usuario que
-- executa UPDATE ter visibilidade de estoque_movimentacoes por RLS.
-- Owner: postgres (definido explicitamente por ALTER FUNCTION OWNER TO abaixo).
-- SET search_path = public: padrao aprovado do projeto.
-- Todos os objetos schema-qualified: public.estoque_movimentacoes.
-- Sem SQL dinamico. Sem is_admin(). Sem flag de sessao de bypass.

create or replace function public.fn_protect_prescricao_item_after_dispense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispensado                   boolean := false;
  v_campos_historicos_alterados  boolean;
begin
  -- short-circuit: se nenhum campo historico mudou, sair sem consultar estoque_movimentacoes.
  v_campos_historicos_alterados := (
    NEW.medicamento_id    IS DISTINCT FROM OLD.medicamento_id    OR
    NEW.medicamento_nome  IS DISTINCT FROM OLD.medicamento_nome  OR
    NEW.dose              IS DISTINCT FROM OLD.dose              OR
    NEW.via               IS DISTINCT FROM OLD.via               OR
    NEW.prescricao_id     IS DISTINCT FROM OLD.prescricao_id     OR
    NEW.deleted_at        IS DISTINCT FROM OLD.deleted_at        OR
    NEW.created_at        IS DISTINCT FROM OLD.created_at        OR
    NEW.created_by        IS DISTINCT FROM OLD.created_by
  );

  IF NOT v_campos_historicos_alterados THEN
    RETURN NEW;
  END IF;

  -- verificar se existe dispensacao real (tipo='saida') vinculada a este item.
  SELECT EXISTS (
    SELECT 1
    FROM   public.estoque_movimentacoes
    WHERE  prescricao_item_id = OLD.id
      AND  tipo_movimentacao  = 'saida'
    LIMIT  1
  ) INTO v_dispensado;

  IF v_dispensado THEN
    RAISE EXCEPTION
      'GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE: '
      'prescricao_item id=% ja possui dispensacao registrada em estoque_movimentacoes. '
      'Campos imutaveis: medicamento_id, medicamento_nome, dose, via, '
      'prescricao_id, deleted_at, created_at, created_by. '
      'Para correcao: altere o status para indicar cancelamento e crie novo item.',
      OLD.id
    USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

comment on function public.fn_protect_prescricao_item_after_dispense() is
  'PP3-C.1 (20260810000001): congela campos farmacologicos e de identidade de '
  'prescricao_itens apos dispensacao confirmada. '
  'SECURITY DEFINER / owner=postgres: invariante de banco, independe de RLS do invocador. '
  'Condicao HAS_EVER_BEEN_DISPENSED: EXISTS tipo_movimentacao=''saida'' '
  'em public.estoque_movimentacoes com prescricao_item_id=item.id. '
  'Estorno (tipo=''ajuste'') nao descongela. '
  'Campos protegidos: medicamento_id, medicamento_nome, dose, via, '
  'prescricao_id, deleted_at, created_at, created_by. '
  'Campos livres: status_id, hora_administracao_ts, updated_at, updated_by. '
  'MD5 normalizado do corpo (prosrc): e85bd11fd7f1ef07e921c6b1a588ea43.';

-- Owner explicito: nao depende do role executor da migration.
-- Padrao do projeto: fn_audit_trigger e fn_estoque_aplicar_movimentacao sao owner=postgres.
alter function public.fn_protect_prescricao_item_after_dispense() owner to postgres;

-- =========================================================================
-- B. TRIGGER
-- =========================================================================

drop trigger if exists trg_protect_prescricao_item_post_dispense
  on public.prescricao_itens;

create trigger trg_protect_prescricao_item_post_dispense
  before update on public.prescricao_itens
  for each row
  execute function public.fn_protect_prescricao_item_after_dispense();

comment on trigger trg_protect_prescricao_item_post_dispense
  on public.prescricao_itens is
  'PP3-C.1 (20260810000001): BEFORE UPDATE FOR EACH ROW. '
  'Invoca fn_protect_prescricao_item_after_dispense para congelar campos '
  'historicos apos HAS_EVER_BEEN_DISPENSED. '
  'Ver funcao para lista de campos protegidos e condicao de dispensacao.';

-- =========================================================================
-- C. INDICE PARCIAL
-- =========================================================================
-- Sem este indice, a consulta HAS_EVER_BEEN_DISPENSED faria varredura
-- sequencial em estoque_movimentacoes a cada UPDATE de prescricao_item.
-- Nenhuma migration anterior criou indice cobrindo prescricao_item_id.
-- O indice cobre exatamente a condicao da funcao:
--   tipo_movimentacao = 'saida' AND prescricao_item_id IS NOT NULL.

create index idx_estoque_movimentacoes_prescricao_item_saida
  on public.estoque_movimentacoes (prescricao_item_id)
  where tipo_movimentacao = 'saida'
    and prescricao_item_id is not null;

comment on index idx_estoque_movimentacoes_prescricao_item_saida is
  'PP3-C.1 (20260810000001): indice parcial para a consulta HAS_EVER_BEEN_DISPENSED '
  'em fn_protect_prescricao_item_after_dispense. '
  'Cobre prescricao_item_id WHERE tipo_movimentacao=''saida'' AND IS NOT NULL.';

-- =========================================================================
-- D. REVOKE EXECUTE (padrao de hardening -- 20260623100016)
-- =========================================================================
-- Trigger functions nao precisam de EXECUTE grant para authenticated:
-- sao invocadas pelo motor de trigger com os privilegios do SECURITY DEFINER,
-- nunca chamadas diretamente pela aplicacao.

revoke execute on function public.fn_protect_prescricao_item_after_dispense()
  from public;
revoke execute on function public.fn_protect_prescricao_item_after_dispense()
  from anon;
revoke execute on function public.fn_protect_prescricao_item_after_dispense()
  from authenticated;

-- =========================================================================
-- GUARDIAO POS-MIGRATION (P-1..P-18)
-- =========================================================================

do $postguard$
declare
  v_count          integer;
  v_text           text;
  v_text2          text;
  v_bool           boolean;
  v_arr            text[];
  v_trigger_timing text;
  v_trigger_event  text;
  v_fn_md5         text;

  -- MD5 normalizado esperado do corpo (prosrc) criado por esta migration.
  -- Normalizacao: strip comentarios de linha (--...\n), lowercase,
  -- collapse \s+ para ' ', trim.
  -- SECURITY DEFINER e atributo prosecdef -- nao integra prosrc nem o MD5.
  -- ALTER FUNCTION OWNER TO nao altera prosrc nem o MD5.
  v_expected_md5 constant text := 'e85bd11fd7f1ef07e921c6b1a588ea43';
begin

  -- P-1: funcao existe exatamente 1 vez
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count <> 1 then
    raise exception 'pp3c1 [P-1]: fn_protect_prescricao_item_after_dispense '
      'count=% (esperado 1).', v_count;
  end if;

  -- P-2: pronargs = 0 (trigger function nao tem argumentos)
  select p.pronargs into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count <> 0 then
    raise exception 'pp3c1 [P-2]: pronargs=% (esperado 0).', v_count;
  end if;

  -- P-3: retorno = trigger
  select pg_get_function_result(p.oid) into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'trigger' then
    raise exception 'pp3c1 [P-3]: retorno=[%] (esperado trigger).', v_text;
  end if;

  -- P-4: language = plpgsql
  select l.lanname into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language  l on l.oid = p.prolang
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'plpgsql' then
    raise exception 'pp3c1 [P-4]: language=[%] (esperado plpgsql).', v_text;
  end if;

  -- P-5: SECURITY DEFINER = true
  select p.prosecdef into v_bool
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if not v_bool then
    raise exception 'pp3c1 [P-5]: prosecdef=false -- funcao nao e SECURITY DEFINER. '
      'Drift critico: invariante de banco nao pode depender de RLS do invocador.';
  end if;

  -- P-6: owner = postgres (garantido pelo ALTER FUNCTION OWNER TO acima)
  select pg_get_userbyid(p.proowner) into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'postgres' then
    raise exception 'pp3c1 [P-6]: owner=[%] (esperado postgres).', v_text;
  end if;

  -- P-7: proconfig contem search_path=public (exatamente 1 entrada)
  select p.proconfig into v_arr
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_arr is null
     or array_length(v_arr, 1) <> 1
     or v_arr[1] <> 'search_path=public'
  then
    raise exception 'pp3c1 [P-7]: proconfig=[%] (esperado {search_path=public}).',
      array_to_string(v_arr, ',');
  end if;

  -- P-8: MD5 normalizado do corpo (prosrc) confere
  select md5(
    trim(regexp_replace(
      lower(regexp_replace(p.prosrc, '--[^\n]*', '', 'g')),
      '\s+', ' ', 'g'
    ))
  ) into v_fn_md5
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_fn_md5 <> v_expected_md5 then
    raise exception
      'pp3c1 [P-8]: MD5 do corpo diverge. Calculado:[%] Esperado:[%]. '
      'O corpo nao corresponde ao versionado por esta migration.',
      v_fn_md5, v_expected_md5;
  end if;

  -- P-9: nenhum EXECUTE concedido a public / anon / authenticated
  -- Se proacl e NULL, nenhum grant explicito existe (apenas defaults do owner).
  -- acldefault('f', proowner) retorna o default que inclui PUBLIC=EXECUTE;
  -- apos REVOKE FROM public, proacl fica nao-null sem entrada para PUBLIC.
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  where n.nspname          = 'public'
    and p.proname          = 'fn_protect_prescricao_item_after_dispense'
    and acl.privilege_type = 'EXECUTE'
    and acl.grantee        in (
      (select oid from pg_roles where rolname = 'authenticated'),
      (select oid from pg_roles where rolname = 'anon'),
      0  -- OID 0 = PUBLIC
    );
  if v_count > 0 then
    raise exception 'pp3c1 [P-9]: EXECUTE concedido indevidamente a % role(s) '
      '(authenticated/anon/public).', v_count;
  end if;

  -- P-10: trigger existe exatamente 1 vez em prescricao_itens
  select count(*) into v_count
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_count <> 1 then
    raise exception 'pp3c1 [P-10]: trigger trg_protect_prescricao_item_post_dispense '
      'count=% (esperado 1).', v_count;
  end if;

  -- P-11: trigger e BEFORE UPDATE (tgtype bit 2 = BEFORE; bit 16 = UPDATE)
  select
    case when t.tgtype & 2  = 2  then 'BEFORE' else 'AFTER'  end,
    case when t.tgtype & 16 = 16 then 'UPDATE' else 'OTHER'  end
  into v_trigger_timing, v_trigger_event
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_trigger_timing <> 'BEFORE' or v_trigger_event <> 'UPDATE' then
    raise exception 'pp3c1 [P-11]: trigger nao e BEFORE UPDATE '
      '(timing=%, event=%).', v_trigger_timing, v_trigger_event;
  end if;

  -- P-12: indice parcial existe em estoque_movimentacoes com definicao exata
  -- Valida: nome, tabela, coluna, predicado 'saida', IS NOT NULL, nao-unique.
  select pg_get_indexdef(ic.oid) into v_text
  from pg_class     ic
  join pg_index     ix on ix.indexrelid = ic.oid
  join pg_class     t  on t.oid = ix.indrelid
  join pg_namespace n  on n.oid = ic.relnamespace
  where n.nspname = 'public'
    and ic.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
    and ic.relkind = 'i'
    and t.relname  = 'estoque_movimentacoes';
  if v_text is null then
    raise exception 'pp3c1 [P-12a]: idx_estoque_movimentacoes_prescricao_item_saida '
      'nao encontrado em public.estoque_movimentacoes.';
  end if;
  if lower(v_text) not like '%prescricao_item_id%'
     or lower(v_text) not like '%saida%'
     or lower(v_text) not like '%is not null%'
     or lower(v_text)     like '%unique%' then
    raise exception 'pp3c1 [P-12b]: definicao do indice diverge do esperado. '
      'Calculado: [%]', v_text;
  end if;

  -- P-13: policies baseline de prescricao_itens intactas (3 obrigatorias)
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'prescricao_itens'
    and policyname in (
      'prescricao_itens_update_farmacia_admin',
      'prescricao_itens_select_farmacia_clinico',
      'prescricao_itens_insert_medico_admin'
    );
  if v_count <> 3 then
    raise exception 'pp3c1 [P-13]: % de 3 policies baseline de prescricao_itens '
      'encontradas -- alguma removida ou renomeada.', v_count;
  end if;

  -- P-14: trigger aponta para fn_protect_prescricao_item_after_dispense (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_text is null or v_text <> 'fn_protect_prescricao_item_after_dispense' then
    raise exception 'pp3c1 [P-14]: tgfoid aponta para % (esperado fn_protect_prescricao_item_after_dispense).',
      coalesce(v_text, 'NULL');
  end if;

  -- P-15: trigger habilitado (tgenabled = 'O' = origem/enabled)
  select t.tgenabled::text into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_text <> 'O' then
    raise exception 'pp3c1 [P-15]: tgenabled=% (esperado O = enabled). '
      'Trigger pode estar desabilitado -- drift critico.', v_text;
  end if;

  -- P-16: audit trigger baseline intacto e aponta para fn_audit_trigger (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_audit_prescricao_itens';
  if v_text is null or v_text <> 'fn_audit_trigger' then
    raise exception 'pp3c1 [P-16]: trg_audit_prescricao_itens ausente ou aponta para % '
      '(esperado fn_audit_trigger). Auditabilidade comprometida.',
      coalesce(v_text, 'NULL');
  end if;

  -- P-17: estoque block baseline intacto e aponta para fn_block_update_delete (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'estoque_movimentacoes'
    and t.tgname  = 'trg_block_update_estoque_movimentacoes';
  if v_text is null or v_text <> 'fn_block_update_delete' then
    raise exception 'pp3c1 [P-17]: trg_block_update_estoque_movimentacoes ausente ou aponta para % '
      '(esperado fn_block_update_delete). Protecao de estoque comprometida.',
      coalesce(v_text, 'NULL');
  end if;

  -- P-18: updated_at baseline em prescricao_itens intacto e aponta para fn_set_updated_at (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_updated_at_prescricao_itens';
  if v_text is null or v_text <> 'fn_set_updated_at' then
    raise exception 'pp3c1 [P-18]: trg_updated_at_prescricao_itens ausente ou aponta para % '
      '(esperado fn_set_updated_at).',
      coalesce(v_text, 'NULL');
  end if;

  raise notice 'pp3c1 guardiao pos: P-1..P-18 passaram. MD5 confirmado: %. '
    'PP3-C.1 aplicado com sucesso.', v_expected_md5;

end $postguard$;

-- =========================================================================
-- FIM DA MIGRATION 20260810000001
--
-- Funcao criada:  fn_protect_prescricao_item_after_dispense
--   security:     SECURITY DEFINER
--   owner:        postgres (ALTER FUNCTION OWNER TO explicito)
--   search_path:  public
--   MD5 (prosrc): e85bd11fd7f1ef07e921c6b1a588ea43
-- Trigger criado: trg_protect_prescricao_item_post_dispense
--   tipo:         BEFORE UPDATE FOR EACH ROW
--   tabela:       public.prescricao_itens
--   tgfoid:       fn_protect_prescricao_item_after_dispense
--   tgenabled:    O (enabled)
-- Indice criado:  idx_estoque_movimentacoes_prescricao_item_saida
--   tabela:       public.estoque_movimentacoes (prescricao_item_id)
--   parcial:      WHERE tipo_movimentacao = 'saida' AND prescricao_item_id IS NOT NULL
--   unique:       false
-- EXECUTE revogado: public, anon, authenticated
-- Campos congelados apos HAS_EVER_BEEN_DISPENSED:
--   medicamento_id, medicamento_nome, dose, via, prescricao_id,
--   deleted_at, created_at, created_by
-- Campos livres: status_id, hora_administracao_ts, updated_at, updated_by
-- METADATA_IMMUTABILITY_ALWAYS = PENDING (created_at/created_by pre-dispensacao)
-- FK validada: estoque_movimentacoes.prescricao_item_id -> prescricao_itens(id) NO ACTION
-- Proxima etapa: SEC-15B -- prescricoes (cabecalho)
-- Rollback: supabase/rollback/20260810000001_pp3c1_prescricao_item_freeze_after_dispense_rollback.sql
-- =========================================================================
