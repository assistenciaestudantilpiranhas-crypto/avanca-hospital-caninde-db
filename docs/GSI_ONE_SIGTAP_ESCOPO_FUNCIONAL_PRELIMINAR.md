# GSI ONE — SIGTAP: Escopo Funcional Preliminar

**Documento:** GSI_ONE_SIGTAP_ESCOPO_FUNCIONAL_PRELIMINAR  
**Competência de referência:** 07/2026  
**Pacote SIGTAP:** TabelaUnificada_202607_v2607101010.zip (79 arquivos, ainda não importado)  
**Status:** Rascunho preliminar — pendente de validação com assessor de produção  
**Data de elaboração:** 2026-07-23  

---

## 1. Finalidade do módulo SIGTAP dentro do GSI ONE

O módulo SIGTAP no GSI ONE tem como finalidade registrar, controlar e organizar a **produção ambulatorial e hospitalar** da unidade de saúde para fins de faturamento ao SUS.

Ele não substitui o fluxo assistencial já existente. Ele se conecta a esse fluxo para extrair os registros clínicos necessários à composição da produção, por competência, nos instrumentos corretos: **BPA-C** (Boletim de Produção Ambulatorial Consolidado), **BPA-I** (Boletim de Produção Ambulatorial Individualizado) e **AIH** (Autorização de Internação Hospitalar).

Objetivos específicos do módulo:

- registrar o procedimento SUS associado a um atendimento ou internação;
- vincular o procedimento ao profissional executor (CBO), ao estabelecimento (CNES) e ao período (competência);
- permitir conferência interna antes do envio à Central de Regulação ou ao DATASUS;
- gerar relatório por competência para controle interno;
- servir de base para futura exportação em arquivo-padrão (a validar).

> **Atenção:** O GSI ONE não gera arquivos BPA ou AIH em formato de transmissão nesta fase. O escopo atual é o registro e o controle interno. A geração do arquivo de exportação é uma evolução futura, dependente de validação técnica e operacional.

---

## 2. Diferença entre catálogo nacional e catálogo local

### Catálogo nacional (SIGTAP)

O SIGTAP — Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos e OPM do SUS — é a tabela nacional publicada pelo DATASUS/MS. A competência 07/2026 está disponível no pacote oficial com 79 arquivos, contendo todos os procedimentos, atributos, regras de habilitação, CBO, CID, serviços e classificações válidos no período.

Esse catálogo é de uso **somente leitura** dentro do GSI ONE. Ele serve como referência para validação dos procedimentos registrados.

### Catálogo local (unidade)

O catálogo local é o subconjunto de procedimentos que o estabelecimento está habilitado a realizar conforme seu CNES. Nem todos os procedimentos nacionais são válidos para a unidade.

O catálogo local deve ser definido a partir de:

- habilitações vigentes no CNES do estabelecimento;
- procedimentos efetivamente realizados na unidade (a confirmar com o assessor);
- restrições de serviço, classificação e CBO aplicáveis;
- histórico de glosas e rejeições (a levantar com o assessor).

> **A validar com o assessor:** quais procedimentos compõem o catálogo local vigente, quais habilitações estão ativas, e se há procedimentos que o sistema de origem atual já lista como frequentes.

---

## 3. Vínculo entre paciente, atendimento, profissional e procedimento

O registro de produção no GSI ONE deve vincular obrigatoriamente:

| Elemento | Descrição | Já existe no GSI ONE? |
|---|---|---|
| Paciente | Identificação do paciente | Sim — tabela `pacientes` |
| Atendimento | Episódio de cuidado | Sim — tabela `atendimentos` |
| Profissional executor | Quem realizou o procedimento | Parcialmente — campo de médico/setor em atendimentos e consultas |
| CBO do profissional | Código de ocupação | A validar — não identificado como campo estruturado |
| Procedimento SIGTAP | Código e descrição oficial | Não existe ainda |
| CID principal | Diagnóstico associado | A validar — não identificado como campo estruturado |
| Competência | Mês/ano de referência | A validar — derivado da data do atendimento |
| CNES | Estabelecimento de saúde | A validar — não identificado como campo configurável centralizado |
| Instrumento de registro | BPA-C, BPA-I ou AIH | Não existe ainda |

---

## 4. Fluxo desde o registro assistencial até a conferência da produção

O fluxo preliminar conceitual é:

```
Recepção → Triagem → Consulta / Observação / Estabilização
     ↓
Registro do procedimento realizado (novo — a criar)
     ↓
Vinculação: paciente + profissional + CBO + CID + competência + CNES
     ↓
Fila de produção interna (por competência)
     ↓
Conferência pelo responsável de produção (a validar quem é)
     ↓
Geração de relatório/planilha (fase 1)
     ↓
[Futuro] Geração de arquivo de exportação (BPA-C, BPA-I, AIH)
```

> **Nota:** Este fluxo é preliminar e deve ser validado com o assessor. A definição de qual etapa assistencial origina o registro de produção (triagem, consulta, alta, internação) depende do tipo de instrumento e das regras do SUS aplicáveis a cada procedimento.

---

## 5. Campos já existentes no GSI ONE que podem sustentar produção

Com base no mapa de módulos atual (`GSI_ONE_MAPA_MODULOS_SCRIPT_JS_6A1.md`) e nas tabelas Supabase identificadas:

| Campo / Tabela | Módulo de origem | Relevância para produção |
|---|---|---|
| `pacientes` — nome, data de nascimento | Recepção | Identificação do beneficiário |
| `atendimentos` — data/hora de abertura | Atendimentos | Base para competência |
| `atendimentos` — status, setor | Atendimentos | Rastreabilidade do episódio |
| `consultas` — data, profissional fictício | Consulta | Origem do procedimento ambulatorial |
| `observacoes` — tipo, data | Observação | Caracterização do período de permanência |
| `estabilizacoes` — data, checklist | Estabilização | Registro de procedimentos de urgência |
| `transferencias` — data, destino | Transferências | Possível vínculo com AIH regulada |
| `dom_desfechos` — tipo de desfecho | Consulta / Alta | Alta hospitalar, transferência, óbito |

---

## 6. Campos que provavelmente precisarão ser acrescentados

Os campos a seguir **não foram identificados** como estruturados no GSI ONE atual e provavelmente precisarão ser criados ou configurados:

| Campo necessário | Observação |
|---|---|
| Código do procedimento SIGTAP | Chave principal do registro de produção |
| CBO do profissional executor | Vinculado ao profissional real, não fictício |
| CID principal (e secundário, se aplicável) | Diagnóstico clínico para BPA-I e AIH |
| CNES do estabelecimento | Configuração central da unidade |
| Competência (mês/ano) | Pode ser derivada da data, mas precisa ser explícita |
| Instrumento de registro | BPA-C, BPA-I ou AIH |
| Quantidade de procedimentos | Para BPA-C, é a contagem consolidada |
| Número do prontuário / CNS do paciente | Obrigatório para BPA-I e AIH |
| Folha e sequência | Para estrutura de arquivo BPA (futuro) |
| Caráter de atendimento | Eletivo, urgência, etc. (a validar) |
| Serviço / classificação SIGTAP | Vínculo com habilitação do estabelecimento |

> **A validar com o assessor:** quais campos são obrigatórios nos instrumentos usados atualmente, e quais o sistema vigente já controla.

---

## 7. Separação entre BPA-C, BPA-I e AIH

Esta seção apresenta a diferença conceitual entre os três instrumentos. As regras específicas de cada um **não foram presumidas** e devem ser confirmadas com o assessor.

### BPA-C — Boletim de Produção Ambulatorial Consolidado

- Registra procedimentos por **totais agregados**.
- Não vincula individualmente a um paciente específico.
- Utilizado para procedimentos de menor complexidade ou de produção em massa (a validar).
- Campos mínimos esperados: competência, CNES, procedimento, CBO, quantidade.

### BPA-I — Boletim de Produção Ambulatorial Individualizado

- Registra procedimentos vinculados **individualmente ao paciente**.
- Exige identificação do beneficiário (CNS ou CPF), CID, CBO e data.
- Utilizado para procedimentos que exigem rastreabilidade individual (a validar quais se aplicam à unidade).

### AIH — Autorização de Internação Hospitalar

- Instrumento para **internações hospitalares**.
- Mais complexo: exige diagnóstico principal, secundário, procedimento solicitado e realizado, profissional, CID, tempo de permanência e caráter da internação.
- Vinculado ao processo de regulação e à Central de Leitos (quando aplicável).
- A geração da AIH pelo GSI ONE é **evolução futura**, condicionada à validação do fluxo de internação.

> **Atenção:** A aplicabilidade de BPA-C, BPA-I e AIH a cada tipo de atendimento da unidade deve ser confirmada com o assessor. Não foi presumida nenhuma regra de qual instrumento se aplica a qual procedimento.

---

## 8. Proposta preliminar de entidades de banco — apenas conceitual

> **Importante:** Esta seção é puramente conceitual. Nenhuma tabela, migration, RLS ou função foi criada. Tudo depende de validação com o assessor e de aprovação explícita antes de qualquer implementação.

### Entidades candidatas

```
producao_procedimentos
  - id
  - atendimento_id (FK atendimentos)
  - paciente_id (FK pacientes)
  - competencia (YYYY-MM)
  - codigo_sigtap (texto, validado contra tabela SIGTAP)
  - descricao_procedimento
  - cbo_executor (texto)
  - cid_principal (texto)
  - cid_secundario (texto, opcional)
  - cnes_estabelecimento
  - instrumento (BPA-C | BPA-I | AIH)
  - quantidade
  - status (rascunho | conferido | enviado)
  - criado_por (FK usuarios)
  - criado_em (timestamp)
  - competencia_fechada (boolean)

sigtap_procedimentos_local
  - codigo_sigtap
  - descricao
  - competencia_inicio
  - competencia_fim (null = ativo)
  - instrumento_compativel (BPA-C | BPA-I | AIH | múltiplos)
  - servico
  - classificacao
  - habilitacao_necessaria
  - ativo (boolean)
  - importado_em

sigtap_cbo_procedimento
  - codigo_sigtap
  - cbo
  - competencia

sigtap_cid_procedimento
  - codigo_sigtap
  - cid
  - competencia
```

> **A definir:** estrutura de auditoria (audit_log já existe), RLS por perfil, quem pode conferir e quem pode fechar a competência, e como tratar rejeições e glosas.

---

## 9. Histórico por competência

O módulo deve manter o histórico de produção por competência, permitindo:

- consultar produção de competências anteriores;
- comparar produção entre períodos;
- identificar variações (picos, quedas, novos procedimentos);
- suportar auditoria interna.

Regras preliminares:

- uma competência fechada não deve permitir novas inclusões sem ação explícita;
- o fechamento da competência deve ser uma ação controlada, com registro de quem fechou e quando;
- registros de competências anteriores devem ser somente leitura após fechamento.

> **A validar com o assessor:** qual é o calendário de fechamento de competência atual e quem é responsável por esse controle.

---

## 10. Controle de procedimento ativo/inativo

O catálogo SIGTAP muda a cada competência. Procedimentos podem ser incluídos, alterados ou excluídos pelo MS.

O módulo deve:

- marcar cada procedimento com a competência de início e, quando aplicável, de fim;
- impedir o registro de procedimentos inativos na competência corrente;
- permitir consulta de procedimentos históricos para competências anteriores;
- alertar quando um procedimento importado do SIGTAP for alterado ou desativado.

---

## 11. Necessidade de validar CBO, CID, CNES, serviço, classificação, habilitação e instrumento de registro

Antes de qualquer registro de produção, o sistema deve ser capaz de validar:

| Elemento | O que validar | Fonte de validação |
|---|---|---|
| Código SIGTAP | Se existe e está ativo na competência | Tabela local importada do SIGTAP |
| CBO | Se é permitido para o procedimento | Tabela sigtap_cbo_procedimento |
| CID | Se é compatível com o procedimento | Tabela sigtap_cid_procedimento |
| CNES | Se está corretamente configurado | Configuração do sistema |
| Serviço / classificação | Se o estabelecimento possui a habilitação | Tabela de habilitações locais |
| Instrumento de registro | Se o procedimento é válido para BPA-C, BPA-I ou AIH | Atributos SIGTAP + regra local |

> **Nenhuma regra de validação foi implementada.** Tudo depende de importação do SIGTAP e de confirmação com o assessor.

---

## 12. Geração inicial de relatório / planilha

Na fase 1, o módulo deve gerar um relatório interno por competência contendo:

- listagem de procedimentos registrados;
- agrupamento por instrumento (BPA-C, BPA-I, AIH);
- totais por procedimento e por CBO;
- status de cada registro (rascunho, conferido);
- exportação em formato de planilha (CSV ou XLSX) para conferência manual.

Esse relatório substituiria temporariamente a geração do arquivo de transmissão.

---

## 13. Evolução futura para arquivo de exportação

Em fase posterior (a planejar após validação do módulo básico):

- geração do arquivo BPA no formato-padrão do DATASUS;
- geração do arquivo AIH no formato SISAIH01 (a validar se aplicável à unidade);
- validação automática contra as regras do SIGTAP antes da exportação;
- registro de envio e retorno (glosas, aprovações, rejeições);
- controle de lote por competência.

> Esta evolução **não está no escopo atual** e não deve ser implementada sem aprovação explícita.

---

## 14. Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação preliminar |
|---|---|---|---|
| Catálogo SIGTAP não importado antes do desenvolvimento | Alta | Alto | Importar apenas o subconjunto de procedimentos relevantes como primeiro passo |
| CNES ou habilitações da unidade não mapeados | Alta | Alto | Levantar com o assessor na reunião |
| CBOs dos profissionais não registrados no sistema | Alta | Alto | Criar cadastro de profissionais e CBOs como pré-requisito |
| Regras de BPA-C vs BPA-I não confirmadas | Alta | Alto | Não presumir; validar com assessor antes de qualquer tela |
| Fluxo assistencial atual não gera campos necessários para produção | Média | Alto | Mapear lacunas por instrumento antes de criar campos |
| Competência importada desatualizada | Baixa | Médio | Sempre verificar competência vigente no site do DATASUS |
| Glosas por CBO/CID/serviço incorretos | Média | Alto | Implementar validação antes do fechamento da competência |

---

## 15. Itens que dependem de confirmação do assessor

Os seguintes pontos **não podem ser decididos sem a reunião com o assessor de produção**:

- [ ] Quais procedimentos a unidade fatura atualmente e em qual instrumento (BPA-C, BPA-I, AIH)?
- [ ] Quais habilitações estão ativas no CNES da unidade?
- [ ] Quais CBOs são utilizados nos registros de produção?
- [ ] Qual é o calendário de fechamento de competência?
- [ ] Quem é responsável pela conferência e pelo envio?
- [ ] Qual sistema é utilizado hoje para geração do BPA/AIH?
- [ ] Há integração com a Central de Regulação para AIH?
- [ ] Quais são os procedimentos com maior índice de glosa?
- [ ] O CNS do paciente está disponível nos registros atuais?
- [ ] O CID é registrado no atendimento atual ou apenas na guia?
- [ ] Há procedimentos que podem ser registrados sem CID (BPA-C)?
- [ ] Qual formato de relatório o responsável de produção usa hoje?

---

*Documento gerado em 2026-07-23. Status: rascunho preliminar. Não implementar nada sem validação do assessor e aprovação explícita.*
