-- ROLLBACK: 20260722100030_grant_tabelas_clinicas_estendidas
-- Revoga exatamente os GRANTs adicionados pela migration 30.
-- Restaura o estado anterior (sem grants em nenhuma das nove tabelas).
--
-- PRE-CONDICAO: aplicar somente em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
--
-- Efeito: PostgREST volta a devolver HTTP 403 para qualquer perfil que tente
-- acessar as nove tabelas abaixo, porque nenhum GRANT SELECT permanecera.
-- As policies RLS seguem inalteradas; o bloqueio sera de GRANT, nao de RLS.
--
-- Validacao pos-rollback:
--   select table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee='authenticated'
--     and table_name in (
--       'evolucoes_enfermagem','reavaliacoes_observacao',
--       'checklist_estabilizacao_itens','prescricoes','prescricao_itens',
--       'exames','checklist_transferencia_itens',
--       'estoque_itens','estoque_movimentacoes'
--     )
--   order by table_name, privilege_type;
-- Esperado: zero linhas.

revoke select, insert, update on table public.evolucoes_enfermagem          from authenticated;
revoke select, insert, update on table public.reavaliacoes_observacao        from authenticated;
revoke select, insert, update on table public.checklist_estabilizacao_itens  from authenticated;
revoke select, insert, update on table public.prescricoes                    from authenticated;
revoke select, insert, update on table public.prescricao_itens               from authenticated;
revoke select, insert, update on table public.exames                         from authenticated;
revoke select, insert, update on table public.checklist_transferencia_itens  from authenticated;
revoke select, insert, update on table public.estoque_itens                  from authenticated;
revoke select, insert         on table public.estoque_movimentacoes          from authenticated;
