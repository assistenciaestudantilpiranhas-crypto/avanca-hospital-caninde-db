-- Migration: 20260807000001_rls_phase_b1_soft_delete_select_filter
-- GSI ONE | PP3-B.1 — Filtro de exclusao logica nas policies SELECT das 12 tabelas Classe B
--
-- Problema corrigido:
--   As 12 tabelas abaixo possuem campos deleted_at / deleted_by / delete_reason
--   (adicionados pela migration 20260709170000), mas suas policies SELECT nao
--   filtravam registros com deleted_at IS NOT NULL.
--   Resultado: perfis operacionais continuavam visualizando registros logicamente
--   excluidos, violando o principio de exclusao logica documentado no PP3-A.
--
-- O que esta migration faz:
--   Recria as 12 policies SELECT das tabelas Classe B, adicionando o filtro
--   deleted_at IS NULL ao ramo operacional (has_permission). Admin e Auditoria
--   mantem acesso irrestrito, inclusive a registros excluidos — necessario para
--   rastreabilidade e auditoria forense (conforme design aprovado no PP2-F).
--
-- Padrão uniforme aplicado (identico ao PP2-F para as 3 tabelas Classe A):
--   (
--     (has_permission('...') [OR has_permission('...')] AND deleted_at IS NULL)
--     OR public.is_admin()
--     OR public.is_auditoria()
--   )
--
-- O que esta migration NAO faz:
--   - Nao altera tabelas, colunas, sequences, triggers ou funcoes.
--   - Nao altera grants de nenhuma tabela.
--   - Nao altera policies de INSERT, UPDATE ou DELETE.
--   - Nao altera as 4 tabelas Classe B com predicado is_linked_user()
--     (paciente_alergias, paciente_comorbidades, paciente_medicamentos_continuos,
--     paciente_alertas_clinicos) — escopo de subetapa separada.
--   - Nao altera as 3 tabelas Classe A ja corrigidas no PP2-F
--     (pacientes, atendimentos, consultas).
--   - Nao altera dados (nenhum INSERT, UPDATE, DELETE, TRUNCATE).
--   - Nao aplica no ambiente remoto sem autorizacao expressa.
--
-- Tabelas corrigidas (12):
--   Fluxo:      chamadas
--   Clinico:    triagens, evolucoes_enfermagem, observacoes, reavaliacoes_observacao,
--               estabilizacoes, checklist_estabilizacao_itens
--   Diagnostico: exames
--   Farmacia:   prescricoes, prescricao_itens
--   Regulacao:  transferencias, checklist_transferencia_itens
--
-- Dependencias:
--   20260709170000_block_delete_assistencial_audit_append_only.sql
--     (campos deleted_at nas 12 tabelas — pre-condicao verificada abaixo)
--   20260722100029_rls_select_phase_a_positive_permissions.sql
--     (policies SELECT originais das 12 tabelas — substituidas por DROP/CREATE abaixo)
--
-- Rollback:
--   supabase/rollback/20260807000001_rls_phase_b1_soft_delete_select_filter_rollback.sql
--
-- Validacao:
--   npx.cmd vitest run tests/security/pp3b1-soft-delete-select-filter.test.js
--   npx.cmd vitest run tests/security

-- =========================================================================
-- GUARDIAO DE SCHEMA DRIFT — PP3-B.1
--
-- Valida, para cada uma das 12 policies, ANTES do primeiro DROP POLICY:
--   1. existencia da tabela em public
--   2. existencia da coluna deleted_at
--   3. existencia da policy pelo nome exato
--   4. comando da policy = SELECT
--   5. roles da policy = {authenticated}
--   6. expressao USING normalizada == baseline documentado (levantamento 2026-08-07)
--
-- Normalizacao aplicada (identica a usada nos testes Vitest):
--   a. lower()                  — elimina variacao de caixa
--   b. remove ::[a-z_.]+        — elimina type casts (::text, ::name, etc.)
--   c. remove public\.          — elimina qualificacao de schema
--   d. \s+ -> ' '               — normaliza whitespace e quebras de linha
--   e. trim()                   — elimina espacos extremos
--
-- A normalizacao e aplicada tanto ao valor do banco quanto ao baseline,
-- tornando a comparacao deterministica e independente de formatacao.
-- Ela NAO altera: nomes de funcoes, literais de permissoes, operadores
-- AND/OR, ordem logica, chamadas is_admin() e is_auditoria().
--
-- Baselines: expressoes comprovadas via pg_policies do banco remoto em
-- 2026-08-07, antes desta migration, sem deleted_at no USING.
-- =========================================================================

do $pre$
declare
  -- Tabelas e policies alvo (12 entradas, indices 1..12)
  v_tbls text[] := array[
    'chamadas',
    'triagens',
    'evolucoes_enfermagem',
    'observacoes',
    'reavaliacoes_observacao',
    'estabilizacoes',
    'checklist_estabilizacao_itens',
    'exames',
    'prescricoes',
    'prescricao_itens',
    'transferencias',
    'checklist_transferencia_itens'
  ];

  v_pols text[] := array[
    'chamadas_select_operacional',
    'triagens_select_clinico',
    'evolucoes_enfermagem_select_clinico',
    'observacoes_select_clinico',
    'reavaliacoes_observacao_select_clinico',
    'estabilizacoes_select_clinico',
    'checklist_estabilizacao_itens_select_clinico',
    'exames_select_diagnostico',
    'prescricoes_select_farmacia_clinico',
    'prescricao_itens_select_farmacia_clinico',
    'transferencias_select_operacional',
    'checklist_transferencia_itens_select_operacional'
  ];

  -- Baselines em forma normalizada (lowercase, sem ::text, sem public., espaco unico).
  -- Serao normalizados novamente antes da comparacao (operacao idempotente).
  -- Fonte: pg_policies.qual do banco remoto em 2026-08-07.
  v_bases text[] := array[
    '(has_permission(''atendimento.abrir'') or has_permission(''triagem.classificar'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''triagem.classificar'') or has_permission(''consulta.iniciar'') or has_permission(''consulta.registrar_conduta'') or has_permission(''observacao.reavaliar'') or is_admin() or is_auditoria())',
    '(has_permission(''enfermagem.evolucao.registrar'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''observacao.reavaliar'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''observacao.reavaliar'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''estabilizacao.checklist_item'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''estabilizacao.checklist_item'') or has_permission(''consulta.iniciar'') or is_admin() or is_auditoria())',
    '(has_permission(''exame.solicitar'') or has_permission(''exame.visualizar'') or has_permission(''exame.liberar_resultado'') or is_admin() or is_auditoria())',
    '(has_permission(''prescricao.criar'') or has_permission(''prescricao.dispensar'') or is_admin() or is_auditoria())',
    '(has_permission(''prescricao.criar'') or has_permission(''prescricao.dispensar'') or is_admin() or is_auditoria())',
    '(has_permission(''transferencia.solicitar'') or has_permission(''transferencia.aprovar_vaga'') or has_permission(''transferencia.confirmar_checklist'') or has_permission(''transferencia.confirmar_saida'') or is_admin() or is_auditoria())',
    '(has_permission(''transferencia.confirmar_checklist'') or has_permission(''transferencia.aprovar_vaga'') or is_admin() or is_auditoria())'
  ];

  v_i            integer;
  v_tbl          text;
  v_pol          text;
  v_base         text;
  v_exists_tbl   boolean;
  v_exists_col   boolean;
  v_actual_cmd   text;
  v_actual_roles name[];
  v_actual_using text;
  v_norm_actual  text;
  v_norm_expect  text;

begin
  for v_i in 1..array_length(v_tbls, 1) loop
    v_tbl  := v_tbls[v_i];
    v_pol  := v_pols[v_i];
    v_base := v_bases[v_i];

    -- Verificacao 1: tabela existe em public
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public'
        and table_name   = v_tbl
        and table_type   = 'BASE TABLE'
    ) into v_exists_tbl;

    if not v_exists_tbl then
      raise exception
        'pp3b1_schema_drift [%]: tabela ausente em public. '
        'Verificar migrations de estrutura.', v_tbl;
    end if;

    -- Verificacao 2: coluna deleted_at existe
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = v_tbl
        and column_name  = 'deleted_at'
    ) into v_exists_col;

    if not v_exists_col then
      raise exception
        'pp3b1_schema_drift [%]: coluna deleted_at ausente. '
        'Aplicar migration 20260709170000 primeiro.', v_tbl;
    end if;

    -- Verificacoes 3-6: buscar policy e validar cmd, roles e expressao USING
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

    -- Verificacao 3: policy existe com nome exato
    if not found then
      raise exception
        'pp3b1_schema_drift [%.%]: policy ausente no catalogo. '
        'A policy foi renomeada ou removida apos o levantamento PP3-A.',
        v_tbl, v_pol;
    end if;

    -- Verificacao 4: comando = SELECT
    if v_actual_cmd <> 'SELECT' then
      raise exception
        'pp3b1_schema_drift [%.%]: comando "%" inesperado (esperado: SELECT).',
        v_tbl, v_pol, v_actual_cmd;
    end if;

    -- Verificacao 5: roles = {authenticated}
    if v_actual_roles <> array['authenticated'::name] then
      raise exception
        'pp3b1_schema_drift [%.%]: roles "%" inesperados (esperado: {authenticated}).',
        v_tbl, v_pol, v_actual_roles::text;
    end if;

    -- Verificacao 6: expressao USING normalizada == baseline documentado
    -- Normalizacao: lower → remove type casts → remove public. → normalize whitespace → trim
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
        'pp3b1_schema_drift [%.%]: SCHEMA DRIFT detectado. '
        'esperado (norm)=[%] encontrado (norm)=[%]. '
        'A policy foi alterada apos o levantamento PP3-A. '
        'Revisar manualmente antes de aplicar esta migration.',
        v_tbl, v_pol, v_norm_expect, v_norm_actual;
    end if;

  end loop;
end $pre$;

-- =========================================================================
-- B1.1 — chamadas
-- Policy:  chamadas_select_operacional
-- Antes:   has_permission('atendimento.abrir') OR has_permission('triagem.classificar')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists chamadas_select_operacional on public.chamadas;

create policy chamadas_select_operacional on public.chamadas
  for select to authenticated
  using (
    (
      (
        public.has_permission('atendimento.abrir')
        or public.has_permission('triagem.classificar')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy chamadas_select_operacional on public.chamadas is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito, inclusive a '
  'registros excluidos logicamente, para rastreabilidade e auditoria forense. '
  'Permissoes preservadas: atendimento.abrir, triagem.classificar, consulta.iniciar.';

-- =========================================================================
-- B1.2 — triagens
-- Policy:  triagens_select_clinico
-- Antes:   has_permission('triagem.classificar') OR has_permission('consulta.iniciar')
--          OR has_permission('consulta.registrar_conduta')
--          OR has_permission('observacao.reavaliar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists triagens_select_clinico on public.triagens;

create policy triagens_select_clinico on public.triagens
  for select to authenticated
  using (
    (
      (
        public.has_permission('triagem.classificar')
        or public.has_permission('consulta.iniciar')
        or public.has_permission('consulta.registrar_conduta')
        or public.has_permission('observacao.reavaliar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy triagens_select_clinico on public.triagens is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: triagem.classificar, consulta.iniciar, '
  'consulta.registrar_conduta, observacao.reavaliar.';

-- =========================================================================
-- B1.3 — evolucoes_enfermagem
-- Policy:  evolucoes_enfermagem_select_clinico
-- Antes:   has_permission('enfermagem.evolucao.registrar')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem;

create policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem
  for select to authenticated
  using (
    (
      (
        public.has_permission('enfermagem.evolucao.registrar')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: enfermagem.evolucao.registrar, consulta.iniciar.';

-- =========================================================================
-- B1.4 — observacoes
-- Policy:  observacoes_select_clinico
-- Antes:   has_permission('observacao.reavaliar')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists observacoes_select_clinico on public.observacoes;

create policy observacoes_select_clinico on public.observacoes
  for select to authenticated
  using (
    (
      (
        public.has_permission('observacao.reavaliar')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy observacoes_select_clinico on public.observacoes is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: observacao.reavaliar, consulta.iniciar.';

-- =========================================================================
-- B1.5 — reavaliacoes_observacao
-- Policy:  reavaliacoes_observacao_select_clinico
-- Antes:   has_permission('observacao.reavaliar')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao;

create policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao
  for select to authenticated
  using (
    (
      (
        public.has_permission('observacao.reavaliar')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: observacao.reavaliar, consulta.iniciar.';

-- =========================================================================
-- B1.6 — estabilizacoes
-- Policy:  estabilizacoes_select_clinico
-- Antes:   has_permission('estabilizacao.checklist_item')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists estabilizacoes_select_clinico on public.estabilizacoes;

create policy estabilizacoes_select_clinico on public.estabilizacoes
  for select to authenticated
  using (
    (
      (
        public.has_permission('estabilizacao.checklist_item')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy estabilizacoes_select_clinico on public.estabilizacoes is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: estabilizacao.checklist_item, consulta.iniciar.';

-- =========================================================================
-- B1.7 — checklist_estabilizacao_itens
-- Policy:  checklist_estabilizacao_itens_select_clinico
-- Antes:   has_permission('estabilizacao.checklist_item')
--          OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens;

create policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens
  for select to authenticated
  using (
    (
      (
        public.has_permission('estabilizacao.checklist_item')
        or public.has_permission('consulta.iniciar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: estabilizacao.checklist_item, consulta.iniciar.';

-- =========================================================================
-- B1.8 — exames
-- Policy:  exames_select_diagnostico
-- Antes:   has_permission('exame.solicitar') OR has_permission('exame.visualizar')
--          OR has_permission('exame.liberar_resultado') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists exames_select_diagnostico on public.exames;

create policy exames_select_diagnostico on public.exames
  for select to authenticated
  using (
    (
      (
        public.has_permission('exame.solicitar')
        or public.has_permission('exame.visualizar')
        or public.has_permission('exame.liberar_resultado')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy exames_select_diagnostico on public.exames is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: exame.solicitar, exame.visualizar, exame.liberar_resultado.';

-- =========================================================================
-- B1.9 — prescricoes
-- Policy:  prescricoes_select_farmacia_clinico
-- Antes:   has_permission('prescricao.criar')
--          OR has_permission('prescricao.dispensar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists prescricoes_select_farmacia_clinico on public.prescricoes;

create policy prescricoes_select_farmacia_clinico on public.prescricoes
  for select to authenticated
  using (
    (
      (
        public.has_permission('prescricao.criar')
        or public.has_permission('prescricao.dispensar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricoes_select_farmacia_clinico on public.prescricoes is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: prescricao.criar, prescricao.dispensar.';

-- =========================================================================
-- B1.10 — prescricao_itens
-- Policy:  prescricao_itens_select_farmacia_clinico
-- Antes:   has_permission('prescricao.criar')
--          OR has_permission('prescricao.dispensar') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists prescricao_itens_select_farmacia_clinico on public.prescricao_itens;

create policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens
  for select to authenticated
  using (
    (
      (
        public.has_permission('prescricao.criar')
        or public.has_permission('prescricao.dispensar')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: prescricao.criar, prescricao.dispensar.';

-- =========================================================================
-- B1.11 — transferencias
-- Policy:  transferencias_select_operacional
-- Antes:   has_permission('transferencia.solicitar')
--          OR has_permission('transferencia.aprovar_vaga')
--          OR has_permission('transferencia.confirmar_checklist')
--          OR has_permission('transferencia.confirmar_saida')
--          OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists transferencias_select_operacional on public.transferencias;

create policy transferencias_select_operacional on public.transferencias
  for select to authenticated
  using (
    (
      (
        public.has_permission('transferencia.solicitar')
        or public.has_permission('transferencia.aprovar_vaga')
        or public.has_permission('transferencia.confirmar_checklist')
        or public.has_permission('transferencia.confirmar_saida')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy transferencias_select_operacional on public.transferencias is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: transferencia.solicitar, transferencia.aprovar_vaga, '
  'transferencia.confirmar_checklist, transferencia.confirmar_saida.';

-- =========================================================================
-- B1.12 — checklist_transferencia_itens
-- Policy:  checklist_transferencia_itens_select_operacional
-- Antes:   has_permission('transferencia.confirmar_checklist')
--          OR has_permission('transferencia.aprovar_vaga') OR is_admin() OR is_auditoria()
-- Depois:  (... AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
-- =========================================================================

drop policy if exists checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens;

create policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens
  for select to authenticated
  using (
    (
      (
        public.has_permission('transferencia.confirmar_checklist')
        or public.has_permission('transferencia.aprovar_vaga')
      )
      and deleted_at is null
    )
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens is
  'PP3-B.1 (20260807000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito. '
  'Permissoes preservadas: transferencia.confirmar_checklist, transferencia.aprovar_vaga.';

-- =========================================================================
-- FIM DA MIGRATION 20260807000001
-- Policies alteradas: 12 (SELECT somente — INSERT/UPDATE/DELETE preservadas)
-- Tabelas alteradas: nenhuma estruturalmente
-- Grants: nao alterados
-- Triggers: nao alterados
-- Dados: nao alterados
-- Rollback: supabase/rollback/20260807000001_rls_phase_b1_soft_delete_select_filter_rollback.sql
-- Validacao: npx.cmd vitest run tests/security/pp3b1-soft-delete-select-filter.test.js
-- =========================================================================
