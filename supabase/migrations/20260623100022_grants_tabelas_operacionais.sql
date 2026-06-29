-- Migration: GRANT de tabela para "authenticated" nas tabelas operacionais
-- protegidas por RLS (pacientes, atendimentos, triagens, consultas, chamadas)
-- e SELECT em audit_log.
--
-- Achado que motivou esta migration: RLS habilitada e policies corretas ja
-- existem desde a migration 20260623100012 (atendimentos/pacientes/chamadas)
-- e 20260623100007/20260623100012 (triagens/consultas), mas NENHUMA migration
-- anterior concedeu o GRANT de tabela correspondente a "authenticated". Sem
-- esse GRANT, o PostgREST devolve "permission denied for table X" (42501)
-- antes mesmo de avaliar qualquer policy - a requisicao nunca chega a ser
-- avaliada pela RLS. Mesmo padrao/alerta ja documentado no comentario da
-- migration 20260623100019 (configuracoes_sistema), reaplicado aqui para as
-- tabelas operacionais centrais do fluxo assistencial.
--
-- IMPORTANTE - GRANT nao substitui RLS:
-- - GRANT (este arquivo) apenas autoriza o role "authenticated" a TENTAR
--   SELECT/INSERT/UPDATE/DELETE na tabela - e' a camada de privilegio do
--   Postgres, avaliada antes de qualquer linha ser lida/escrita.
-- - RLS (ja existente, inalterada por esta migration) continua sendo a
--   camada de autorizacao por perfil/linha - decide QUAIS linhas o usuario
--   pode ver/alterar e QUAIS operacoes seu perfil permite, conforme as
--   policies de cada tabela (ex.: atendimentos_update_assistencial exige
--   perfil Enfermagem/Medico/Regulacao/admin).
-- - As duas camadas sao cumulativas: falha em qualquer uma bloqueia a
--   operacao. Esta migration so' resolve a camada de GRANT, que faltava.
--
-- Esta migration NAO cria, altera ou remove nenhuma policy. NAO desabilita
-- RLS em nenhuma tabela. NAO altera schema (nenhuma coluna/tabela/index).
-- NAO insere dados. NAO altera funcoes clinicas. NAO concede nada a "anon"
-- (nenhuma decisao anterior do projeto previu acesso anonimo a estas
-- tabelas) nem usa "service_role" (que ja e' owner/bypassa RLS por padrao,
-- sem necessidade de GRANT explicito).

-- =========================================================================
-- 1. Tabelas transacionais operacionais - SELECT, INSERT, UPDATE, DELETE
-- =========================================================================
-- DELETE concedido por simetria com o privilegio ja existente em
-- "configuracoes_sistema" (migration 20260623100019) e porque ja existem
-- policies de DELETE restritas a admin (pacientes_delete_admin_only,
-- atendimentos_delete_admin_only, chamadas_delete_admin_only) - sem o
-- GRANT, essas policies de DELETE nunca seriam alcancadas por ningum,
-- nem mesmo admin. RLS continua restringindo quem de fato pode deletar.

grant select, insert, update, delete on table public.pacientes to authenticated;
grant select, insert, update, delete on table public.atendimentos to authenticated;
grant select, insert, update, delete on table public.triagens to authenticated;
grant select, insert, update, delete on table public.consultas to authenticated;
grant select, insert, update, delete on table public.chamadas to authenticated;

-- =========================================================================
-- 2. audit_log - somente SELECT
-- =========================================================================
-- audit_log so' tem policy de SELECT (audit_log_select_admin_auditoria,
-- restrita a admin/auditoria - ver migration 20260623100012). A escrita em
-- audit_log e' feita exclusivamente pela trigger fn_audit_trigger()
-- (migration 20260623100013), que roda como o owner da tabela e por isso
-- nao depende de GRANT a "authenticated" para INSERT - conceder INSERT/
-- UPDATE/DELETE manual aqui contrariaria o design existente (auditoria
-- gravada so' por trigger, nunca por escrita direta de aplicacao) e por
-- isso NAO e' feito nesta migration.

grant select on table public.audit_log to authenticated;

-- =========================================================================
-- 3. Tabelas de dominio (dom_*) e configuracoes_sistema
-- =========================================================================
-- Nenhuma acao nesta migration: dom_status_atendimento, dom_desfechos,
-- dom_classificacao_risco, dom_tipos_observacao, dom_status_transferencia,
-- dom_status_prescricao e dom_status_exame ja possuem GRANT SELECT a
-- authenticated no ambiente (confirmado por diagnostico antes desta
-- migration). configuracoes_sistema ja recebeu GRANT correto na migration
-- 20260623100019. Repetir esses GRANTs aqui seria redundante (embora um
-- "grant" repetido seja idempotente no Postgres, evita-se por clareza:
-- esta migration so' adiciona o que estava genuinamente faltando).

comment on table public.atendimentos is 'Episodio central do fluxo assistencial. classificacao_risco_id e desfecho_id sao nullable - preenchidos somente por acao explicita (triagem/conduta), nunca inferidos. GRANT de tabela para authenticated adicionado na migration 20260623100022 - RLS (policies existentes) continua sendo a camada de autorizacao por perfil/linha.';
