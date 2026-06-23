-- Migration: estoque_itens e estoque_movimentacoes
-- Regra obrigatoria: quantidade_atual nao deve ser alterada manualmente; toda
-- alteracao ocorre via INSERT em estoque_movimentacoes (recalculo por trigger/view futura).

create table estoque_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade_atual numeric not null default 0,
  quantidade_minima numeric not null default 0,
  validade date,
  local text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table estoque_itens is 'quantidade_atual e derivada de estoque_movimentacoes. Nao deve ser editada diretamente pela aplicacao - ver trigger de recalculo (migration futura).';

create table estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references estoque_itens (id) on delete cascade,
  responsavel_id uuid references usuarios (id),
  prescricao_item_id uuid,
  tipo_movimentacao text not null check (tipo_movimentacao in ('entrada', 'saida', 'ajuste')),
  quantidade numeric not null,
  hora_movimentacao_ts timestamptz not null,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table estoque_movimentacoes is 'Fonte de verdade da quantidade de estoque_itens. FK para prescricao_item_id e adicionada apos a criacao de prescricao_itens.';
