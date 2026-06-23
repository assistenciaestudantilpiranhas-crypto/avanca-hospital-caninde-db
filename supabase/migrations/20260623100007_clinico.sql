-- Migration: bloco clinico - triagens, consultas, evolucoes_enfermagem,
-- observacoes, reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens

create table triagens (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  profissional_id uuid references usuarios (id),
  classificacao_sugerida_id uuid references dom_classificacao_risco (id),
  classificacao_confirmada_id uuid references dom_classificacao_risco (id),
  hora_inicio_ts timestamptz not null,
  hora_fim_ts timestamptz,
  historia_breve text,
  sinais_vitais jsonb,
  justificativa_classificacao text,
  prioridade text,
  orientacao_inicial text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table triagens is 'Sistema sugere (classificacao_sugerida_id); enfermeiro classifica (classificacao_confirmada_id), por acao explicita.';

create unique index triagens_atendimento_ativa_idx on triagens (atendimento_id) where hora_fim_ts is null;

create table consultas (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  profissional_id uuid references usuarios (id),
  consultorio text,
  hora_inicio_ts timestamptz not null,
  hora_fim_ts timestamptz,
  hipotese_diagnostica text,
  cid text,
  conduta text,
  desfecho_proposto text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table consultas is 'Campo cid fica "a validar" quando nao informado - nao inventar codificacao oficial.';

create table evolucoes_enfermagem (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  profissional_id uuid references usuarios (id),
  setor text,
  tipo_registro text not null,
  descricao text,
  sinais_vitais jsonb,
  hora_registro_ts timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table observacoes (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  tipo_id uuid not null references dom_tipos_observacao (id),
  origem text,
  inicio_ts timestamptz not null,
  fim_ts timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table reavaliacoes_observacao (
  id uuid primary key default gen_random_uuid(),
  observacao_id uuid not null references observacoes (id) on delete cascade,
  profissional_id uuid references usuarios (id),
  hora_ts timestamptz not null,
  anotacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table estabilizacoes (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  inicio_ts timestamptz not null,
  fim_ts timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table checklist_estabilizacao_itens (
  id uuid primary key default gen_random_uuid(),
  estabilizacao_id uuid not null references estabilizacoes (id) on delete cascade,
  item text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  concluido_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table checklist_estabilizacao_itens is 'Marcar item nao concede alta/transfere/altera desfecho automaticamente (regra do documento mestre).';
