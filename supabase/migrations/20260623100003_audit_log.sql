-- Migration: audit_log (criada cedo, antes das tabelas assistenciais)
-- Triggers de auditoria por tabela ficam para migration posterior (apos todas as tabelas existirem).
-- Regra obrigatoria: audit_log nao permite UPDATE nem DELETE, somente INSERT e SELECT.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id),
  tabela_afetada text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('insert', 'update', 'delete')),
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

comment on table audit_log is 'Trilha de auditoria. Somente INSERT/SELECT - ver regra de protecao contra UPDATE/DELETE aplicada via RLS em migration futura.';

-- Bloqueio estrutural minimo: nenhuma regra de UPDATE/DELETE e' definida aqui de proposito.
-- A proibicao efetiva de UPDATE/DELETE deve ser implementada via RLS (REVOKE + policies),
-- na migration de RLS, junto com a concessao de SELECT/INSERT por perfil.
