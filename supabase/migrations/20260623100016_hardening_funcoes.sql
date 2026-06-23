-- Migration: hardening de funcoes (GRANT/REVOKE EXECUTE) - GSI Saude
-- Escopo: revogar EXECUTE de PUBLIC nas funcoes auxiliares e de trigger,
-- conceder de volta apenas onde ha necessidade tecnica comprovada (uso
-- direto em policy de RLS), e restringir dom_codigo()/dom_ordem() a uma
-- whitelist fixa de tabelas de dominio, em vez de aceitar nome de tabela
-- livre.
-- Nao altera frontend, nao cria login, nao integra Supabase, nao instala
-- dependencias. Mantem compatibilidade com as migrations 01-15: nenhuma
-- assinatura de funcao, nome de trigger ou nome de policy e alterado.

-- =========================================================================
-- 1. Por que isto e necessario
-- =========================================================================
-- Por padrao, toda funcao nova no Postgres recebe EXECUTE para PUBLIC (ou
-- seja, qualquer role, inclusive "anon" e "authenticated" no Supabase).
-- Como o PostgREST expoe automaticamente toda funcao do schema public como
-- endpoint RPC, isso significa que, sem este hardening, qualquer usuario
-- (mesmo anonimo) poderia chamar diretamente funcoes como has_perfil(),
-- is_admin() ou - o caso mais sensivel - dom_codigo()/dom_ordem(), que
-- aceitavam qualquer nome de tabela como parametro e, sendo SECURITY
-- DEFINER, conseguiam ler colunas de QUALQUER tabela do schema public que
-- tivesse coluna "codigo"/"ordem", contornando RLS.

-- =========================================================================
-- 2. dom_codigo() e dom_ordem(): whitelist fixa de tabelas de dominio
-- =========================================================================
-- Reescritas para validar p_tabela contra uma lista fixa antes do EXECUTE
-- dinamico. Mesma assinatura, mesmo comportamento para as 7 tabelas de
-- dominio existentes - nenhuma migration anterior que as chama precisa
-- ser alterada.

create or replace function public.dom_codigo(p_tabela text, p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  if p_id is null then
    return null;
  end if;

  if p_tabela not in (
    'dom_status_atendimento', 'dom_desfechos', 'dom_classificacao_risco',
    'dom_tipos_observacao', 'dom_status_transferencia', 'dom_status_prescricao',
    'dom_status_exame'
  ) then
    raise exception 'dom_codigo: tabela "%" nao esta na whitelist de tabelas de dominio permitidas.', p_tabela;
  end if;

  execute format('select codigo from %I where id = $1', p_tabela) into v_codigo using p_id;
  return v_codigo;
end;
$$;

comment on function public.dom_codigo(text, uuid) is 'Retorna o codigo (text) de uma linha de tabela de dominio a partir do id. p_tabela e validado contra whitelist fixa (dom_status_atendimento, dom_desfechos, dom_classificacao_risco, dom_tipos_observacao, dom_status_transferencia, dom_status_prescricao, dom_status_exame) antes do EXECUTE dinamico - nao aceita nome de tabela arbitrario.';

create or replace function public.dom_ordem(p_tabela text, p_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ordem int;
begin
  if p_id is null then
    return null;
  end if;

  if p_tabela not in (
    'dom_status_atendimento', 'dom_desfechos', 'dom_classificacao_risco',
    'dom_tipos_observacao', 'dom_status_transferencia', 'dom_status_prescricao',
    'dom_status_exame'
  ) then
    raise exception 'dom_ordem: tabela "%" nao esta na whitelist de tabelas de dominio permitidas.', p_tabela;
  end if;

  execute format('select ordem from %I where id = $1', p_tabela) into v_ordem using p_id;
  return v_ordem;
end;
$$;

comment on function public.dom_ordem(text, uuid) is 'Retorna o campo ordem de uma linha de tabela de dominio. Mesma whitelist fixa de dom_codigo() - nao aceita nome de tabela arbitrario.';

-- =========================================================================
-- 3. REVOKE EXECUTE FROM PUBLIC em todas as funcoes auxiliares e de trigger
-- =========================================================================
-- Revoga de PUBLIC (que cobre anon e authenticated por heranca padrao) e,
-- por reforco explicito, tambem de anon e authenticated diretamente. O
-- GRANT especifico a "authenticated", quando necessario, e feito na secao
-- 4, apos este bloqueio geral.

revoke execute on function public.current_user_id() from public;
revoke execute on function public.is_linked_user() from public;
revoke execute on function public.has_perfil(text) from public;
revoke execute on function public.has_permission(text) from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_auditoria() from public;
revoke execute on function public.audit_text_to_uuid(text) from public;
revoke execute on function public.fn_audit_trigger() from public;
revoke execute on function public.fn_set_updated_at() from public;
revoke execute on function public.fn_estoque_itens_protect_quantidade() from public;
revoke execute on function public.fn_estoque_aplicar_movimentacao() from public;
revoke execute on function public.fn_block_update_delete() from public;
revoke execute on function public.dom_codigo(text, uuid) from public;
revoke execute on function public.dom_ordem(text, uuid) from public;
revoke execute on function public.fn_validate_atendimento_transicao() from public;

revoke execute on function public.current_user_id() from anon;
revoke execute on function public.is_linked_user() from anon;
revoke execute on function public.has_perfil(text) from anon;
revoke execute on function public.has_permission(text) from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_auditoria() from anon;
revoke execute on function public.audit_text_to_uuid(text) from anon;
revoke execute on function public.fn_audit_trigger() from anon;
revoke execute on function public.fn_set_updated_at() from anon;
revoke execute on function public.fn_estoque_itens_protect_quantidade() from anon;
revoke execute on function public.fn_estoque_aplicar_movimentacao() from anon;
revoke execute on function public.fn_block_update_delete() from anon;
revoke execute on function public.dom_codigo(text, uuid) from anon;
revoke execute on function public.dom_ordem(text, uuid) from anon;
revoke execute on function public.fn_validate_atendimento_transicao() from anon;

revoke execute on function public.current_user_id() from authenticated;
revoke execute on function public.is_linked_user() from authenticated;
revoke execute on function public.has_perfil(text) from authenticated;
revoke execute on function public.has_permission(text) from authenticated;
revoke execute on function public.is_admin() from authenticated;
revoke execute on function public.is_auditoria() from authenticated;
revoke execute on function public.audit_text_to_uuid(text) from authenticated;
revoke execute on function public.fn_audit_trigger() from authenticated;
revoke execute on function public.fn_set_updated_at() from authenticated;
revoke execute on function public.fn_estoque_itens_protect_quantidade() from authenticated;
revoke execute on function public.fn_estoque_aplicar_movimentacao() from authenticated;
revoke execute on function public.fn_block_update_delete() from authenticated;
revoke execute on function public.dom_codigo(text, uuid) from authenticated;
revoke execute on function public.dom_ordem(text, uuid) from authenticated;
revoke execute on function public.fn_validate_atendimento_transicao() from authenticated;

-- =========================================================================
-- 4. GRANT EXECUTE TO authenticated apenas onde ha necessidade tecnica
-- =========================================================================
-- has_perfil(), has_permission(), is_admin() e is_auditoria() sao chamadas
-- DIRETAMENTE dentro de USING/WITH CHECK de praticamente todas as policies
-- de RLS criadas na migration 20260623100012 (ex.: atendimentos_select_linked,
-- pacientes_insert_recepcao_admin, exames_update_diagnostico_admin etc.).
-- Uma policy de RLS e avaliada com os privilegios do role que fez a
-- consulta (authenticated, no caso do app); se esse role nao tiver EXECUTE
-- na funcao chamada pela policy, toda consulta/escrita que dependa dela
-- falha com "permission denied for function". Por isso estas 4 precisam
-- de GRANT explicito a authenticated:

grant execute on function public.has_perfil(text) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_auditoria() to authenticated;

-- is_linked_user() tambem e chamada diretamente em policies (ex.:
-- pacientes_select_linked, atendimentos_select_linked, e nas tabelas de
-- dominio) - mesma necessidade tecnica:

grant execute on function public.is_linked_user() to authenticated;

-- =========================================================================
-- 5. Funcoes que NAO recebem GRANT (permanecem so' acessiveis ao owner)
-- =========================================================================
-- current_user_id(): nao e chamada por nenhuma policy nem trigger nas
--   migrations 01-15 (as policies usam auth.uid() diretamente). Mantida
--   sem GRANT a authenticated/anon por padrao conservador - "evitar
--   exposicao desnecessaria via RPC". Se uma necessidade futura do
--   frontend exigir chama-la via RPC, o GRANT deve ser adicionado em
--   migration propria, com justificativa registrada.
--
-- audit_text_to_uuid(text): chamada apenas internamente por
--   fn_audit_trigger() (SECURITY DEFINER). Como o owner de uma funcao tem
--   privilegio implicito sobre os objetos que possui (independente de
--   GRANT/REVOKE a PUBLIC), fn_audit_trigger() continua funcionando sem
--   que authenticated/anon precisem de EXECUTE em audit_text_to_uuid().
--
-- fn_audit_trigger(), fn_set_updated_at(), fn_estoque_itens_protect_quantidade(),
--   fn_estoque_aplicar_movimentacao(), fn_block_update_delete(),
--   fn_validate_atendimento_transicao(): sao todas funcoes de TRIGGER
--   (returns trigger). O Postgres ja impede a chamada direta dessas
--   funcoes via SELECT/RPC ("trigger functions can only be called as
--   triggers"), e a invocacao via mecanismo de trigger nao depende do
--   GRANT EXECUTE do role que disparou o INSERT/UPDATE/DELETE na tabela.
--   O REVOKE aqui e reforco defensivo/documentacional, sem necessidade de
--   GRANT de volta para nenhum role.
--
-- dom_codigo(text, uuid) e dom_ordem(text, uuid): chamadas apenas
--   internamente por fn_validate_atendimento_transicao() (SECURITY
--   DEFINER, mesmo owner). Por isso NAO recebem GRANT a authenticated/anon
--   - ficam acessiveis apenas ao owner das funcoes, minimizando a
--   exposicao via RPC mesmo apos a whitelist da secao 2. Caso uma
--   necessidade futura do frontend exija consulta-las diretamente, isso
--   deve ser uma decisao explicita registrada em migration propria.

-- =========================================================================
-- 6. Resumo de compatibilidade
-- =========================================================================
-- Nenhuma assinatura de funcao mudou. Nenhum nome de trigger ou de policy
-- mudou. As policies da migration 20260623100012 e o trigger da migration
-- 20260623100015 continuam funcionando sem alteracao, pois as 5 funcoes
-- que eles chamam diretamente (has_perfil, has_permission, is_admin,
-- is_auditoria, is_linked_user) receberam GRANT EXECUTE TO authenticated
-- nesta mesma migration. dom_codigo()/dom_ordem() continuam funcionando
-- dentro de fn_validate_atendimento_transicao() porque essa funcao roda
-- como owner (SECURITY DEFINER), que tem privilegio implicito sobre as
-- proprias funcoes independente do REVOKE aplicado a outros roles.
