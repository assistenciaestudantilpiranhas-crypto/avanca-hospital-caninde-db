-- Migration: exames

create table exames (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  status_id uuid not null references dom_status_exame (id),
  solicitante_id uuid references usuarios (id),
  exame text not null,
  tipo text not null,
  origem text,
  prioridade text,
  resultado text,
  hora_solicitacao_ts timestamptz not null,
  hora_liberacao_ts timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table exames is 'Solicitar exame nao altera desfecho do paciente automaticamente. Resultado critico fica como status proprio (dom_status_exame.codigo = critico).';
