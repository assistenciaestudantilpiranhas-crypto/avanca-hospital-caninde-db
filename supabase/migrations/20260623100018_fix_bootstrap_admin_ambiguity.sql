-- Migration: correcao de ambiguidade em bootstrap_primeiro_admin - GSI Saude
-- Escopo: corrigir erro "column reference is ambiguous" (42702) detectado em
-- teste local. Causa raiz: a funcao original (migration 20260623100017)
-- declarava "returns table (mensagem text, usuario_id uuid, perfil_id uuid)".
-- Em PL/pgSQL, os parametros de saida de RETURNS TABLE se tornam variaveis
-- automaticas dentro do corpo da funcao - "usuario_id" e "perfil_id" colidiam
-- com as colunas de mesmo nome usadas nos INSERT/ON CONFLICT em
-- usuario_perfil e audit_log, causando ambiguidade.
-- Nenhum dado parcial foi deixado pela falha (transacao da funcao foi
-- revertida automaticamente pelo Postgres) - confirmado por consulta
-- read-only antes desta migration.
-- Nao altera frontend, nao cria login, nao integra Supabase, nao executa a
-- funcao, nao cria usuario Auth, nao insere dados.

-- O tipo de retorno (nomes das colunas de saida) muda em relacao a versao
-- anterior (usuario_id/perfil_id -> out_usuario_id/out_perfil_id, ver
-- justificativa no cabecalho). CREATE OR REPLACE FUNCTION nao permite
-- alterar o tipo de retorno de uma funcao existente - e necessario DROP
-- explicito antes do CREATE.
drop function if exists public.bootstrap_primeiro_admin(uuid, text, text, text, text);

create function public.bootstrap_primeiro_admin(
  p_auth_user_id uuid,
  p_nome text,
  p_email text,
  p_categoria_profissional text default null,
  p_registro_profissional text default null
)
returns table (mensagem text, out_usuario_id uuid, out_perfil_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid;
  v_admin_perfil_id uuid;
  v_admin_existente boolean;
  v_dados_depois jsonb;
begin
  v_usuario_id := p_auth_user_id;

  -- 1. p_auth_user_id precisa existir em auth.users (a funcao NAO cria
  -- usuario Auth - isso e responsabilidade do GoTrue/Admin API/painel).
  if not exists (select 1 from auth.users au where au.id = v_usuario_id) then
    raise exception 'bootstrap_primeiro_admin: auth.users.id "%" nao encontrado. Crie o usuario de autenticacao antes de chamar esta funcao.', v_usuario_id;
  end if;

  -- 2. Localizar o perfil 'Administração'.
  select pa.id into v_admin_perfil_id
  from perfis_acesso pa
  where pa.nome = 'Administração';

  if v_admin_perfil_id is null then
    raise exception 'bootstrap_primeiro_admin: perfil "Administração" nao encontrado em perfis_acesso. Verifique o seed de perfis.';
  end if;

  -- 3. Bloquear se ja existir administrador ativo vinculado.
  select exists (
    select 1
    from usuario_perfil up
    join usuarios u on u.id = up.usuario_id
    where up.perfil_id = v_admin_perfil_id
      and u.ativo = true
  ) into v_admin_existente;

  if v_admin_existente then
    raise exception 'bootstrap_primeiro_admin: ja existe administrador ativo vinculado ao perfil "Administração". Operacao bloqueada - use o fluxo normal de gestao de usuarios.';
  end if;

  -- 4. Inserir ou atualizar o registro em public.usuarios.
  insert into usuarios as us (id, nome, categoria_profissional, registro_profissional, email, ativo)
  values (v_usuario_id, p_nome, p_categoria_profissional, p_registro_profissional, p_email, true)
  on conflict (id) do update set
    nome = excluded.nome,
    categoria_profissional = excluded.categoria_profissional,
    registro_profissional = excluded.registro_profissional,
    email = excluded.email,
    ativo = true,
    updated_at = now()
  where us.id = excluded.id;

  -- 5. Vincular ao perfil 'Administração'.
  insert into usuario_perfil as up (usuario_id, perfil_id)
  values (v_usuario_id, v_admin_perfil_id)
  on conflict (usuario_id, perfil_id) do nothing;

  -- 6. Registrar a operacao em audit_log.
  v_dados_depois := jsonb_build_object(
    'usuario_id', v_usuario_id,
    'perfil_id', v_admin_perfil_id,
    'perfil_nome', 'Administração',
    'email', p_email
  );

  insert into audit_log as al (usuario_id, tabela_afetada, registro_id, acao, dados_antes, dados_depois, created_at)
  values (v_usuario_id, 'usuario_perfil', v_usuario_id, 'bootstrap_admin', null, v_dados_depois, now());

  return query select
    'Primeiro administrador vinculado com sucesso.'::text,
    v_usuario_id,
    v_admin_perfil_id;
end;
$$;

comment on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) is
  'Bootstrap do primeiro administrador. SECURITY DEFINER, sem GRANT a anon/authenticated - chamar apenas via service_role/superusuario/SQL administrativo. Nao cria usuario em auth.users, nao recebe senha. So executa se nao houver administrador ativo vinculado ao perfil "Administração"; caso contrario lanca excecao e nao altera nada. Corrigido na migration 20260623100018: parametros de RETURNS TABLE renomeados para out_usuario_id/out_perfil_id e variaveis internas prefixadas com v_ para evitar ambiguidade com colunas de tabela (erro 42702 observado em teste local da versao anterior).';

-- =========================================================================
-- Hardening: sem execucao publica (reforco, mesma funcao/assinatura)
-- =========================================================================
-- create or replace preserva GRANTs/REVOKEs existentes na funcao, mas o
-- REVOKE e reaplicado aqui de forma explicita por seguranca/documentacao,
-- garantindo que nenhuma migration futura dependa de estado implicito.

revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from public;
revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from anon;
revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from authenticated;
