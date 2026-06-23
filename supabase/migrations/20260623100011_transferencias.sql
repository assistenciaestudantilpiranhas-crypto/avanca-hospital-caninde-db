-- Migration: transferencias e checklist_transferencia_itens

create table transferencias (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  status_id uuid not null references dom_status_transferencia (id),
  motivo text not null,
  destino text not null,
  acompanhante text,
  tipo_transporte text,
  usou_ambulancia boolean,
  hora_solicitacao_ts timestamptz not null,
  hora_aprovacao_vaga_ts timestamptz,
  hora_saida_ts timestamptz,
  checklist_confirmado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table transferencias is 'Aprovar vaga so altera status_id. Checklist so fecha por confirmacao explicita (checklist_confirmado_em). Confirmar saida grava hora_saida_ts e atualiza atendimentos.desfecho_id/status_id na aplicacao - registro nunca e deletado.';

create table checklist_transferencia_itens (
  id uuid primary key default gen_random_uuid(),
  transferencia_id uuid not null references transferencias (id) on delete cascade,
  item text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  concluido_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table checklist_transferencia_itens is 'Clique na tabela nao conclui automaticamente o checklist - so apos confirmacao explicita dentro do modal (regra do documento mestre).';
