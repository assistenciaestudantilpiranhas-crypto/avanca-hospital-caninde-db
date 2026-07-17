# GSI ONE - Fluxo Assistencial e Perfis

Documento interno de alinhamento para preservar o fluxo assistencial, a responsabilidade dos perfis e a consistencia entre tela, `localStorage` e Supabase.

Este documento e uma referencia funcional e tecnica. Ele nao altera banco, codigo, RLS, permissoes ou regras em producao.

## 1. Perfis e responsabilidades

### Recepcao

- Cadastra paciente em `public.pacientes`.
- Abre atendimento inicial em `public.atendimentos`.
- Mantem dados administrativos e identificacao do paciente.
- Encaminha o paciente para triagem quando o atendimento esta aberto.
- Nao executa triagem, classificacao clinica, consulta medica, prescricao ou regulacao.

### Enfermeiro

- Executa a triagem operacional.
- Confirma a classificacao de risco por acao explicita.
- Registra a triagem em `public.triagens`.
- Pode atuar em evolucao de enfermagem, observacao e estabilizacao conforme permissoes aprovadas.
- Nao cria paciente.
- Nao abre atendimento.
- Nao faz consulta medica.
- Nao prescreve.
- Nao aprova vaga de transferencia.

### Tecnico em Enfermagem

- Atua em atividades assistenciais de enfermagem permitidas pelo perfil.
- Pode registrar evolucao de enfermagem e itens operacionais autorizados.
- Pode participar da triagem quando a regra de permissao permitir `triagem.classificar`.
- Nao confirma saida final de transferencia.
- Nao executa atos medicos, prescricao ou aprovacao de vaga.

### Medico

- Inicia consulta medica.
- Registra conduta medica.
- Solicita exames, prescreve e pode solicitar transferencia.
- Nao aprova vaga regulada.
- Nao substitui o registro proprio da triagem.

### Regulacao de Transferencia

- Acompanha e operacionaliza a transferencia regulada.
- Pode aprovar vaga quando possuir permissao especifica.
- Pode conduzir etapas de regulacao e saida conforme regra aprovada.
- Nao faz triagem.
- Nao faz consulta medica.
- Nao prescreve.

### Administracao

- Supervisiona configuracoes, usuarios, perfis, permissoes e auditoria.
- Pode ter permissao administrativa ampla para suporte e governanca.
- Nao deve ser usada como atalho para burlar fluxo assistencial.
- Deve preservar RLS, rastreabilidade e segregacao de responsabilidades.

## 2. Fluxo assistencial oficial

Fluxo oficial:

```text
Recepcao -> Triagem -> Consulta Medica -> Condutas -> Observacao/Estabilizacao/Alta/Transferencia
```

Etapas:

1. Recepcao cadastra o paciente e abre o atendimento.
2. Triagem executa escuta qualificada, sinais vitais, alertas clinicos e classificacao de risco.
3. Consulta medica inicia avaliacao medica somente apos classificacao ou regra assistencial validada.
4. Condutas direcionam o paciente para alta, observacao, estabilizacao, exames, prescricao ou transferencia.
5. Observacao, estabilizacao, alta e transferencia registram seus proprios eventos, tempos e desfechos.

## 3. Regra de atendimento ativo

- Um paciente pode ter varios atendimentos historicos.
- Um paciente nao pode ter mais de um atendimento ativo ou em andamento ao mesmo tempo.
- Antes de criar novo atendimento, o sistema deve verificar se ja existe atendimento ativo para o paciente.
- Se existir atendimento ativo, o sistema deve reutilizar esse atendimento.
- Novo atendimento so deve ser criado quando nao houver atendimento ativo.
- Atendimentos encerrados permanecem historicos e nao devem ser apagados para resolver duplicidade.

Status considerados ativos ou em andamento:

- `aguardando_triagem`
- `em_triagem`
- `aguardando_consulta`
- `em_consulta`
- `em_observacao`
- `em_estabilizacao`
- `em_transferencia_regulada`

Status de encerramento:

- `desfecho_registrado`

## 4. Diferencas conceituais

### Paciente cadastrado

Registro administrativo em `public.pacientes`.

Indica que a pessoa esta identificada no sistema, mas nao significa que exista episodio assistencial ativo.

### Atendimento aberto

Registro em `public.atendimentos`.

Representa um episodio assistencial em andamento ou historico. Deve conter status, etapa atual e vinculo com o paciente.

### Triagem registrada

Registro em `public.triagens`.

Representa ato assistencial de triagem, com classificacao sugerida, classificacao confirmada, sinais vitais, historia breve, justificativa e horarios.

### Atendimento aguardando consulta

Estado em `public.atendimentos` com status `aguardando_consulta`.

Deve ocorrer somente depois de triagem registrada ou regra assistencial validada. Nao substitui o registro em `public.triagens`.

## 5. Diferenca entre telas

### Triagem

Tela de execucao operacional da triagem pelo Enfermeiro ou perfil autorizado.

Responsabilidades:

- coletar dados da triagem;
- registrar sinais vitais;
- confirmar classificacao de risco;
- persistir `public.triagens`;
- avancar o atendimento para `aguardando_consulta` quando aplicavel.

### Classificacao de Risco

Painel de apoio, protocolo e monitoramento.

Responsabilidades:

- apoiar visualizacao de protocolos;
- acompanhar filas e prioridades;
- orientar monitoramento operacional;
- nao substituir a tela de execucao da triagem;
- nao criar atendimento nem registrar triagem real sem acao propria validada.

## 6. Tabelas envolvidas

- `public.pacientes`: cadastro administrativo do paciente.
- `public.atendimentos`: episodio assistencial, status, etapa atual, tempos e desfecho.
- `public.triagens`: ato de triagem, classificacao, sinais vitais, historia breve e horarios.
- `public.consultas`: ato medico, inicio de consulta, conduta e informacoes clinicas medicas.
- `public.evolucoes_enfermagem`: evolucoes e registros assistenciais de enfermagem.
- `public.observacoes`: permanencia em observacao e seus controles.
- `public.estabilizacoes`: permanencia e controles da sala de estabilizacao.
- `public.transferencias`: solicitacao, regulacao, aprovacao e saida de transferencia.
- `public.checklist_transferencia_itens`: itens de seguranca e preparo da transferencia.

## 7. Status esperados

- `aguardando_triagem`: atendimento aberto, paciente aguardando triagem.
- `em_triagem`: triagem iniciada e ainda nao concluida.
- `aguardando_consulta`: triagem concluida, paciente aguardando consulta medica.
- `em_consulta`: consulta medica iniciada.
- `em_observacao`: paciente em observacao.
- `em_estabilizacao`: paciente em sala de estabilizacao.
- `em_transferencia_regulada`: transferencia regulada em andamento.
- `desfecho_registrado`: atendimento encerrado com desfecho.

## 8. Regras que nao podem ser violadas

- Enfermeiro nao cria paciente.
- Enfermeiro nao abre atendimento.
- Enfermeiro nao faz consulta medica.
- Enfermeiro nao prescreve.
- Enfermeiro nao aprova vaga.
- Recepcao nao faz triagem.
- Regulacao nao faz triagem.
- Tecnico nao confirma saida final de transferencia.
- Medico solicita transferencia, mas nao aprova vaga.
- Administracao supervisiona e governa o sistema.

## 9. Problemas atuais encontrados

- Paciente visivel na tela sem persistencia correspondente em `public.pacientes`.
- Duplicidade de atendimentos reais ativos para Roberto Jose:
  - um atendimento em `aguardando_triagem`;
  - outro atendimento em `aguardando_consulta`.
- Necessidade de garantir persistencia em `public.triagens` antes de avancar atendimento para `aguardando_consulta`.
- Necessidade de funcao ou fluxo seguro para buscar ou criar atendimento ativo.
- Correcoes isoladas em fluxo assistencial podem interferir em outros modulos quando nao existe regra central para atendimento ativo.

## 10. Proposta tecnica futura

Sem implementar agora, avaliar a criacao de helper no frontend ou RPC futura:

```text
obterOuCriarAtendimentoAtivo(paciente_id)
```

O helper deve:

1. Buscar atendimento ativo existente para o paciente.
2. Reutilizar o atendimento ativo se existir.
3. Criar novo atendimento somente se nao existir atendimento ativo.
4. Impedir duplicidade de atendimento ativo.
5. Retornar de forma explicita se o atendimento foi reutilizado ou criado.
6. Nunca criar atendimento para paciente inexistente em `public.pacientes`.
7. Preservar historico e auditabilidade de atendimentos encerrados.

Essa proposta deve ser avaliada com cuidado porque toca regra assistencial, integridade de dados, RLS e rastreabilidade clinica.
