# GSI ONE — Matriz de Leitura por Perfil e Módulo

**Documento:** GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A  
**Etapa:** 5B.8.5A  
**Status:** Documento de definição — nenhuma alteração de banco, código ou migration  
**Elaborado em:** 2026-07-24  
**Pré-requisito lido:** GSI_ONE_RLS_VINCULO_POR_LINHA_DIAGNOSTICO_5B8_5.md  

---

## 1. Perfis considerados

Os perfis abaixo correspondem aos registros existentes em `perfis_acesso` após as migrations aplicadas. Os dois últimos (`usuário sem perfil` e `usuário inativo`) são estados de sessão, não perfis cadastrados.

| Código interno | Nome em `perfis_acesso` | Situação |
|---|---|---|
| `RECEPCAO` | Recepção | Ativo no banco e no frontend |
| `TEC_ENF` | Técnico em Enfermagem | Ativo no banco e no frontend |
| `ENFERMEIRO` | Enfermeiro | Ativo no banco; presente em gates do frontend |
| `MEDICO` | Médico | Ativo no banco e no frontend |
| `FARMACIA` | Farmácia | Ativo no banco e no frontend |
| `REGULACAO` | Regulação de Transferência | Ativo no banco e no frontend |
| `ADMIN` | Administração | Ativo no banco e no frontend |
| `AUDITORIA` | Auditoria | Ativo no banco e no frontend |
| `GESTAO` | Gestão Hospitalar | Existe em `perfis_acesso`; sem policies próprias no banco; não listado em `routePermissions` |
| `LEITURA` | Leitura/Gestor | Existe em `perfis_acesso`; sem policies próprias no banco; não listado em `routePermissions` |
| `SEM_PERFIL` | (nenhum) | Usuário em `usuarios` com `ativo = true` mas sem nenhum registro em `usuario_perfil` |
| `INATIVO` | (nenhum) | Usuário com `ativo = false` em `usuarios`; `is_linked_user()` retorna `FALSE` |

---

## 2. Legenda dos níveis de leitura

| Nível | Símbolo | Descrição |
|---|---|---|
| Sem acesso | `—` | Nenhuma leitura permitida; policy ou gate bloqueia |
| Leitura resumida | `LR` | Apenas dados de identificação ou status agregado; sem conteúdo clínico |
| Leitura operacional | `LO` | Dados necessários para executar a função do perfil naquele módulo; sem conteúdo clínico detalhado |
| Leitura clínica | `LC` | Dados clínicos pertinentes à etapa do fluxo em que o perfil atua |
| Leitura completa | `LX` | Todos os campos da tabela, sem restrição |
| Leitura administrativa | `LA` | Dados de configuração, usuários, permissões, perfis; sem prontuário clínico |
| Leitura de auditoria | `LAU` | Trilha de auditoria e metadados de operações; restrito a Auditoria e Administração |

---

## 3. Matriz principal — módulo × perfil

> Legenda das colunas: **REC** = Recepção · **TEN** = Técnico em Enfermagem · **ENF** = Enfermeiro · **MED** = Médico · **FAR** = Farmácia · **REG** = Regulação de Transferência · **ADM** = Administração · **AUD** = Auditoria · **GES** = Gestão Hospitalar · **LEI** = Leitura/Gestor · **SPF** = Sem Perfil · **INA** = Inativo

| Módulo / Dado | REC | TEN | ENF | MED | FAR | REG | ADM | AUD | GES | LEI | SPF | INA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **pacientes** (cadastro) | LO | LR | LR | LO | LR | LR | LX | LR | LR | LR | — | — |
| **pacientes** (dados clínicos persistentes: alergias, comorbidades, medicamentos, alertas) | — | LC | LC | LC | — | — | LX | LC | — | — | — | — |
| **atendimentos** (lista ativa) | LO | LO | LO | LO | LR | LO | LX | LX | LR | LR | — | — |
| **atendimentos** (histórico encerrado) | — | — | — | LC | — | LR | LX | LX | LR | LR | — | — |
| **chamadas** | LO | LO | LO | LO | — | — | LX | LX | — | — | — | — |
| **triagens** | — | LC | LC | LC | — | — | LX | LX | — | — | — | — |
| **consultas** | — | — | — | LC | — | — | LX | LX | — | — | — | — |
| **evoluções de enfermagem** | — | LC | LC | LC | — | — | LX | LX | — | — | — | — |
| **observações** (clínica, pediátrica, obstétrica) | — | LC | LC | LC | — | — | LX | LX | — | — | — | — |
| **reavaliações de observação** | — | LC | LC | LC | — | — | LX | LX | — | — | — | — |
| **estabilização** | — | LC | LC | LC | — | — | LX | LX | — | — | — | — |
| **checklist de estabilização** | — | LO | LO | LR | — | — | LX | LX | — | — | — | — |
| **prescrições** (cabeçalho) | — | LR | LR | LC | LO | — | LX | LX | — | — | — | — |
| **itens de prescrição** | — | LR | LR | LC | LO | — | LX | LX | — | — | — | — |
| **exames** (solicitação e status) | — | LR | LR | LC | — | — | LX | LX | — | — | — | — |
| **exames** (resultado clínico) | — | — | LC | LC | — | — | LX | LX | — | — | — | — |
| **estoque** (itens e quantidades) | — | — | — | — | LO | — | LX | LX | — | — | — | — |
| **movimentações de estoque** | — | — | — | — | LO | — | LX | LX | — | — | — | — |
| **transferências** | — | LR | LC | LC | — | LC | LX | LX | LR | LR | — | — |
| **checklist de transferência** | — | LC | LC | LC | — | LC | LX | LX | — | — | — | — |
| **usuários** (próprio registro) | LR | LR | LR | LR | LR | LR | LX | LR | LR | LR | — | — |
| **usuários** (todos os registros) | — | — | — | — | — | — | LX | LX | — | — | — | — |
| **perfis e permissões** | LR | LR | LR | LR | LR | LR | LA | LR | LR | LR | — | — |
| **configurações do sistema** | — | — | — | — | — | — | LA | — | — | — | — | — |
| **indicadores** (agregados) | — | — | — | — | — | — | LX | LX | LX | LX | — | — |
| **relatórios** (agregados) | — | — | — | — | — | — | LX | LX | LX | LX | — | — |
| **audit_log** | — | — | — | — | — | — | LAU | LAU | — | — | — | — |
| **domínios e catálogos** (`dom_*`) | LR | LR | LR | LR | LR | LR | LX | LR | LR | LR | — | — |

---

## 4. Detalhamento por perfil e módulo

### 4.1 Recepção

| Módulo | Nível | Finalidade operacional | Dados mínimos | Dados a ocultar | Vínculo atendimento | Vínculo setor | Histórico | Justificativa |
|---|---|---|---|---|---|---|---|---|
| pacientes (cadastro) | LO | Cadastrar e localizar paciente | Nome, data de nascimento, CPF (para identificação), telefone, município | Alergias, comorbidades, medicamentos contínuos, alertas clínicos | Não obrigatório | Recepção | Não | Recepção opera cadastro administrativo, não prontuário clínico |
| atendimentos (lista ativa) | LO | Visualizar fila e chamar paciente | Paciente, status, hora de chegada, classificação de risco (cor), etapa atual | Queixa principal detalhada, conduta, CID, desfecho, histórico clínico | Não | Não | Não | Recepção gerencia fluxo de entrada, não diagnóstico |
| chamadas | LO | Emitir chamadas no painel | Tipo, local, horário | — | Sim | Sim | Não | Operação direta de chamada |
| usuários (próprio) | LR | Ver próprio perfil | Nome, e-mail, perfil | Dados de outros usuários | — | — | — | Cada usuário vê o próprio registro |
| perfis e permissões | LR | Entender as próprias permissões | Nomes dos perfis existentes | Detalhes de permissões de outros perfis | — | — | — | Necessário para o frontend carregar gates corretamente |
| domínios e catálogos | LR | Carregar listas de status, classificação, etc. | Código, descrição | — | — | — | — | Catálogos necessários para funcionamento do sistema |

**Dados que a Recepção nunca deve visualizar:**
- Conteúdo clínico de triagens (sinais vitais, escala de dor, queixa detalhada)
- Consultas médicas e condutas
- Evoluções de enfermagem
- Prescrições e itens prescritos
- Resultados de exames
- Observações e estabilizações
- Dados de alergias, comorbidades e alertas clínicos

---

### 4.2 Técnico em Enfermagem

| Módulo | Nível | Finalidade operacional | Dados mínimos | Dados a ocultar | Vínculo atendimento | Vínculo setor | Histórico | Justificativa |
|---|---|---|---|---|---|---|---|---|
| pacientes (cadastro) | LR | Identificar o paciente na triagem | Nome, data de nascimento | CPF completo, dados de contato em detalhe | Sim | Sim | Não | Identificação para triagem no setor |
| pacientes (dados clínicos) | LC | Ver alertas e alergias antes da triagem | Alergias, comorbidades, alertas | Medicamentos de uso contínuo (se não relevantes à triagem) | Sim | Sim | Não | Segurança do paciente na triagem |
| atendimentos (lista ativa) | LO | Visualizar fila de triagem do setor | Paciente, status, hora de chegada, etapa atual | Condutas, desfechos, histórico de outras etapas | Sim (setor) | Sim | Não | Operação da triagem |
| triagens | LC | Registrar e visualizar triagem | Todos os campos de triagem | — | Sim | Sim | Não | Executa a triagem |
| evoluções de enfermagem | LC | Registrar evolução | Todos os campos de evolução | — | Sim | Sim | Não | Responsabilidade do técnico |
| observações | LC | Acompanhar paciente em observação | Tipo, status, reavaliações | Conduta médica em detalhe | Sim (setor) | Sim | Não | Cuidado de enfermagem na observação |
| reavaliações | LC | Registrar reavaliação de observação | Todos os campos | — | Sim | Sim | Não | Permissão `observacao.reavaliar` |
| estabilização | LC | Acompanhar checklist na sala | Checklist, status | Conduta médica em detalhe | Sim | Sim | Não | Execução de itens de estabilização |
| checklist de estabilização | LO | Marcar itens do checklist | Itens e status | — | Sim | Sim | Não | Permissão `estabilizacao.checklist_item` |
| prescrições (cabeçalho) | LR | Verificar medicação prescrita | Paciente, status geral | Conduta médica completa, CID | Sim | Sim | Não | Execução da prescrição pela enfermagem |
| itens de prescrição | LR | Ver itens a administrar | Medicamento, dose, via, status | — | Sim | Sim | Não | Administração de medicamentos |
| exames (solicitação) | LR | Ver exames solicitados | Tipo, status | Resultado clínico detalhado | Sim | Sim | Não | Coleta de material quando aplicável |
| transferências | LR | Ver status da transferência | Status, destino | Detalhe clínico da solicitação | Sim (setor) | Sim | Não | Participação no checklist de segurança |
| checklist de transferência | LC | Preencher checklist de transferência segura | Todos os itens | — | Sim | Sim | Não | Permissão `transferencia.confirmar_checklist` |

**Dados que o Técnico em Enfermagem nunca deve visualizar:**
- Consultas médicas e condutas
- Prescrições completas com CID e fundamentação clínica
- Resultados clínicos detalhados de exames (apenas status e tipo)
- audit_log
- Usuários e permissões de outros profissionais
- Configurações do sistema

---

### 4.3 Enfermeiro

Mesmos acessos do Técnico em Enfermagem, com adição:

| Módulo | Nível adicional | Justificativa |
|---|---|---|
| transferências (checklist e saída) | LC | Permissão `transferencia.confirmar_checklist` e `transferencia.confirmar_saida` |
| exames (resultado) | LC | Acesso clínico ao resultado para acompanhamento do paciente |
| consultas | LR | Leitura do plano terapêutico para continuidade do cuidado de enfermagem |

---

### 4.4 Médico

| Módulo | Nível | Finalidade operacional | Dados mínimos | Dados a ocultar | Vínculo atendimento | Vínculo setor | Histórico | Justificativa |
|---|---|---|---|---|---|---|---|---|
| pacientes (cadastro) | LO | Identificar o paciente na consulta | Nome, data de nascimento, município | CPF completo (a validar) | Sim | Sim | Sim (atendimentos anteriores) | Anamnese e histórico |
| pacientes (dados clínicos) | LC | Avaliar histórico clínico relevante | Alergias, comorbidades, medicamentos, alertas | — | Sim | Sim | Sim | Segurança clínica |
| atendimentos (ativo e histórico) | LC | Visualizar episódios anteriores | Todos os campos do atendimento | — | Sim | Sim | Sim | Continuidade do cuidado |
| triagens | LC | Avaliar dados de triagem para iniciar consulta | Todos os campos | — | Sim | Sim | Sim | Decisão clínica |
| consultas | LC | Registrar consulta e conduta | Todos os campos | — | Sim | Sim | Sim | Ato médico principal |
| observações | LC | Acompanhar e reavaliar | Todos os campos | — | Sim (em atendimento) | Sim | Sim | Decisão de alta ou encaminhamento |
| reavaliações | LC | Registrar reavaliação | Todos os campos | — | Sim | Sim | Sim | Ato médico |
| estabilização | LC | Coordenar sala de estabilização | Todos os campos | — | Sim | Sim | Não | Ato médico de urgência |
| exames (solicitação e resultado) | LC | Solicitar e ler resultados | Todos os campos | — | Sim | Sim | Sim | Diagnóstico |
| prescrições | LC | Prescrever | Todos os campos | — | Sim | Sim | Sim | Ato médico |
| itens de prescrição | LC | Detalhar prescrição | Todos os campos | — | Sim | Sim | Sim | Ato médico |
| transferências | LC | Solicitar transferência | Todos os campos | — | Sim | Sim | Sim | Decisão clínica de regulação |

**Dados que o Médico não deve acessar por padrão:**
- Dados de pacientes de outros setores sem participação no atendimento (após Fase D)
- audit_log
- Configurações do sistema
- Usuários e permissões de outros profissionais

---

### 4.5 Farmácia

| Módulo | Nível | Finalidade operacional | Dados mínimos | Dados a ocultar | Vínculo atendimento | Vínculo setor | Histórico | Justificativa |
|---|---|---|---|---|---|---|---|---|
| pacientes (cadastro) | LR | Identificar o destinatário da medicação | Nome, data de nascimento | Alergias (idealmente disponível), CPF, dados de contato | Sim | Não | Não | Conferência de identidade na dispensação |
| prescrições | LO | Dispensar medicamentos | Paciente, medicamento, dose, via, status, prescritor | CID, conduta médica completa | Sim | Não | Não | Operação de dispensação |
| itens de prescrição | LO | Dispensar item a item | Medicamento, dose, via, status | — | Sim | Não | Não | Dispensação granular |
| estoque (itens) | LO | Consultar disponibilidade | Medicamento, quantidade atual | — | — | — | Não | Gestão operacional do estoque |
| movimentações de estoque | LO | Registrar entrada e saída | Tipo, quantidade, data | — | — | — | Não | Controle de estoque |

**Dados que a Farmácia nunca deve visualizar:**
- Conteúdo clínico de triagens, consultas, observações, estabilizações
- Evoluções de enfermagem
- Resultados de exames
- Transferências
- audit_log
- Usuários e configurações

> **Nota:** A Farmácia pode precisar visualizar alergias do paciente para verificar incompatibilidades. Essa necessidade deve ser confirmada com a equipe clínica e, se aprovada, limitar-se à lista de alergias — não a todo o histórico clínico.

---

### 4.6 Regulação de Transferência

| Módulo | Nível | Finalidade operacional | Dados mínimos | Dados a ocultar | Vínculo atendimento | Vínculo setor | Histórico | Justificativa |
|---|---|---|---|---|---|---|---|---|
| pacientes (cadastro) | LR | Identificar o paciente para regulação | Nome, data de nascimento, município | Alergias, comorbidades detalhadas | Sim | Não | Não | Identificação para documentação de transferência |
| atendimentos (ativo) | LO | Visualizar atendimentos com transferência em curso | Status, etapa, classificação de risco | Condutas clínicas em detalhe | Sim | Não | Não | Operação de regulação |
| transferências | LC | Operacionalizar transferência | Todos os campos da transferência | — | Sim | Não | Sim | Responsabilidade do perfil |
| checklist de transferência | LC | Gestão do checklist de saída | Todos os itens | — | Sim | Não | Não | Operação de saída regulada |
| consultas | LR | Ver resumo clínico para referência | Diagnóstico, conduta, CID (sumário) | Evolução completa, prescrição, exames | Sim | Não | Não | Fundamentação da solicitação de vaga |

**Dados que a Regulação nunca deve visualizar por padrão:**
- Triagens completas
- Evoluções de enfermagem
- Estabilização (salvo referência ao checklist)
- Prescrições e exames
- audit_log
- Usuários e configurações

---

### 4.7 Administração

| Módulo | Nível | Observação de segurança |
|---|---|---|
| Todos os módulos operacionais | LX | Acesso técnico completo para suporte e governança |
| usuários e permissões | LA | Gerencia cadastro institucional e vínculos de perfil |
| configurações | LA | Configurações do sistema |
| audit_log | LAU | Trilha de auditoria completa |
| indicadores e relatórios | LX | Visão gerencial e estratégica |

> **Regra crítica:** O acesso administrativo completo não deve ser usado como substituto de acesso clínico. O Administrador não deve atender pacientes, registrar triagens, prescrever ou operar o fluxo assistencial. O curto-circuito de `is_admin()` é uma concessão técnica de suporte, não uma função operacional. Recomenda-se que o acesso administrativo seja rastreado em audit_log com destaque.

---

### 4.8 Auditoria

| Módulo | Nível | Finalidade | Observação de segurança |
|---|---|---|---|
| audit_log | LAU | Revisar trilha de operações | Único perfil (além de Admin) com acesso a audit_log |
| pacientes | LR | Verificar existência de registros em auditoria | Sem acesso a conteúdo clínico em prontuário individual |
| atendimentos | LX | Auditoria de fluxo e tempos | Acesso completo a metadados e fluxo, sem modificação |
| triagens, consultas, observações, etc. | LX | Auditoria assistencial | Somente leitura; jamais modificação |
| usuários e permissões | LX | Auditoria de acessos e alterações | Somente leitura |
| indicadores e relatórios | LX | Auditoria de indicadores | Somente leitura |
| configurações | — | Auditoria não gerencia configurações | Acesso somente via audit_log se necessário |

> **Nota:** O acesso amplo da Auditoria é justificado pela finalidade de controle. Deve ser rastreado, justificado e limitado no tempo em produção. Todo acesso da Auditoria a dados clínicos nominais deve gerar registro em audit_log.

---

### 4.9 Gestão Hospitalar e Leitura/Gestor

> **Situação atual:** Esses dois perfis existem em `perfis_acesso` mas **não possuem policies próprias** no banco. No frontend, não estão listados em `routePermissions` para nenhuma rota. Qualquer usuário com apenas esses perfis herda, pelo `is_linked_user()` atual, leitura ampla de todas as tabelas clínicas — comportamento **não intencional** e não documentado.

| Módulo | Nível recomendado | Finalidade | Observação |
|---|---|---|---|
| indicadores (agregados) | LX | Gestão hospitalar e tomada de decisão | Dados sem identificação nominal |
| relatórios (agregados) | LX | Relatórios institucionais | Dados sem identificação nominal |
| atendimentos (agregados) | LR | Volume e performance operacional | Sem prontuário individual |
| pacientes | LR | Apenas contagens e estatísticas | Sem identificação nominal |
| triagens, consultas, etc. | — | Gestão acessa dados agregados, não prontuários | Acesso individual é responsabilidade clínica, não gerencial |
| audit_log | — | Gestão não acessa trilha diretamente | Relatórios gerenciais, não operações individuais |
| configurações | — | Gestão não administra sistema | Papel separado do Administrador |
| usuários e permissões | LR | Visualizar organograma de perfis | Sem modificação |

> **Decisão pendente:** É necessário definir se esses perfis devem ter policies próprias no banco que restrinjam o `is_linked_user()` atual, ou se devem ser eliminados/fundidos a outro perfil.

---

### 4.10 Sem Perfil e Inativo

| Estado | Acesso a qualquer módulo |
|---|---|
| Sem perfil (`usuario_perfil` vazio) | Nenhum. `is_linked_user()` retorna `FALSE` |
| Inativo (`usuarios.ativo = false`) | Nenhum. `is_linked_user()` retorna `FALSE` |

Esses estados devem bloquear o acesso a todas as tabelas do Grupo C, D e E sem exceção. A verificação já é feita por `is_linked_user()`.

---

## 5. Regras mínimas obrigatórias

As regras abaixo são inegociáveis e devem ser preservadas em qualquer refatoração de RLS:

| Regra | Justificativa |
|---|---|
| Usuário sem perfil: nenhum acesso assistencial | `is_linked_user()` já bloqueia; jamais remover essa verificação |
| Usuário inativo: nenhum acesso | `is_linked_user()` já bloqueia; nenhum caminho alternativo deve existir |
| Recepção: não visualiza conteúdo clínico detalhado | Recepção é administrativa; acesso clínico viola segregação de função e LGPD |
| Farmácia: apenas dados necessários à dispensação | Princípio do mínimo necessário; prescrição sim, prontuário clínico não |
| Regulação: apenas dados necessários à transferência | Acesso à transferência e resumo clínico; não a todo o prontuário |
| Gestão Hospitalar e Leitura/Gestor: dados agregados, não nominais | Gestão gerencia indicadores, não atende pacientes |
| Auditoria: acesso controlado e rastreável | Todo acesso da Auditoria deve gerar registro; acesso nominal deve ser justificado |
| Administração: acesso técnico, não clínico operacional | Administrador é papel de suporte; usar o fluxo clínico como Médico ou Enfermeiro é desvio |
| Médico, Enfermeiro e Técnico: acesso condicionado à finalidade e setor | Princípio do mínimo necessário; profissional de pediátrica não precisa de prontuários de obstétrica |
| DELETE físico bloqueado em tabelas assistenciais | Já implementado por trigger; jamais remover |
| UPDATE de audit_log bloqueado estruturalmente | Já implementado por trigger e REVOKE; jamais remover |

---

## 6. Segunda tabela — Perfil × condição de acesso

| Perfil | Módulo | Condição atual | Vínculo exigido (recomendado) | Observação de segurança |
|---|---|---|---|---|
| Recepção | pacientes | `is_linked_user()` | Nenhum (catálogo administrativo) | Limitar visualização a campos de cadastro; bloquear campos clínicos |
| Recepção | atendimentos | `is_linked_user()` | Setor = Recepção | Exibir apenas atendimentos da fila de entrada |
| Recepção | triagens | `is_linked_user()` | **Bloquear** — sem acesso | Recepção não executa triagem |
| Recepção | consultas | `is_linked_user()` | **Bloquear** — sem acesso | Recepção não acessa prontuário médico |
| Técnico em Enfermagem | triagens | `is_linked_user()` | Setor do usuário + atendimento ativo | Apenas triagens do setor em que atua |
| Técnico em Enfermagem | consultas | `is_linked_user()` | **Bloquear** — sem acesso | Técnico não executa consulta médica |
| Técnico em Enfermagem | prescricoes | `is_linked_user()` | Atendimento vinculado ao setor | Apenas prescrições dos pacientes do setor |
| Médico | consultas | `is_linked_user()` | Criador OU responsável pelo atendimento (Fase D) | Médico lê consultas que criou ou do mesmo atendimento |
| Médico | triagens | `is_linked_user()` | Atendimento vinculado | Acesso necessário para decisão clínica |
| Farmácia | triagens | `is_linked_user()` | **Bloquear** — sem acesso | Farmácia não precisa de triagem |
| Farmácia | consultas | `is_linked_user()` | **Bloquear** — sem acesso | Farmácia não acessa consulta médica |
| Farmácia | prescricoes | `is_linked_user()` | Prescricao vinculada ao farmacêutico (dispensação) | Acesso restrito a dispensação |
| Farmácia | exames | `is_linked_user()` | **Bloquear** — sem acesso | Farmácia não visualiza exames |
| Regulação | triagens | `is_linked_user()` | **Bloquear** — sem acesso | Regulação não executa triagem |
| Regulação | consultas | `is_linked_user()` | Resumo (LR) vinculado ao atendimento em transferência | Apenas dados necessários à regulação |
| Regulação | transferencias | `is_linked_user()` | Atendimento com transferência ativa | Acesso operacional completo ao processo de transferência |
| Gestão Hospitalar | pacientes | `is_linked_user()` | **Bloquear dados nominais** — apenas agregados | Gestão acessa indicadores, não prontuários |
| Gestão Hospitalar | consultas | `is_linked_user()` | **Bloquear** — sem acesso | Gestão não acessa prontuário individual |
| Leitura/Gestor | todos os dados clínicos | `is_linked_user()` | **Bloquear** — sem acesso clínico | Perfil de leitura deve ser restrito a indicadores e relatórios |
| Auditoria | audit_log | `is_admin() OR is_auditoria()` | Manter — adequado | Policy correta; manter e reforçar rastreabilidade do acesso |
| Auditoria | consultas, triagens, etc. | `is_linked_user()` | Leitura completa com rastreamento | Todo acesso nominal deve gerar log |
| Administração | todos os dados | `is_admin()` | Manter — com rastreamento obrigatório | Acesso técnico de suporte; logs devem ser revisados periodicamente |

---

## 7. Conflitos identificados entre frontend, banco e matriz recomendada

### 7.1 Rotas sem controle de SELECT no banco

| Rota | Controle no frontend (`routePermissions`) | Controle no banco (policy SELECT) | Conflito |
|---|---|---|---|
| `indicadores` | Apenas Administração (perfis e permissões vazios) | `is_linked_user()` nas tabelas de domínio; sem tabela própria de indicadores | Frontend bloqueia acesso; banco não tem tabela específica — risco baixo hoje, mas inconsistente |
| `relatorios` | Apenas Administração | Idem | Idem |
| `auditoria` | Perfis: `["Auditoria"]` | `is_admin() OR is_auditoria()` | Alinhado — frontend e banco consistentes |
| `consulta` | `permissoes: ["consulta.iniciar", "consulta.registrar_conduta"]` + `perfis: []` | `is_linked_user()` para SELECT | **Conflito:** frontend restringe acesso à rota para médicos, mas banco permite SELECT a qualquer perfil vinculado |
| `pacientes` | `perfis: ["Recepção", "Técnico em Enfermagem", "Médico", "Enfermeiro"]` | `is_linked_user()` para SELECT | Conflito menor: Farmácia não aparece no frontend, mas pode ler via API |
| `farmacia` | `perfis: ["Farmácia"]` | `is_linked_user()` para SELECT em triagens, consultas, etc. | **Conflito crítico:** Farmácia não acessa a rota de consulta no frontend, mas pode ler via API REST |

### 7.2 Perfis sem rota no frontend que ainda têm acesso via API

| Perfil | Rota bloqueada no frontend | Acesso via API (PostgREST) atual |
|---|---|---|
| Farmácia | `triagem`, `consulta`, `enfermagem`, `observacao-*`, `estabilizacao` | Leitura liberada por `is_linked_user()` em todas essas tabelas |
| Recepção | `triagem`, `consulta`, `exames`, `prescricoes`, `transferencias` | Leitura liberada por `is_linked_user()` |
| Regulação de Transferência | `triagem`, `consulta`, `enfermagem`, `exames`, `farmacia` | Leitura liberada por `is_linked_user()` |
| Gestão Hospitalar | Nenhuma rota configurada | Leitura ampla por `is_linked_user()` em tudo |
| Leitura/Gestor | Nenhuma rota configurada | Leitura ampla por `is_linked_user()` em tudo |

> **Este é o conflito central documentado na etapa 5B.8.5:** o frontend protege as rotas por perfil, mas o banco não protege os dados por perfil — apenas por existência de vínculo ativo. Um usuário com qualquer perfil pode consultar a API PostgREST diretamente e acessar todos os dados clínicos.

### 7.3 Action gates sem correspondência no banco

| Action gate no frontend | Permissão/perfil verificado | Correspondência em policy de escrita no banco |
|---|---|---|
| `EXAME_SOLICITAR_ACTION_RULE` | `exame.solicitar` ou `Médico` | Policy `exames_insert_medico_admin` → alinhado |
| `PRESCRICAO_CRIAR_ACTION_RULE` | `prescricao.criar` ou `Médico` | Policy `prescricoes_insert_medico_admin` → alinhado |
| `OBSERVACAO_ENCAMINHAR_ESTABILIZACAO_ACTION_RULE` | apenas perfil `Médico` | Sem policy específica para esta transição → risco de ser executada por outros via API |
| `OBSERVACAO_ALTA_ACTION_RULE` | apenas perfil `Médico` | Parcialmente coberto pelo trigger `fn_validate_atendimento_transicao` → adequado |
| `RESET_DEMO_ACTION_RULE` | apenas perfil `Administração` | Operação local em localStorage — sem impacto no banco |

---

## 8. Mudanças futuras necessárias por camada

### 8.1 Frontend

- Verificar se o frontend impede acesso à rota mas não impede consultas diretas via API.
- Garantir que dados clínicos não sejam carregados desnecessariamente (ex.: Farmácia não deve chamar `loadAtendimentosReais` com dados clínicos completos).
- Adaptar `loadPacientesReais`, `loadAtendimentosReais` e funções similares para receber apenas os campos necessários ao perfil do usuário autenticado.
- Após as policies de banco serem refinadas, o frontend pode retornar 0 linhas em módulos que antes carregavam dados amplos — tratar isso como comportamento esperado, não como erro.

### 8.2 Banco (policies)

- Substituir `is_linked_user()` por `has_permission('<chave>')` nas policies de SELECT das tabelas do Grupo D (Fase B).
- Adicionar condição de setor nas policies de SELECT de `atendimentos` e tabelas do Grupo C (Fase C).
- Adicionar subquery de participação (`created_by`, `profissional_responsavel_id`) nas policies do Grupo D (Fase D).
- Criar policies próprias para `Gestão Hospitalar` e `Leitura/Gestor` que restrinjam o acesso atual herdado de `is_linked_user()`.

### 8.3 Funções auxiliares

- Criar `has_permission_for_table(tabela text) → boolean` ou equivalente para simplificar policies que verificam múltiplas permissões.
- Avaliar criação de função `is_linked_to_atendimento(atendimento_id uuid) → boolean` que verifique se o usuário autenticado tem vínculo operacional com aquele atendimento (criador, responsável ou setor).
- Garantir que todas as novas funções sejam `SECURITY DEFINER` com `search_path = public` e REVOKE de PUBLIC antes de GRANT a `authenticated`.

### 8.4 Cadastros de setor

- Definir lista oficial de setores válidos da unidade.
- Garantir que `usuario_perfil.setor` seja preenchido para todos os usuários ativos.
- Garantir que `atendimentos.setor_atual` seja atualizado consistentemente a cada transição de etapa no fluxo assistencial.

### 8.5 Profissional responsável

- Confirmar se `atendimentos.profissional_responsavel_id` é sempre preenchido ou apenas eventual.
- Se sempre preenchido, o campo pode ser usado como condição de acesso nas policies de Fase D.
- Se eventual, as políticas de Fase D precisam de fallback (setor, equipe ou `created_by`).

### 8.6 Logs de acesso

- Em produção real, todo acesso de Auditoria a dados clínicos nominais deve gerar registro em `audit_log`.
- Todo acesso de Administração a tabelas clínicas deve ser auditado com contexto (qual operação, qual tabela, qual registro).
- Avaliar criação de trigger de SELECT auditável para tabelas do Grupo D em produção (Fase E — alta complexidade, baixa prioridade inicial).

---

## 9. Plano de implementação em fases

### Fase A — Bloquear acessos evidentemente indevidos (menor risco)

**Objetivo:** Sem alterar policies existentes, criar policies novas que bloqueiem perfis que claramente não precisam de acesso clínico.  
**Ações:**
- Criar policy em `triagens` que bloqueie explicitamente `Recepção` e `Farmácia` (adicionar condição `NOT has_perfil('Recepção') AND NOT has_perfil('Farmácia')` à policy SELECT — ou substituir `is_linked_user()` por lista de perfis permitidos).
- Criar policy em `consultas` que restrinja leitura a `Médico`, `Técnico em Enfermagem`, `Enfermeiro`, `Auditoria`, `Administração`.
- Criar policy em `prescricoes` e `prescricao_itens` que inclua `Farmácia` na leitura mas exclua `Recepção`, `Regulação`.
- **Prerequisito:** Validação com o frontend de que nenhuma das telas afetadas deixará de carregar.
- **Risco:** Baixo — adição de condição restritiva, sem remoção de acesso legítimo confirmado.

### Fase B — Restringir por permissão

**Objetivo:** Substituir `is_linked_user()` por `has_permission('<chave>') OR has_perfil('<nome>') OR is_admin() OR is_auditoria()` nas policies de SELECT de todas as tabelas do Grupo D.  
**Ações:**
- Mapear qual permissão ou perfil dá acesso a cada tabela clínica (tabela em seção 6 acima).
- Criar uma nova migration com DROP+CREATE de ~20 policies de SELECT.
- Testar com usuários fictícios de cada perfil antes de aplicar em produção.
- **Prerequisito:** Aprovação da matriz de leitura (este documento).
- **Risco:** Médio — requer mapeamento cuidadoso; erro de mapeamento pode excluir acesso legítimo.

### Fase C — Restringir por setor

**Objetivo:** Adicionar condição de setor às policies de `atendimentos` e tabelas operacionais (Grupo C).  
**Ações:**
- Confirmar lista de setores válidos.
- Garantir que `usuario_perfil.setor` esteja preenchido.
- Criar migration adicionando condição `setor_atual = (SELECT up.setor FROM usuario_perfil up WHERE up.usuario_id = auth.uid() LIMIT 1)` nas policies pertinentes.
- **Prerequisito:** Fase B concluída; `usuario_perfil.setor` populado; decisão institucional sobre setores.
- **Risco:** Médio-alto — usuários sem setor perdem acesso se não houver fallback definido.

### Fase D — Restringir por atendimento/profissional

**Objetivo:** Nas tabelas do Grupo D, adicionar condição de participação real no atendimento (`created_by = auth.uid()` OR `profissional_responsavel_id = auth.uid()`) como condição suplementar (OR com o setor da Fase C).  
**Ações:**
- Confirmar se `profissional_responsavel_id` é consistentemente preenchido.
- Criar migration com subqueries correlacionadas nas policies de triagens, consultas, observações, etc.
- **Prerequisito:** Fase C concluída; `profissional_responsavel_id` validado.
- **Risco:** Alto — subqueries correlacionadas impactam performance; testar com volume representativo.

### Fase E — Auditoria de leitura clínica

**Objetivo:** Registrar em `audit_log` todo acesso de Auditoria e Administração a dados clínicos nominais.  
**Ações:**
- Avaliar criação de trigger de SELECT em tabelas do Grupo D (solução Postgres — `event trigger` ou wrapper via view).
- Alternativamente, implementar no nível de RPC/função para acessos sensíveis.
- **Prerequisito:** Fases A–D concluídas; avaliação de impacto de performance.
- **Risco:** Alto — SELECT triggers têm custo operacional significativo; requer benchmarking.

---

## 10. Decisões institucionais pendentes

Os itens abaixo não podem ser resolvidos tecnicamente sem alinhamento institucional:

### 10.1 Setores oficiais da unidade

- [ ] Qual é a lista oficial de setores da unidade? (Ex.: Recepção, Triagem, UPA, Observação Clínica, Observação Pediátrica, Observação Obstétrica, Sala de Estabilização, Farmácia, Laboratório, Regulação, Administração)
- [ ] Cada setor tem nome padronizado e estável, ou muda conforme escala ou evento?

### 10.2 Política de cobertura de plantão

- [ ] Quando um profissional substitui outro de plantão, ele deve ter acesso automático aos atendimentos do substituto, ou apenas aos que iniciar?
- [ ] Existe conceito formal de "equipe de plantão" que daria acesso compartilhado aos atendimentos em curso no período?

### 10.3 Acesso entre observações

- [ ] Um técnico de enfermagem da Observação Clínica pode visualizar pacientes da Observação Pediátrica e Obstétrica, ou o acesso deve ser por tipo de observação?
- [ ] O Médico de plantão geral pode ver todos os tipos de observação ou apenas os de sua área?

### 10.4 Acesso de direção e gestão hospitalar

- [ ] A direção hospitalar (gerência, diretoria clínica) deve ter acesso a prontuários nominais ou apenas a indicadores e relatórios?
- [ ] Os perfis `Gestão Hospitalar` e `Leitura/Gestor` devem ser mantidos, fundidos ou eliminados?
- [ ] Qual é o escopo pretendido de acesso desses perfis?

### 10.5 Acesso da auditoria

- [ ] O perfil Auditoria deve ter acesso a prontuários nominais individuais, ou apenas a audit_log e relatórios agregados?
- [ ] O acesso da Auditoria a dados clínicos deve ser justificado e registrado por solicitação formal?
- [ ] Existe distinção entre Auditoria interna (profissional da unidade) e Auditoria externa (SMS, TCE, auditoria SUS)?

### 10.6 Acesso fora do atendimento ativo

- [ ] Um médico pode buscar o histórico de um paciente antes de iniciar um atendimento, ou o acesso é restrito ao atendimento aberto?
- [ ] Qual é a regra para consulta de histórico de pacientes que não estão em atendimento ativo?

### 10.7 Acesso histórico

- [ ] Depois que um atendimento é encerrado (desfecho registrado), quem pode acessar os dados clínicos daquele episódio?
- [ ] Existe prazo mínimo de retenção e acesso a dados históricos definido institucionalmente?

### 10.8 Múltiplas unidades futuras

- [ ] O GSI ONE pode ser expandido para múltiplas unidades (multi-CNES)?
- [ ] Se sim, um profissional de uma unidade nunca deve acessar dados de outra?
- [ ] O modelo de setor deve evoluir para um modelo de setor × unidade?

### 10.9 LGPD e orientação jurídica

- [ ] A unidade possui orientação jurídica formal sobre o nível mínimo de separação de acesso a dados de saúde por perfil profissional?
- [ ] Existe DPO (Data Protection Officer) ou responsável pela proteção de dados pessoais designado?

---

*Documento de definição — 2026-07-24. Nenhuma migration, tabela, policy, function ou grant foi criado ou alterado. Aprovação institucional e técnica necessária antes de qualquer implementação das fases descritas.*
