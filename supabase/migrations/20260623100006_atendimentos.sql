-- Migration: atendimentos (episodio central do fluxo assistencial) e chamadas
-- Ver DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md: atendimento e' a central operacional;
-- triagem/consulta/observacao/estabilizacao/exames/prescricao/transferencia pertencem a ele.

create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id),
  status_id uuid not null references dom_status_atendimento (id),
  classificacao_risco_id uuid references dom_classificacao_risco (id),
  desfecho_id uuid references dom_desfechos (id),
  profissional_responsavel_id uuid references usuarios (id),
  queixa_principal text not null,
  etapa_atual text not null,
  setor_atual text,
  hora_chegada_ts timestamptz not null,
  hora_desfecho_ts timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table atendimentos is 'Episodio central do fluxo assistencial. classificacao_risco_id e desfecho_id sao nullable - preenchidos somente por acao explicita (triagem/conduta), nunca inferidos.';

create table chamadas (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  tipo_chamada text not null,
  local_chamada text,
  hora_chamada_ts timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

comment on table chamadas is 'Registro de evento de chamada. Nao altera atendimentos.status_id automaticamente (regra do documento mestre).';
