-- ROLLBACK: 20260728000002_create_low_risk_management_views
-- GSI ONE | Fase 2.6.1 — Views agregadas de baixo risco
--
-- Contexto:
--   Reverte exatamente as alteracoes da migration 20260728000002.
--   Remove as tres views gerenciais e os grants associados.
--   Nao altera permissoes, perfis, tabelas clinicas nem policies.
--
-- Ordem de execucao:
--   R1: Revogar grants das views
--   R2: Remover as views
--
-- Pre-condicao: executar APENAS em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
--
-- Efeito:
--   - Remove as 3 views gerenciais criadas pela migration 20260728000002.
--   - Remove os grants de SELECT para 'authenticated'.
--   - As 13 permissoes gerenciais da Fase 2.5 permanecem intactas.
--   - As policies das tabelas clinicas permanecem intactas.
--   - Os perfis 'Gestao Hospitalar' e 'Leitura/Gestor' permanecem intactos.
--
-- Validacao pos-rollback:
--   SELECT table_name FROM information_schema.views
--   WHERE table_schema = 'public'
--   AND table_name LIKE 'vw_gestao_%';
--   Esperado: zero linhas.
--
--   SELECT COUNT(*) FROM public.permissoes
--   WHERE chave LIKE 'gestao.%' OR chave LIKE 'leitura.%';
--   Esperado: 13 (permissoes da Fase 2.5 inalteradas).

-- =========================================================================
-- R1: Revogar grants das views (idempotente — sem erro se ja foram removidos)
-- =========================================================================

revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

-- =========================================================================
-- R2: Remover as views criadas pela migration 20260728000002
-- =========================================================================
-- IF EXISTS garante idempotencia: nenhum erro se a view nao existir.

drop view if exists public.vw_gestao_tempos_assistenciais;
drop view if exists public.vw_gestao_producao_assistencial;
drop view if exists public.vw_gestao_indicadores_gerais;

-- =========================================================================
-- O que NAO e removido por este rollback
-- =========================================================================
-- As 13 permissoes gerenciais (gestao.* e leitura.*) permanecem.
-- Os vinculos em perfil_permissao permanecem.
-- Os perfis 'Gestao Hospitalar' e 'Leitura/Gestor' permanecem.
-- As policies 'pacientes_select_operacional', 'atendimentos_select_operacional'
-- e 'consultas_select_clinico' permanecem inalteradas.
-- Nenhuma tabela clinica e alterada.

-- =========================================================================
-- FIM DO ROLLBACK 20260728000002
-- =========================================================================
