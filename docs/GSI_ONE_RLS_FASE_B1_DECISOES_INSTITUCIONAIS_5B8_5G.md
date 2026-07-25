# GSI ONE — RLS Fase B1: Consolidação das Decisões Institucionais

**Documento:** GSI_ONE_RLS_FASE_B1_DECISOES_INSTITUCIONAIS_5B8_5G  
**Etapa:** 5B.8.5G  
**Status:** Decisões institucionais consolidadas — nenhuma migration, policy, grant, permissão ou código alterado  
**Elaborado em:** 2026-07-24  
**Pré-requisitos lidos:**
- GHAES-SESSION.md · AGENTS.md · CLAUDE.md
- DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md
- GSI_ONE_RLS_FASE_B1_ESPECIFICACAO_5B8_5F.md
- GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A.md
- GSI_ONE_RLS_FASE_B_GRANULARIDADE_PERMISSOES_5B8_5E.md
- migrations 20260623100004 · 20260623100020 · 20260623100024 · 20260623100026 · 20260722100029
- tests/security/phase-a-select-access.test.js

**Objetivo:** Transformar cada decisão institucional pendente identificada em 5B.8.5F em uma posição explícita, justificada e aprovável, fechando o conjunto de requisitos que autoriza a implementação da Fase B1.

---

## 1. Decisões institucionais pendentes identificadas em 5B.8.5F

O documento 5B.8.5F identificou as seguintes decisões em aberto (§15 do documento referenciado):

| Ref. | Decisão pendente |
|---|---|
| **P1** | Farmácia deve ou não ter acesso a `atendimentos` após Fase B1? |
| **P2** | Regulação deve ter acesso a `consultas` (resumo clínico para fundamentar transferência)? |
| **P3** | Aceita-se que todos os campos de `pacientes` e `atendimentos` — incluindo CPF e `queixa_principal` — sejam visíveis a todos os perfis com acesso via RLS de linha? Ou é necessário view/RPC? |
| **P4** | Auditoria deve ter janela de tempo de acesso ou acesso contínuo? |
| **P5** | Confirmar que `is_admin()` deve permanecer diretamente nas policies (não migrar para permissão explícita). |

Além dessas cinco, esta etapa consolida de forma normativa as decisões de perfil que estavam recomendadas, mas não aprovadas formalmente, para cada uma das três permissões e para os perfis especiais (Administração, Auditoria, Gestão Hospitalar, Leitura/Gestor, múltiplos perfis).

---

## 2. Decisão A — `paciente.visualizar`

### 2.1 Questão

Quais perfis devem receber a permissão `paciente.visualizar`, autorizando leitura da tabela `pacientes`?

### 2.2 Análise por perfil

**Recepção**

- Opções: conceder / não conceder.
- Impacto assistencial: Recepção realiza o cadastro e a localização de pacientes. Sem `paciente.visualizar`, perderia acesso via mecanismo explícito após a Fase B1c.
- Impacto de segurança: Recepção já tem `paciente.criar` — acesso a `pacientes` é pré-existente e intencional.
- Impacto no frontend: módulo de Pacientes, Atendimentos e Painel de Chamada dependem da leitura de `pacientes`.
- Risco de acesso indevido: nenhum — Recepção não acessa campos clínicos nem prontuário; campos como CPF e telefone são necessários para identificação na recepção.
- **Decisão: CONCEDER.**

**Técnico em Enfermagem**

- Opções: conceder / não conceder.
- Impacto assistencial: TEN executa triagem e cuidados diretos ao paciente e precisa identificar o paciente nominalmente.
- Impacto de segurança: Hoje acessa via `triagem.classificar` — acoplamento. A nova permissão declara a intenção corretamente, sem ampliar o acesso efetivo.
- Impacto no frontend: módulo de Triagem, Enfermagem, Observação e Checklist de Estabilização exibem dados do paciente.
- Risco de acesso indevido: TEN verá CPF e telefone por limitação de RLS de linha (ver P3 — aceito institucionalmente nesta fase).
- **Decisão: CONCEDER.**

**Enfermeiro**

- Opções: conceder / não conceder.
- Impacto assistencial: Enfermeiro coordena o cuidado de enfermagem e precisa de identificação plena do paciente.
- Impacto de segurança: Enfermeiro tem escopo mais amplo que TEN; acesso a `pacientes` já existe via permissões atuais.
- Impacto no frontend: módulos de Enfermagem, Observação, Transferência e Checklist.
- Risco de acesso indevido: nenhum — Enfermeiro é perfil clínico direto.
- **Decisão: CONCEDER.**

**Médico**

- Opções: conceder / não conceder.
- Impacto assistencial: Médico precisa identificar o paciente para a consulta, anamnese e histórico. Sem `paciente.visualizar`, perderia acesso nominal explícito.
- Impacto de segurança: Hoje acessa via `consulta.iniciar` — acoplamento crítico. `paciente.visualizar` substitui o gate indiretto.
- Impacto no frontend: módulo de Consulta, Prescrição, Exames, Observação, Transferência.
- Risco de acesso indevido: nenhum — Médico é o perfil de maior responsabilidade clínica do sistema.
- **Decisão: CONCEDER.**

**Farmácia**

- Opções: conceder / não conceder.
- Impacto assistencial: Farmácia confirma identidade do paciente no momento da dispensação.
- Impacto de segurança: Farmácia verá CPF, cartão SUS e telefone por limitação de RLS de linha. Aceito institucionalmente nesta fase (ver P3), pois a finalidade é conferência de identidade.
- Impacto no frontend: módulo de Farmácia exibe nome do paciente para confirmar dispensação correta.
- Risco de acesso indevido: baixo — Farmácia não terá acesso a dados clínicos de `consultas` ou `triagens`; dados de `pacientes` são de identificação.
- **Decisão: CONCEDER.**

**Técnico em RX**

- Opções: conceder / não conceder.
- Impacto assistencial: TEN-RX precisa do nome e data de nascimento do paciente para vincular o exame ao paciente correto.
- Impacto de segurança: TEN-RX verá CPF e telefone por limitação de RLS de linha — aceito institucionalmente nesta fase, pois TEN-RX não tem acesso a dados clínicos de outras tabelas.
- Impacto no frontend: módulo de Exames exibe nome do paciente para identificação do exame.
- Risco de acesso indevido: baixo — escopo do TEN-RX é estritamente o módulo de Exames.
- **Decisão: CONCEDER.**

**Regulação de Transferência**

- Opções: conceder / não conceder.
- Impacto assistencial: Regulação documenta e processa transferências, e precisa identificar o paciente nominalmente para preencher o formulário de regulação.
- Impacto de segurança: Regulação verá CPF e telefone por limitação de RLS de linha — aceito institucionalmente, pois documentos de transferência podem exigir CPF e nome completo.
- Impacto no frontend: módulo de Transferências exibe identificação do paciente.
- Risco de acesso indevido: baixo — Regulação não tem acesso a `consultas`, `triagens` ou `evolucoes`.
- **Decisão: CONCEDER.**

**Administração**

- Situação: `is_admin()` já cobre o acesso a `pacientes` na policy. Atribuir `paciente.visualizar` ao perfil Administração criaria dependência redundante e poderia manter acesso residual indevido se `is_admin()` fosse removido das policies no futuro.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_admin()` mantido nas policies.**

**Auditoria**

- Situação: `is_auditoria()` já cobre o acesso. Mesma lógica da Administração.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_auditoria()` mantido nas policies.**

**Gestão Hospitalar**

- Opções: conceder / não conceder.
- Impacto assistencial: Gestão não executa função assistencial. Acessa indicadores e relatórios agregados — sem necessidade de dados nominais.
- Impacto de segurança: permitir leitura de `pacientes` à Gestão expõe CPF, nome e data de nascimento sem finalidade operacional definida — violação de proporcionalidade de acesso (LGPD Art. 6, VI).
- Risco de acesso indevido: alto — acesso a dados pessoais de pacientes sem finalidade assistencial direta.
- **Decisão: NÃO CONCEDER. Gestão acessa apenas indicadores e relatórios agregados (Fase E/F).**

**Leitura/Gestor**

- Mesma análise da Gestão Hospitalar.
- **Decisão: NÃO CONCEDER. Acesso futuro via views de relatórios agregados.**

**Sem perfil / Inativo**

- Bloqueio automático via `has_permission()` (verifica `ativo = true` e existência de vínculo).
- **Decisão: NEGAR automaticamente — sem ação necessária.**

### 2.3 Decisão consolidada — `paciente.visualizar`

| Perfil | Decisão | Mecanismo |
|---|---|---|
| Recepção | **CONCEDER** | `perfil_permissao` |
| Técnico em Enfermagem | **CONCEDER** | `perfil_permissao` |
| Enfermeiro | **CONCEDER** | `perfil_permissao` |
| Médico | **CONCEDER** | `perfil_permissao` |
| Farmácia | **CONCEDER** | `perfil_permissao` |
| Técnico em RX | **CONCEDER** | `perfil_permissao` |
| Regulação de Transferência | **CONCEDER** | `perfil_permissao` |
| Administração | **VIA `is_admin()`** | Função direta na policy |
| Auditoria | **VIA `is_auditoria()`** | Função direta na policy |
| Gestão Hospitalar | **NÃO CONCEDER** | — |
| Leitura/Gestor | **NÃO CONCEDER** | — |
| Sem perfil | **NÃO** (automático) | `has_permission()` retorna FALSE |
| Inativo | **NÃO** (automático) | `has_permission()` verifica `ativo = true` |

---

## 3. Decisão B — `atendimento.visualizar`

### 3.1 Questão

Quais perfis devem receber a permissão `atendimento.visualizar`, autorizando leitura da tabela `atendimentos`?

Ponto crítico: `atendimentos` contém `queixa_principal` (NOT NULL, clínico), que será visível a todos os perfis com acesso, por limitação de RLS de linha. A decisão de conceder ou não inclui aceitar que o perfil veja a queixa principal de todos os pacientes em atendimento.

### 3.2 Análise por perfil

**Recepção**

- Recepção gerencia a fila de entrada, chama pacientes e acompanha etapa e status do atendimento. Verá `queixa_principal`, mas esse dado é contextual e limitado à função de monitoramento do fluxo.
- Risco: baixo — Recepção não tem acesso a tabelas clínicas; a queixa é o dado de menor sensibilidade em `atendimentos`.
- **Decisão: CONCEDER.**

**Técnico em Enfermagem**

- TEN precisa da lista de atendimentos para identificar o paciente na triagem e no cuidado. Verá `queixa_principal` — necessário para priorizar o cuidado de enfermagem.
- **Decisão: CONCEDER.**

**Enfermeiro**

- Mesmo escopo e justificativa do TEN, com responsabilidade adicional de coordenação.
- **Decisão: CONCEDER.**

**Médico**

- Médico precisa da lista de atendimentos para selecionar o paciente, iniciar consulta e acompanhar o fluxo. Acesso pleno à tabela é necessário.
- **Decisão: CONCEDER.**

**Farmácia**

- Decisão pendente P1 — analisada abaixo:
  - A Farmácia acessa prescrições pelo `id` diretamente, não lista atendimentos.
  - Conceder `atendimento.visualizar` à Farmácia exporia `queixa_principal` de todos os pacientes em atendimento, sem finalidade de dispensação.
  - O frontend da Farmácia usa `GsiApi` — não chama Supabase para listar atendimentos.
  - A futura integração de dispensação via API acessará prescrições, não atendimentos.
  - Princípio do menor privilégio: Farmácia não precisa de `atendimentos` para executar sua função.
- **Decisão: NÃO CONCEDER. Farmácia perde acesso a `atendimentos` na Fase B1. Esse é o comportamento correto e o frontend não é impactado.**

**Técnico em RX**

- TEN-RX precisa de `atendimento_id` para identificar o episódio ao qual o exame pertence. Acesso operacional ao status e à etapa do atendimento é necessário para localizar o contexto do exame.
- Verá `queixa_principal` — aceito institucionalmente, pois TEN-RX não tem acesso a dados clínicos de outras tabelas.
- **Decisão: CONCEDER.**

**Regulação de Transferência**

- Regulação precisa identificar os atendimentos com transferência em andamento, verificar o status e o setor atual para processar a aprovação de vaga.
- **Decisão: CONCEDER.**

**Administração**

- Via `is_admin()` — mesma lógica de §2.2.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_admin()`.**

**Auditoria**

- Via `is_auditoria()`.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_auditoria()`.**

**Gestão Hospitalar / Leitura/Gestor**

- Mesma análise de §2.2 — acesso nominal a atendimentos individuais não é função gerencial.
- **Decisão: NÃO CONCEDER.**

### 3.3 Resolução explícita da pendência P1

> **P1 — Farmácia deve ter acesso a `atendimentos`?**
>
> **Decisão: NÃO.** A Farmácia acessa `prescrições` pelo identificador direto. Não existe finalidade de dispensação que exija listar atendimentos individuais. A exposição de `queixa_principal` a todos os pacientes em atendimento é desproporcionalmente ampla para o perfil de Farmácia. O frontend não é impactado.

### 3.4 Decisão consolidada — `atendimento.visualizar`

| Perfil | Decisão | Mecanismo |
|---|---|---|
| Recepção | **CONCEDER** | `perfil_permissao` |
| Técnico em Enfermagem | **CONCEDER** | `perfil_permissao` |
| Enfermeiro | **CONCEDER** | `perfil_permissao` |
| Médico | **CONCEDER** | `perfil_permissao` |
| Farmácia | **NÃO CONCEDER** | — |
| Técnico em RX | **CONCEDER** | `perfil_permissao` |
| Regulação de Transferência | **CONCEDER** | `perfil_permissao` |
| Administração | **VIA `is_admin()`** | Função direta na policy |
| Auditoria | **VIA `is_auditoria()`** | Função direta na policy |
| Gestão Hospitalar | **NÃO CONCEDER** | — |
| Leitura/Gestor | **NÃO CONCEDER** | — |
| Sem perfil | **NÃO** (automático) | `has_permission()` retorna FALSE |
| Inativo | **NÃO** (automático) | `has_permission()` verifica `ativo = true` |

---

## 4. Decisão C — `consulta.visualizar`

### 4.1 Questão

Quais perfis devem receber a permissão `consulta.visualizar`, autorizando leitura da tabela `consultas` — que inclui `hipotese_diagnostica`, `cid`, `conduta`, `desfecho_proposto` e `observacoes`?

Esta é a permissão de maior sensibilidade da Fase B1. Os campos de `consultas` constituem o prontuário do ato médico — dados altamente sensíveis sob LGPD e ética médica.

### 4.2 Análise por perfil

**Recepção**

- Recepção não tem função clínica. Não existe finalidade de dispensação, cuidado ou assistência que justifique o acesso a diagnósticos e condutas médicas.
- Regra inegociável da Matriz 5B.8.5A: Recepção tem acesso `—` a `consultas`.
- **Decisão: NÃO CONCEDER.**

**Técnico em Enfermagem**

- O acesso atual do TEN a `consultas` é **não intencional** — deriva de `observacao.reavaliar` na policy da Fase A, e contraria a Matriz 5B.8.5A (acesso `—`).
- TEN acessa a conduta médica via prescrição (que receberá `prescricao.visualizar` na Fase B posterior) — não precisa do prontuário médico completo.
- `hipotese_diagnostica`, `cid`, `conduta` e `desfecho_proposto` são dados exclusivos do ato médico, não necessários para execução de cuidados de enfermagem.
- **Decisão: NÃO CONCEDER. A perda de acesso é uma correção intencional de um acesso não autorizado pela Matriz.**

**Enfermeiro**

- O Enfermeiro tem responsabilidade de coordenação do cuidado pós-consulta: valida condutas médicas, coordena administração de medicamentos e planeja alta ou transferência.
- Acesso ao plano terapêutico completo (`conduta`, `desfecho_proposto`) é necessário para a função de coordenação.
- A Matriz 5B.8.5A confirma Enfermeiro com acesso `—` a `consultas`, mas essa classificação reflete o estado atual não intencional. A decisão desta etapa é normativa: Enfermeiro **deve** ter acesso.
- **Decisão: CONCEDER.**

**Médico**

- Médico é o autor do ato médico registrado em `consultas`. Acesso total e necessário.
- **Decisão: CONCEDER.**

**Farmácia**

- Farmácia acessa dados de prescrição, não o prontuário médico.
- Conhecer `hipotese_diagnostica` ou `cid` não tem finalidade de dispensação.
- Regra inegociável: Farmácia tem acesso `—` a `consultas` na Matriz 5B.8.5A.
- **Decisão: NÃO CONCEDER.**

**Técnico em RX**

- TEN-RX acessa exames. A conduta médica ou o CID não são necessários para laudar ou liberar resultado de exame.
- **Decisão: NÃO CONCEDER.**

**Regulação de Transferência**

- Decisão pendente P2 — analisada abaixo:
  - Regulação pode precisar do diagnóstico para justificar a transferência em formulários de regulação hospitalar.
  - Porém, o dado relevante para regulação é o **resumo clínico da transferência** (campo no documento de transferência), não o prontuário médico completo da consulta.
  - Conceder `consulta.visualizar` à Regulação exporia `cid`, `conduta` e `observacoes` completas, o que é desproporcionalmente amplo para a função de aprovação de vaga.
  - Quando a Fase B avançar para `transferencias`, o dado de diagnóstico estará disponível via o campo de resumo clínico da própria transferência.
- **Decisão: NÃO CONCEDER nesta fase. Regulação acessa dados clínicos de transferência via tabela `transferencias`, não via `consultas`. Revisão na Fase B posterior (transferencia.visualizar).**

**Administração**

- Via `is_admin()`.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_admin()`.**

**Auditoria**

- Via `is_auditoria()`.
- **Decisão: NÃO CONCEDER permissão de linha. Acesso via `is_auditoria()`.**

**Gestão Hospitalar / Leitura/Gestor**

- Sem finalidade clínica.
- **Decisão: NÃO CONCEDER.**

### 4.3 Resolução explícita da pendência P2

> **P2 — Regulação deve ter acesso a `consultas`?**
>
> **Decisão: NÃO nesta fase.** O dado clínico necessário para a transferência (diagnóstico de encaminhamento) deve estar disponível no campo de resumo da própria transferência — não no prontuário médico completo. O acesso a `consultas` pela Regulação seria desproporcional. Revisar quando `transferencia.visualizar` for especificada.

### 4.4 Decisão consolidada — `consulta.visualizar`

| Perfil | Decisão | Mecanismo |
|---|---|---|
| Recepção | **NÃO CONCEDER** | — |
| Técnico em Enfermagem | **NÃO CONCEDER** *(correção de acesso não intencional)* | — |
| Enfermeiro | **CONCEDER** | `perfil_permissao` |
| Médico | **CONCEDER** | `perfil_permissao` |
| Farmácia | **NÃO CONCEDER** | — |
| Técnico em RX | **NÃO CONCEDER** | — |
| Regulação de Transferência | **NÃO CONCEDER** *(revisão na Fase B posterior)* | — |
| Administração | **VIA `is_admin()`** | Função direta na policy |
| Auditoria | **VIA `is_auditoria()`** | Função direta na policy |
| Gestão Hospitalar | **NÃO CONCEDER** | — |
| Leitura/Gestor | **NÃO CONCEDER** | — |
| Sem perfil | **NÃO** (automático) | `has_permission()` retorna FALSE |
| Inativo | **NÃO** (automático) | `has_permission()` verifica `ativo = true` |

---

## 5. Decisão D — Administração

### 5.1 Posição institucional

A Administração no GSI ONE é um perfil técnico-administrativo com finalidade de:

- suporte operacional e configuração do sistema;
- gestão de usuários, perfis e permissões;
- estoque e parametrização de catálogos;
- contingência e suporte a outros profissionais.

A Administração **não é um perfil clínico.** O acesso administrativo a dados clínicos (consultas, triagens, prescrições) não é uma função primária do perfil — é uma necessidade de suporte e contingência.

### 5.2 Regras definidas

1. **`is_admin()` permanece como exceção técnica direta nas policies** — não migra para permissão de linha nesta fase (resolução da pendência P5).
2. O acesso clínico do Administrador é justificado por suporte, parametrização e contingência operacional — não por função assistencial.
3. O Administrador não deve usar o acesso a dados clínicos fora de situações de suporte explicitamente registradas.
4. Futuramente, qualquer acesso administrativo a prontuários deve gerar entrada em `audit_log` — trilha obrigatória para conformidade.
5. Em ambiente de produção, o perfil Administração não deve ser atribuído a profissionais de saúde com função assistencial primária.

### 5.3 Resolução explícita da pendência P5

> **P5 — `is_admin()` deve permanecer diretamente nas policies?**
>
> **Decisão: SIM.** `is_admin()` é um wrapper claro e auditável de `has_perfil('Administração')`. Migrar para permissões de linha criaria ~17 entradas redundantes em `perfil_permissao` sem benefício de segurança. O controle real do Administrador é via rastreabilidade e `audit_log` — não via restrição de RLS. Revisão futura se o sistema evoluir para múltiplas unidades com administradores de escopo limitado.

---

## 6. Decisão E — Auditoria

### 6.1 Posição institucional

O perfil Auditoria no GSI ONE tem como finalidade exclusiva:

- revisão de processos assistenciais para conformidade e qualidade;
- verificação de registros clínicos e administrativos para fins de auditoria interna e externa;
- geração de trilha de conformidade para órgãos de controle (SUS, TCE, ANS se aplicável).

### 6.2 Regras definidas

1. **`is_auditoria()` permanece nas policies** — mesma lógica de `is_admin()`.
2. O perfil Auditoria tem acesso de **somente leitura** em todos os módulos clínicos e operacionais. Não possui, e não deve ter, permissão de escrita em qualquer tabela clínica.
3. O acesso da Auditoria a dados nominais (`pacientes`, `atendimentos`, `consultas`) **deve ser rastreável** — toda leitura de Auditoria em dados nominais deve gerar entrada em `audit_log` em ambiente de produção.
4. A Auditoria não pode criar, alterar ou excluir registros clínicos — apenas ler. Qualquer INSERT ou UPDATE por usuário com perfil Auditoria em tabelas clínicas deve ser bloqueado por policy.
5. Futuramente, definir janela temporal de acesso: o acesso da Auditoria deve ser restrito por competência (mês/ano de referência da auditoria), não contínuo sobre todos os registros históricos. Esta restrição está fora do escopo da Fase B1.

### 6.3 Resolução explícita da pendência P4

> **P4 — Auditoria deve ter janela de tempo de acesso ou acesso contínuo?**
>
> **Decisão: ACESSO CONTÍNUO nesta fase**, com a seguinte condição: o acesso a dados nominais deve ser trilhado via `audit_log`. A implementação de janela temporal de acesso (por competência de auditoria) é uma melhoria de conformidade LGPD a ser tratada na Fase E (auditoria e logs de leitura). **Esta decisão não bloqueia a Fase B1.**

---

## 7. Decisão F — Restrição de colunas (RLS de linha vs. view/RPC)

### 7.1 Questão (pendência P3)

Os campos sensíveis de `pacientes` (CPF, cartão SUS, telefone) serão visíveis a todos os perfis com acesso via RLS de linha, mesmo quando a finalidade do perfil não exige esses dados. O mesmo ocorre com `queixa_principal` em `atendimentos` para perfis como TEN-RX.

### 7.2 Opções

| Opção | Descrição | Custo |
|---|---|---|
| A — Aceitar como está | RLS de linha é suficiente; restrição de coluna é desnecessária nesta fase | Zero — sem impacto de implementação |
| B — View por perfil | Criar views com projeção de colunas diferentes por perfil | Alto — N views + N grants + N policies; complexidade operacional elevada |
| C — RPC (função SECURITY DEFINER) | Criar RPCs que retornam apenas os campos necessários por perfil | Médio — RPCs são manuteníveis, mas mudam a interface de acesso do frontend |

### 7.3 Resolução explícita da pendência P3

> **P3 — Aceita-se que CPF, telefone e `queixa_principal` sejam visíveis a todos os perfis com acesso via RLS de linha?**
>
> **Decisão: SIM, aceito nesta fase (Opção A).** O GSI ONE é um protótipo operacional em ambiente hospitalar controlado. A restrição de colunas individuais é uma melhoria de privacidade incremental — relevante para produção real com LGPD — mas está fora do escopo da Fase B1. A separação de responsabilidade de dados por coluna deve ser tratada como item de conformidade LGPD em Fase posterior (Fase F — privacidade e restrição de coluna). **Esta decisão não bloqueia a Fase B1.**
>
> Registrado como dívida técnica: a exposição de CPF ao perfil Técnico em RX e Regulação é desproporcionalmente ampla sob LGPD Art. 6 (proporcionalidade) e deve ser corrigida antes da produção com dados reais.

---

## 8. Decisão G — Múltiplos perfis

### 8.1 Comportamento definido

1. **As permissões são cumulativas.** Um usuário com dois ou mais perfis recebe a **união** das permissões de todos os seus perfis ativos. Não existe precedência de negação nesta fase — a afirmação de qualquer perfil é suficiente para autorizar o acesso.

2. **O comportamento é derivado da implementação de `has_permission()`.** A função verifica a existência da permissão em qualquer perfil vinculado ao usuário — um OR lógico sobre todos os vínculos do usuário.

3. **Não existe conceito de perfil principal nesta fase.** Toda decisão de acesso é baseada no conjunto completo de permissões do usuário — independente de qual perfil é o "primário".

4. **O risco de escalada é real e deve ser monitorado.** Um usuário com TEN + Enfermeiro terá `consulta.visualizar` via Enfermeiro — o que é tecnicamente correto, mas exige que a combinação de perfis seja gerenciada com atenção pela Administração.

5. **Futura revisão.** Se o sistema evoluir para um modelo com perfil principal de sessão ou contexto de função ativa, o mecanismo de `has_permission()` precisará ser revisado. Essa revisão está fora do escopo desta fase.

### 8.2 Exemplos de comportamento esperado

| Usuário | Perfis | `paciente.visualizar` | `atendimento.visualizar` | `consulta.visualizar` |
|---|---|---|---|---|
| A | TEN + Enfermeiro | SIM (TEN) | SIM (TEN) | SIM (via Enfermeiro) |
| B | TEN + Farmácia | SIM (TEN) | SIM (TEN) | NÃO |
| C | Farmácia (apenas) | SIM | NÃO | NÃO |
| D | Gestão Hospitalar + Médico | SIM (Médico) | SIM (Médico) | SIM (Médico) |
| E | Gestão Hospitalar (apenas) | NÃO | NÃO | NÃO |
| F | Leitura/Gestor (apenas) | NÃO | NÃO | NÃO |

### 8.3 Regra de governança para múltiplos perfis

A combinação de perfis que resulte em acesso a `consultas` deve ser autorizada explicitamente pela Administração:
- Enfermeiro + qualquer outro perfil: **acesso a `consultas` é esperado e aceitável**.
- Médico + qualquer outro perfil: **acesso a `consultas` é esperado e aceitável**.
- Qualquer perfil **não clínico** + Enfermeiro ou Médico: **risco de escalada — requer justificativa**.

---

## 9. Decisão H — Gestão Hospitalar e Leitura/Gestor

### 9.1 Posição definida

1. **Sem acesso nominal às três tabelas da Fase B1.** Os perfis Gestão Hospitalar e Leitura/Gestor não receberão `paciente.visualizar`, `atendimento.visualizar` ou `consulta.visualizar`.

2. **Acesso futuro por agregação.** Esses perfis acessarão dados hospitalares exclusivamente via views de indicadores e relatórios agregados (sem identificação nominal de pacientes) — a ser implementado na Fase E/F.

3. **`is_linked_user()` não será reutilizado.** O mecanismo `is_linked_user()` não será reativado para esses perfis em nenhuma circunstância — ele foi substituído pelo modelo de permissões positivas e não deve ser reintroduzido.

4. **Dados que esses perfis acessam nesta fase:**
   - Domínios e catálogos (listas de status, classificações, etc.) — leitura de referência.
   - Indicadores e relatórios agregados — sem identificação nominal.
   - Dados do próprio usuário (nome, e-mail, perfil).

5. **Dados que esses perfis não acessarão mesmo após a Fase E:**
   - Prontuário clínico nominal.
   - Triagens individuais com identificação de paciente.
   - Consultas médicas individuais.
   - Prescrições nominais.

---

## 10. Matriz final de decisão

> **Legenda:** **SIM** = permissão concedida via `perfil_permissao` · **NÃO** = não concedida · **VIA ADMIN** = coberto por `is_admin()`, sem permissão de linha · **VIA AUD** = coberto por `is_auditoria()`, sem permissão de linha · **FUTURO** = fora do escopo desta fase, pode ser revisado em fase posterior

| Perfil | `paciente.visualizar` | `atendimento.visualizar` | `consulta.visualizar` |
|---|---|---|---|
| Recepção | **SIM** | **SIM** | **NÃO** |
| Técnico em Enfermagem | **SIM** | **SIM** | **NÃO** *(correção)* |
| Enfermeiro | **SIM** | **SIM** | **SIM** |
| Médico | **SIM** | **SIM** | **SIM** |
| Farmácia | **SIM** | **NÃO** | **NÃO** |
| Técnico em RX | **SIM** | **SIM** | **NÃO** |
| Regulação de Transferência | **SIM** | **SIM** | **FUTURO** |
| Administração | **VIA ADMIN** | **VIA ADMIN** | **VIA ADMIN** |
| Auditoria | **VIA AUD** | **VIA AUD** | **VIA AUD** |
| Gestão Hospitalar | **NÃO** | **NÃO** | **NÃO** |
| Leitura/Gestor | **NÃO** | **NÃO** | **NÃO** |
| Sem perfil | NÃO (automático) | NÃO (automático) | NÃO (automático) |
| Inativo | NÃO (automático) | NÃO (automático) | NÃO (automático) |

---

## 11. Decisões aprovadas para implementação

As seguintes decisões estão fechadas, justificadas e aprovadas para uso como requisito de implementação da Fase B1:

### 11.1 Permissões a criar

```
paciente.visualizar     — módulo: Pacientes  — finalidade: identificação operacional do paciente
atendimento.visualizar  — módulo: Atendimentos — finalidade: acompanhamento do fluxo operacional
consulta.visualizar     — módulo: Consulta — finalidade: leitura do prontuário do ato médico
```

### 11.2 Vínculos a criar em `perfil_permissao`

| Permissão | Perfis que recebem |
|---|---|
| `paciente.visualizar` | Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Farmácia, Técnico em RX, Regulação de Transferência |
| `atendimento.visualizar` | Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Técnico em RX, Regulação de Transferência |
| `consulta.visualizar` | Enfermeiro, Médico |

### 11.3 Policies a substituir

| Policy atual | Expressão proposta aprovada |
|---|---|
| `pacientes_select_operacional` | `has_permission('paciente.visualizar') OR is_admin() OR is_auditoria()` |
| `atendimentos_select_operacional` | `has_permission('atendimento.visualizar') OR is_admin() OR is_auditoria()` |
| `consultas_select_clinico` | `has_permission('consulta.visualizar') OR is_admin() OR is_auditoria()` |

### 11.4 Arquitetura de exceções aprovada

- `is_admin()` permanece diretamente nas policies, sem migração para permissão de linha.
- `is_auditoria()` permanece diretamente nas policies, sem migração para permissão de linha.
- Restrição de colunas (CPF, `queixa_principal`) é aceita como limitação técnica desta fase — não bloqueia a implementação.
- Farmácia perde acesso a `atendimentos` — comportamento correto e intencional.
- Técnico em Enfermagem perde acesso a `consultas` — correção de acesso não intencional.
- Regulação não receberá `consulta.visualizar` nesta fase — dados clínicos de transferência serão acessados via tabela `transferencias`.

### 11.5 Múltiplos perfis

- Permissões são cumulativas (union).
- Não existe precedência de negação nesta fase.
- Risco de escalada monitorado; combinações com Enfermeiro ou Médico requerem justificativa se combinados com perfis não clínicos.

### 11.6 Auditoria e conformidade

- Auditoria: acesso contínuo nesta fase; trilha de leitura nominal a ser implementada na Fase E.
- Administração: acesso por suporte e contingência; trilha de leitura a ser implementada na Fase E.
- Gestão Hospitalar e Leitura/Gestor: sem acesso nominal; acesso futuro exclusivamente via indicadores agregados.

---

## 12. Pontos fora do escopo da Fase B1

Os seguintes temas foram identificados durante a especificação e consolidação, mas estão **explicitamente fora do escopo** desta fase. Cada um deverá ser tratado em fase específica:

| Tema | Fase prevista | Descrição |
|---|---|---|
| **Setor** | Fase C | Restrição de acesso por setor ou unidade de internação — apenas o próprio setor do profissional |
| **Unidade / Filial** | Fase C | Restrição de acesso a dados da própria unidade em ambiente multiunidade |
| **Profissional responsável** | Fase C/D | Restrição de acesso a atendimentos do próprio profissional responsável |
| **Vínculo com atendimento** | Fase D | Acesso condicionado ao atendimento em que o profissional está ativamente vinculado |
| **Paciente específico** | Fase D | Acesso condicionado ao paciente atualmente em cuidado do profissional |
| **Finalidade de acesso** | Fase E | Registro e auditoria da finalidade declarada de acesso a dados nominais |
| **Log de leitura** | Fase E | Trilha de auditoria para SELECT em tabelas com dados nominais (Auditoria e Administração) |
| **Janela temporal de auditoria** | Fase E | Acesso da Auditoria restrito por competência de auditoria (mês/ano) |
| **Views agregadas** | Fase F | Indicadores e relatórios para Gestão Hospitalar e Leitura/Gestor sem identificação nominal |
| **Restrição de coluna** | Fase F | Views ou RPCs que projetam apenas os campos necessários por perfil (CPF, `queixa_principal`) |
| **Contexto de sessão / perfil ativo** | Fase G | Modelo de perfil principal por sessão para usuários com múltiplos perfis |
| **Multiunidade** | Fase G | Arquitetura de acesso para redes hospitalares com múltiplas unidades |

---

## 13. Decisão final GO/NO-GO

### 13.1 Critérios verificados

| Critério | Status |
|---|---|
| `paciente.visualizar` — todos os perfis com decisão fechada | **FECHADO** |
| `atendimento.visualizar` — todos os perfis com decisão fechada, incluindo Farmácia (P1) | **FECHADO** |
| `consulta.visualizar` — todos os perfis com decisão fechada, incluindo Regulação (P2) | **FECHADO** |
| RLS de linha com exposição de CPF e `queixa_principal` — aceito institucionalmente (P3) | **FECHADO** |
| Auditoria — acesso contínuo aceito, trilha de leitura diferida para Fase E (P4) | **FECHADO** |
| `is_admin()` permanece diretamente nas policies (P5) | **FECHADO** |
| `is_auditoria()` permanece diretamente nas policies | **FECHADO** |
| Múltiplos perfis — comportamento definido como cumulativo | **FECHADO** |
| Gestão Hospitalar e Leitura/Gestor — sem acesso nominal | **FECHADO** |
| Rollback definido (B1c → B1b → B1a) | **DEFINIDO em 5B.8.5F** |
| Testes autenticados especificados (13 perfis × 3 tabelas + múltiplos perfis) | **ESPECIFICADOS em 5B.8.5F** |
| Nenhuma migration, policy, grant, permissão ou código alterado por esta etapa | **CONFIRMADO** |

### 13.2 Pendências residuais (não bloqueiam GO)

| Item | Status | Ação necessária antes de quando |
|---|---|---|
| Testes em `phase-a-select-access.test.js` atualizados | Não implementado | Antes da Fase B1c (atualização de policies) |
| Rollback B1c, B1b, B1a escritos e testados | Esboços em 5B.8.5F | Antes da Fase B1c |
| Suite de segurança 231/231 passando após B1b | Não executado | Antes da Fase B1c |
| Commit dos arquivos de 5B.8.5D a 5B.8.5G | Não autorizado | Quando explicitamente autorizado pelo responsável técnico |

### 13.3 Decisão final

> **GO.**
>
> Todas as cinco decisões institucionais pendentes identificadas em 5B.8.5F estão explicitamente fechadas neste documento. Nenhum perfil permanece ambíguo. A matriz final está completa. As regras de Administração, Auditoria, múltiplos perfis e Gestão estão definidas de forma normativa.
>
> A Fase B1 está autorizada a avançar para implementação técnica nas etapas 5B.8.5H e seguintes, com as condições listadas em §13.2 como pré-requisitos operacionais antes da Fase B1c.

---

*Documento de consolidação institucional — 2026-07-24. Nenhuma migration, permissão, policy, grant, função, dado ou arquivo de código foi criado ou alterado.*
