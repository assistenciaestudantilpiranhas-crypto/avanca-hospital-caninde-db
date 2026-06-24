-- Migration: bootstrap do primeiro administrador - GSI Saude
-- Escopo: funcao SECURITY DEFINER de uso unico (enquanto nao existir admin
-- ativo) para vincular um usuario, ja existente em auth.users, ao perfil
-- 'Administração'. Nao cria usuario em auth.users, nao recebe senha, nao
-- contem dado pessoal real hardcoded. Chamada apenas via service_role/
-- superusuario/SQL administrativo - sem GRANT a anon/authenticated.
-- Nao altera frontend, nao cria login, nao integra Supabase.

-- =========================================================================
-- 1. audit_log: permitir o valor de acao 'bootstrap_admin'
-- =========================================================================
-- O check constraint original (migration 20260623100003) so aceita
-- 'insert'/'update'/'delete', pois audit_log era pensada para espelhar
-- operacoes de tabela via trigger. O bootstrap e uma operacao administrativa
-- distinta (nao e insert/update/delete de uma tabela de negocio especifica),
-- por isso o valor proprio 'bootstrap_admin' e adicionado a whitelist.

alter table audit_log drop constraint if exists audit_log_acao_check;
alter table audit_log add constraint audit_log_acao_check
  check (acao in ('insert', 'update', 'delete', 'bootstrap_admin'));

-- =========================================================================
-- 2. Funcao de bootstrap do primeiro administrador
-- =========================================================================

create or replace function public.bootstrap_primeiro_admin(
  p_auth_user_id uuid,
  p_nome text,
  p_email text,
  p_categoria_profissional text default null,
  p_registro_profissional text default null
)
returns table (mensagem text, usuario_id uuid, perfil_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil_id uuid;
  v_admin_existente boolean;
  v_dados_depois jsonb;
begin
  -- 2.1. p_auth_user_id precisa existir em auth.users (a funcao NAO cria
  -- usuario Auth - isso e responsabilidade do GoTrue/Admin API/painel).
  if not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'bootstrap_primeiro_admin: auth.users.id "%" nao encontrado. Crie o usuario de autenticacao antes de chamar esta funcao.', p_auth_user_id;
  end if;

  -- 2.2. Localizar o perfil 'Administração'.
  select id into v_perfil_id
  from perfis_acesso
  where nome = 'Administração';

  if v_perfil_id is null then
    raise exception 'bootstrap_primeiro_admin: perfil "Administração" nao encontrado em perfis_acesso. Verifique o seed de perfis.';
  end if;

  -- 2.3. Bloquear se ja existir administrador ativo vinculado.
  select exists (
    select 1
    from usuario_perfil up
    join usuarios u on u.id = up.usuario_id
    where up.perfil_id = v_perfil_id
      and u.ativo = true
  ) into v_admin_existente;

  if v_admin_existente then
    raise exception 'bootstrap_primeiro_admin: ja existe administrador ativo vinculado ao perfil "Administração". Operacao bloqueada - use o fluxo normal de gestao de usuarios.';
  end if;

  -- 2.4. Inserir ou atualizar o registro em public.usuarios.
  insert into usuarios (id, nome, categoria_profissional, registro_profissional, email, ativo)
  values (p_auth_user_id, p_nome, p_categoria_profissional, p_registro_profissional, p_email, true)
  on conflict (id) do update set
    nome = excluded.nome,
    categoria_profissional = excluded.categoria_profissional,
    registro_profissional = excluded.registro_profissional,
    email = excluded.email,
    ativo = true,
    updated_at = now();

  -- 2.5. Vincular ao perfil 'Administração'.
  insert into usuario_perfil (usuario_id, perfil_id)
  values (p_auth_user_id, v_perfil_id)
  on conflict (usuario_id, perfil_id) do nothing;

  -- 2.6. Registrar a operacao em audit_log (best-effort: nao deve impedir o
  -- bootstrap caso a propria escrita de auditoria falhe por algum motivo
  -- inesperado, mas nao ha cenario conhecido de falha alem do generico).
  v_dados_depois := jsonb_build_object(
    'usuario_id', p_auth_user_id,
    'perfil_id', v_perfil_id,
    'perfil_nome', 'Administração',
    'email', p_email
  );

  insert into audit_log (usuario_id, tabela_afetada, registro_id, acao, dados_antes, dados_depois, created_at)
  values (p_auth_user_id, 'usuario_perfil', p_auth_user_id, 'bootstrap_admin', null, v_dados_depois, now());

  return query select
    'Primeiro administrador vinculado com sucesso.'::text,
    p_auth_user_id,
    v_perfil_id;
end;
$$;

comment on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) is
  'Bootstrap do primeiro administrador. SECURITY DEFINER, sem GRANT a anon/authenticated - chamar apenas via service_role/superusuario/SQL administrativo. Nao cria usuario em auth.users, nao recebe senha. So executa se nao houver administrador ativo vinculado ao perfil "Administração"; caso contrario lanca excecao e nao altera nada.';

-- =========================================================================
-- 3. Hardening: sem execucao publica
-- =========================================================================
-- Por padrao toda funcao nova recebe EXECUTE para PUBLIC. Revoga
-- explicitamente de public, anon e authenticated. Nenhum GRANT e concedido
-- a nenhum role nesta migration - a funcao fica acessivel apenas ao owner
-- (role que aplica as migrations, ex.: postgres/supabase_admin), que e o
-- equivalente local ao service_role administrativo.

revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from public;
revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from anon;
revoke execute on function public.bootstrap_primeiro_admin(uuid, text, text, text, text) from authenticated;
