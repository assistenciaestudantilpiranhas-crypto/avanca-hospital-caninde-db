-- ROLLBACK: 20260722100029_rls_select_phase_a_positive_permissions
-- Restaura as 17 policies SELECT amplas baseadas em is_linked_user()
-- que existiam antes da migration de Fase A.
--
-- Como usar:
--   psql $LOCAL_DB_URL < supabase/rollback/20260722100029_..._rollback.sql
--   OU via psql no container:
--   docker exec -i supabase_db_avanca-hospital-caninde-db psql -U postgres -d postgres -f /tmp/rollback.sql
--
-- Pre-condicao: rodar SOMENTE em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
-- Validar com: select policyname, tablename, qual from pg_policies where policyname like '%select_%' order by tablename;

-- =========================================================================
-- pacientes
-- =========================================================================
drop policy if exists pacientes_select_operacional on public.pacientes;
create policy pacientes_select_linked on public.pacientes
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- atendimentos
-- =========================================================================
drop policy if exists atendimentos_select_operacional on public.atendimentos;
create policy atendimentos_select_linked on public.atendimentos
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- chamadas
-- =========================================================================
drop policy if exists chamadas_select_operacional on public.chamadas;
create policy chamadas_select_linked on public.chamadas
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- triagens
-- =========================================================================
drop policy if exists triagens_select_clinico on public.triagens;
create policy triagens_select_linked on public.triagens
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- consultas
-- =========================================================================
drop policy if exists consultas_select_clinico on public.consultas;
create policy consultas_select_linked on public.consultas
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- evolucoes_enfermagem
-- =========================================================================
drop policy if exists evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem;
create policy evolucoes_enfermagem_select_linked on public.evolucoes_enfermagem
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- observacoes
-- =========================================================================
drop policy if exists observacoes_select_clinico on public.observacoes;
create policy observacoes_select_linked on public.observacoes
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- reavaliacoes_observacao
-- =========================================================================
drop policy if exists reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao;
create policy reavaliacoes_observacao_select_linked on public.reavaliacoes_observacao
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- estabilizacoes
-- =========================================================================
drop policy if exists estabilizacoes_select_clinico on public.estabilizacoes;
create policy estabilizacoes_select_linked on public.estabilizacoes
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- checklist_estabilizacao_itens
-- =========================================================================
drop policy if exists checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens;
create policy checklist_estabilizacao_itens_select_linked on public.checklist_estabilizacao_itens
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- prescricoes
-- =========================================================================
drop policy if exists prescricoes_select_farmacia_clinico on public.prescricoes;
create policy prescricoes_select_linked on public.prescricoes
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- prescricao_itens
-- =========================================================================
drop policy if exists prescricao_itens_select_farmacia_clinico on public.prescricao_itens;
create policy prescricao_itens_select_linked on public.prescricao_itens
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- exames
-- =========================================================================
drop policy if exists exames_select_diagnostico on public.exames;
create policy exames_select_linked on public.exames
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- transferencias
-- =========================================================================
drop policy if exists transferencias_select_operacional on public.transferencias;
create policy transferencias_select_linked on public.transferencias
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- checklist_transferencia_itens
-- =========================================================================
drop policy if exists checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens;
create policy checklist_transferencia_itens_select_linked on public.checklist_transferencia_itens
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- estoque_itens
-- =========================================================================
drop policy if exists estoque_itens_select_farmacia on public.estoque_itens;
create policy estoque_itens_select_linked on public.estoque_itens
  for select to authenticated
  using (public.is_linked_user());

-- =========================================================================
-- estoque_movimentacoes
-- =========================================================================
drop policy if exists estoque_movimentacoes_select_farmacia on public.estoque_movimentacoes;
create policy estoque_movimentacoes_select_linked on public.estoque_movimentacoes
  for select to authenticated
  using (public.is_linked_user());

-- Verificacao pos-rollback:
-- select policyname, tablename, cmd, qual
-- from pg_policies
-- where schemaname = 'public'
--   and policyname like '%select_%'
-- order by tablename;
