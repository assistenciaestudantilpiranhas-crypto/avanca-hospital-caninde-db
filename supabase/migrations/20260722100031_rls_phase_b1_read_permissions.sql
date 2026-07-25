-- Migration: Fase B1 — permissoes especificas de leitura
-- GSI ONE | Etapa 5B.8.5H
--
-- Contexto:
--   A Fase A (20260722100029) substituiu is_linked_user() por listas positivas
--   de permissoes de acao como gates de leitura SELECT. Isso criou acoplamentos
--   indesejaveis — ex: observacao.reavaliar dando acesso a consultas ao TEN,
--   prescricao.dispensar dando acesso a atendimentos a Farmacia.
--
--   Esta migration implementa a Fase B1 aprovada nos documentos:
--     docs/GSI_ONE_RLS_FASE_B1_ESPECIFICACAO_5B8_5F.md
--     docs/GSI_ONE_RLS_FASE_B1_DECISOES_INSTITUCIONAIS_5B8_5G.md
--
-- O que esta migration faz:
--   PARTE B1a — Cria 3 permissoes de leitura especificas (se nao existirem).
--   PARTE B1b — Vincula as 3 permissoes aos perfis aprovados.
--   PARTE B1c — Atualiza 3 policies SELECT (e somente estas 3).
--
-- Tabelas com policy atualizada:
--   pacientes    — pacientes_select_operacional
--   atendimentos — atendimentos_select_operacional
--   consultas    — consultas_select_clinico
--
-- O que esta migration NAO faz:
--   - Nao altera as outras 14 policies da Fase A.
--   - Nao altera INSERT, UPDATE, DELETE ou ALL em nenhuma tabela.
--   - Nao altera grants (SELECT, INSERT, UPDATE).
--   - Nao altera funcoes (has_permission, is_admin, is_auditoria, is_linked_user).
--   - Nao altera tabelas, colunas, sequences, triggers.
--   - Nao altera audit_log, configuracoes_sistema nem nenhum objeto de infraestrutura.
--   - Nao altera script.js nem qualquer arquivo de frontend.
--
-- Impacto de acesso (mudancas em relacao a Fase A):
--   Farmacia        : perde acesso a atendimentos (prescricao.dispensar removida da policy)
--   Tecnico em Enf. : perde acesso a consultas (observacao.reavaliar removida da policy)
--   Todos os demais : sem mudanca de comportamento observavel
--
-- Rollback:
--   supabase/rollback/20260722100031_rls_phase_b1_read_permissions_rollback.sql
--
-- Validacao:
--   npx.cmd supabase db reset
--   npx.cmd vitest run tests/security/phase-a-select-access.test.js
--   npx.cmd vitest run tests/security
--   npx.cmd vitest run tests/common

-- =========================================================================
-- PARTE B1a — Criar as 3 permissoes de leitura especificas
-- =========================================================================

insert into public.permissoes (chave, modulo, descricao)
values
  (
    'paciente.visualizar',
    'Pacientes',
    'Visualizar dados de identificacao do paciente para execucao da funcao operacional'
  ),
  (
    'atendimento.visualizar',
    'Atendimentos',
    'Visualizar atendimentos e acompanhar fluxo operacional do paciente'
  ),
  (
    'consulta.visualizar',
    'Consulta',
    'Visualizar consultas medicas, hipotese diagnostica, CID e conduta clinica'
  )
on conflict (chave) do nothing;

-- =========================================================================
-- PARTE B1b — Vincular as 3 permissoes aos perfis aprovados
-- =========================================================================

-- paciente.visualizar
-- Perfis: Recepção, Técnico em Enfermagem, Enfermeiro, Médico,
--         Farmácia, Técnico em RX, Regulação de Transferência
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'paciente.visualizar'
  and pa.nome in (
    'Recepção',
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Farmácia',
    'Técnico em RX',
    'Regulação de Transferência'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- atendimento.visualizar
-- Perfis: Recepção, Técnico em Enfermagem, Enfermeiro, Médico,
--         Técnico em RX, Regulação de Transferência
-- Farmácia NAO recebe: acesso a atendimentos é desproporcional a dispensacao.
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'atendimento.visualizar'
  and pa.nome in (
    'Recepção',
    'Técnico em Enfermagem',
    'Enfermeiro',
    'Médico',
    'Técnico em RX',
    'Regulação de Transferência'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- consulta.visualizar
-- Perfis: Enfermeiro (coordenacao do cuidado pos-consulta), Médico (autor do ato medico)
-- TEN NAO recebe: acesso atual via observacao.reavaliar e nao intencional (correcao).
-- Recepção, Farmacia, TEN-RX, Regulacao NAO recebem (sem finalidade clinica direta).
-- Administracao e Auditoria cobertos por is_admin() / is_auditoria() nas policies.
insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa
cross join public.permissoes p
where p.chave = 'consulta.visualizar'
  and pa.nome in (
    'Enfermeiro',
    'Médico'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- =========================================================================
-- PARTE B1c — Atualizar 3 policies SELECT
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. pacientes_select_operacional
--    Antes: 6 permissoes de acao como gate + is_admin() + is_auditoria()
--    Depois: paciente.visualizar + is_admin() + is_auditoria()
--
--    Perfis mantidos: Recepção, TEN, Enfermeiro, Médico, Farmácia,
--                     Técnico em RX, Regulação, Administração, Auditoria
--    Mudanca de mecanismo — comportamento de acesso preservado para todos.
-- -------------------------------------------------------------------------
drop policy if exists pacientes_select_operacional on public.pacientes;

create policy pacientes_select_operacional on public.pacientes
  for select to authenticated
  using (
    public.has_permission('paciente.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy pacientes_select_operacional on public.pacientes is
  'Fase B1 RLS (20260722100031): leitura restrita a perfis com paciente.visualizar. '
  'Substitui a Fase A: elimina acoplamento entre permissoes de acao e leitura. '
  'Perfis autorizados: Recepção, TEN, Enfermeiro, Médico, Farmácia, TEN-RX, Regulação.';

-- -------------------------------------------------------------------------
-- 2. atendimentos_select_operacional
--    Antes: 6 permissoes de acao como gate + is_admin() + is_auditoria()
--    Depois: atendimento.visualizar + is_admin() + is_auditoria()
--
--    Perfis mantidos: Recepção, TEN, Enfermeiro, Médico, Técnico em RX,
--                     Regulação, Administração, Auditoria
--    Farmácia: perde acesso — prescricao.dispensar removida do gate.
--              Queixa_principal nao deve ser exposta a perfil de dispensacao.
-- -------------------------------------------------------------------------
drop policy if exists atendimentos_select_operacional on public.atendimentos;

create policy atendimentos_select_operacional on public.atendimentos
  for select to authenticated
  using (
    public.has_permission('atendimento.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy atendimentos_select_operacional on public.atendimentos is
  'Fase B1 RLS (20260722100031): leitura restrita a perfis com atendimento.visualizar. '
  'Farmacia perde acesso: prescricao.dispensar removida do gate (acesso desproporcional). '
  'Farmacia acessa prescricoes diretamente — nao necessita listar atendimentos.';

-- -------------------------------------------------------------------------
-- 3. consultas_select_clinico
--    Antes: consulta.iniciar + consulta.registrar_conduta + observacao.reavaliar
--           + is_admin() + is_auditoria()
--    Depois: consulta.visualizar + is_admin() + is_auditoria()
--
--    Perfis mantidos: Enfermeiro, Médico, Administração, Auditoria
--    TEN: perde acesso nao intencional — observacao.reavaliar removida do gate.
--         Dados de hipotese_diagnostica, CID e conduta nao sao necessarios ao TEN.
-- -------------------------------------------------------------------------
drop policy if exists consultas_select_clinico on public.consultas;

create policy consultas_select_clinico on public.consultas
  for select to authenticated
  using (
    public.has_permission('consulta.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy consultas_select_clinico on public.consultas is
  'Fase B1 RLS (20260722100031): leitura restrita a Enfermeiro e Médico (via consulta.visualizar). '
  'TEN perde acesso nao intencional: observacao.reavaliar removida do gate. '
  'Corrige exposicao de hipotese_diagnostica, CID e conduta ao perfil de enfermagem basica.';

-- =========================================================================
-- FIM DA MIGRATION 20260722100031
-- Rollback: supabase/rollback/20260722100031_rls_phase_b1_read_permissions_rollback.sql
-- Validacao: npx.cmd supabase db reset && npx.cmd vitest run tests/security
-- =========================================================================
