# GSI ONE — RLS Fase B: Granularidade por Permissão

**Documento:** GSI_ONE_RLS_FASE_B_GRANULARIDADE_PERMISSOES_5B8_5E  
**Etapa:** 5B.8.5E  
**Status:** Diagnóstico e plano — nenhuma migration, policy, grant ou função criada ou alterada  
**Elaborado em:** 2026-07-24  
**Pré-requisitos lidos:**
- GSI_ONE_RLS_VINCULO_POR_LINHA_DIAGNOSTICO_5B8_5.md
- GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A.md
- GSI_ONE_RLS_FASE_A_PLANO_TECNICO_5B8_5B.md
- GSI_ONE_RLS_FASE_A_DEPENDENCIAS_FRONTEND_5B8_5C.md
- migrations 20260623100004, 20260623100020, 20260623100024, 20260623100026, 20260722100029, 20260722100030
- tests/security/phase-a-select-access.test.js
- tests/security/policies.test.js
- script.js (lido para mapeamento de gates — não alterado)

---

## 1. Situação após a Fase A

A Fase A (migration 20260722100029) substituiu `is_linked_user()` por listas positivas de permissão em 17 policies SELECT. O resultado verificado pelos testes autenticados (163/163) confirma que:

- Recepção não lê mais triagens, consultas, exames, prescrições, observações, estabilizações ou transferências.
- Farmácia não lê mais dados clínicos (triagens, consultas, observações, estabilizações).
- Gestão Hospitalar e Leitura/Gestor não leem mais nenhuma tabela clínica ou operacional das 17.
- Técnico em RX lê apenas exames, pacientes e atendimentos.
- Regulação lê transferências, checklist, pacientes e atendimentos.
- Médico, Técnico em Enfermagem e Enfermeiro mantêm acesso clínico amplo (Fase C/D tratarão restrição por setor e atendimento).

A Fase A é um avanço significativo em relação ao `is_linked_user()` original. Porém, ela reutiliza permissões de ação (cujo propósito original é autorizar escrita ou operação específica) como mecanismo de autorização de leitura. Isso cria acoplamentos que esta análise documenta.

---

## 2. Inventário das permissões usadas nas 17 policies SELECT da Fase A

### 2.1 Tabela de permissões e perfis

| Permissão (chave) | Módulo original | Perfis que a possuem | Propósito original |
|---|---|---|---|
| `paciente.criar` | Pacientes | Recepção, Administração | Cadastrar novo paciente |
| `atendimento.abrir` | Atendimentos | Recepção, Administração | Abrir novo atendimento |
| `triagem.classificar` | Triagem | Técnico em Enfermagem, Enfermeiro | Confirmar classificação de risco na triagem |
| `consulta.iniciar` | Consulta | Médico | Iniciar atendimento médico |
| `consulta.registrar_conduta` | Consulta | Médico | Registrar conduta médica |
| `enfermagem.evolucao.registrar` | Enfermagem | Técnico em Enfermagem, Enfermeiro | Registrar evolução de enfermagem |
| `observacao.reavaliar` | Observação | Técnico em Enfermagem, Médico, Enfermeiro | Registrar reavaliação em observação |
| `estabilizacao.checklist_item` | Estabilização | Técnico em Enfermagem, Enfermeiro | Marcar item do checklist de estabilização |
| `exame.solicitar` | Exames | Médico | Solicitar exame |
| `exame.visualizar` | Exames | Médico, Técnico em RX, Auditoria | Visualizar exames e resultados |
| `exame.liberar_resultado` | Exames | Técnico em RX | Liberar resultado de exame |
| `prescricao.criar` | Farmácia | Médico | Criar prescrição |
| `prescricao.dispensar` | Farmácia | Farmácia | Dispensar item de prescrição |
| `estoque.movimentar` | Estoque | Farmácia, Administração | Registrar movimentação de estoque |
| `transferencia.solicitar` | Transferências | Médico | Solicitar transferência/regulação |
| `transferencia.aprovar_vaga` | Transferências | Regulação de Transferência | Aprovar vaga de transferência |
| `transferencia.confirmar_checklist` | Transferências | Enfermeiro | Confirmar checklist de transferência segura |
| `transferencia.confirmar_saida` | Transferências | Enfermeiro | Confirmar saída de transferência |

> **Nota:** `exame.marcar_critico` e `exame.visualizar` estão vinculados à Auditoria como permissão explícita. `auditoria.visualizar` e `configuracoes.gerenciar` **não são usadas em nenhuma policy SELECT** das 17 da Fase A — Auditoria e Administração são cobertas por `is_auditoria()` e `is_admin()`.

---

### 2.2 Mapa de permissões por policy SELECT

| Tabela | Policy | Permissões de ação usadas como gate de leitura | is_admin | is_auditoria |
|---|---|---|---|---|
| `pacientes` | `pacientes_select_operacional` | `paciente.criar`, `triagem.classificar`, `consulta.iniciar`, `exame.visualizar`, `prescricao.dispensar`, `transferencia.aprovar_vaga` | ✓ | ✓ |
| `atendimentos` | `atendimentos_select_operacional` | `atendimento.abrir`, `triagem.classificar`, `consulta.iniciar`, `exame.visualizar`, `prescricao.dispensar`, `transferencia.aprovar_vaga` | ✓ | ✓ |
| `chamadas` | `chamadas_select_operacional` | `atendimento.abrir`, `triagem.classificar`, `consulta.iniciar` | ✓ | ✓ |
| `triagens` | `triagens_select_clinico` | `triagem.classificar`, `consulta.iniciar`, `consulta.registrar_conduta`, `observacao.reavaliar` | ✓ | ✓ |
| `consultas` | `consultas_select_clinico` | `consulta.iniciar`, `consulta.registrar_conduta`, `observacao.reavaliar` | ✓ | ✓ |
| `evolucoes_enfermagem` | `evolucoes_enfermagem_select_clinico` | `enfermagem.evolucao.registrar`, `consulta.iniciar` | ✓ | ✓ |
| `observacoes` | `observacoes_select_clinico` | `observacao.reavaliar`, `consulta.iniciar` | ✓ | ✓ |
| `reavaliacoes_observacao` | `reavaliacoes_observacao_select_clinico` | `observacao.reavaliar`, `consulta.iniciar` | ✓ | ✓ |
| `estabilizacoes` | `estabilizacoes_select_clinico` | `estabilizacao.checklist_item`, `consulta.iniciar` | ✓ | ✓ |
| `checklist_estabilizacao_itens` | `checklist_estabilizacao_itens_select_clinico` | `estabilizacao.checklist_item`, `consulta.iniciar` | ✓ | ✓ |
| `prescricoes` | `prescricoes_select_farmacia_clinico` | `prescricao.criar`, `prescricao.dispensar` | ✓ | ✓ |
| `prescricao_itens` | `prescricao_itens_select_farmacia_clinico` | `prescricao.criar`, `prescricao.dispensar` | ✓ | ✓ |
| `exames` | `exames_select_diagnostico` | `exame.solicitar`, `exame.visualizar`, `exame.liberar_resultado` | ✓ | ✓ |
| `transferencias` | `transferencias_select_operacional` | `transferencia.solicitar`, `transferencia.aprovar_vaga`, `transferencia.confirmar_checklist`, `transferencia.confirmar_saida` | ✓ | ✓ |
| `checklist_transferencia_itens` | `checklist_transferencia_itens_select_operacional` | `transferencia.confirmar_checklist`, `transferencia.aprovar_vaga` | ✓ | ✓ |
| `estoque_itens` | `estoque_itens_select_farmacia` | `prescricao.dispensar`, `estoque.movimentar` | ✓ | ✓ |
| `estoque_movimentacoes` | `estoque_movimentacoes_select_farmacia` | `prescricao.dispensar`, `estoque.movimentar` | ✓ | ✓ |

---

## 3. Análise por módulo — permissão versus finalidade de leitura

### 3.1 Pacientes e atendimentos

| Permissão | Perfis | Acesso atual | Leitura necessária | Leitura excessiva | Risco lateral |
|---|---|---|---|---|---|
| `paciente.criar` | Recepção, Administração | Lê toda a tabela `pacientes` | Campos de cadastro (nome, dt. nasc., CPF, município) | Alergias, comorbidades, alertas (se em mesma query) | Baixo — campos clínicos estão em tabelas separadas |
| `atendimento.abrir` | Recepção, Administração | Lê toda a tabela `atendimentos` e `chamadas` | Status, fila ativa, hora de chegada, classificação de risco (cor) | Queixa principal, conduta, desfecho, histórico encerrado | Médio — queixa principal é campo clínico na mesma tabela |
| `triagem.classificar` | TEN, Enfermeiro | Lê `pacientes`, `atendimentos`, `chamadas`, `triagens` | Todos esses dados são necessários para executar triagem | — | Baixo — acesso justificado pelo fluxo |
| `consulta.iniciar` | Médico | Lê **9 das 17 tabelas** (pacientes, atendimentos, chamadas, triagens, consultas, evoluções, observações, reavaliações, estabilizações, checklist estab.) | Todas as 9 são necessárias para o ato médico completo | Nenhuma tabela é excessiva individualmente, mas o acumulo via permissão única cria dependência de acoplamento | **Alto** — permissão de ação única com efeito de super-gate de leitura |
| `exame.visualizar` | Médico, Técnico em RX, Auditoria | Lê `pacientes`, `atendimentos`, `exames` | TEN-RX: `exames` — necessário; `pacientes` e `atendimentos` — necessário para identificar o paciente do exame | Médico: redundante (já tem `consulta.iniciar`); Auditoria: coberta por `is_auditoria()` — `exame.visualizar` na Auditoria é permissão explícita desnecessária do ponto de vista de policy | Médio |
| `prescricao.dispensar` | Farmácia | Lê `pacientes`, `atendimentos`, `prescricoes`, `prescricao_itens`, `estoque_itens`, `estoque_movimentacoes` | `pacientes` (identificação), `prescricoes`, `prescricao_itens`, `estoque_itens`, `estoque_movimentacoes` | `atendimentos` — Farmácia não precisa do fluxo completo do atendimento, apenas da prescrição e do paciente | Médio — Farmácia pode ver queixa, status, desfecho e histórico do atendimento |
| `transferencia.aprovar_vaga` | Regulação de Transferência | Lê `pacientes`, `atendimentos`, `transferencias`, `checklist_transferencia_itens` | `pacientes` (identificação), `atendimentos` (status atual), `transferencias`, checklist | `atendimentos` completo inclui queixa, conduta e desfecho — Regulação não precisa do prontuário, apenas do status e etapa | Médio |

### 3.2 Chamadas

| Permissão | Perfis alcançados | Justificativa | Risco |
|---|---|---|---|
| `atendimento.abrir` | Recepção, Administração | Recepção emite chamadas — acesso necessário | Baixo |
| `triagem.classificar` | TEN, Enfermeiro | TEN precisa ver chamadas para saber qual paciente chamar para triagem | Baixo |
| `consulta.iniciar` | Médico | Médico verifica a fila de chamadas antes de iniciar a consulta | Baixo — mas acesso via `consulta.iniciar` é acoplamento indireto |

### 3.3 Triagens

| Permissão | Perfis | Finalidade da permissão original | Necessidade de leitura | Risco de acoplamento |
|---|---|---|---|---|
| `triagem.classificar` | TEN, Enfermeiro | Registrar e confirmar triagem | ✓ Total — executa e relê triagem | Correto |
| `consulta.iniciar` | Médico | Iniciar atendimento médico | ✓ Médico precisa ler triagem para consulta | Correto — mas o gate deveria ser `triagem.visualizar`, não `consulta.iniciar` |
| `consulta.registrar_conduta` | Médico | Registrar conduta | ✓ Conduta pressupõe consulta iniciada, que pressupõe triagem lida | Correto — mas mesmo acoplamento |
| `observacao.reavaliar` | TEN, Médico, Enfermeiro | Reavaliação em observação | ⚠ Reavaliação ocorre **depois** da triagem — permissão de fase posterior dá acesso a fase anterior | **Médio** — qualquer futuro perfil com apenas `observacao.reavaliar` leria triagens sem ter executado triagem |

### 3.4 Consultas

| Permissão | Perfis | Necessidade de leitura de `consultas` | Risco |
|---|---|---|---|
| `consulta.iniciar` | Médico | ✓ Total | Correto |
| `consulta.registrar_conduta` | Médico | ✓ Total | Correto |
| `observacao.reavaliar` | TEN, Médico, Enfermeiro | ⚠ TEN e Enfermeiro com `observacao.reavaliar` leem todas as consultas médicas, incluindo condutas e CIDs | **Alto** — Técnico em Enfermagem nunca deve ler conduta médica completa; a matriz (5B.8.5A) classifica Técnico em Enfermagem com leitura `—` em consultas |

> **Achado crítico:** A policy `consultas_select_clinico` inclui `observacao.reavaliar` como gate. TEN e Enfermeiro possuem `observacao.reavaliar`. Portanto, TEN e Enfermeiro leem **todas as consultas médicas**, incluindo diagnóstico, conduta e CID — o que contraria a Matriz de Leitura (5B.8.5A) que classifica TEN sem acesso a consultas.

### 3.5 Evoluções de enfermagem

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `enfermagem.evolucao.registrar` | TEN, Enfermeiro | ✓ Total — executam e releem evoluções | Correto |
| `consulta.iniciar` | Médico | ✓ Médico precisa ler evoluções para acompanhar o cuidado do paciente | Correto — mas `evolucao_enfermagem.visualizar` seria mais explícito |

### 3.6 Observações e reavaliações

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `observacao.reavaliar` | TEN, Médico, Enfermeiro | ✓ Total — reavaliação está diretamente vinculada a observações | Correto |
| `consulta.iniciar` | Médico | ✓ Médico encaminha para observação e precisa acompanhar | Correto, mas ver nota de acoplamento em §3.4 |

### 3.7 Estabilização e checklist de estabilização

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `estabilizacao.checklist_item` | TEN, Enfermeiro | ✓ Total — marcam e releem itens do checklist | Correto |
| `consulta.iniciar` | Médico | ✓ Médico coordena a sala de estabilização | Correto — mas `estabilizacao.visualizar` seria mais explícito |

### 3.8 Prescrições

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `prescricao.criar` | Médico | ✓ Médico cria e relê prescrições | Correto |
| `prescricao.dispensar` | Farmácia | ✓ Farmácia dispensa e precisa ver prescrições e itens | Correto — mas não deveria ver `atendimentos` completo (ver §3.1) |

### 3.9 Exames

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `exame.solicitar` | Médico | ✓ Médico solicita e relê exames | Correto |
| `exame.visualizar` | Médico, Técnico em RX, Auditoria | ✓ Técnico em RX visualiza para liberar resultado; Médico para laudo | Correto — mas Auditoria já coberta por `is_auditoria()`, a permissão `exame.visualizar` na Auditoria é redundante no contexto das policies |
| `exame.liberar_resultado` | Técnico em RX | ✓ Libera resultado, logo precisa ler o exame | Correto |

### 3.10 Transferências e checklist

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `transferencia.solicitar` | Médico | ✓ Solicita e acompanha | Correto |
| `transferencia.aprovar_vaga` | Regulação de Transferência | ✓ Regulação aprova e acompanha | Correto |
| `transferencia.confirmar_checklist` | Enfermeiro | ✓ Preenche e relê o checklist | Correto |
| `transferencia.confirmar_saida` | Enfermeiro | ✓ Confirma saída, precisa ver o status da transferência | Correto |

### 3.11 Estoque

| Permissão | Perfis | Necessidade de leitura | Risco |
|---|---|---|---|
| `prescricao.dispensar` | Farmácia | ⚠ Farmácia dispensa prescrições, não necessariamente movimenta estoque via POST direto — a leitura de estoque para conferência é operacional, mas deveria ser separada semanticamente | Baixo — dados de estoque não são clínicos, mas `prescricao.dispensar` autoriza leitura de estoque por acoplamento |
| `estoque.movimentar` | Farmácia, Administração | ✓ Quem movimenta estoque precisa ler o inventário | Correto |

---

## 4. Permissões de ação reutilizadas como gate de leitura — mapa de acoplamentos

| Permissão de ação | Tabelas cobertas pela Fase A como leitura | Problema de acoplamento |
|---|---|---|
| `consulta.iniciar` | pacientes, atendimentos, chamadas, triagens, consultas, evolucoes_enfermagem, observacoes, reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens | **Super-gate:** única permissão que dá acesso de leitura a 10 das 17 tabelas. Qualquer mudança na atribuição de `consulta.iniciar` altera silenciosamente o acesso de leitura a todas essas tabelas. |
| `observacao.reavaliar` | triagens, consultas, observacoes, reavaliacoes_observacao | TEN e Enfermeiro leem consultas médicas completas (incluindo CID e conduta) por consequência de ter permissão de reavaliação. Contraria a Matriz 5B.8.5A. |
| `prescricao.dispensar` | pacientes, atendimentos, prescricoes, prescricao_itens, estoque_itens, estoque_movimentacoes | Farmácia lê o fluxo completo do atendimento (queixa, status, desfecho) por consequência de ter permissão de dispensação. |
| `transferencia.aprovar_vaga` | pacientes, atendimentos | Regulação lê todos os campos de atendimentos (incluindo conduta, desfecho) para aprovar vaga — acesso mais amplo do que a finalidade exige. |
| `exame.visualizar` | pacientes, atendimentos | Técnico em RX lê atendimentos completos (queixa, conduta, desfecho) por consequência de ter acesso a exames. |

---

## 5. Avaliação da necessidade de permissões específicas de leitura

### 5.1 Permissões de leitura candidatas

As permissões abaixo **não existem no banco** e são avaliadas como candidatas à Fase B. Nenhuma será criada nesta etapa — apenas avaliada.

| Permissão candidata | Tabelas cobertas | Justificativa para criar | Perfis que receberiam | Impacto se criada |
|---|---|---|---|---|
| `paciente.visualizar` | `pacientes` | Separar "ver paciente" de "criar paciente" — Médico, TEN, Farmácia, Regulação e TEN-RX precisam ver pacientes mas não podem criá-los | Médico, TEN, Enfermeiro, Farmácia, TEN-RX, Regulação | Baixo — simplifica a policy de pacientes |
| `atendimento.visualizar` | `atendimentos` | Separar "ver atendimento" de "abrir atendimento" — TEN, Médico, Regulação precisam ver sem ser os que abrem | Médico, TEN, Enfermeiro, Regulação | Baixo — simplifica a policy de atendimentos; Farmácia seria excluída (não precisa ver o fluxo completo) |
| `triagem.visualizar` | `triagens` | Separar "ver triagem" de "classificar" — Médico precisa ver triagens mas não as executa; `consulta.iniciar` seria o gate atual | Médico, TEN, Enfermeiro | Médio — permite separar claramente quem lê de quem escreve triagens |
| `consulta.visualizar` | `consultas` | Separar "ver consulta" de "iniciar consulta" — elimina o acoplamento de `observacao.reavaliar` como gate de `consultas` | Médico, Enfermeiro | **Alto impacto positivo** — resolve o achado crítico: TEN não receberia essa permissão e deixaria de ler consultas médicas |
| `evolucao_enfermagem.visualizar` | `evolucoes_enfermagem` | Separar "ver evolução" de "registrar evolução" — Médico lê evoluções mas `enfermagem.evolucao.registrar` não é adequado como gate de leitura médica | Médico, TEN, Enfermeiro | Baixo — simplifica o gate sem alterar acesso efetivo |
| `observacao.visualizar` | `observacoes`, `reavaliacoes_observacao` | Separar "ver observação" de "registrar reavaliação" | Médico, TEN, Enfermeiro | Baixo — organizacional |
| `estabilizacao.visualizar` | `estabilizacoes`, `checklist_estabilizacao_itens` | Separar "ver estabilização" de "marcar item de checklist" | Médico, TEN, Enfermeiro | Baixo — organizacional |
| `prescricao.visualizar` | `prescricoes`, `prescricao_itens` | Separar "ver prescrição" de "criar/dispensar" — TEN e Enfermeiro precisam ver prescrições para administrar medicamentos | TEN, Enfermeiro (e Médico via `prescricao.criar`, Farmácia via `prescricao.dispensar`) | **Médio** — TEN e Enfermeiro atualmente não leem prescrições pela Fase A (só Médico e Farmácia). Criar essa permissão resolveria a lacuna para a enfermagem. |
| `exame.visualizar` | `exames` | **Já existe** — é a única permissão de leitura explícita criada originalmente | Médico, TEN-RX, Auditoria | Já em uso — manter |
| `transferencia.visualizar` | `transferencias`, `checklist_transferencia_itens` | Separar "ver transferência" de "operar etapas" — TEN precisa ver status da transferência mas não opera etapas | TEN | Baixo — TEN atualmente não lê transferências; criação dessa permissão preencheria a lacuna documentada na Matriz 5B.8.5A |
| `estoque.visualizar` | `estoque_itens`, `estoque_movimentacoes` | Separar "ver estoque" de "movimentar estoque" | Farmácia (separado de `prescricao.dispensar`), Administração | Baixo — organizacional; Farmácia já recebe acesso de leitura via `prescricao.dispensar` e `estoque.movimentar` |

### 5.2 Prioridade de criação

| Prioridade | Permissão candidata | Motivo |
|---|---|---|
| **Alta** | `consulta.visualizar` | Resolve achado crítico: TEN lê consultas médicas por `observacao.reavaliar` — contraria a Matriz |
| **Alta** | `atendimento.visualizar` | Remove Farmácia da leitura de atendimentos clínicos completos; simplifica policy |
| **Alta** | `paciente.visualizar` | Separa identificação (leitura) de cadastro (escrita); elimina dependência de `consulta.iniciar` como gate de pacientes |
| **Média** | `prescricao.visualizar` | Habilita TEN e Enfermeiro a lerem prescrições (lacuna atual); remove acoplamento de Farmácia via `prescricao.dispensar` |
| **Média** | `triagem.visualizar` | Remove `observacao.reavaliar` como gate de triagens; declara intenção explícita de quem pode ler triagens |
| **Baixa** | `evolucao_enfermagem.visualizar` | Organizacional; acesso atual pelo `enfermagem.evolucao.registrar` e `consulta.iniciar` é correto para TEN e Médico |
| **Baixa** | `observacao.visualizar` / `estabilizacao.visualizar` | Organizacional; perfis corretos já têm acesso |
| **Baixa** | `transferencia.visualizar` | Preenche lacuna de TEN, mas o fluxo atual de TEN em transferências usa GsiApi (localStorage) |
| **Baixa** | `estoque.visualizar` | Organizacional; acesso atual é correto para Farmácia e Admin |

---

## 6. Comparação das alternativas

### Alternativa A — Continuar reutilizando permissões de ação como gate de leitura

**Descrição:** Manter as policies da Fase A sem criar permissões de leitura específicas. Eventuais ajustes pontuais nas policies substituem uma permissão por outra conforme necessário.

| Critério | Avaliação |
|---|---|
| Segurança | Média — a separação entre perfis melhorou na Fase A, mas acoplamentos permanecem (TEN lê consultas, Farmácia lê atendimentos) |
| Clareza | Baixa — difícil inferir quais tabelas um perfil lê sem percorrer todas as policies; `consulta.iniciar` como super-gate não é óbvio |
| Manutenção | Baixa — adicionar um perfil novo ou remover uma permissão de um perfil causa efeitos de leitura não documentados em outras tabelas |
| Impacto em perfis existentes | Nenhum — estado atual preservado |
| Impacto no frontend | Nenhum — frontend não consulta Supabase nas tabelas afetadas |
| Impacto nos testes | Mínimo — testes autenticados passam sem alteração |
| Risco de quebra | Baixo no curto prazo; cresce com o tempo à medida que perfis evoluem |
| Aderência ao menor privilégio | Baixa — `consulta.iniciar` autoriza leitura de 10 tabelas implicitamente; Farmácia lê atendimentos sem necessidade |

**Quando escolher:** Quando o projeto ainda não tem clareza sobre a matriz definitiva de permissões de leitura e nenhuma decisão institucional sobre quais perfis devem ler o quê foi tomada. Válido como estado transitório.

---

### Alternativa B — Criar permissões específicas de leitura por módulo

**Descrição:** Criar permissões de leitura com chave `<modulo>.visualizar` (ou `<modulo>.ver`) no banco, vincular aos perfis corretos, e substituir as policies da Fase A por predicados que usem essas permissões.

| Critério | Avaliação |
|---|---|
| Segurança | Alta — cada permissão de leitura declara explicitamente quem pode ver o quê; acoplamentos eliminados; TEN deixa de ler consultas médicas; Farmácia deixa de ver atendimentos |
| Clareza | Alta — policy declara diretamente `has_permission('consulta.visualizar')`, sem raciocínio sobre efeitos laterais |
| Manutenção | Alta — adicionar ou remover uma permissão de um perfil tem efeito previsível e isolado |
| Impacto em perfis existentes | Médio — perfis que atualmente leem dados pela Fase A poderiam perder acesso se as novas permissões não forem atribuídas corretamente antes da migration |
| Impacto no frontend | Baixo — frontend não chama Supabase nas tabelas afetadas (confirmado em 5B.8.5C); módulos de escrita não serão alterados |
| Impacto nos testes | Médio — 163 testes autenticados precisarão ser revisados: algumas expectativas de "body não-vazio" mudarão; novos testes para `consulta.visualizar`, `atendimento.visualizar`, etc. serão necessários |
| Risco de quebra | Médio — a migration de criação de permissões é segura (additive); a migration de atualização de policies é crítica e deve ser acompanhada por rollback testado |
| Aderência ao menor privilégio | Alta — cada perfil recebe exatamente as permissões de leitura que sua função justifica |

**Quando escolher:** Quando a Matriz de Leitura estiver aprovada e houver clareza sobre quais perfis devem ler quais módulos. Recomendado antes de qualquer implantação em produção real.

---

### Decisão recomendada

**Alternativa B — criar permissões específicas de leitura.**

**Justificativa:**
1. O achado crítico (TEN lendo consultas médicas via `observacao.reavaliar`) não pode ser resolvido na Alternativa A sem remover `observacao.reavaliar` das policies de `consultas` — o que quebraria o acesso do Médico, que também tem `observacao.reavaliar`. A única solução limpa é criar `consulta.visualizar` (apenas Médico e Enfermeiro a recebem, não o TEN).
2. A Alternativa B elimina o super-gate de `consulta.iniciar` (10 tabelas via uma permissão), tornando o modelo auditável e manutenível.
3. O impacto no frontend é mínimo (confirmado em 5B.8.5C): as tabelas clínicas não são lidas via Supabase no frontend atual.
4. O risco de quebra é controlável com a sequência de fases descrita na seção 9.

---

## 7. Matriz recomendada: perfil × permissão de leitura

> Legenda: ✓ = recebe a permissão | ✓* = recebe, mas com campo restrito (a definir na implementação) | — = não recebe | `is_admin()` / `is_auditoria()` = cobertura por função, não por permissão de linha

| Permissão de leitura | REC | TEN | ENF | MED | FAR | TEN-RX | REG | ADM | AUD | GES | LEI |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `paciente.visualizar` | ✓ | ✓ | ✓ | ✓ | ✓* | ✓* | ✓* | `is_admin` | `is_audit` | — | — |
| `atendimento.visualizar` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | `is_admin` | `is_audit` | — | — |
| `triagem.visualizar` | — | ✓ | ✓ | ✓ | — | — | — | `is_admin` | `is_audit` | — | — |
| `consulta.visualizar` | — | — | ✓ | ✓ | — | — | — | `is_admin` | `is_audit` | — | — |
| `evolucao_enfermagem.visualizar` | — | ✓ | ✓ | ✓ | — | — | — | `is_admin` | `is_audit` | — | — |
| `observacao.visualizar` | — | ✓ | ✓ | ✓ | — | — | — | `is_admin` | `is_audit` | — | — |
| `estabilizacao.visualizar` | — | ✓ | ✓ | ✓ | — | — | — | `is_admin` | `is_audit` | — | — |
| `prescricao.visualizar` | — | ✓ | ✓ | ✓ | ✓ | — | — | `is_admin` | `is_audit` | — | — |
| `exame.visualizar` *(já existe)* | — | — | ✓* | ✓ | — | ✓ | — | `is_admin` | `is_audit` | — | — |
| `transferencia.visualizar` | — | — | ✓ | ✓ | — | — | ✓ | `is_admin` | `is_audit` | — | — |
| `estoque.visualizar` | — | — | — | — | ✓ | — | — | `is_admin` | `is_audit` | — | — |

> **Notas:**
> - `paciente.visualizar`: Farmácia (identificação para dispensação), TEN-RX (identificação para exames) e Regulação (identificação para transferência) recebem permissão com leitura limitada a campos de cadastro — campos clínicos persistentes (alergias, comorbidades) permanecem protegidos por policy separada.
> - `exame.visualizar` (existente): Enfermeiro recebe acesso ao resultado clínico de exames (`✓*`) para continuidade do cuidado; TEN receberia apenas status (a definir na implementação).
> - Gestão Hospitalar e Leitura/Gestor: **nenhuma permissão de leitura clínica ou operacional** — acesso apenas a indicadores e relatórios agregados (sem tabela própria no banco atual).
> - `chamadas` não aparece na matriz pois é coberta pelo mesmo gate de `atendimento.visualizar` (quem vê atendimentos vê chamadas vinculadas).

---

## 8. Administração e Auditoria — tratamento separado

### 8.1 Administração

**Situação atual:** Coberta por `is_admin()` em todas as 17 policies.

**Problema:** Administração não é um perfil clínico. O acesso técnico completo via `is_admin()` é uma concessão de suporte, não uma função operacional. A migration de hardening (`20260623100028`) já revogou DELETE, o que é um primeiro passo correto.

**Recomendação para a Fase B:**
- Manter `is_admin()` nas policies de SELECT como mecanismo de acesso técnico de suporte.
- **Não migrar para permissões explícitas:** o custo de gerenciar ~17 permissões de leitura para o perfil Administração é alto e o benefício marginal — o controle real do Administrador é feito via `audit_log`, não via restrição de RLS.
- **Rastreabilidade:** todo acesso de Administração a dados clínicos nominais deve gerar registro em `audit_log` (Fase E — fora do escopo da Fase B).
- **Regra inegociável:** o Administrador nunca deve executar atos clínicos (triagem, consulta, prescrição) via sistema. A interface deve impedir isso. O banco não tem mecanismo de impedir o SELECT via `is_admin()`, mas as policies de escrita já são específicas por perfil/permissão.

### 8.2 Auditoria

**Situação atual:** Coberta por `is_auditoria()` em todas as 17 policies.

**Problema:** A Auditoria tem acesso de leitura irrestrito a todos os dados clínicos nominais de todos os pacientes. Em produção real com LGPD, esse acesso deve ser controlado, justificado e rastreável.

**Recomendação para a Fase B:**
- Manter `is_auditoria()` nas policies de SELECT como mecanismo de acesso controlado para auditoria.
- **Não migrar para permissões explícitas por tabela:** a finalidade da Auditoria é verificar a integridade operacional do sistema, o que exige visibilidade ampla.
- **Condição para produção real:** todo acesso de Auditoria a dados clínicos individualizados (`pacientes`, `atendimentos`, `triagens`, `consultas`, etc.) deve ser registrado em `audit_log` com contexto (qual tabela, qual operação, horário). Isso é escopo da Fase E.
- **Distinção futura:** em produção, considerar separar Auditoria interna (acesso contínuo operacional) de Auditoria externa (acesso por solicitação com janela de tempo — a definir institucionalmente).

### 8.3 Conclusão sobre is_admin() e is_auditoria() nas policies

`is_admin()` e `is_auditoria()` devem **permanecer diretamente nas policies** SELECT. Migrá-los para permissões explícitas por tabela criaria um sistema de permissões duplicado (função × permissão) sem ganho de segurança equivalente ao custo de manutenção.

---

## 9. Impacto nos testes

### 9.1 Testes que deverão mudar

| Arquivo | Suite / Teste afetado | Motivo da mudança |
|---|---|---|
| `tests/security/phase-a-select-access.test.js` | `tecnico-em-enfermagem: nao ve consultas — body vazio` (NOVO teste negativo) | Atualmente TEN **lê** consultas via `observacao.reavaliar`; após Fase B, deverá **não ler** |
| `tests/security/phase-a-select-access.test.js` | Todos os testes de TEN com `prescricoes` e `prescricao_itens` | Atualmente TEN não lê prescrições (body vazio); com `prescricao.visualizar`, **deverá ler** |
| `tests/security/phase-a-select-access.test.js` | `farmacia: le atendimentos (body nao-vazio)` → deve mudar para `body vazio` | Farmácia não precisaria mais de `atendimentos` com `atendimento.visualizar` |
| `tests/security/phase-a-select-access.test.js` | Testes de `enfermeiro: le transferencias` e `enfermeiro: le checklist_transferencia_itens` | Enfermeiro receberia `transferencia.visualizar` — confirmar acesso |
| `tests/security/policies.test.js` | Inventário de policies — nomes novos precisarão ser adicionados | 17 policies mudam de nome: `*_select_clinico` e `*_select_farmacia_clinico` → novos nomes |

### 9.2 Novos cenários positivos (após Fase B)

| Perfil | Tabela | Expectativa |
|---|---|---|
| TEN | `prescricoes` | body não-vazio (com `prescricao.visualizar`) |
| TEN | `prescricao_itens` | body não-vazio |
| Enfermeiro | `consultas` | body não-vazio (com `consulta.visualizar`) |
| Enfermeiro | `transferencias` | body não-vazio (com `transferencia.visualizar`) |
| TEN-RX | `pacientes` e `atendimentos` | manter body não-vazio (via `paciente.visualizar` e `atendimento.visualizar`) |

### 9.3 Novos cenários negativos (após Fase B)

| Perfil | Tabela | Expectativa |
|---|---|---|
| TEN | `consultas` | body vazio (sem `consulta.visualizar`) |
| TEN | `atendimentos` (detalhe clínico de campos como queixa) | ainda body não-vazio, mas campo queixa não deveria retornar — **não implementável via RLS sem views ou column-level security** |
| Farmácia | `atendimentos` | body vazio (sem `atendimento.visualizar`) |
| Farmácia | `pacientes` | a decidir (Farmácia precisa de identificação para dispensação → `paciente.visualizar` com campos limitados) |

### 9.4 Riscos de falso positivo

- **TEN com `prescricao.visualizar`:** criar a permissão sem ajustar a policy de `prescricoes_select_farmacia_clinico` pode não alterar o comportamento — precisa de nova migration de policy.
- **Múltiplos perfis:** usuário com perfil Médico + Farmácia receberia acesso a todas as tabelas de ambos. Testes devem cobrir combinações de perfis (embora seja cenário improvável na operação hospitalar).
- **Gestão Hospitalar:** atualmente sem acesso pelas 17 policies da Fase A — qualquer nova permissão de leitura criada e atribuída incorretamente a esse perfil reinstituiria o acesso indevido.

---

## 10. Plano faseado para implementação da Fase B

> Nenhuma das fases abaixo deve ser iniciada sem aprovação explícita. Este documento é de diagnóstico e planejamento.

### Fase B1 — Criar permissões de leitura específicas

**Objetivo:** Inserir as novas chaves de permissão em `permissoes`.  
**Migration:** `INSERT INTO permissoes (chave, modulo, descricao) VALUES (...)` para as permissões de prioridade Alta e Média.  
**Risco:** Mínimo — operação aditiva; nenhuma policy é alterada; nenhum acesso existente muda.  
**Rollback:** `DELETE FROM permissoes WHERE chave IN (...)`.  
**Validação:** Query em `permissoes` confirma existência das novas chaves.

### Fase B2 — Vincular permissões de leitura aos perfis

**Objetivo:** Inserir vínculos em `perfil_permissao` conforme a matriz da seção 7.  
**Migration:** `INSERT INTO perfil_permissao (perfil_id, permissao_id) SELECT ... ON CONFLICT DO NOTHING`.  
**Risco:** Baixo — os vínculos novos só terão efeito quando as policies forem atualizadas na Fase B3; até lá, o acesso permanece controlado pelas policies da Fase A.  
**Rollback:** `DELETE FROM perfil_permissao WHERE ...`.  
**Validação:** Query em `perfil_permissao` + `permissoes` confirma vínculos por perfil.

### Fase B3 — Atualizar as 17 policies SELECT

**Objetivo:** Substituir as permissões de ação por permissões de leitura específicas nas 17 policies da Fase A.  
**Migration:** `DROP POLICY IF EXISTS ... ; CREATE POLICY ... USING (has_permission('<modulo>.visualizar') OR ... OR is_admin() OR is_auditoria())`.  
**Risco:** Alto — alteração de comportamento de acesso em produção; rollback deve ser testado antes.  
**Rollback:** Script de rollback recria as 17 policies da Fase A (equivalente ao rollback 29 existente, atualizado para os novos nomes).  
**Validação:** Suite de segurança completa (231 testes) + suite da Fase B (testes novos).

### Fase B4 — Executar matriz de testes autenticados

**Objetivo:** Confirmar que cada perfil lê exatamente o que a Matriz 7 define — nem mais, nem menos.  
**Escopo:** 11 perfis × 17 tabelas = 187 combinações, com cenários positivos e negativos por combinação relevante.  
**Ferramentas:** Extensão de `tests/security/phase-a-select-access.test.js` com novos casos de teste, mantendo a arquitetura `cit()` + `execLocalRows()`.

### Fase B5 — Rollback e validação de reversibilidade

**Objetivo:** Confirmar que o rollback da Fase B restaura exatamente o estado da Fase A.  
**Sequência:** `supabase db reset` → executar rollback B3 → verificar 17 policies da Fase A restauradas → re-aplicar B3 → confirmar testes.

---

## 11. Rollback conceitual da Fase B

```
Rollback B3 (policies):
  DROP POLICY IF EXISTS <nova_policy_fase_b> ON public.<tabela>;
  -- recriar policies da Fase A via script rollback 29 (já existente e testado)

Rollback B2 (vínculos de permissão):
  DELETE FROM public.perfil_permissao
  WHERE permissao_id IN (
    SELECT id FROM public.permissoes
    WHERE chave IN (
      'paciente.visualizar', 'atendimento.visualizar', 'triagem.visualizar',
      'consulta.visualizar', 'evolucao_enfermagem.visualizar', 'observacao.visualizar',
      'estabilizacao.visualizar', 'prescricao.visualizar', 'transferencia.visualizar',
      'estoque.visualizar'
    )
  );

Rollback B1 (permissões):
  DELETE FROM public.permissoes
  WHERE chave IN (
    'paciente.visualizar', 'atendimento.visualizar', 'triagem.visualizar',
    'consulta.visualizar', 'evolucao_enfermagem.visualizar', 'observacao.visualizar',
    'estabilizacao.visualizar', 'prescricao.visualizar', 'transferencia.visualizar',
    'estoque.visualizar'
  );
```

> **Nota:** `exame.visualizar` não está no rollback conceitual pois já existe no banco desde a migration 04. Não deve ser removida.

---

## 12. Decisões institucionais pendentes antes da Fase B

| Decisão | Impacto na Fase B |
|---|---|
| TEN deve ler prescrições? | Determina se `prescricao.visualizar` é atribuída ao Técnico em Enfermagem |
| Enfermeiro deve ler consultas médicas completas (CID, conduta)? | Determina se `consulta.visualizar` é atribuída ao Enfermeiro; acesso ao CID pode exigir confirmação jurídica (LGPD) |
| Farmácia deve ver atendimentos? | Determina se `atendimento.visualizar` é atribuída à Farmácia ou se a Farmácia acessa prescrições apenas pelo `paciente_id` |
| Farmácia deve ver alergias do paciente para verificar incompatibilidades? | Determina acesso de Farmácia a `paciente_alergias` — tabela fora das 17 da Fase A, política separada |
| TEN-RX deve ver atendimentos completos ou apenas os vinculados a exames? | Determina escopo de `atendimento.visualizar` para o perfil TEN-RX; pode exigir restrição por linha (Fase D) |
| Regulação deve ver queixa principal e conduta no atendimento? | Determina se `atendimento.visualizar` para Regulação inclui ou exclui campos clínicos — RLS por coluna não é suportado nativamente pelo PostgREST |
| Gestão Hospitalar e Leitura/Gestor: eliminar, fundir ou criar permissões específicas? | Determina se esses perfis recebem qualquer permissão de leitura na Fase B |
| Auditoria: acesso contínuo ou por solicitação com janela de tempo? | Determina se `is_auditoria()` nas policies deve ser complementado por controle temporal (fora do escopo de RLS padrão) |

---

## 13. Critérios de GO/NO-GO para autorizar a implementação

### GO — todos os critérios abaixo devem ser atendidos

- [ ] Matriz de leitura por perfil aprovada institucionalmente (seção 7 deste documento ou versão revisada)
- [ ] Decisões institucionais pendentes (seção 12) respondidas para as permissões de prioridade Alta e Média
- [ ] Ambiente local com `supabase db reset` limpo e testes 231/231 passando antes da migration B1
- [ ] Rollback B1, B2 e B3 redigidos, revisados e testados em ambiente local antes da migration B3
- [ ] Suite de testes da Fase B (187+ combinações) escrita e com expectativas validadas antes da migration B3
- [ ] Frontend validado: confirmar que nenhuma função em `script.js` chama `window.GsiAuth.client.from()` nas tabelas cujas policies serão alteradas na B3, ou que essas funções foram adaptadas
- [ ] Nenhum teste da suite de segurança FALHA após B3 (tolerância zero a regressão)
- [ ] Aprovação explícita de commit e deploy

### NO-GO — qualquer um dos itens abaixo bloqueia

- [ ] Alguma decisão institucional da seção 12 de prioridade Alta não foi respondida
- [ ] Suite de testes da Fase B não está escrita antes da migration B3
- [ ] Rollback B3 não foi testado em ambiente local
- [ ] Algum teste da suite 231/231 falha após B1, B2 ou B3
- [ ] Frontend faz SELECT via Supabase em tabela com policy alterada sem que o comportamento pós-alteração tenha sido validado
- [ ] Migrations B1, B2, B3 não possuem arquivos de rollback correspondentes em `supabase/rollback/`

---

## 14. Riscos consolidados

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| TEN perde acesso a dados necessários para cuidado do paciente | Média | Alto | Confirmar matriz com coordenação de enfermagem antes da Fase B3 |
| Farmácia perde acesso a informações necessárias para identificação na dispensação | Baixa | Médio | Avaliar `paciente.visualizar` com campos limitados vs. tabela completa |
| Médico com `consulta.iniciar` removido de uma policy perde acesso de leitura a múltiplas tabelas | Baixa | Alto | Resolução pelo uso de permissões de leitura específicas — exatamente o objetivo da Fase B |
| Regressão em 163 testes da Fase A após Fase B3 | Média | Alto | Executar full suite antes de B3; testes autenticados validam comportamento por perfil |
| Perfil novo adicionado no futuro sem permissões de leitura adequadas | Alta (a longo prazo) | Médio | A Alternativa B torna isso explícito: novo perfil sem `<modulo>.visualizar` não lê nada — correto por padrão |
| Column-level security não é suportado via RLS padrão no PostgREST | N/A | Médio | Campos clínicos sensíveis (queixa, conduta, CID) em tabelas também acessadas por perfis não clínicos não podem ser ocultados por RLS de linha — alternativa é view ou função RPC (fora do escopo da Fase B) |

---

## 15. Achado crítico resumido

> **TEN e Enfermeiro leem consultas médicas completas (incluindo CID e conduta) via `observacao.reavaliar` na Fase A.** Isso contraria diretamente a Matriz de Leitura (5B.8.5A) e a regra institucional de que o Técnico em Enfermagem não acessa o prontuário médico completo. Este é o achado de maior urgência para a Fase B e o principal motivador para a criação de `consulta.visualizar`.

---

*Documento de diagnóstico e planejamento — 2026-07-24. Nenhuma migration, tabela, policy, function, grant ou permissão foi criada ou alterada. Aprovação institucional e técnica necessária antes de qualquer implementação das fases descritas.*
