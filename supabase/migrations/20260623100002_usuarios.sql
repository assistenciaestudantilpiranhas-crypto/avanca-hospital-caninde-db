-- Migration: usuarios (cadastro institucional, vinculado ao auth.users do Supabase)
-- Nao cria tela de login nem fluxo de autenticacao - apenas a estrutura de dados.

create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  categoria_profissional text not null,
  registro_profissional text,
  email text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table usuarios is 'Cadastro institucional de profissionais/operadores. 1:1 com auth.users. Dados ficticios no prototipo.';
