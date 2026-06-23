# Documento Mestre do Fluxo Assistencial do Paciente

Este documento define a regra funcional de referência para o fluxo assistencial do paciente no protótipo GSI Saúde. Antes de qualquer alteração em fluxo assistencial, status do paciente, tempos, indicadores, consulta, triagem, observação, sala de estabilização, transferência, enfermagem, farmácia, exames ou desfechos, este documento deve ser lido obrigatoriamente.

## Princípios

- O sistema é um protótipo visual, sem backend real e sem banco de dados real.
- Todos os dados são fictícios e persistidos em `localStorage` por meio de `GsiApi`.
- Nenhuma mudança deve criar dados reais de pacientes, CNES, CPF, CNS, indicadores oficiais ou informações institucionais não validadas.
- O fluxo assistencial deve preservar rastreabilidade: entrada, triagem, classificação, consulta, observação, estabilização, exames, medicação, transferência e desfecho.
- Status de paciente e tempos assistenciais só devem mudar por ação funcional explícita do usuário ou regra já existente no fluxo.
- Indicadores e relatórios devem usar registros existentes, sem inventar horários ou resultados.

## Aba Atendimentos — Central operacional do fluxo assistencial

### Definição

A aba **Atendimentos** representa a central operacional dos atendimentos ativos da unidade. Sua função é acompanhar o fluxo assistencial em tempo real, permitindo visualizar onde cada paciente se encontra dentro do percurso assistencial, desde a abertura da ficha até o desfecho final.

A aba não substitui os módulos assistenciais específicos. Ela organiza a visão geral do atendimento em curso e direciona o usuário para o módulo adequado quando houver necessidade de continuidade do cuidado.

### Finalidade da aba

A aba Atendimentos deve permitir identificar:

- quais pacientes estão em atendimento ativo;
- em qual etapa assistencial cada paciente se encontra;
- há quanto tempo o paciente permanece na etapa atual;
- qual é o tempo total desde a chegada à unidade;
- qual a classificação de risco;
- qual o status atual;
- qual profissional ou setor está responsável;
- qual é o próximo direcionamento operacional.

### Regra conceitual

A regra principal da aba Atendimentos é:

**Atendimentos acompanha o fluxo; os módulos assistenciais executam o cuidado.**

Isso significa que a aba Atendimentos deve servir como painel de acompanhamento e gestão operacional, enquanto as ações clínicas e assistenciais devem permanecer nos módulos próprios.

### O que a aba Atendimentos deve exibir

A tela deve priorizar informações como:

- paciente;
- horário de chegada;
- classificação de risco;
- etapa atual;
- status atual;
- tempo na etapa;
- permanência total;
- profissional ou setor responsável;
- acesso ao prontuário;
- acesso ao módulo correspondente.

### Etapas que podem aparecer na aba Atendimentos

A aba pode exibir pacientes nas seguintes situações:

- aguardando triagem;
- em triagem;
- aguardando consulta;
- em consulta;
- em enfermagem/medicação;
- em observação clínica;
- em observação pediátrica;
- em observação obstétrica;
- em sala de estabilização;
- em transferência regulada;
- com desfecho final registrado nas últimas 24 horas.

### Ações permitidas

As ações da aba Atendimentos devem ser prioritariamente de consulta, acompanhamento e direcionamento, como:

- ver prontuário;
- acessar etapa correspondente;
- acompanhar situação do atendimento;
- visualizar tempos e pendências.

### Ações que não devem ser concentradas nesta aba

A aba Atendimentos não deve concentrar ações assistenciais específicas, como:

- iniciar triagem;
- registrar classificação de risco;
- prescrever medicação;
- solicitar exames;
- registrar conduta médica;
- dar alta;
- confirmar transferência;
- registrar evolução de enfermagem;
- concluir checklist assistencial.

Essas ações devem permanecer nos módulos próprios, conforme a etapa do cuidado:

- Triagem;
- Consulta;
- Enfermagem;
- Farmácia;
- Exames;
- Observação Clínica;
- Observação Pediátrica;
- Observação Obstétrica;
- Sala de Estabilização;
- Transferências.

### Relação com os indicadores

A aba Atendimentos deve utilizar os tempos registrados no fluxo assistencial para demonstrar a situação operacional da unidade, especialmente:

- tempo desde a chegada;
- tempo na etapa atual;
- tempo até triagem;
- tempo entre triagem e consulta;
- tempo em observação;
- tempo em transferência;
- permanência total.

Essas informações devem ser derivadas dos eventos reais registrados no atendimento, sem criação de dados fictícios.

### Relação com a lista de pacientes

A aba Atendimentos difere da aba Pacientes.

A aba **Pacientes** tem função de consulta, busca, identificação, prontuário e lista operacional das últimas 24 horas.

A aba **Atendimentos** tem função de acompanhamento do fluxo ativo da unidade, permitindo visualizar a situação operacional dos atendimentos em andamento.

### Regra de preservação funcional

A aba Atendimentos não deve alterar regras clínicas, status internos, tempos, desfechos ou dados assistenciais sem validação prévia.

Qualquer mudança funcional nessa aba deve respeitar o Documento Mestre do Fluxo Assistencial do Paciente.

## Entrada do Paciente

O paciente entra no sistema pela recepção/porta de entrada ou pelo cadastro direto.

Campos esperados quando disponíveis:

- `horaChegada`
- `horaChegadaTs`
- identificação fictícia do paciente
- município/origem
- queixa principal
- status inicial, geralmente `Aguardando triagem`

Regra:

- A chegada representa o início da permanência do paciente na unidade.
- A permanência deve ser calculada a partir de `horaChegadaTs` e `horaDesfechoTs`, quando ambos existirem.

## Triagem e Classificação de Risco

A triagem registra sinais vitais, queixa, alertas clínicos e classificação de risco. Ela deve coletar dados objetivos e alertas clínicos mínimos para apoiar a classificação de risco, a segurança da prescrição e a continuidade do cuidado.

O sistema pode sugerir automaticamente uma classificação de risco com base nos sinais, sintomas e respostas preenchidas no formulário. A confirmação final da classificação de risco deve ser registrada pelo enfermeiro responsável.

Regra conceitual:

- O sistema sugere; o enfermeiro classifica.

O formulário de triagem deve manter os campos atuais já existentes e acrescentar, quando implementado, os seguintes blocos de informação:

### Bloco A — Profissional responsável pela triagem

- nome do profissional
- categoria profissional
- registro profissional, quando disponível
- hora de início da triagem
- hora de fim da triagem

### Bloco B — História breve/escuta qualificada

- queixa principal
- início dos sintomas
- tempo de evolução
- sintomas associados
- fator de piora ou melhora, quando informado
- observações relevantes da triagem

### Bloco C — Sinais vitais e dados objetivos

- pressão arterial
- frequência cardíaca
- frequência respiratória
- saturação de O2
- temperatura
- glicemia capilar, quando indicada
- escala de dor de 0 a 10
- nível de consciência, quando aplicável

### Bloco D — Alertas clínicos

- alergias
- medicamentos de uso contínuo
- comorbidades
- tratamento em andamento
- uso recente de medicação antes da chegada
- gestação ou suspeita de gestação, quando aplicável
- outros alertas relevantes

### Bloco E — Classificação de risco

- classificação sugerida pelo sistema, quando aplicável
- classificação confirmada pelo enfermeiro
- justificativa da classificação
- prioridade
- orientação inicial da triagem, quando houver

Campos esperados quando disponíveis:

- `horaInicioTriagem`
- `horaInicioTriagemTs`
- `horaFimTriagem`
- `horaFimTriagemTs`
- `sinaisVitais`
- `triagemRisco`
- `classificacao`

Os dados da triagem devem alimentar:

- o prontuário do atendimento atual
- o resumo clínico exibido ao médico no modal Registrar conduta
- os indicadores de tempo e classificação de risco

Os dados de alergias, comorbidades, medicações em uso, tratamento em andamento e sinais vitais devem estar visíveis ao médico antes do registro da conduta, prescrição ou solicitação de exames.

Regra:

- A classificação final deve ser registrada por ação de triagem.
- A conclusão da triagem pode encaminhar o paciente para consulta ou outro fluxo previsto.
- Não alterar classificação, status ou horários de triagem fora das ações próprias da triagem.

## Consulta

A consulta atende pacientes classificados e pacientes em avaliação médica.

Campos esperados quando disponíveis:

- `horaChamadaConsulta`
- `horaInicioConsulta`
- `horaInicioConsultaTs`
- `profissionalResponsavel`
- `consultorioAtual`
- `conduta`

Regra:

- Chamar paciente para consulta não deve iniciar consulta automaticamente.
- Iniciar consulta registra início de atendimento médico.
- Registrar conduta pode encaminhar para alta, observação, sala de estabilização, exame, prescrição ou transferência regulada.
- Desfechos definitivos devem registrar `horaDesfecho` e `horaDesfechoTs` quando aplicável.

## Observação Clínica, Pediátrica e Obstétrica

A observação acompanha pacientes que precisam permanecer sob avaliação.

Campos esperados quando disponíveis:

- `observacaoClinica`
- `observacaoPediatrica`
- `observacaoObstetrica`
- `inicio`
- `inicioTimestamp`
- `origem`
- `reavaliacoes`

Regra:

- Paciente em observação permanece na fila correspondente até alta da observação, encaminhamento para estabilização, transferência ou outro desfecho validado.
- Reavaliações devem ser registradas manualmente.
- Alta da observação altera status/desfecho apenas por ação própria.

## Sala de Estabilização

A sala de estabilização acompanha pacientes graves ou instáveis.

Campos esperados quando disponíveis:

- `estabilizacao`
- `checklistEstabilizacao`
- `reavaliacoes`

Regra:

- O checklist de estabilização é individual por paciente.
- Marcar checklist não deve conceder alta, transferir ou alterar desfecho automaticamente.
- Paciente permanece em estabilização até nova conduta profissional.

## Exames

Exames são solicitações vinculadas ao paciente e ao fluxo assistencial.

Campos esperados quando disponíveis:

- `pacienteId`
- `paciente`
- `exame`
- `tipo`
- `origem`
- `solicitante`
- `horario`
- `status`
- `prioridade`
- `resultado`
- `horarioLiberacao`

Regra:

- Solicitar exame não altera o desfecho do paciente automaticamente.
- Resultado crítico deve ser registrado como status próprio quando aplicável.
- Indicadores de exames devem usar horários existentes, sem criar tempos fictícios.

## Farmácia e Prescrição

Prescrições e dispensações apoiam o fluxo assistencial.

Campos esperados quando disponíveis:

- `paciente`
- `medicamento`
- `dose`
- `via`
- `horario`
- `prescritor`
- `status`

Regra:

- Prescrever ou dispensar medicação não deve alterar status assistencial do paciente automaticamente, salvo regra explicitamente definida.
- Falta de medicamento deve ser registrada como status da prescrição/estoque, não como desfecho do paciente.

## Transferências

A transferência representa regulação, preparação, saída e desfecho assistencial.

Campos já usados quando disponíveis:

- `pacienteId`
- `paciente`
- `motivo`
- `destino`
- `status`
- `acompanhante`
- `checklist`
- `saida`
- `tipoTransporte`
- `usouAmbulancia`

Campos recomendados quando for necessário reforçar rastreabilidade:

- `horaSolicitacaoTransferencia`
- `horaSolicitacaoTransferenciaTs`
- `horaAprovacaoVaga`
- `horaAprovacaoVagaTs`
- `horaSaidaTransferencia`
- `horaSaidaTransferenciaTs`

Regra:

- O paciente entra em Transferências quando há solicitação de transferência/regulação.
- Enquanto não houver saída confirmada, a transferência permanece em andamento.
- Aprovar vaga deve alterar apenas o status de regulação, por exemplo `Vaga confirmada`, sem retirar o paciente da lista de andamento.
- Completar checklist deve abrir modal ou caixa de checklist.
- O clique no botão da tabela não deve concluir automaticamente o checklist.
- O checklist só deve ficar `Completo` após confirmação explícita dentro do modal.
- Confirmar saída representa a conclusão real da transferência.
- Ao confirmar saída, o sistema deve registrar horário de saída, atualizar status/desfecho do paciente para `Transferência regulada` ou equivalente validado, retirar da lista de transferências em andamento e manter o registro para histórico, indicadores e relatórios.
- Transferências concluídas não devem aparecer na tabela de transferências em andamento.
- Histórico de transferências deve permanecer nos dados e em relatórios/indicadores já existentes. Não criar nova seção de concluídos sem autorização.

## Desfechos

Desfechos encerram ou redirecionam o atendimento.

Exemplos de desfecho:

- `Alta`
- `Alta da observação`
- `Medicação e alta`
- `Transferência regulada`
- `Evasão/desistência`
- `Óbito`
- `Sala de estabilização`
- `Observação Clínica`
- `Observação Pediátrica`
- `Observação Obstétrica`

Regra:

- Desfecho definitivo deve registrar horário de desfecho quando aplicável.
- Desfechos não devem ser alterados por ações visuais ou por simples navegação de tela.
- Não apagar histórico assistencial ao mudar status.

## Tempos Assistenciais

Tempos devem ser calculados com base em campos existentes.

Tempos principais:

- chegada até triagem
- triagem até consulta
- consulta até desfecho
- permanência na unidade
- solicitação de transferência até saída, quando os campos existirem
- aprovação de vaga até saída, quando os campos existirem

Regra:

- Não inventar horários para completar indicadores.
- Se um campo não existir, exibir `Sem dados suficientes`, `Aguardando registro` ou `a validar`, conforme contexto.
- Campos `Ts` devem ser usados para cálculo quando existirem.

## Indicadores e Relatórios

Indicadores e relatórios devem ler dados já registrados.

Regra:

- Não alterar indicador para compensar falha de fluxo sem corrigir a origem do dado.
- Não remover registros concluídos da base, pois eles alimentam relatórios e indicadores.
- Transferências concluídas devem sair da lista operacional de andamento, mas permanecer disponíveis para relatórios e indicadores.

## Regra de Segurança Para Alterações

Antes de alterar qualquer trecho relacionado a fluxo assistencial, status do paciente, tempos, indicadores, consulta, triagem, observação, sala de estabilização, transferência, enfermagem, farmácia, exames ou desfechos:

1. Ler este documento.
2. Identificar quais status e horários serão afetados.
3. Confirmar se a alteração muda fluxo assistencial ou apenas apresentação visual.
4. Fazer a menor mudança possível.
5. Preservar dados fictícios e compatibilidade com publicação estática.
6. Testar o caminho funcional afetado.
