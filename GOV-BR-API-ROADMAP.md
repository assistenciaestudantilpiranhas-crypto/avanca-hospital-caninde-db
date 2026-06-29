# GOV-BR-API-ROADMAP.md

## 1. Objetivo do documento

Este documento é um **roadmap técnico inicial**, de caráter exploratório e institucional, sobre integrações futuras entre o GSI ONE (plataforma) — implantado no programa Avança Hospital, sob o ecossistema GSI HealthTech — e APIs/sistemas governamentais ligados à saúde pública brasileira.

Este documento **não autoriza** o início de qualquer integração técnica real. Antes de qualquer implementação:

- Credenciais de acesso devem ser solicitadas formalmente aos órgãos competentes.
- Processos de homologação devem ser concluídos.
- Eventuais convênios, termos de uso ou termos de cooperação entre o município/secretaria/hospital e o DATASUS/Ministério da Saúde devem estar formalizados.
- Autorização institucional expressa (direção hospitalar e/ou secretaria municipal de saúde) deve preceder qualquer solicitação de acesso técnico.

Onde não houver confirmação documental oficial, o conteúdo é marcado como **"A confirmar no Portal de Serviços DATASUS/gov.br"**.

---

## 2. APIs prioritárias a documentar

### 2.1 CNS/CADSUS

- **Finalidade provável:** validação e consulta do Cartão Nacional de Saúde (CNS) do paciente, apoiando o cadastro único de usuários do SUS.
- **Módulo do GSI ONE impactado:** Cadastro de Pacientes.
- **Fase recomendada de integração:** Fase 2 (validações cadastrais), após autorização institucional.
- **Tipo de dado envolvido:** dado pessoal identificável (nome, CNS, data de nascimento, filiação).
- **Sensibilidade/LGPD:** alta — dado pessoal associado a identificação de saúde; exige base legal e finalidade explícita.
- **Critérios prováveis de acesso:** cadastro institucional do hospital/município, credenciamento e possivelmente certificado digital — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** endpoint técnico, protocolo de autenticação, SLA de disponibilidade — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.2 CNES

- **Finalidade provável:** consulta de dados cadastrais do estabelecimento de saúde (Cadastro Nacional de Estabelecimentos de Saúde), incluindo leitos, serviços e profissionais vinculados.
- **Módulo do GSI ONE impactado:** Cadastro de Pacientes (dados do estabelecimento), Indicadores, Auditoria.
- **Fase recomendada de integração:** Fase 1 (dados públicos/baixa sensibilidade), conforme disponibilidade confirmada.
- **Tipo de dado envolvido:** dado institucional/administrativo, em geral de caráter público.
- **Sensibilidade/LGPD:** baixa, por se tratar predominantemente de dados de estabelecimento, não de paciente.
- **Critérios prováveis de acesso:** consulta pode ser pública ou exigir cadastro — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** formato de exportação/API disponível, periodicidade de atualização — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.3 SIGTAP

- **Finalidade provável:** consulta da tabela de procedimentos, medicamentos, órteses/próteses e materiais do SUS, para apoio a faturamento e codificação de procedimentos.
- **Módulo do GSI ONE impactado:** Consulta, Exames, Farmácia, Indicadores, Relatórios (faturamento SUS).
- **Fase recomendada de integração:** Fase 1 (tabela de referência pública).
- **Tipo de dado envolvido:** dado tabular de referência, não associado a paciente individual.
- **Sensibilidade/LGPD:** baixa.
- **Critérios prováveis de acesso:** download de tabela ou consulta pública — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** existência de API formal versus disponibilização apenas por arquivo de competência mensal — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.4 SISREG/e-SUS Regulação

- **Finalidade provável:** apoio à regulação de leitos, encaminhamentos e transferências entre unidades de saúde.
- **Módulo do GSI ONE impactado:** Transferências/Regulação, Atendimento/Recepção, Indicadores.
- **Fase recomendada de integração:** Fase 3, somente após pactuação formal com a gestão regional/estadual da regulação.
- **Tipo de dado envolvido:** dado pessoal de saúde, incluindo condição clínica e justificativa de transferência.
- **Sensibilidade/LGPD:** alta — dado sensível de saúde, vinculado a decisão assistencial.
- **Critérios prováveis de acesso:** pactuação com gestor de regulação municipal/estadual, possivelmente vínculo de unidade solicitante/executante — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** modelo de integração disponível (API, webservice, ou apenas interface web institucional) — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.5 SI-BNAFAR

- **Finalidade provável:** apoio ao controle de estoque, dispensação e gestão da assistência farmacêutica no âmbito do SUS.
- **Módulo do GSI ONE impactado:** Farmácia, Indicadores, Auditoria.
- **Fase recomendada de integração:** Fase 4, após validação de requisitos de assistência farmacêutica municipal.
- **Tipo de dado envolvido:** dado de movimentação de insumos/medicamentos, podendo se vincular a dispensação individual a paciente.
- **Sensibilidade/LGPD:** média a alta, dependendo do nível de vinculação a paciente identificado.
- **Critérios prováveis de acesso:** cadastro da farmácia/unidade no sistema nacional — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** disponibilidade de integração via API versus apenas alimentação manual — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.6 OBM (Observatório/Banco de dados de Mortalidade ou correlato)

- **Finalidade provável:** apoio a indicadores de mortalidade/morbidade para fins de observatório de saúde pública.
- **Módulo do GSI ONE impactado:** Observatório, Indicadores, Relatórios.
- **Fase recomendada de integração:** Fase 6.
- **Tipo de dado envolvido:** dado estatístico/epidemiológico, possivelmente agregado.
- **Sensibilidade/LGPD:** variável — depende do nível de agregação dos dados (individualizado versus agregado/anonimizado).
- **Critérios prováveis de acesso:** **a confirmar no Portal de Serviços DATASUS/gov.br**, dado que a sigla/sistema específico exige confirmação documental oficial.
- **Pendências de confirmação:** identificação exata do sistema/API correspondente — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.7 RNDS/SUS Digital

- **Finalidade provável:** interoperabilidade de dados clínicos em saúde, incluindo registros de atendimento, resultados de exames e histórico assistencial, no padrão de Rede Nacional de Dados em Saúde.
- **Módulo do GSI ONE impactado:** Consulta, Exames, Observação Clínica/Pediátrica/Obstétrica, Triagem, Auditoria.
- **Fase recomendada de integração:** Fase 5, somente com maturidade de segurança da informação comprovada.
- **Tipo de dado envolvido:** dado clínico sensível, podendo incluir diagnóstico, evolução clínica, exames e prescrições.
- **Sensibilidade/LGPD:** muito alta — dado de saúde individualizado, exigindo controles reforçados de segurança e auditoria.
- **Critérios prováveis de acesso:** certificação de conformidade técnica, adesão formal à RNDS, possivelmente certificado digital institucional — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** requisitos técnicos de certificação (padrão FHIR ou correlato), processo de habilitação institucional — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.8 REL

- **Finalidade provável:** **a confirmar no Portal de Serviços DATASUS/gov.br** — sigla não confirmada com precisão suficiente neste documento para descrição de finalidade específica.
- **Módulo do GSI ONE impactado:** Relatórios, Indicadores (hipótese, sujeita a confirmação).
- **Fase recomendada de integração:** Fase 6, condicionada à confirmação da finalidade real do sistema.
- **Tipo de dado envolvido:** **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Sensibilidade/LGPD:** **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Critérios prováveis de acesso:** **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** identificação exata do sistema correspondente à sigla — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.9 e-SUS Notifica/Sinan

- **Finalidade provável:** notificação compulsória de agravos e doenças, apoiando vigilância epidemiológica.
- **Módulo do GSI ONE impactado:** Triagem, Consulta, Observatório, Indicadores.
- **Fase recomendada de integração:** Fase 6.
- **Tipo de dado envolvido:** dado clínico sensível associado a notificação compulsória, podendo incluir identificação do paciente conforme protocolo de vigilância.
- **Sensibilidade/LGPD:** alta — dado de saúde com finalidade de interesse público em vigilância epidemiológica, exigindo base legal específica.
- **Critérios prováveis de acesso:** cadastro de unidade notificante, fluxo de vigilância municipal/estadual — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** modelo de integração (formulário web, API, arquivo de lote) — **a confirmar no Portal de Serviços DATASUS/gov.br**.

### 2.10 RIA/Vacinação

- **Finalidade provável:** registro e consulta de histórico vacinal do paciente (Registro Informatizado de Vacinação ou correlato).
- **Módulo do GSI ONE impactado:** Consulta, Cadastro de Pacientes, Indicadores.
- **Fase recomendada de integração:** Fase 6.
- **Tipo de dado envolvido:** dado de saúde individualizado (histórico de imunização).
- **Sensibilidade/LGPD:** alta — dado de saúde vinculado a paciente identificado.
- **Critérios prováveis de acesso:** cadastro de sala de vacina/unidade no sistema correspondente — **a confirmar no Portal de Serviços DATASUS/gov.br**.
- **Pendências de confirmação:** identificação exata do sistema vigente e seu modelo de integração — **a confirmar no Portal de Serviços DATASUS/gov.br**.

---

## 3. Módulos impactados do GSI ONE

| Módulo | APIs/sistemas relacionados (hipótese) |
|---|---|
| Cadastro de Pacientes | CNS/CADSUS, CNES |
| Atendimento/Recepção | SISREG/e-SUS Regulação |
| Triagem | e-SUS Notifica/Sinan |
| Consulta | SIGTAP, RNDS/SUS Digital, RIA/Vacinação |
| Exames | SIGTAP, RNDS/SUS Digital |
| Farmácia | SI-BNAFAR, SIGTAP |
| Transferências/Regulação | SISREG/e-SUS Regulação |
| Indicadores | CNES, SIGTAP, OBM, REL (a confirmar) |
| Auditoria | RNDS/SUS Digital, SI-BNAFAR |
| Observatório | OBM, e-SUS Notifica/Sinan |
| Relatórios | SIGTAP, REL (a confirmar) |

---

## 4. Arquitetura recomendada

As diretrizes abaixo devem orientar qualquer implementação futura, quando autorizada:

- O front-end do GSI ONE **não deve** chamar APIs governamentais diretamente do navegador.
- Deve existir um **backend intermediário** (camada de integração) responsável por toda comunicação com sistemas governamentais.
- **Credenciais de acesso devem permanecer fora do navegador**, armazenadas apenas no backend, nunca expostas em código front-end.
- **Tokens e chaves não devem ser versionados** em repositório de código.
- Todo acesso a dados governamentais deve ser **auditado**, com registro de usuário, data/hora, finalidade da consulta e resultado.
- **Logs devem preservar rastreabilidade** sem expor dado sensível além do estritamente necessário (evitar registrar dados clínicos completos em log; preferir identificadores e metadados).
- **Homologação deve preceder produção** em todos os casos.
- **Produção só deve ocorrer após autorização institucional formal** (direção hospitalar e/ou secretaria municipal de saúde).
- A integração deve respeitar a **LGPD**, o **sigilo assistencial** e o **controle de acesso por perfil de usuário**, restringindo consultas a profissionais autorizados e à finalidade assistencial declarada.

---

## 5. Roadmap recomendado por fases

- **Fase 0:** documentação, levantamento de requisitos, autorização institucional e avaliação de impacto à proteção de dados (LGPD).
- **Fase 1:** tabelas de referência pública/baixa sensibilidade — CNES e SIGTAP, se disponíveis em formato de integração confirmado.
- **Fase 2:** validações cadastrais — CNS/CADSUS, apenas após autorização institucional formal.
- **Fase 3:** regulação/transferência — SISREG/e-SUS Regulação, após pactuação com gestão regional/estadual.
- **Fase 4:** farmácia/assistência farmacêutica — SI-BNAFAR, após validação de requisitos junto à gestão municipal.
- **Fase 5:** RNDS/SUS Digital e demais dados clínicos sensíveis, somente com maturidade de segurança da informação comprovada.
- **Fase 6:** notificações compulsórias, vacinação e observatórios — e-SUS Notifica/Sinan, RIA/Vacinação, OBM, REL (sujeito a confirmação), conforme autorização e finalidade específica.

---

## 6. Riscos

- Tratamento de dados sensíveis de saúde sem base legal ou finalidade adequada (risco LGPD).
- Uso indevido, vazamento ou exposição de credenciais de acesso a sistemas governamentais.
- Exposição de dados sensíveis diretamente no navegador, caso a arquitetura recomendada não seja respeitada.
- Dependência de disponibilidade e estabilidade de sistemas externos fora do controle do GSI ONE.
- Inconsistência entre dados mantidos localmente (localStorage/banco do GSI ONE) e dados oficiais governamentais.
- Mudança de regras de acesso, autenticação ou disponibilidade por parte dos sistemas governamentais sem aviso prévio.
- Integração realizada sem processo de homologação formal.
- Auditoria insuficiente sobre o uso de dados obtidos de sistemas governamentais.
- Responsabilidade institucional e legal do hospital/município pelo uso inadequado de dados integrados.

---

## 7. Próximas ações institucionais

- Levantar documentação oficial e atualizada no Portal de Serviços DATASUS/gov.br para cada API/sistema listado.
- Identificar o responsável institucional pela solicitação formal de acesso a cada sistema.
- Verificar se o município, secretaria de saúde ou hospital já possui autorização, convênio ou cadastro prévio junto ao DATASUS/Ministério da Saúde.
- Mapear o encarregado de proteção de dados (DPO) ou responsável equivalente, para avaliação de impacto à proteção de dados antes de qualquer integração.
- Definir ambiente de homologação segregado do ambiente de produção.
- Definir a arquitetura do backend intermediário responsável pela comunicação com sistemas governamentais.
- Definir política de logs e auditoria para acessos a dados governamentais.
- Definir matriz de permissões por perfil de usuário para consulta e uso desses dados.
- Priorizar a integração de APIs de menor risco e menor sensibilidade antes de avançar para APIs clínicas sensíveis.

---

*Documento de caráter exploratório. Não constitui autorização para implementação técnica. Pendências marcadas como "A confirmar no Portal de Serviços DATASUS/gov.br" devem ser resolvidas junto às fontes oficiais antes de qualquer decisão de arquitetura ou desenvolvimento.*
