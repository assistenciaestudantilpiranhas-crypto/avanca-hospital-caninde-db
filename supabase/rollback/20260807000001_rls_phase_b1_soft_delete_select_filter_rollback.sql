-- ROLLBACK: 20260807000001_rls_phase_b1_soft_delete_select_filter
-- GSI ONE | PP3-B.1 — Reverte filtro de exclusao logica das 12 tabelas Classe B
--
-- Contexto:
--   Reverte exatamente as alteracoes da migration 20260807000001.
--   Restaura as 12 policies SELECT ao estado da migration
--   20260722100029_rls_select_phase_a_positive_permissions.sql,
--   removendo o filtro deleted_at IS NULL do ramo operacional.
--
-- Efeito:
--   - Perfis operacionais voltam a ver registros com deleted_at IS NOT NULL
--     nas 12 tabelas Classe B.
--   - Admin e Auditoria: sem mudanca observavel (acesso era irrestrito em ambos os estados).
--
-- Pre-condicao:
--   Executar APENAS em ambiente local (127.0.0.1:54322) ou
--   em janela de manutencao aprovada no remoto.
--   NAO executar em producao sem autorizacao expressa.
--
-- Tabelas revertidas (12):
--   chamadas, triagens, evolucoes_enfermagem, observacoes,
--   reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens,
--   exames, prescricoes, prescricao_itens, transferencias,
--   checklist_transferencia_itens

-- =========================================================================
-- R1.1 — chamadas (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists chamadas_select_operacional on public.chamadas;

create policy chamadas_select_operacional on public.chamadas
  for select to authenticated
  using (
    public.has_permission('atendimento.abrir')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy chamadas_select_operacional on public.chamadas is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.2 — triagens (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists triagens_select_clinico on public.triagens;

create policy triagens_select_clinico on public.triagens
  for select to authenticated
  using (
    public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy triagens_select_clinico on public.triagens is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.3 — evolucoes_enfermagem (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem;

create policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem
  for select to authenticated
  using (
    public.has_permission('enfermagem.evolucao.registrar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.4 — observacoes (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists observacoes_select_clinico on public.observacoes;

create policy observacoes_select_clinico on public.observacoes
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy observacoes_select_clinico on public.observacoes is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.5 — reavaliacoes_observacao (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao;

create policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.6 — estabilizacoes (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists estabilizacoes_select_clinico on public.estabilizacoes;

create policy estabilizacoes_select_clinico on public.estabilizacoes
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy estabilizacoes_select_clinico on public.estabilizacoes is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.7 — checklist_estabilizacao_itens (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens;

create policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.8 — exames (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists exames_select_diagnostico on public.exames;

create policy exames_select_diagnostico on public.exames
  for select to authenticated
  using (
    public.has_permission('exame.solicitar')
    or public.has_permission('exame.visualizar')
    or public.has_permission('exame.liberar_resultado')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy exames_select_diagnostico on public.exames is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.9 — prescricoes (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists prescricoes_select_farmacia_clinico on public.prescricoes;

create policy prescricoes_select_farmacia_clinico on public.prescricoes
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')
    or public.has_permission('prescricao.dispensar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricoes_select_farmacia_clinico on public.prescricoes is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.10 — prescricao_itens (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists prescricao_itens_select_farmacia_clinico on public.prescricao_itens;

create policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')
    or public.has_permission('prescricao.dispensar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.11 — transferencias (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists transferencias_select_operacional on public.transferencias;

create policy transferencias_select_operacional on public.transferencias
  for select to authenticated
  using (
    public.has_permission('transferencia.solicitar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_checklist')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy transferencias_select_operacional on public.transferencias is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- R1.12 — checklist_transferencia_itens (restaura estado 20260722100029)
-- =========================================================================

drop policy if exists checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens;

create policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens
  for select to authenticated
  using (
    public.has_permission('transferencia.confirmar_checklist')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens is
  'Rollback PP3-B.1 (20260807000001): restaura estado 20260722100029 sem filtro '
  'deleted_at IS NULL. Registros logicamente excluidos voltam a ser visiveis '
  'para perfis operacionais.';

-- =========================================================================
-- FIM DO ROLLBACK 20260807000001
-- Policies revertidas: 12 (SELECT somente — INSERT/UPDATE/DELETE nao alteradas)
-- Tabelas alteradas estruturalmente: nenhuma
-- Grants: nao alterados
-- =========================================================================
