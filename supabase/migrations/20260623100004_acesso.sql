-- Migration: perfis de acesso, permissoes e vinculos (usuario_perfil, perfil_permissao)

create table perfis_acesso (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table permissoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  modulo text not null,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id)
);

create table perfil_permissao (
  perfil_id uuid not null references perfis_acesso (id) on delete cascade,
  permissao_id uuid not null references permissoes (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  primary key (perfil_id, permissao_id)
);

create table usuario_perfil (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  perfil_id uuid not null references perfis_acesso (id) on delete cascade,
  setor text,
  created_at timestamptz not null default now(),
  created_by uuid references usuarios (id),
  primary key (usuario_id, perfil_id)
);

-- Seeds ficticios/demonstrativos: perfis e permissoes propostos no relatorio v3.
-- Nao representam estrutura institucional oficial - "a validar" antes de uso real.

insert into perfis_acesso (nome, descricao) values
  ('Recepção', 'Cadastro de paciente, abertura de atendimento, chamadas'),
  ('Enfermagem', 'Triagem, classificação, alertas/alergias/comorbidades, evoluções, observação, estabilização'),
  ('Médico', 'Consulta, conduta, solicitação de exames, prescrição'),
  ('Diagnóstico/Exames', 'Visualização e gestão operacional de exames'),
  ('Farmácia', 'Estoque e dispensação'),
  ('Regulação/Transferências', 'Transferências, aprovação de vaga, confirmação de saída'),
  ('Administração', 'Configurações, usuários, perfis, permissões, domínios'),
  ('Auditoria', 'Leitura ampla read-only, incluindo audit_log');

insert into permissoes (chave, modulo, descricao) values
  ('paciente.criar', 'Pacientes', 'Cadastrar novo paciente'),
  ('paciente.alergia.registrar', 'Pacientes', 'Registrar/atualizar alergia do paciente'),
  ('paciente.comorbidade.registrar', 'Pacientes', 'Registrar/atualizar comorbidade do paciente'),
  ('atendimento.abrir', 'Atendimentos', 'Abrir novo atendimento'),
  ('triagem.classificar', 'Triagem', 'Confirmar classificação de risco na triagem'),
  ('consulta.iniciar', 'Consulta', 'Iniciar atendimento médico'),
  ('consulta.registrar_conduta', 'Consulta', 'Registrar conduta médica'),
  ('enfermagem.evolucao.registrar', 'Enfermagem', 'Registrar evolução de enfermagem'),
  ('observacao.reavaliar', 'Observação', 'Registrar reavaliação em observação'),
  ('estabilizacao.checklist_item', 'Estabilização', 'Marcar item do checklist de estabilização'),
  ('exame.solicitar', 'Exames', 'Solicitar exame'),
  ('exame.visualizar', 'Exames', 'Visualizar exames e resultados'),
  ('exame.liberar_resultado', 'Exames', 'Liberar resultado de exame'),
  ('exame.marcar_critico', 'Exames', 'Marcar resultado de exame como crítico'),
  ('prescricao.criar', 'Farmácia', 'Criar prescrição'),
  ('prescricao.dispensar', 'Farmácia', 'Dispensar item de prescrição'),
  ('estoque.movimentar', 'Estoque', 'Registrar movimentação de estoque'),
  ('transferencia.solicitar', 'Transferências', 'Solicitar transferência/regulação'),
  ('transferencia.aprovar_vaga', 'Transferências', 'Aprovar vaga de transferência'),
  ('transferencia.confirmar_saida', 'Transferências', 'Confirmar saída de transferência'),
  ('configuracoes.gerenciar', 'Configurações', 'Gerenciar usuários, perfis, permissões e domínios'),
  ('auditoria.visualizar', 'Auditoria', 'Visualizar trilha de auditoria');

-- Vinculo perfil x permissao, conforme tabela de permissoes do relatorio v3.
insert into perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from perfis_acesso pa
join permissoes p on (
  (pa.nome = 'Recepção' and p.chave in ('paciente.criar', 'atendimento.abrir')) or
  (pa.nome = 'Enfermagem' and p.chave in (
    'paciente.alergia.registrar', 'paciente.comorbidade.registrar', 'triagem.classificar',
    'enfermagem.evolucao.registrar', 'observacao.reavaliar', 'estabilizacao.checklist_item'
  )) or
  (pa.nome = 'Médico' and p.chave in (
    'paciente.alergia.registrar', 'paciente.comorbidade.registrar', 'consulta.iniciar',
    'consulta.registrar_conduta', 'observacao.reavaliar', 'exame.solicitar',
    'exame.visualizar', 'prescricao.criar', 'transferencia.solicitar'
  )) or
  (pa.nome = 'Diagnóstico/Exames' and p.chave in ('exame.visualizar', 'exame.liberar_resultado', 'exame.marcar_critico')) or
  (pa.nome = 'Farmácia' and p.chave in ('prescricao.dispensar', 'estoque.movimentar')) or
  (pa.nome = 'Regulação/Transferências' and p.chave in (
    'transferencia.aprovar_vaga', 'transferencia.confirmar_saida'
  )) or
  (pa.nome = 'Administração' and p.chave in (
    'paciente.criar', 'atendimento.abrir', 'estoque.movimentar', 'configuracoes.gerenciar'
  )) or
  (pa.nome = 'Auditoria' and p.chave in ('exame.visualizar', 'auditoria.visualizar'))
);
