-- Migration: pacientes (cadastro estavel) e dados clinicos persistentes do paciente
-- Ver DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md: paciente e' cadastro estavel,
-- nao carrega status de fluxo (isso pertence a atendimentos).

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date not null,
  cpf text,
  cartao_sus text,
  telefone text,
  municipio text not null,
  perfil_residencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table pacientes is 'Cadastro estavel do paciente. Dados ficticios no prototipo - nunca usar CPF/CNS/nomes reais.';

create table paciente_alergias (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  descricao text not null,
  gravidade text,
  origem_registro text,
  registrado_por uuid references usuarios (id),
  registrado_em_ts timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table paciente_comorbidades (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  descricao text not null,
  observacoes text,
  registrado_por uuid references usuarios (id),
  registrado_em_ts timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table paciente_medicamentos_continuos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  medicamento text not null,
  dose text,
  frequencia text,
  registrado_por uuid references usuarios (id),
  registrado_em_ts timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table paciente_alertas_clinicos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  tipo_alerta text not null,
  descricao text,
  registrado_por uuid references usuarios (id),
  registrado_em_ts timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table paciente_alergias is 'Registrado/atualizado pela triagem (ou consulta), pertence ao paciente, visivel a consulta/enfermagem/observacao/estabilizacao.';
comment on table paciente_comorbidades is 'Idem paciente_alergias.';
comment on table paciente_medicamentos_continuos is 'Idem paciente_alergias.';
comment on table paciente_alertas_clinicos is 'Idem paciente_alergias - ex.: gestacao, uso recente de medicacao, tratamento em andamento.';
