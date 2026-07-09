-- Migration: bloqueio de DELETE fisico assistencial e audit_log append-only - GSI ONE
-- Escopo aprovado: Fase 1 de correcao segura.
--
-- Esta migration NAO altera policies select_linked, NAO cria views por perfil,
-- NAO cria escopo por unidade/setor/vinculo, NAO implementa versionamento
-- clinico completo e NAO altera frontend.
--
-- Objetivos:
-- 1. Adicionar campos minimos de inativacao logica em tabelas assistenciais.
-- 2. Bloquear DELETE fisico em dados assistenciais sensiveis.
-- 3. Reforcar que audit_log rejeita UPDATE/DELETE direto.
-- 4. Preparar audit_log para modelo append-only com metadados de encadeamento.

-- =========================================================================
-- 1. Campos minimos para inativacao logica (soft delete)
-- =========================================================================
-- Os campos abaixo sao nullable para preservar compatibilidade com dados e
-- fluxos existentes. Nenhuma linha e alterada por esta migration.

do $$
declare
  protected_table text;
begin
  for protected_table in select unnest(array[
    'pacientes',
    'paciente_alergias',
    'paciente_comorbidades',
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos',
    'atendimentos',
    'chamadas',
    'triagens',
    'consultas',
    'evolucoes_enfermagem',
    'observacoes',
    'reavaliacoes_observacao',
    'estabilizacoes',
    'checklist_estabilizacao_itens',
    'exames',
    'prescricoes',
    'prescricao_itens',
    'transferencias',
    'checklist_transferencia_itens'
  ])
  loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz;', protected_table);
    execute format('alter table public.%I add column if not exists deleted_by uuid references public.usuarios (id);', protected_table);
    execute format('alter table public.%I add column if not exists delete_reason text;', protected_table);
  end loop;
end $$;

comment on column public.pacientes.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preencher somente por fluxo administrativo validado.';
comment on column public.atendimentos.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar historico assistencial.';
comment on column public.triagens.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar rastreabilidade clinica.';
comment on column public.consultas.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar rastreabilidade clinica.';
comment on column public.exames.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar solicitacao/resultado.';
comment on column public.prescricoes.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar prescricao.';
comment on column public.transferencias.deleted_at is 'Inativacao logica. DELETE fisico e bloqueado por trigger; preservar regulacao/saida.';

-- =========================================================================
-- 2. Bloqueio estrutural de DELETE fisico em tabelas assistenciais
-- =========================================================================
-- O bloqueio por trigger complementa RLS/GRANT: mesmo que uma policy futura
-- ou role elevada tente remover registros assistenciais via DELETE, a regra
-- de produto permanece append/preservacao historica. Correcoes operacionais
-- devem usar os campos deleted_* adicionados acima, nunca DELETE fisico.

create or replace function public.fn_block_assistential_physical_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'DELETE fisico em %.% nao e permitido. Use inativacao logica com deleted_at, deleted_by e delete_reason.',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME;
end;
$$;

comment on function public.fn_block_assistential_physical_delete() is
  'Bloqueia DELETE fisico em tabelas assistenciais sensiveis. Remocao operacional deve ser feita por inativacao logica auditavel.';

do $$
declare
  protected_table text;
begin
  for protected_table in select unnest(array[
    'pacientes',
    'paciente_alergias',
    'paciente_comorbidades',
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos',
    'atendimentos',
    'chamadas',
    'triagens',
    'consultas',
    'evolucoes_enfermagem',
    'observacoes',
    'reavaliacoes_observacao',
    'estabilizacoes',
    'checklist_estabilizacao_itens',
    'exames',
    'prescricoes',
    'prescricao_itens',
    'transferencias',
    'checklist_transferencia_itens'
  ])
  loop
    execute format('drop trigger if exists trg_block_delete_%I on public.%I;', protected_table, protected_table);
    execute format(
      'create trigger %I before delete on public.%I for each row execute function public.fn_block_assistential_physical_delete();',
      'trg_block_delete_' || protected_table,
      protected_table
    );
  end loop;
end $$;

-- =========================================================================
-- 3. audit_log append-only: bloqueio de UPDATE/DELETE e metadados futuros
-- =========================================================================
-- audit_log ja nao concede INSERT/UPDATE/DELETE a authenticated/anon nas
-- migrations anteriores. Aqui adicionamos bloqueio por trigger para impedir
-- alteracao direta mesmo se privilegios/policies forem ampliados por engano.
-- Os campos hash_* e sequencia_auditoria preparam o encadeamento futuro sem
-- exigir backfill nem alterar a funcao atual de auditoria nesta fase.

alter table public.audit_log
  add column if not exists sequencia_auditoria bigint,
  add column if not exists hash_anterior text,
  add column if not exists hash_atual text,
  add column if not exists append_only_metadata jsonb not null default '{}'::jsonb;

comment on column public.audit_log.sequencia_auditoria is 'Preparacao para encadeamento append-only futuro. Nullable para preservar logs existentes.';
comment on column public.audit_log.hash_anterior is 'Preparacao para hash encadeado de auditoria. Nullable nesta fase.';
comment on column public.audit_log.hash_atual is 'Preparacao para hash encadeado de auditoria. Nullable nesta fase.';
comment on column public.audit_log.append_only_metadata is 'Metadados tecnicos futuros do modelo append-only; nao substitui dados_antes/dados_depois.';

create or replace function public.fn_block_audit_log_update_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    '% direto em audit_log nao e permitido. A trilha de auditoria e append-only.',
    TG_OP;
end;
$$;

comment on function public.fn_block_audit_log_update_delete() is
  'Bloqueia UPDATE/DELETE direto em audit_log. Novos registros devem ser criados apenas pelos triggers/funcoes autorizadas.';

drop trigger if exists trg_block_update_audit_log on public.audit_log;
create trigger trg_block_update_audit_log
  before update on public.audit_log
  for each row execute function public.fn_block_audit_log_update_delete();

drop trigger if exists trg_block_delete_audit_log on public.audit_log;
create trigger trg_block_delete_audit_log
  before delete on public.audit_log
  for each row execute function public.fn_block_audit_log_update_delete();

revoke insert, update, delete on table public.audit_log from authenticated;
revoke insert, update, delete on table public.audit_log from anon;

-- =========================================================================
-- 4. Hardening de EXECUTE das novas funcoes
-- =========================================================================
-- Funcoes de trigger nao devem ser chamadas como RPC pelo cliente.

revoke execute on function public.fn_block_assistential_physical_delete() from public;
revoke execute on function public.fn_block_assistential_physical_delete() from anon;
revoke execute on function public.fn_block_assistential_physical_delete() from authenticated;

revoke execute on function public.fn_block_audit_log_update_delete() from public;
revoke execute on function public.fn_block_audit_log_update_delete() from anon;
revoke execute on function public.fn_block_audit_log_update_delete() from authenticated;

comment on table public.audit_log is
  'Trilha de auditoria append-only. INSERT operacional ocorre por trigger/funcoes autorizadas; UPDATE/DELETE direto bloqueado por trigger e sem GRANT a anon/authenticated.';
