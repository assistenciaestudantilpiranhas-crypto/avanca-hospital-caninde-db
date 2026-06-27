-- Migration: configuracoes_sistema - GSI Saude
-- Etapa 2.2 (Configuracoes / toggle-config): substitui as preferencias hoje
-- fictícias em localStorage (gsi_saude_cfg_*) por uma tabela real, restrita
-- a Administracao via configuracoes.gerenciar (permissao ja existente no
-- seed - migration 20260623100004_acesso.sql - sem necessidade de criar
-- nova permissao).
-- Reaproveita as funcoes ja existentes public.has_permission(text) e
-- public.is_admin() (migration 20260623100012_rls_policies.sql) e os
-- triggers genericos public.fn_set_updated_at() (20260623100014) e
-- public.fn_audit_trigger() (20260623100013) - nenhuma funcao nova e criada
-- nesta migration.
-- Nao altera frontend, nao migra localStorage, nao cria CRUD - apenas a
-- estrutura de dados e seguranca no banco (Fase 1).

-- =========================================================================
-- 1. Tabela
-- =========================================================================

create table public.configuracoes_sistema (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  modulo text not null default 'sistema',
  descricao text,
  valor jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.usuarios (id),
  updated_by uuid references public.usuarios (id)
);

comment on table public.configuracoes_sistema is 'Configuracoes institucionais/sistema reais (substitui placeholders de localStorage gsi_saude_cfg_*). Leitura e escrita restritas a Administracao (has_permission(''configuracoes.gerenciar'') ou is_admin()).';
comment on column public.configuracoes_sistema.chave is 'Identificador unico da configuracao, ex.: modulo_pacientes_ativo.';
comment on column public.configuracoes_sistema.valor is 'Valor da configuracao em jsonb, para suportar tanto booleanos simples (ex.: {"ativo": true}) quanto estruturas futuras sem nova migration de schema.';

-- =========================================================================
-- 2. Trigger de updated_at (reaproveita fn_set_updated_at ja existente)
-- =========================================================================

drop trigger if exists trg_updated_at_configuracoes_sistema on public.configuracoes_sistema;
create trigger trg_updated_at_configuracoes_sistema
  before update on public.configuracoes_sistema
  for each row execute function public.fn_set_updated_at();

-- =========================================================================
-- 3. Trigger de auditoria (reaproveita fn_audit_trigger ja existente)
-- =========================================================================
-- Configuracoes do sistema sao administrativas e sensiveis (afetam o
-- comportamento de todo o protótipo) - faz sentido auditar INSERT/UPDATE/
-- DELETE da mesma forma que as demais tabelas administrativas/assistenciais
-- (ver migration 20260623100013_audit_triggers.sql).

drop trigger if exists trg_audit_configuracoes_sistema on public.configuracoes_sistema;
create trigger trg_audit_configuracoes_sistema
  after insert or update or delete on public.configuracoes_sistema
  for each row execute function public.fn_audit_trigger();

-- =========================================================================
-- 4. RLS
-- =========================================================================
-- Diferente das tabelas assistenciais (que tem policy de SELECT ampla via
-- is_linked_user() + policy de escrita restrita por permissao/perfil),
-- configuracoes_sistema NAO tem policy de leitura ampla: por decisao de
-- produto explicita, somente quem tem configuracoes.gerenciar (hoje,
-- apenas o perfil Administracao no seed) pode ler ou escrever - nenhum
-- outro perfil (Recepcao, Enfermagem, Medico, Farmacia, Diagnostico/Exames,
-- Regulacao/Transferencias, Auditoria) tem acesso nesta fase.

alter table public.configuracoes_sistema enable row level security;

drop policy if exists configuracoes_sistema_select_admin on public.configuracoes_sistema;
create policy configuracoes_sistema_select_admin on public.configuracoes_sistema
  for select to authenticated
  using (public.has_permission('configuracoes.gerenciar') or public.is_admin());

drop policy if exists configuracoes_sistema_insert_admin on public.configuracoes_sistema;
create policy configuracoes_sistema_insert_admin on public.configuracoes_sistema
  for insert to authenticated
  with check (public.has_permission('configuracoes.gerenciar') or public.is_admin());

drop policy if exists configuracoes_sistema_update_admin on public.configuracoes_sistema;
create policy configuracoes_sistema_update_admin on public.configuracoes_sistema
  for update to authenticated
  using (public.has_permission('configuracoes.gerenciar') or public.is_admin())
  with check (public.has_permission('configuracoes.gerenciar') or public.is_admin());

drop policy if exists configuracoes_sistema_delete_admin on public.configuracoes_sistema;
create policy configuracoes_sistema_delete_admin on public.configuracoes_sistema
  for delete to authenticated
  using (public.has_permission('configuracoes.gerenciar') or public.is_admin());

-- =========================================================================
-- 5. Grants de tabela
-- =========================================================================
-- configuracoes_sistema sera acessada pelo frontend via Supabase client
-- autenticado (Fase 2, futura) - authenticated precisa do privilegio basico
-- de tabela (GRANT) para que o PostgREST nem chegue a avaliar as policies
-- de RLS; sem isso, qualquer SELECT/INSERT/UPDATE/DELETE falharia com
-- "permission denied for table configuracoes_sistema" mesmo com as
-- policies corretas (RLS restringe LINHAS, nao substitui o GRANT de
-- privilegio de OPERACAO na tabela). RLS (secao 4) continua sendo a camada
-- de seguranca real - o GRANT apenas autoriza authenticated a tentar a
-- operacao, e as policies decidem se cada linha e' visivel/gravavel.
-- anon nao recebe nenhum privilegio. Nenhuma funcao nova foi criada, logo
-- nao ha novo GRANT/REVOKE de funcao a fazer - has_permission(text) e
-- is_admin() ja tem EXECUTE concedido a authenticated desde a migration
-- 20260623100016_hardening_funcoes.sql.
revoke all on public.configuracoes_sistema from anon;
grant select, insert, update, delete on public.configuracoes_sistema to authenticated;

-- =========================================================================
-- 6. Seed minimo de configuracoes reais
-- =========================================================================
-- Espelha as chaves de modulo/fluxo ja existentes no sistema (ver
-- menuItems em script.js) com um valor booleano "ativo" simples em jsonb.
-- Nao inclui nada sensivel (sem senha, token, chave, URL secreta ou dado
-- privado) - apenas flags de visibilidade/ativacao de modulo, coerentes com
-- o que ja existe hoje no protótipo.

insert into public.configuracoes_sistema (chave, modulo, descricao, valor) values
  ('modulo_pacientes_ativo', 'sistema', 'Ativa o modulo Pacientes no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_atendimentos_ativo', 'sistema', 'Ativa o modulo Atendimentos no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_triagem_ativo', 'sistema', 'Ativa o modulo Triagem/Classificacao de Risco no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_consulta_ativo', 'sistema', 'Ativa o modulo Consulta no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_estabilizacao_ativo', 'sistema', 'Ativa o modulo Sala de Estabilizacao no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_transferencias_ativo', 'sistema', 'Ativa o modulo Transferencias no sistema.', '{"ativo": true}'::jsonb),
  ('modulo_relatorios_ativo', 'sistema', 'Ativa o modulo Relatorios no sistema.', '{"ativo": true}'::jsonb)
on conflict (chave) do nothing;

-- TODO (Fase 2 - fora do escopo desta migration): atualizar script.js para
-- ler/escrever configuracoes_sistema via window.GsiAuth.client (Supabase)
-- em vez de localStorage (gsi_saude_cfg_*), e aplicar gate de action
-- (isActionAllowed) em toggle-config seguindo o mesmo padrao ja usado nos
-- demais modulos (ver ESTABILIZACAO_CHECKLIST_ACTION_RULE).
-- TODO (avaliar separadamente): decidir se Auditoria deve ganhar uma
-- policy de SELECT propria no futuro (ex.: nova permissao
-- configuracoes.visualizar) - nesta fase, por decisao de produto explicita,
-- Auditoria NAO tem acesso a configuracoes_sistema.
