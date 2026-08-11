-- Rollback: 20260810000001_pp3c1_prescricao_item_freeze_after_dispense
-- GSI ONE | PP3-C.1 -- Reverter protecao de prescricao_itens apos dispensacao
--
-- O que este rollback desfaz (exatamente o que a migration criou):
--   R1. DROP TRIGGER trg_protect_prescricao_item_post_dispense em prescricao_itens
--   R2. DROP FUNCTION public.fn_protect_prescricao_item_after_dispense()
--   R3. DROP INDEX  public.idx_estoque_movimentacoes_prescricao_item_saida
--
-- O que este rollback NAO toca:
--   - Nenhuma tabela.
--   - Nenhuma coluna ou constraint.
--   - Nenhuma policy de RLS.
--   - Nenhum grant.
--   - Nenhuma outra funcao ou trigger.
--   - audit_log e audit triggers (trg_audit_prescricao_itens permanece intacto).
--   - trg_block_update_estoque_movimentacoes (permanece intacto).
--   - trg_updated_at_prescricao_itens (permanece intacto).
--   - Nenhum dado.
--
-- ATENCAO: apos o rollback, prescricao_itens volta a ter campos farmacologicos
-- mutaveis para qualquer usuario com UPDATE grant e policy RLS permissiva.
-- A vulnerabilidade SEC-15 retorna ao estado pre-PP3-C.1.
--
-- Atributos validados antes de executar (guardiao pre-rollback R-G1..R-G15):
--   trigger:    trg_protect_prescricao_item_post_dispense  BEFORE UPDATE em prescricao_itens
--   tgfoid:     fn_protect_prescricao_item_after_dispense (exato)
--   tgenabled:  O (habilitado)
--   funcao:     fn_protect_prescricao_item_after_dispense  existe exatamente 1 vez
--   pronargs:   0 / retorno: trigger / language: plpgsql
--   prosecdef:  true (SECURITY DEFINER)
--   owner:      postgres
--   proconfig:  {search_path=public}
--   MD5:        e85bd11fd7f1ef07e921c6b1a588ea43 (corpo prosrc normalizado)
--   indice:     idx_estoque_movimentacoes_prescricao_item_saida (definicao exata)
--   policy:     prescricao_itens_update_farmacia_admin (semantica UPDATE/has_permission/is_admin)
--   grants:     authenticated UPDATE em prescricao_itens
--   audit:      trg_audit_prescricao_itens -> fn_audit_trigger
--   estoque:    trg_block_update_estoque_movimentacoes -> fn_block_update_delete
--
-- Migration correspondente:
--   supabase/migrations/20260810000001_pp3c1_prescricao_item_freeze_after_dispense.sql

-- =========================================================================
-- GUARDIAO PRE-ROLLBACK (R-G1..R-G15)
-- =========================================================================

do $rguard$
declare
  v_count          integer;
  v_bool           boolean;
  v_text           text;
  v_text2          text;
  v_arr            text[];
  v_trigger_timing text;
  v_trigger_event  text;
  v_fn_md5         text;

  v_expected_md5 constant text := 'e85bd11fd7f1ef07e921c6b1a588ea43';
begin

  -- R-G1: trigger existe e e BEFORE UPDATE em prescricao_itens
  select count(*) into v_count
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_count = 0 then
    raise exception 'pp3c1-rollback [R-G1]: trigger trg_protect_prescricao_item_post_dispense '
      'nao encontrado em prescricao_itens. Migration ja revertida?';
  end if;

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
    raise exception 'pp3c1-rollback [R-G1b]: trigger nao e BEFORE UPDATE '
      '(timing=%, event=%). Estado inesperado -- nao reverter.', v_trigger_timing, v_trigger_event;
  end if;

  -- R-G2: funcao existe exatamente 1 vez
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count <> 1 then
    raise exception 'pp3c1-rollback [R-G2]: fn_protect_prescricao_item_after_dispense '
      'count=% (esperado 1). Nao reverter sem investigar.', v_count;
  end if;

  -- R-G3: funcao e SECURITY DEFINER (prosecdef = true)
  select p.prosecdef into v_bool
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if not v_bool then
    raise exception 'pp3c1-rollback [R-G3]: fn_protect_prescricao_item_after_dispense '
      'nao e SECURITY DEFINER (prosecdef=false). '
      'Funcao pode ter sido substituida por versao diferente -- nao reverter.';
  end if;

  -- R-G4: owner = postgres
  select pg_get_userbyid(p.proowner) into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'postgres' then
    raise exception 'pp3c1-rollback [R-G4]: owner=[%] (esperado postgres). '
      'Funcao pode ter sido substituida -- nao reverter.', v_text;
  end if;

  -- R-G5: MD5 do corpo (prosrc) confere
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
      'pp3c1-rollback [R-G5]: MD5 do corpo diverge. Calculado:[%] Esperado:[%]. '
      'O corpo foi alterado apos a migration -- nao reverter sem investigar.',
      v_fn_md5, v_expected_md5;
  end if;

  -- R-G6: indice parcial existe
  select count(*) into v_count
  from pg_class     ic
  join pg_namespace n on n.oid = ic.relnamespace
  where n.nspname = 'public'
    and ic.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
    and ic.relkind = 'i';
  if v_count = 0 then
    raise exception 'pp3c1-rollback [R-G6]: idx_estoque_movimentacoes_prescricao_item_saida '
      'nao encontrado. Estado inconsistente com a migration -- investigar.';
  end if;

  -- R-G7: funcao args=0, retorno=trigger, language=plpgsql
  select p.pronargs into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count <> 0 then
    raise exception 'pp3c1-rollback [R-G7a]: pronargs=% (esperado 0). '
      'Funcao diferente -- nao reverter.', v_count;
  end if;
  select pg_get_function_result(p.oid) into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'trigger' then
    raise exception 'pp3c1-rollback [R-G7b]: retorno=[%] (esperado trigger).', v_text;
  end if;
  select l.lanname into v_text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language  l on l.oid = p.prolang
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_text <> 'plpgsql' then
    raise exception 'pp3c1-rollback [R-G7c]: language=[%] (esperado plpgsql).', v_text;
  end if;

  -- R-G8: proconfig contem search_path=public (exatamente 1 entrada)
  select p.proconfig into v_arr
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_arr is null
     or array_length(v_arr, 1) <> 1
     or v_arr[1] <> 'search_path=public'
  then
    raise exception 'pp3c1-rollback [R-G8]: proconfig=[%] (esperado {search_path=public}). '
      'Funcao diferente -- nao reverter.', array_to_string(v_arr, ',');
  end if;

  -- R-G9: trigger aponta para fn_protect_prescricao_item_after_dispense (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_text is null or v_text <> 'fn_protect_prescricao_item_after_dispense' then
    raise exception 'pp3c1-rollback [R-G9]: tgfoid aponta para % '
      '(esperado fn_protect_prescricao_item_after_dispense). Estado inesperado -- nao reverter.',
      coalesce(v_text, 'NULL');
  end if;

  -- R-G10: trigger habilitado (tgenabled = 'O')
  select t.tgenabled::text into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_text <> 'O' then
    raise exception 'pp3c1-rollback [R-G10]: tgenabled=% (esperado O = enabled). '
      'Estado inesperado -- investigar antes de reverter.', v_text;
  end if;

  -- R-G11: definicao exata do indice parcial (tabela, coluna, predicado, nao-unique)
  select pg_get_indexdef(ic.oid) into v_text
  from pg_class     ic
  join pg_index     ix on ix.indexrelid = ic.oid
  join pg_class     t  on t.oid = ix.indrelid
  join pg_namespace n  on n.oid = ic.relnamespace
  where n.nspname = 'public'
    and ic.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
    and ic.relkind = 'i'
    and t.relname  = 'estoque_movimentacoes';
  if v_text is null
     or lower(v_text) not like '%prescricao_item_id%'
     or lower(v_text) not like '%saida%'
     or lower(v_text) not like '%is not null%'
     or lower(v_text)     like '%unique%' then
    raise exception 'pp3c1-rollback [R-G11]: definicao do indice diverge ou indice em tabela errada. '
      'Definicao: [%]. Nao reverter sem investigar.', coalesce(v_text, 'NULL');
  end if;

  -- R-G12: policy prescricao_itens_update_farmacia_admin semanticamente intacta
  -- (cmd=UPDATE, USING contem has_permission/prescricao.dispensar/is_admin)
  select cmd, qual
  into   v_text, v_text2
  from   pg_policies
  where  schemaname = 'public'
    and  tablename  = 'prescricao_itens'
    and  policyname = 'prescricao_itens_update_farmacia_admin';
  if v_text is null then
    raise exception 'pp3c1-rollback [R-G12]: policy prescricao_itens_update_farmacia_admin ausente. '
      'Estado inesperado -- nao reverter.';
  end if;
  if v_text <> 'UPDATE' then
    raise exception 'pp3c1-rollback [R-G12]: policy cmd=% (esperado UPDATE).', v_text;
  end if;
  if lower(coalesce(v_text2, '')) not like '%prescricao.dispensar%'
     or lower(coalesce(v_text2, '')) not like '%is_admin%' then
    raise exception 'pp3c1-rollback [R-G12]: policy USING semanticamente diferente: [%]. '
      'Nao reverter sem investigar.', v_text2;
  end if;

  -- R-G13: authenticated possui UPDATE grant em prescricao_itens
  select count(*) into v_count
  from information_schema.role_table_grants
  where grantee        = 'authenticated'
    and table_schema   = 'public'
    and table_name     = 'prescricao_itens'
    and privilege_type = 'UPDATE';
  if v_count = 0 then
    raise exception 'pp3c1-rollback [R-G13]: authenticated perdeu UPDATE grant em prescricao_itens. '
      'Estado inesperado -- investigar antes de reverter.';
  end if;

  -- R-G14: audit trigger aponta para fn_audit_trigger (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_audit_prescricao_itens';
  if v_text is null or v_text <> 'fn_audit_trigger' then
    raise exception 'pp3c1-rollback [R-G14]: trg_audit_prescricao_itens ausente ou aponta para % '
      '(esperado fn_audit_trigger). Auditabilidade comprometida -- investigar antes de reverter.',
      coalesce(v_text, 'NULL');
  end if;

  -- R-G15: estoque block trigger aponta para fn_block_update_delete (tgfoid exato)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'estoque_movimentacoes'
    and t.tgname  = 'trg_block_update_estoque_movimentacoes';
  if v_text is null or v_text <> 'fn_block_update_delete' then
    raise exception 'pp3c1-rollback [R-G15]: trg_block_update_estoque_movimentacoes ausente ou aponta para % '
      '(esperado fn_block_update_delete). Protecao de estoque comprometida -- investigar.',
      coalesce(v_text, 'NULL');
  end if;

  raise notice 'pp3c1-rollback guardiao pre: R-G1..R-G15 passaram. Prosseguindo.';

end $rguard$;

-- =========================================================================
-- R1. REMOVER TRIGGER
-- =========================================================================

drop trigger if exists trg_protect_prescricao_item_post_dispense
  on public.prescricao_itens;

-- =========================================================================
-- R2. REMOVER FUNCAO
-- =========================================================================

drop function if exists public.fn_protect_prescricao_item_after_dispense();

-- =========================================================================
-- R3. REMOVER INDICE PARCIAL
-- =========================================================================

drop index if exists public.idx_estoque_movimentacoes_prescricao_item_saida;

-- =========================================================================
-- GUARDIAO POS-ROLLBACK (R-PG1..R-PG7)
-- =========================================================================

do $rpostguard$
declare
  v_count  integer;
  v_text   text;
begin

  -- R-PG1: funcao nao existe mais
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'fn_protect_prescricao_item_after_dispense';
  if v_count > 0 then
    raise exception 'pp3c1-rollback [R-PG1]: fn_protect_prescricao_item_after_dispense '
      'ainda existe apos drop. Rollback incompleto.';
  end if;

  -- R-PG2: trigger nao existe mais
  select count(*) into v_count
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_protect_prescricao_item_post_dispense';
  if v_count > 0 then
    raise exception 'pp3c1-rollback [R-PG2]: trigger trg_protect_prescricao_item_post_dispense '
      'ainda existe apos drop. Rollback incompleto.';
  end if;

  -- R-PG3: indice nao existe mais
  select count(*) into v_count
  from pg_class     ic
  join pg_namespace n on n.oid = ic.relnamespace
  where n.nspname = 'public'
    and ic.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
    and ic.relkind = 'i';
  if v_count > 0 then
    raise exception 'pp3c1-rollback [R-PG3]: idx_estoque_movimentacoes_prescricao_item_saida '
      'ainda existe apos drop. Rollback incompleto.';
  end if;

  -- R-PG4: policies baseline de prescricao_itens intactas (3 obrigatorias)
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
    raise exception 'pp3c1-rollback [R-PG4]: % de 3 policies baseline de prescricao_itens '
      'encontradas -- alguma foi afetada pelo rollback.', v_count;
  end if;

  -- R-PG5: audit trigger de prescricao_itens intacto (existencia)
  select count(*) into v_count
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_audit_prescricao_itens';
  if v_count = 0 then
    raise exception 'pp3c1-rollback [R-PG5]: trg_audit_prescricao_itens ausente apos rollback. '
      'Auditabilidade comprometida -- investigar imediatamente.';
  end if;

  -- R-PG6: audit trigger ainda aponta para fn_audit_trigger apos rollback (tgfoid)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'prescricao_itens'
    and t.tgname  = 'trg_audit_prescricao_itens';
  if v_text is null or v_text <> 'fn_audit_trigger' then
    raise exception 'pp3c1-rollback [R-PG6]: trg_audit_prescricao_itens aponta para % '
      '(esperado fn_audit_trigger) apos rollback. Auditabilidade comprometida.',
      coalesce(v_text, 'NULL');
  end if;

  -- R-PG7: estoque block ainda aponta para fn_block_update_delete apos rollback (tgfoid)
  select p.proname into v_text
  from pg_trigger   t
  join pg_class     c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc      p on p.oid = t.tgfoid
  where n.nspname = 'public'
    and c.relname = 'estoque_movimentacoes'
    and t.tgname  = 'trg_block_update_estoque_movimentacoes';
  if v_text is null or v_text <> 'fn_block_update_delete' then
    raise exception 'pp3c1-rollback [R-PG7]: trg_block_update_estoque_movimentacoes aponta para % '
      '(esperado fn_block_update_delete) apos rollback. Protecao de estoque comprometida.',
      coalesce(v_text, 'NULL');
  end if;

  raise notice 'pp3c1-rollback guardiao pos: R-PG1..R-PG7 passaram. '
    'Rollback PP3-C.1 concluido com sucesso. '
    'AVISO: prescricao_itens voltou a ter campos farmacologicos mutaveis '
    'apos dispensacao -- vulnerabilidade SEC-15 restaurada.';

end $rpostguard$;

-- =========================================================================
-- FIM DO ROLLBACK 20260810000001
--
-- Removido:  trg_protect_prescricao_item_post_dispense (BEFORE UPDATE em prescricao_itens)
-- Removido:  fn_protect_prescricao_item_after_dispense() (SECURITY DEFINER, owner=postgres)
-- Removido:  idx_estoque_movimentacoes_prescricao_item_saida (indice parcial)
-- Intacto:   trg_audit_prescricao_itens -> fn_audit_trigger
-- Intacto:   trg_block_update_estoque_movimentacoes -> fn_block_update_delete
-- Intacto:   trg_updated_at_prescricao_itens -> fn_set_updated_at
-- Intacto:   3 policies baseline de prescricao_itens
-- Intacto:   grants, schema, dados
-- EFEITO:    SEC-15 vulnerabilidade restaurada -- campos farmacologicos mutaveis pos-dispensa
-- =========================================================================
