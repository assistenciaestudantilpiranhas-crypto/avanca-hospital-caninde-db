-- Migration: 20260809000001_pp3b2_patient_clinical_permissions_and_rls
-- GSI ONE | PP3-B.2 — Permissoes clinicas de leitura e correcao das policies SELECT
--                     das 4 tabelas de dados persistentes do paciente.
--
-- Contexto:
--   As 4 tabelas abaixo possuiam policy SELECT baseada somente em
--   is_linked_user(), concedendo leitura ampla a qualquer usuario com perfil
--   ativo, independente do perfil ou relacao clinica. Esta migration:
--     (a) cria 4 permissoes especificas de leitura e 2 de escrita ausentes;
--     (b) vincula cada permissao de leitura somente aos perfis aprovados;
--     (c) substitui as 4 policies SELECT por predicados baseados em
--         has_permission(*.visualizar), com filtro ativo=true e verificacao
--         de paciente pai ativo (pacientes.deleted_at IS NULL);
--     (d) corrige as policies INSERT/UPDATE de paciente_medicamentos_continuos
--         e paciente_alertas_clinicos, que usavam proxy incorreto de
--         paciente.alergia.registrar OR paciente.comorbidade.registrar.
--
-- Tabelas alteradas:
--   SELECT policies recriadas (4):
--     paciente_alergias               — paciente_alergias_select_linked
--     paciente_comorbidades           — paciente_comorbidades_select_linked
--     paciente_medicamentos_continuos — paciente_medicamentos_continuos_select_linked
--     paciente_alertas_clinicos       — paciente_alertas_clinicos_select_linked
--   INSERT/UPDATE policies recriadas (2 tabelas x 2 policies = 4):
--     paciente_medicamentos_continuos — _insert_clinico, _update_clinico
--     paciente_alertas_clinicos       — _insert_clinico, _update_clinico
--   Policies preservadas integralmente:
--     paciente_alergias      — _insert_clinico, _update_clinico, _delete_admin_only
--     paciente_comorbidades  — _insert_clinico, _update_clinico, _delete_admin_only
--     (e DELETE das 4 tabelas)
--
-- O que esta migration NAO faz:
--   - Nao altera tabelas, colunas, sequences, triggers ou funcoes.
--   - Nao altera grants de nenhuma tabela.
--   - Nao altera as 12 policies PP3-B.1 (deleted_at Classe B).
--   - Nao altera as 3 policies PP2-F (Classe A).
--   - Nao altera Auth, audit_log nem views gerenciais.
--   - Nao altera dados clinicos (nenhum INSERT/UPDATE/DELETE/TRUNCATE).
--   - Nao usa is_linked_user() em nenhuma nova policy SELECT.
--   - Nao usa permissao de escrita como proxy de leitura.
--   - Nao aplica no ambiente remoto sem autorizacao expressa.
--
-- Mecanismo de soft delete das tabelas filhas:
--   As 4 tabelas usam `ativo boolean` (nao deleted_at) como mecanismo proprio
--   de desativacao de registro. O filtro correto para perfis operacionais e':
--     ativo = true
--   O pai (pacientes) usa deleted_at, verificado via EXISTS.
--   Admin e Auditoria ficam fora desses filtros (acesso irrestrito).
--
-- Permissoes criadas (6):
--   Leitura:
--     paciente.alergia.visualizar
--     paciente.comorbidade.visualizar
--     paciente.medicamento_continuo.visualizar
--     paciente.alerta_clinico.visualizar
--   Escrita (ausentes; corrigem proxy anterior):
--     paciente.medicamento_continuo.registrar
--     paciente.alerta_clinico.registrar
--
-- Matriz de leitura aprovada:
--   Permissao                           | TEN | ENF | MED | FAR
--   paciente.alergia.visualizar         | SIM | SIM | SIM | SIM
--   paciente.comorbidade.visualizar     | SIM | SIM | SIM | NAO
--   paciente.medicamento_continuo.viz.  | SIM | SIM | SIM | SIM
--   paciente.alerta_clinico.viz.        | SIM | SIM | SIM | SIM
--   Legenda: TEN=Tecnico em Enfermagem, ENF=Enfermeiro, MED=Medico, FAR=Farmacia
--
-- Rollback:
--   supabase/rollback/20260809000001_pp3b2_patient_clinical_permissions_and_rls_rollback.sql
--
-- Validacao:
--   npx.cmd vitest run tests/security/pp3b2-patient-clinical-permissions.test.js
--   npx.cmd vitest run tests/security

-- =========================================================================
-- PARTE B2-0: GUARDIAO DE SCHEMA DRIFT — PP3-B.2
--
-- Valida, ANTES do primeiro DROP POLICY:
--   G-1.  Tabela existe em public.
--   G-2.  Coluna `ativo` existe.
--   G-3.  Coluna `paciente_id` existe.
--   G-4.  Coluna `deleted_at` existe em public.pacientes (pai).
--   G-5.  SELECT policy existe pelo nome exato.
--   G-6.  Comando da SELECT policy = SELECT.
--   G-7.  Roles da SELECT policy = {authenticated}.
--   G-8.  USING da SELECT policy (normalizado) == baseline documentado.
--   G-9.  INSERT policy existe pelo nome exato (tabelas de medicamentos/alertas).
--   G-10. UPDATE policy existe pelo nome exato (tabelas de medicamentos/alertas).
--   G-11. INSERT WITH CHECK contem a string-proxy que sera substituida.
--   G-12. Perfis esperados existem em perfis_acesso.
--   G-13. Permissoes novas ainda nao existem (idempotente com ON CONFLICT DO NOTHING).
-- =========================================================================

do $guard$
declare
  -- Tabelas alvo com seus baselines (indice 1..4)
  v_tbls      text[] := array[
    'paciente_alergias',
    'paciente_comorbidades',
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos'
  ];
  v_sel_pols  text[] := array[
    'paciente_alergias_select_linked',
    'paciente_comorbidades_select_linked',
    'paciente_medicamentos_continuos_select_linked',
    'paciente_alertas_clinicos_select_linked'
  ];
  -- Baseline SELECT USING (normalizado: lower, sem public., sem ::cast, espaco unico)
  v_sel_bases text[] := array[
    'is_linked_user()',
    'is_linked_user()',
    'is_linked_user()',
    'is_linked_user()'
  ];

  -- Tabelas que tambem tem INSERT/UPDATE a corrigir (subset: indices 3 e 4)
  v_dml_tbls text[] := array[
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos'
  ];
  v_ins_pols text[] := array[
    'paciente_medicamentos_continuos_insert_clinico',
    'paciente_alertas_clinicos_insert_clinico'
  ];
  v_upd_pols text[] := array[
    'paciente_medicamentos_continuos_update_clinico',
    'paciente_alertas_clinicos_update_clinico'
  ];
  -- Baselines normalizados do WITH CHECK das INSERT (origem: 20260623100012, loop proxy)
  v_dml_bases_wc text[] := array[
    '(has_permission(''paciente.alergia.registrar'') or has_permission(''paciente.comorbidade.registrar'') or is_admin())',
    '(has_permission(''paciente.alergia.registrar'') or has_permission(''paciente.comorbidade.registrar'') or is_admin())'
  ];
  -- Baselines normalizados do USING das UPDATE (identicos ao WITH CHECK no baseline)
  v_dml_bases_us text[] := array[
    '(has_permission(''paciente.alergia.registrar'') or has_permission(''paciente.comorbidade.registrar'') or is_admin())',
    '(has_permission(''paciente.alergia.registrar'') or has_permission(''paciente.comorbidade.registrar'') or is_admin())'
  ];

  -- Perfis esperados
  v_perfis text[] := array[
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Farmácia',
    'Administração',
    'Auditoria'
  ];

  -- Novas permissoes (para confirmar ausencia antes — idempotencia via ON CONFLICT)
  v_new_perms text[] := array[
    'paciente.alergia.visualizar',
    'paciente.comorbidade.visualizar',
    'paciente.medicamento_continuo.visualizar',
    'paciente.alerta_clinico.visualizar',
    'paciente.medicamento_continuo.registrar',
    'paciente.alerta_clinico.registrar'
  ];

  v_i             integer;
  v_tbl           text;
  v_pol           text;
  v_base          text;
  v_exists_tbl    boolean;
  v_exists_col    boolean;
  v_exists_pai    boolean;
  v_actual_cmd    text;
  v_actual_roles  name[];
  v_actual_using  text;
  v_norm_actual   text;
  v_norm_expect   text;
  v_withcheck      text;
  v_norm_withcheck text;
  v_perfil_nome    text;
  v_perm_chave     text;
  v_perm_modulo    text;
  v_count          integer;
begin

  -- -----------------------------------------------------------------------
  -- G-4: pacientes.deleted_at existe (pai de todas as 4 tabelas)
  -- -----------------------------------------------------------------------
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'pacientes'
      and column_name  = 'deleted_at'
  ) into v_exists_pai;

  if not v_exists_pai then
    raise exception
      'pp3b2_schema_drift: coluna deleted_at ausente em public.pacientes. '
      'Aplicar migration 20260709170000 antes desta.';
  end if;

  -- -----------------------------------------------------------------------
  -- G-1..8: validacao das 4 tabelas (SELECT policies)
  -- -----------------------------------------------------------------------
  for v_i in 1..array_length(v_tbls, 1) loop
    v_tbl  := v_tbls[v_i];
    v_pol  := v_sel_pols[v_i];
    v_base := v_sel_bases[v_i];

    -- G-1: tabela existe
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public'
        and table_name   = v_tbl
        and table_type   = 'BASE TABLE'
    ) into v_exists_tbl;

    if not v_exists_tbl then
      raise exception
        'pp3b2_schema_drift [%]: tabela ausente em public. '
        'Verificar migrations de estrutura.', v_tbl;
    end if;

    -- G-2: coluna ativo existe
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = v_tbl
        and column_name  = 'ativo'
    ) into v_exists_col;

    if not v_exists_col then
      raise exception
        'pp3b2_schema_drift [%]: coluna ativo ausente. '
        'A tabela nao usa o mecanismo esperado de exclusao logica.', v_tbl;
    end if;

    -- G-3: coluna paciente_id existe
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = v_tbl
        and column_name  = 'paciente_id'
    ) into v_exists_col;

    if not v_exists_col then
      raise exception
        'pp3b2_schema_drift [%]: coluna paciente_id ausente.', v_tbl;
    end if;

    -- G-5..8: SELECT policy
    select p.cmd,
           p.roles,
           p.qual
    into   v_actual_cmd,
           v_actual_roles,
           v_actual_using
    from   pg_policies p
    where  p.schemaname = 'public'
      and  p.tablename  = v_tbl
      and  p.policyname = v_pol;

    if not found then
      raise exception
        'pp3b2_schema_drift [%.%]: SELECT policy ausente no catalogo. '
        'A policy foi renomeada ou removida desde o baseline PP3-B.2.',
        v_tbl, v_pol;
    end if;

    if v_actual_cmd <> 'SELECT' then
      raise exception
        'pp3b2_schema_drift [%.%]: comando "%" inesperado (esperado: SELECT).',
        v_tbl, v_pol, v_actual_cmd;
    end if;

    if v_actual_roles <> array['authenticated'::name] then
      raise exception
        'pp3b2_schema_drift [%.%]: roles "%" inesperados (esperado: {authenticated}).',
        v_tbl, v_pol, v_actual_roles::text;
    end if;

    -- Normalizacao: lower -> remove ::cast -> remove public. -> colapsa whitespace -> trim
    v_norm_actual := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(v_actual_using), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    v_norm_expect := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(v_base), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    if v_norm_actual <> v_norm_expect then
      raise exception
        'pp3b2_schema_drift [%.%]: SCHEMA DRIFT detectado na SELECT policy. '
        'esperado (norm)=[%] encontrado (norm)=[%]. '
        'A policy foi alterada apos o baseline PP3-B.2. Revisar antes de aplicar.',
        v_tbl, v_pol, v_norm_expect, v_norm_actual;
    end if;

  end loop;

  -- -----------------------------------------------------------------------
  -- G-9..11: validacao completa das INSERT/UPDATE das tabelas DML
  --   G-9:  INSERT policy — existe, cmd=INSERT, roles={authenticated},
  --          WITH CHECK normalizado == baseline documentado
  --   G-10: UPDATE policy — existe, cmd=UPDATE, roles={authenticated},
  --          USING normalizado == baseline, WITH CHECK normalizado == baseline
  -- -----------------------------------------------------------------------
  for v_i in 1..array_length(v_dml_tbls, 1) loop
    v_tbl := v_dml_tbls[v_i];

    -- G-9: INSERT policy
    v_pol := v_ins_pols[v_i];
    select p.cmd,
           p.roles,
           p.with_check
    into   v_actual_cmd,
           v_actual_roles,
           v_withcheck
    from   pg_policies p
    where  p.schemaname = 'public'
      and  p.tablename  = v_tbl
      and  p.policyname = v_pol;

    if not found then
      raise exception
        'pp3b2_schema_drift [%.%]: INSERT policy ausente no catalogo.',
        v_tbl, v_pol;
    end if;

    if v_actual_cmd <> 'INSERT' then
      raise exception
        'pp3b2_schema_drift [%.%]: cmd "%" inesperado na INSERT policy (esperado: INSERT).',
        v_tbl, v_pol, v_actual_cmd;
    end if;

    if v_actual_roles <> array['authenticated'::name] then
      raise exception
        'pp3b2_schema_drift [%.%]: roles "%" inesperados na INSERT policy (esperado: {authenticated}).',
        v_tbl, v_pol, v_actual_roles::text;
    end if;

    v_norm_withcheck := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(v_withcheck, '')), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    v_norm_expect := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(v_dml_bases_wc[v_i]), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    if v_norm_withcheck <> v_norm_expect then
      raise exception
        'pp3b2_schema_drift [%.%]: SCHEMA DRIFT na INSERT policy WITH CHECK. '
        'esperado (norm)=[%] encontrado (norm)=[%]. '
        'A policy foi alterada apos o baseline PP3-B.2.',
        v_tbl, v_pol, v_norm_expect, v_norm_withcheck;
    end if;

    -- G-10: UPDATE policy
    v_pol := v_upd_pols[v_i];
    select p.cmd,
           p.roles,
           p.qual,
           p.with_check
    into   v_actual_cmd,
           v_actual_roles,
           v_actual_using,
           v_withcheck
    from   pg_policies p
    where  p.schemaname = 'public'
      and  p.tablename  = v_tbl
      and  p.policyname = v_pol;

    if not found then
      raise exception
        'pp3b2_schema_drift [%.%]: UPDATE policy ausente no catalogo.',
        v_tbl, v_pol;
    end if;

    if v_actual_cmd <> 'UPDATE' then
      raise exception
        'pp3b2_schema_drift [%.%]: cmd "%" inesperado na UPDATE policy (esperado: UPDATE).',
        v_tbl, v_pol, v_actual_cmd;
    end if;

    if v_actual_roles <> array['authenticated'::name] then
      raise exception
        'pp3b2_schema_drift [%.%]: roles "%" inesperados na UPDATE policy (esperado: {authenticated}).',
        v_tbl, v_pol, v_actual_roles::text;
    end if;

    v_norm_actual := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(v_actual_using, '')), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    v_norm_expect := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(v_dml_bases_us[v_i]), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    if v_norm_actual <> v_norm_expect then
      raise exception
        'pp3b2_schema_drift [%.%]: SCHEMA DRIFT na UPDATE policy USING. '
        'esperado (norm)=[%] encontrado (norm)=[%].',
        v_tbl, v_pol, v_norm_expect, v_norm_actual;
    end if;

    v_norm_withcheck := trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(v_withcheck, '')), '::[a-z_.]+', '', 'g'),
        'public\.', '', 'g'
      ),
      '\s+', ' ', 'g'
    ));

    if v_norm_withcheck <> v_norm_expect then
      raise exception
        'pp3b2_schema_drift [%.%]: SCHEMA DRIFT na UPDATE policy WITH CHECK. '
        'esperado (norm)=[%] encontrado (norm)=[%].',
        v_tbl, v_pol, v_norm_expect, v_norm_withcheck;
    end if;

  end loop;

  -- -----------------------------------------------------------------------
  -- G-12: perfis esperados existem — exatamente uma vez
  -- -----------------------------------------------------------------------
  foreach v_perfil_nome in array v_perfis loop
    select count(*) into v_count
    from public.perfis_acesso
    where nome = v_perfil_nome;

    if v_count = 0 then
      raise exception
        'pp3b2_schema_drift: perfil "%" nao encontrado em perfis_acesso. '
        'Verificar migrations de renomeacao/criacao de perfis.',
        v_perfil_nome;
    end if;

    if v_count > 1 then
      raise exception
        'pp3b2_schema_drift: perfil "%" encontrado % vezes em perfis_acesso (esperado: exatamente 1). '
        'Duplicata detectada — revisar integridade da tabela.',
        v_perfil_nome, v_count;
    end if;
  end loop;

  -- -----------------------------------------------------------------------
  -- G-13: permissoes novas — se preexistem, modulo deve ser identico
  --   ON CONFLICT DO NOTHING na parte B2-a garante idempotencia para
  --   permissoes identicas; esta guarda rejeita preexistentes com metadata
  --   incompativel (ex.: mesmo chave em modulo diferente).
  -- -----------------------------------------------------------------------
  for v_i in 1..array_length(v_new_perms, 1) loop
    v_perm_chave := v_new_perms[v_i];

    select modulo into v_perm_modulo
    from public.permissoes
    where chave = v_perm_chave;

    if found and v_perm_modulo <> 'Pacientes' then
      raise exception
        'pp3b2_schema_drift [perm=%]: permissao preexistente com modulo "%" incompativel '
        '(esperado: Pacientes). Conflito de metadata — revisar antes de aplicar.',
        v_perm_chave, v_perm_modulo;
    end if;
  end loop;

  raise notice 'pp3b2_schema_drift: todas as validacoes passaram (G1..G13).';

end $guard$;

-- =========================================================================
-- PARTE B2-a: CRIAR AS 6 PERMISSOES
-- =========================================================================
-- ON CONFLICT (chave) DO NOTHING garante idempotencia em re-execucoes.

insert into public.permissoes (chave, modulo, descricao)
values
  (
    'paciente.alergia.visualizar',
    'Pacientes',
    'Visualizar alergias registradas do paciente. '
    'Necessario em triagem, consulta, enfermagem e dispensacao farmaceutica (farmacovigilancia).'
  ),
  (
    'paciente.comorbidade.visualizar',
    'Pacientes',
    'Visualizar comorbidades registradas do paciente. '
    'Necessario em triagem, consulta e enfermagem para contexto clinico do cuidado.'
  ),
  (
    'paciente.medicamento_continuo.visualizar',
    'Pacientes',
    'Visualizar medicamentos de uso continuo do paciente. '
    'Necessario em triagem, consulta, enfermagem e dispensacao (verificacao de interacao medicamentosa).'
  ),
  (
    'paciente.alerta_clinico.visualizar',
    'Pacientes',
    'Visualizar alertas clinicos do paciente (ex.: gestacao, tratamento em curso, uso recente de medicacao). '
    'Necessario em triagem, consulta, enfermagem e dispensacao farmaceutica.'
  ),
  (
    'paciente.medicamento_continuo.registrar',
    'Pacientes',
    'Registrar ou atualizar medicamento de uso continuo do paciente. '
    'Corrige proxy anterior (paciente.alergia.registrar) que nao refletia o escopo real.'
  ),
  (
    'paciente.alerta_clinico.registrar',
    'Pacientes',
    'Registrar ou atualizar alerta clinico do paciente. '
    'Corrige proxy anterior (paciente.alergia.registrar) que nao refletia o escopo real.'
  )
on conflict (chave) do nothing;

-- =========================================================================
-- PARTE B2-b: VINCULOS DE LEITURA (perfil_permissao)
-- =========================================================================

-- -------------------------------------------------------------------------
-- paciente.alergia.visualizar
-- Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.alergia.visualizar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Farmácia'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- -------------------------------------------------------------------------
-- paciente.comorbidade.visualizar
-- Perfis: Tecnico em Enfermagem, Enfermeiro, Medico
-- Farmacia: NAO recebe (decidido institucionalmente — sem finalidade direta na dispensacao basica)
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.comorbidade.visualizar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- -------------------------------------------------------------------------
-- paciente.medicamento_continuo.visualizar
-- Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia
-- Farmacia: SIM — verificacao de interacao medicamentosa antes da dispensacao
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.medicamento_continuo.visualizar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Farmácia'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- -------------------------------------------------------------------------
-- paciente.alerta_clinico.visualizar
-- Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.alerta_clinico.visualizar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Farmácia'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- =========================================================================
-- PARTE B2-c: VINCULOS DE ESCRITA (perfil_permissao)
-- =========================================================================

-- -------------------------------------------------------------------------
-- paciente.medicamento_continuo.registrar
-- Perfis: Tecnico em Enfermagem (registra na triagem), Enfermeiro, Medico
-- Farmacia: NAO — farmacêutico dispensa, nao registra historico clinico persistente
-- Recepcao: NAO — fora do escopo clinico
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.medicamento_continuo.registrar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- -------------------------------------------------------------------------
-- paciente.alerta_clinico.registrar
-- Perfis: Tecnico em Enfermagem (registra na triagem), Enfermeiro, Medico
-- -------------------------------------------------------------------------
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.alerta_clinico.registrar'
  and pa.nome in (
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- =========================================================================
-- PARTE B2-d: NOVAS SELECT POLICIES (4 tabelas)
--
-- Padrao uniforme:
--   (
--     has_permission('<tabela>.visualizar')
--     AND ativo = true
--     AND EXISTS (
--       SELECT 1 FROM public.pacientes p
--       WHERE p.id = <tabela>.paciente_id
--         AND p.deleted_at IS NULL
--     )
--   )
--   OR public.is_admin()
--   OR public.is_auditoria()
--
-- Admin e Auditoria: acesso irrestrito, inclusive a ativo=false e filhos
-- de pacientes excluidos, para rastreabilidade e auditoria forense.
-- =========================================================================

-- -------------------------------------------------------------------------
-- B2-d.1 — paciente_alergias
-- Antes: paciente_alergias_select_linked — is_linked_user()
-- Depois: paciente_alergias_select_clinico — has_permission('paciente.alergia.visualizar')
--         + ativo = true + paciente pai ativo
-- Perfis com acesso: TEN, Enfermeiro, Medico, Farmacia, Admin, Auditoria
-- -------------------------------------------------------------------------
drop policy if exists paciente_alergias_select_linked  on public.paciente_alergias;
drop policy if exists paciente_alergias_select_clinico on public.paciente_alergias;

create policy paciente_alergias_select_clinico on public.paciente_alergias
  for select to authenticated
  using (
    (
      public.has_permission('paciente.alergia.visualizar')
      and ativo = true
      and exists (
        select 1
        from public.pacientes p
        where p.id = paciente_alergias.paciente_id
          and p.deleted_at is null
      )
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy paciente_alergias_select_clinico on public.paciente_alergias is
  'PP3-B.2 (20260809000001): leitura restrita a perfis com paciente.alergia.visualizar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia. '
  'Ramo operacional exige ativo=true e paciente pai com deleted_at IS NULL. '
  'Admin e Auditoria com acesso irrestrito (rastreabilidade). '
  'Substitui paciente_alergias_select_linked (is_linked_user()).';

-- -------------------------------------------------------------------------
-- B2-d.2 — paciente_comorbidades
-- Antes: paciente_comorbidades_select_linked — is_linked_user()
-- Depois: paciente_comorbidades_select_clinico — has_permission('paciente.comorbidade.visualizar')
--         + ativo = true + paciente pai ativo
-- Perfis com acesso: TEN, Enfermeiro, Medico, Admin, Auditoria
-- Farmacia: NAO recebe (comorbidade nao esta no escopo de dispensacao basica)
-- -------------------------------------------------------------------------
drop policy if exists paciente_comorbidades_select_linked  on public.paciente_comorbidades;
drop policy if exists paciente_comorbidades_select_clinico on public.paciente_comorbidades;

create policy paciente_comorbidades_select_clinico on public.paciente_comorbidades
  for select to authenticated
  using (
    (
      public.has_permission('paciente.comorbidade.visualizar')
      and ativo = true
      and exists (
        select 1
        from public.pacientes p
        where p.id = paciente_comorbidades.paciente_id
          and p.deleted_at is null
      )
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy paciente_comorbidades_select_clinico on public.paciente_comorbidades is
  'PP3-B.2 (20260809000001): leitura restrita a perfis com paciente.comorbidade.visualizar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico. '
  'Farmacia: nao recebe (sem finalidade direta na dispensacao basica — decisao institucional). '
  'Ramo operacional exige ativo=true e paciente pai com deleted_at IS NULL. '
  'Admin e Auditoria com acesso irrestrito (rastreabilidade). '
  'Substitui paciente_comorbidades_select_linked (is_linked_user()).';

-- -------------------------------------------------------------------------
-- B2-d.3 — paciente_medicamentos_continuos
-- Antes: paciente_medicamentos_continuos_select_linked — is_linked_user()
-- Depois: paciente_medicamentos_continuos_select_clinico
--         has_permission('paciente.medicamento_continuo.visualizar')
--         + ativo = true + paciente pai ativo
-- Perfis com acesso: TEN, Enfermeiro, Medico, Farmacia, Admin, Auditoria
-- -------------------------------------------------------------------------
drop policy if exists paciente_medicamentos_continuos_select_linked  on public.paciente_medicamentos_continuos;
drop policy if exists paciente_medicamentos_continuos_select_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_select_clinico on public.paciente_medicamentos_continuos
  for select to authenticated
  using (
    (
      public.has_permission('paciente.medicamento_continuo.visualizar')
      and ativo = true
      and exists (
        select 1
        from public.pacientes p
        where p.id = paciente_medicamentos_continuos.paciente_id
          and p.deleted_at is null
      )
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy paciente_medicamentos_continuos_select_clinico on public.paciente_medicamentos_continuos is
  'PP3-B.2 (20260809000001): leitura restrita a perfis com paciente.medicamento_continuo.visualizar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia. '
  'Farmacia: SIM — verificacao de interacao medicamentosa antes de dispensar. '
  'Ramo operacional exige ativo=true e paciente pai com deleted_at IS NULL. '
  'Admin e Auditoria com acesso irrestrito (rastreabilidade). '
  'Substitui paciente_medicamentos_continuos_select_linked (is_linked_user()).';

-- -------------------------------------------------------------------------
-- B2-d.4 — paciente_alertas_clinicos
-- Antes: paciente_alertas_clinicos_select_linked — is_linked_user()
-- Depois: paciente_alertas_clinicos_select_clinico
--         has_permission('paciente.alerta_clinico.visualizar')
--         + ativo = true + paciente pai ativo
-- Perfis com acesso: TEN, Enfermeiro, Medico, Farmacia, Admin, Auditoria
-- -------------------------------------------------------------------------
drop policy if exists paciente_alertas_clinicos_select_linked  on public.paciente_alertas_clinicos;
drop policy if exists paciente_alertas_clinicos_select_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_select_clinico on public.paciente_alertas_clinicos
  for select to authenticated
  using (
    (
      public.has_permission('paciente.alerta_clinico.visualizar')
      and ativo = true
      and exists (
        select 1
        from public.pacientes p
        where p.id = paciente_alertas_clinicos.paciente_id
          and p.deleted_at is null
      )
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy paciente_alertas_clinicos_select_clinico on public.paciente_alertas_clinicos is
  'PP3-B.2 (20260809000001): leitura restrita a perfis com paciente.alerta_clinico.visualizar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico, Farmacia. '
  'Ramo operacional exige ativo=true e paciente pai com deleted_at IS NULL. '
  'Admin e Auditoria com acesso irrestrito (rastreabilidade). '
  'Substitui paciente_alertas_clinicos_select_linked (is_linked_user()).';

-- =========================================================================
-- PARTE B2-e: CORRECAO DAS INSERT/UPDATE DE MEDICAMENTOS E ALERTAS
--
-- Antes (migration 20260623100012, loop para todas as 4 tabelas):
--   WITH CHECK / USING:
--     has_permission('paciente.alergia.registrar')
--     OR has_permission('paciente.comorbidade.registrar')
--     OR is_admin()
--
-- Depois (somente para medicamentos_continuos e alertas_clinicos):
--   WITH CHECK / USING:
--     has_permission('paciente.medicamento_continuo.registrar')   [ou alerta_clinico]
--     OR is_admin()
--
-- Preservado (alergias e comorbidades: sem alteracao):
--   paciente_alergias_insert_clinico        — inalterada
--   paciente_alergias_update_clinico        — inalterada
--   paciente_comorbidades_insert_clinico    — inalterada
--   paciente_comorbidades_update_clinico    — inalterada
-- =========================================================================

-- -------------------------------------------------------------------------
-- B2-e.1 — paciente_medicamentos_continuos: INSERT
-- -------------------------------------------------------------------------
drop policy if exists paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos
  for insert to authenticated
  with check (
    public.has_permission('paciente.medicamento_continuo.registrar')
    or public.is_admin()
  );

comment on policy paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos is
  'PP3-B.2 (20260809000001): escrita restrita a perfis com paciente.medicamento_continuo.registrar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico. '
  'Corrige proxy anterior (paciente.alergia.registrar OR paciente.comorbidade.registrar) '
  'que nao refletia o escopo real desta tabela.';

-- -------------------------------------------------------------------------
-- B2-e.2 — paciente_medicamentos_continuos: UPDATE
-- -------------------------------------------------------------------------
drop policy if exists paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos
  for update to authenticated
  using (
    public.has_permission('paciente.medicamento_continuo.registrar')
    or public.is_admin()
  )
  with check (
    public.has_permission('paciente.medicamento_continuo.registrar')
    or public.is_admin()
  );

comment on policy paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos is
  'PP3-B.2 (20260809000001): atualizacao restrita a perfis com paciente.medicamento_continuo.registrar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico. '
  'Corrige proxy anterior (paciente.alergia.registrar OR paciente.comorbidade.registrar).';

-- -------------------------------------------------------------------------
-- B2-e.3 — paciente_alertas_clinicos: INSERT
-- -------------------------------------------------------------------------
drop policy if exists paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos
  for insert to authenticated
  with check (
    public.has_permission('paciente.alerta_clinico.registrar')
    or public.is_admin()
  );

comment on policy paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos is
  'PP3-B.2 (20260809000001): escrita restrita a perfis com paciente.alerta_clinico.registrar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico. '
  'Corrige proxy anterior (paciente.alergia.registrar OR paciente.comorbidade.registrar) '
  'que nao refletia o escopo real desta tabela.';

-- -------------------------------------------------------------------------
-- B2-e.4 — paciente_alertas_clinicos: UPDATE
-- -------------------------------------------------------------------------
drop policy if exists paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos
  for update to authenticated
  using (
    public.has_permission('paciente.alerta_clinico.registrar')
    or public.is_admin()
  )
  with check (
    public.has_permission('paciente.alerta_clinico.registrar')
    or public.is_admin()
  );

comment on policy paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos is
  'PP3-B.2 (20260809000001): atualizacao restrita a perfis com paciente.alerta_clinico.registrar. '
  'Perfis: Tecnico em Enfermagem, Enfermeiro, Medico. '
  'Corrige proxy anterior (paciente.alergia.registrar OR paciente.comorbidade.registrar).';

-- =========================================================================
-- FIM DA MIGRATION 20260809000001
-- Permissoes criadas: 6 (4 leitura + 2 escrita)
-- Vinculos criados: 16 (4+3+4+4 leitura + 3+3 escrita)
-- SELECT policies recriadas: 4
-- INSERT/UPDATE policies recriadas: 4 (2 tabelas x 2 tipos)
-- SELECT policies preservadas: 0 adicionais (alergias/comorbidades INSERT/UPDATE inalteradas)
-- Tabelas estruturalmente alteradas: nenhuma
-- Grants alterados: nenhum
-- Dados alterados: nenhum
-- Ambiente remoto: NAO aplicado
-- Rollback: supabase/rollback/20260809000001_pp3b2_patient_clinical_permissions_and_rls_rollback.sql
-- Validacao: npx.cmd vitest run tests/security/pp3b2-patient-clinical-permissions.test.js
-- =========================================================================
