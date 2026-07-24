-- Migration: GRANT SELECT + DML minimo para tabelas clinicas estendidas
-- GSI ONE | Etapa 5B.8.5D — Complemento pre-Fase A
--
-- Contexto:
--   As migrations 20260623100022 e 20260623100023 adicionaram GRANTs apenas para
--   as tabelas operacionais "core" (pacientes, atendimentos, triagens, consultas,
--   chamadas, observacoes, estabilizacoes, transferencias). As nove tabelas abaixo
--   possuem RLS habilitada e policies SELECT refinadas pela Fase A
--   (20260722100029), mas nenhum GRANT para o role "authenticated" havia sido
--   concedido — o PostgREST devolve HTTP 403 antes mesmo de avaliar a RLS.
--
--   Esta migration corrige o gap aplicando o principio do menor privilegio:
--   cada privilegio (SELECT / INSERT / UPDATE) e' concedido somente onde existe
--   uma policy RLS correspondente ou um fluxo assistencial que o demanda.
--   DELETE nao e' concedido em nenhuma das nove tabelas — a migration de
--   hardening (20260623100028) ja revoga DELETE globalmente para essas tabelas.
--
-- Principio de menor privilegio aplicado por tabela:
--
--   evolucoes_enfermagem
--     SELECT  — policy evolucoes_enfermagem_select_clinico (Fase A)
--     INSERT  — policy evolucoes_enfermagem_write_enfermagem_admin (ALL)
--     UPDATE  — policy evolucoes_enfermagem_write_enfermagem_admin (ALL)
--
--   reavaliacoes_observacao
--     SELECT  — policy reavaliacoes_observacao_select_clinico (Fase A)
--     INSERT  — policy reavaliacoes_observacao_write_clinico_admin (ALL)
--     UPDATE  — policy reavaliacoes_observacao_write_clinico_admin (ALL)
--
--   checklist_estabilizacao_itens
--     SELECT  — policy checklist_estabilizacao_itens_select_clinico (Fase A)
--     INSERT  — policy checklist_estabilizacao_itens_write_enfermagem_admin (ALL)
--     UPDATE  — policy checklist_estabilizacao_itens_write_enfermagem_admin (ALL)
--
--   prescricoes
--     SELECT  — policy prescricoes_select_farmacia_clinico (Fase A)
--     INSERT  — policy prescricoes_insert_medico_admin (INSERT)
--     UPDATE  — policy prescricoes_update_medico_admin (UPDATE)
--
--   prescricao_itens
--     SELECT  — policy prescricao_itens_select_farmacia_clinico (Fase A)
--     INSERT  — policy prescricao_itens_insert_medico_admin (INSERT)
--     UPDATE  — policy prescricao_itens_update_farmacia_admin (UPDATE; farmacia dispensa)
--
--   exames
--     SELECT  — policy exames_select_diagnostico (Fase A)
--     INSERT  — policy exames_insert_medico_admin (INSERT; medico solicita)
--     UPDATE  — policy exames_update_diagnostico_admin (UPDATE; diagnostico libera resultado)
--
--   checklist_transferencia_itens
--     SELECT  — policy checklist_transferencia_itens_select_operacional (Fase A)
--     INSERT  — policy checklist_transferencia_itens_write_regulacao_admin (ALL)
--     UPDATE  — policy checklist_transferencia_itens_write_regulacao_admin (ALL)
--
--   estoque_itens
--     SELECT  — policy estoque_itens_select_farmacia (Fase A)
--     INSERT  — policy estoque_itens_write_farmacia_admin (ALL)
--     UPDATE  — policy estoque_itens_write_farmacia_admin (ALL);
--               o trigger fn_estoque_aplicar_movimentacao (SECURITY DEFINER)
--               tambem atualiza quantidade_atual via UPDATE interno
--
--   estoque_movimentacoes
--     SELECT  — policy estoque_movimentacoes_select_farmacia (Fase A)
--     INSERT  — policy estoque_movimentacoes_insert_farmacia_admin (INSERT)
--     UPDATE  — NAO concedido: nenhuma policy UPDATE existe para esta tabela
--               e o trigger fn_block_update_delete bloqueia UPDATE
--               incondicionalmente (imutabilidade de historico de estoque)
--
-- O que esta migration nao faz:
--   - Nao altera nenhuma policy, funcao, trigger ou schema.
--   - Nao concede DELETE em nenhuma tabela (revogado globalmente pela m.28).
--   - Nao concede nada a "anon" ou "service_role".
--
-- Rollback: supabase/rollback/20260722100030_grant_tabelas_clinicas_estendidas_rollback.sql

grant select, insert, update on table public.evolucoes_enfermagem          to authenticated;
grant select, insert, update on table public.reavaliacoes_observacao        to authenticated;
grant select, insert, update on table public.checklist_estabilizacao_itens  to authenticated;
grant select, insert, update on table public.prescricoes                    to authenticated;
grant select, insert, update on table public.prescricao_itens               to authenticated;
grant select, insert, update on table public.exames                         to authenticated;
grant select, insert, update on table public.checklist_transferencia_itens  to authenticated;
grant select, insert, update on table public.estoque_itens                  to authenticated;
grant select, insert         on table public.estoque_movimentacoes          to authenticated;
