-- Migration: tabelas de dominio (substituem enum nativo do Postgres)
-- Protótipo GSI Saude - dados de dominio institucionais, fictícios/demonstrativos.
-- Ver DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md para a regra de cada status/desfecho.

create extension if not exists "pgcrypto";

create table dom_status_atendimento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_desfechos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_classificacao_risco (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_tipos_observacao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_status_transferencia (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_status_prescricao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table dom_status_exame (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- Seeds ficticios/demonstrativos, conforme valores ja usados no prototipo (api.js / script.js)

insert into dom_status_atendimento (codigo, descricao, ordem) values
  ('aguardando_triagem', 'Aguardando triagem', 1),
  ('em_triagem', 'Em triagem', 2),
  ('aguardando_consulta', 'Aguardando consulta', 3),
  ('em_consulta', 'Em consulta', 4),
  ('em_enfermagem_medicacao', 'Em enfermagem/medicação', 5),
  ('em_observacao', 'Em observação', 6),
  ('em_estabilizacao', 'Em sala de estabilização', 7),
  ('em_transferencia_regulada', 'Em transferência regulada', 8),
  ('desfecho_registrado', 'Desfecho registrado', 9);

insert into dom_desfechos (codigo, descricao, ordem) values
  ('alta', 'Alta', 1),
  ('alta_observacao', 'Alta da observação', 2),
  ('medicacao_alta', 'Medicação e alta', 3),
  ('transferencia_regulada', 'Transferência regulada', 4),
  ('evasao_desistencia', 'Evasão/desistência', 5),
  ('obito', 'Óbito', 6);

insert into dom_classificacao_risco (codigo, descricao, ordem) values
  ('azul', 'Azul', 1),
  ('verde', 'Verde', 2),
  ('amarelo', 'Amarelo', 3),
  ('laranja', 'Laranja', 4),
  ('vermelho', 'Vermelho', 5);

insert into dom_tipos_observacao (codigo, descricao, ordem) values
  ('clinica', 'Observação Clínica', 1),
  ('pediatrica', 'Observação Pediátrica', 2),
  ('obstetrica', 'Observação Obstétrica', 3);

insert into dom_status_transferencia (codigo, descricao, ordem) values
  ('em_analise', 'Em análise', 1),
  ('aguardando_vaga', 'Aguardando vaga', 2),
  ('vaga_confirmada', 'Vaga confirmada', 3),
  ('concluida', 'Concluída', 4);

insert into dom_status_prescricao (codigo, descricao, ordem) values
  ('pendente', 'Pendente', 1),
  ('separado', 'Separado', 2),
  ('em_falta', 'Em falta', 3),
  ('administrado', 'Administrado', 4);

insert into dom_status_exame (codigo, descricao, ordem) values
  ('solicitado', 'Solicitado', 1),
  ('em_execucao', 'Em execução', 2),
  ('concluido', 'Concluído', 3),
  ('critico', 'Crítico', 4);
