-- Migration: hardening de grants perigosos para anon/authenticated - GSI ONE
--
-- Contexto 5B.8.2:
-- O inventario de seguranca identificou privilegios perigosos concedidos aos
-- roles anon/authenticated em tabelas do schema public:
--   - TRUNCATE
--   - TRIGGER
--   - REFERENCES
--   - DELETE em tabelas assistenciais/operacionais sensiveis
--
-- O que esta migration FAZ:
--   1. Revoga TRUNCATE, TRIGGER e REFERENCES de anon em todas as tabelas public.
--   2. Revoga TRUNCATE, TRIGGER e REFERENCES de authenticated em todas as tabelas public.
--   3. Revoga DELETE de authenticated nas tabelas assistenciais, operacionais,
--      administrativas e de auditoria listadas abaixo.
--
-- O que esta migration NAO faz:
--   - Nao revoga SELECT das tabelas dom_*.
--   - Nao revoga INSERT/UPDATE.
--   - Nao altera RLS.
--   - Nao altera policies.
--   - Nao altera funcoes, triggers, schema, dados ou ownership.
--   - Nao altera fluxo assistencial.

-- =========================================================================
-- 1. Privilegios perigosos globais em public
-- =========================================================================

revoke truncate, trigger, references on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- =========================================================================
-- 2. DELETE em tabelas assistenciais, operacionais e administrativas sensiveis
-- =========================================================================

revoke delete on table public.pacientes                         from authenticated;
revoke delete on table public.paciente_alergias                 from authenticated;
revoke delete on table public.paciente_comorbidades             from authenticated;
revoke delete on table public.paciente_medicamentos_continuos   from authenticated;
revoke delete on table public.paciente_alertas_clinicos         from authenticated;
revoke delete on table public.atendimentos                      from authenticated;
revoke delete on table public.chamadas                          from authenticated;
revoke delete on table public.triagens                          from authenticated;
revoke delete on table public.consultas                         from authenticated;
revoke delete on table public.evolucoes_enfermagem              from authenticated;
revoke delete on table public.observacoes                       from authenticated;
revoke delete on table public.reavaliacoes_observacao           from authenticated;
revoke delete on table public.estabilizacoes                    from authenticated;
revoke delete on table public.checklist_estabilizacao_itens     from authenticated;
revoke delete on table public.transferencias                    from authenticated;
revoke delete on table public.checklist_transferencia_itens     from authenticated;
revoke delete on table public.prescricoes                       from authenticated;
revoke delete on table public.prescricao_itens                  from authenticated;
revoke delete on table public.exames                            from authenticated;
revoke delete on table public.estoque_itens                     from authenticated;
revoke delete on table public.estoque_movimentacoes             from authenticated;
revoke delete on table public.audit_log                         from authenticated;
revoke delete on table public.usuarios                          from authenticated;
revoke delete on table public.usuario_perfil                    from authenticated;
revoke delete on table public.perfis_acesso                     from authenticated;
revoke delete on table public.perfil_permissao                  from authenticated;
revoke delete on table public.permissoes                        from authenticated;
revoke delete on table public.configuracoes_sistema             from authenticated;
