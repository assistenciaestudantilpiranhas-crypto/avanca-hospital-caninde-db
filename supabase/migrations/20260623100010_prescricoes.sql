-- Migration: prescricoes (cabecalho) e prescricao_itens
-- Depois de criar prescricao_itens, adiciona a FK pendente em estoque_movimentacoes.

create table prescricoes (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  prescritor_id uuid references usuarios (id),
  hora_prescricao_ts timestamptz not null,
  observacoes_gerais text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table prescricao_itens (
  id uuid primary key default gen_random_uuid(),
  prescricao_id uuid not null references prescricoes (id) on delete cascade,
  status_id uuid not null references dom_status_prescricao (id),
  medicamento_id uuid references estoque_itens (id),
  medicamento_nome text not null,
  dose text,
  via text,
  hora_administracao_ts timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table prescricao_itens is 'Status de item de prescricao nao altera atendimentos.status_id automaticamente (regra do documento mestre).';

alter table estoque_movimentacoes
  add constraint estoque_movimentacoes_prescricao_item_id_fkey
  foreign key (prescricao_item_id) references prescricao_itens (id);
