# GSI ONE — RLS Fase B1: Especificação de paciente.visualizar, atendimento.visualizar e consulta.visualizar

**Documento:** GSI_ONE_RLS_FASE_B1_ESPECIFICACAO_5B8_5F  
**Etapa:** 5B.8.5F  
**Status:** Especificação técnica e institucional — nenhuma migration, policy, grant, permissão ou código alterado  
**Elaborado em:** 2026-07-24  
**Pré-requisitos lidos:**
- GHAES-SESSION.md · AGENTS.md · CLAUDE.md
- DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md
- GSI_ONE_RLS_VINCULO_POR_LINHA_DIAGNOSTICO_5B8_5.md (5B.8.5)
- GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A.md (5B.8.5A)
- GSI_ONE_RLS_FASE_A_PLANO_TECNICO_5B8_5B.md (5B.8.5B)
- GSI_ONE_RLS_FASE_A_DEPENDENCIAS_FRONTEND_5B8_5C.md (5B.8.5C)
- GSI_ONE_RLS_FASE_B_GRANULARIDADE_PERMISSOES_5B8_5E.md (5B.8.5E)
- migrations 20260623100004 · 20260623100020 · 20260623100024 · 20260623100026 · 20260722100029 · 20260722100030
- rollbacks correspondentes
- tests/security/phase-a-select-access.test.js · tests/security/policies.test.js
- script.js (lido para mapeamento — não alterado)
- schema ao vivo: pacientes, atendimentos, consultas (via information_schema)

---

## 1. Objetivo e escopo

Este documento especifica com precisão institucional e técnica as **três permissões de leitura de prioridade Alta da Fase B1**:

- `paciente.visualizar`
- `atendimento.visualizar`
- `consulta.visualizar`

O escopo desta especificação é:

- definir cada permissão (finalidade, campos autorizados, perfis, restrições);
- documentar os impactos exatos nas três policies afetadas;
- propor as expressões SQL das novas policies;
- propor o plano de migration, rollback e testes;
- identificar decisões institucionais pendentes e critérios GO/NO-GO.

**O que esta especificação NÃO faz:** não cria permissões, não altera policies, não altera o banco, não altera testes, não altera `script.js`, não faz git add, commit ou push.

---

## 2. Contexto do problema resolvido por esta especificação

### 2.1 Problema 1 — `consulta.iniciar` como super-gate de leitura

A policy `pacientes_select_operacional` atual autoriza leitura de `pacientes` para quem tem `paciente.criar`, `triagem.classificar`, `consulta.iniciar`, `exame.visualizar`, `prescricao.dispensar` ou `transferencia.aprovar_vaga`.

Isso significa que `consulta.iniciar` (permissão do Médico para iniciar uma consulta) está sendo usada como gate de leitura de pacientes — quando a finalidade operacional é outra. Se `consulta.iniciar` for removida do Médico ou atribuída a um novo perfil, o efeito de leitura em `pacientes` muda silenciosamente.

### 2.2 Problema 2 — `observacao.reavaliar` dá acesso a `consultas`

A policy `consultas_select_clinico` inclui `observacao.reavaliar` como gate. Técnico em Enfermagem e Enfermeiro têm `observacao.reavaliar`. Portanto, **TEN lê consultas médicas completas** (incluindo `hipotese_diagnostica`, `cid`, `conduta`, `desfecho_proposto`) — o que contraria a Matriz 5B.8.5A.

### 2.3 Problema 3 — Farmácia lê atendimentos clínicos

A policy `atendimentos_select_operacional` autoriza leitura para quem tem `prescricao.dispensar`. Isso faz a Farmácia ler `queixa_principal`, `profissional_responsavel_id`, `desfecho_id` e `hora_desfecho_ts` — campos além do necessário para dispensação.

---

## 3. Schema das tabelas envolvidas

### 3.1 `public.pacientes` — colunas

| Coluna | Tipo | Nullable | Classificação |
|---|---|---|---|
| `id` | uuid | NOT NULL | Operacional |
| `nome` | text | NOT NULL | **Identificável** |
| `data_nascimento` | date | NOT NULL | **Identificável** |
| `cpf` | text | NULL | **Sensível — LGPD** |
| `cartao_sus` | text | NULL | **Identificável** |
| `telefone` | text | NULL | **Identificável** |
| `municipio` | text | NOT NULL | Identificável |
| `perfil_residencia` | text | NULL | Contextual |
| `created_at` | timestamptz | NOT NULL | Auditoria |
| `updated_at` | timestamptz | NOT NULL | Auditoria |
| `created_by` | uuid | NULL | Auditoria |
| `updated_by` | uuid | NULL | Auditoria |
| `deleted_at` | timestamptz | NULL | Soft-delete |
| `deleted_by` | uuid | NULL | Soft-delete |
| `delete_reason` | text | NULL | Soft-delete |

> **Nota de segurança:** A tabela `pacientes` retorna **todos os campos** por um SELECT sem filtro de coluna. RLS de linha não permite ocultar colunas — qualquer perfil que leia a tabela vê todos os campos. Restrição de coluna exigiria view ou RPC (fora do escopo desta fase). Esta limitação deve ser registrada como decisão pendente.

### 3.2 `public.atendimentos` — colunas

| Coluna | Tipo | Nullable | Classificação |
|---|---|---|---|
| `id` | uuid | NOT NULL | Operacional |
| `paciente_id` | uuid | NOT NULL | Referência |
| `status_id` | uuid | NOT NULL | **Operacional** |
| `classificacao_risco_id` | uuid | NULL | **Operacional** |
| `desfecho_id` | uuid | NULL | Clínico |
| `profissional_responsavel_id` | uuid | NULL | Clínico |
| `queixa_principal` | text | NOT NULL | **Clínico — sensível** |
| `etapa_atual` | text | NOT NULL | **Operacional** |
| `setor_atual` | text | NULL | Operacional |
| `hora_chegada_ts` | timestamptz | NOT NULL | Operacional |
| `hora_desfecho_ts` | timestamptz | NULL | Operacional |
| `created_at` | timestamptz | NOT NULL | Auditoria |
| `updated_at` | timestamptz | NOT NULL | Auditoria |
| `created_by` | uuid | NULL | Auditoria |
| `updated_by` | uuid | NULL | Auditoria |
| `deleted_at` | timestamptz | NULL | Soft-delete |
| `deleted_by` | uuid | NULL | Soft-delete |
| `delete_reason` | text | NULL | Soft-delete |

> **Observação:** `queixa_principal` é NOT NULL — está presente em todo atendimento. Não é possível ocultar esse campo via RLS de linha. A Farmácia, se mantiver acesso a `atendimentos`, verá a queixa principal de todos os pacientes.

### 3.3 `public.consultas` — colunas

| Coluna | Tipo | Nullable | Classificação |
|---|---|---|---|
| `id` | uuid | NOT NULL | Operacional |
| `atendimento_id` | uuid | NOT NULL | Referência |
| `profissional_id` | uuid | NULL | Clínico |
| `consultorio` | text | NULL | Operacional |
| `hora_inicio_ts` | timestamptz | NOT NULL | Operacional |
| `hora_fim_ts` | timestamptz | NULL | Operacional |
| `hipotese_diagnostica` | text | NULL | **Clínico — altamente sensível** |
| `cid` | text | NULL | **Clínico — altamente sensível** |
| `conduta` | text | NULL | **Clínico — altamente sensível** |
| `desfecho_proposto` | text | NULL | **Clínico — altamente sensível** |
| `observacoes` | text | NULL | **Clínico — altamente sensível** |
| `created_at` | timestamptz | NOT NULL | Auditoria |
| `updated_at` | timestamptz | NOT NULL | Auditoria |
| `created_by` | uuid | NULL | Auditoria |
| `updated_by` | uuid | NULL | Auditoria |
| `deleted_at` | timestamptz | NULL | Soft-delete |
| `deleted_by` | uuid | NULL | Soft-delete |
| `delete_reason` | text | NULL | Soft-delete |

---

## 4. Especificação de `paciente.visualizar`

### 4.1 Finalidade

Autorizar leitura da tabela `pacientes` para perfis que precisam **identificar o paciente** no contexto de sua função operacional, mas que **não cadastram pacientes** (e portanto não teriam `paciente.criar`).

### 4.2 Distinção em relação a `paciente.criar`

| Aspecto | `paciente.criar` | `paciente.visualizar` |
|---|---|---|
| Propósito original | Cadastrar novo paciente | Identificar paciente existente |
| Perfil típico | Recepção, Administração | Médico, TEN, Enfermeiro, Farmácia*, TEN-RX*, Regulação* |
| Autoriza INSERT em `pacientes`? | Sim (via policy INSERT) | Não |
| Autoriza leitura? | Sim (via policy SELECT da Fase A) | Sim (nova permissão) |

### 4.3 Campos autorizados (todos os da tabela — limitação de RLS de linha)

Como RLS não filtra colunas, qualquer SELECT retorna todos os campos. A separação de responsabilidade é institucional, não técnica:

| Campo | Perfis que precisam | Perfis que não deveriam ver (mas verão por limitação de RLS) |
|---|---|---|
| `nome`, `data_nascimento` | Todos os perfis com acesso | — |
| `cpf`, `cartao_sus` | Recepção, Médico, Farmácia (verificação) | TEN-RX, Regulação (não precisam de CPF/CNS) |
| `telefone`, `municipio` | Recepção, Médico | TEN-RX, Farmácia, Regulação |
| `perfil_residencia` | Médico (contexto clínico) | Farmácia, TEN-RX, Regulação |

> **Decisão pendente:** A restrição de colunas específicas (CPF, CNS, telefone) para perfis não clínicos requer view ou RPC — fora do escopo desta fase. Registrado como risco em §12.

### 4.4 Perfis — decisão de concessão

| Perfil | Decisão | Justificativa |
|---|---|---|
| **Recepção** | **Conceder** | Já tem `paciente.criar`; `paciente.visualizar` é complementar — Recepção localiza pacientes existentes para abrir atendimento. Manter separação para clareza futura. |
| **Técnico em Enfermagem** | **Conceder** | TEN precisa identificar o paciente na triagem e no cuidado de enfermagem. Atualmente obtém acesso via `triagem.classificar` (acoplamento). A nova permissão declara a intenção corretamente. |
| **Enfermeiro** | **Conceder** | Mesma justificativa do TEN; Enfermeiro tem todas as permissões de enfermagem. |
| **Médico** | **Conceder** | Médico precisa identificar o paciente para consulta, anamnese e histórico. Atualmente obtém acesso via `consulta.iniciar` (acoplamento de ação com leitura). |
| **Farmácia** | **Conceder com ressalva** | Farmácia precisa identificar o paciente para confirmar identidade na dispensação. Acesso a CPF e telefone é além do necessário, mas não é tecnicamente restringível via RLS de linha. Decisão institucional pendente. |
| **Técnico em RX** | **Conceder** | TEN-RX precisa do nome e data de nascimento do paciente para identificar a qual exame pertence. Não precisa de CPF, mas RLS de linha não distingue campos. |
| **Regulação de Transferência** | **Conceder** | Regulação precisa de identificação básica do paciente para documentar a transferência. |
| **Administração** | **Via `is_admin()` — não conceder permissão de linha** | Motivo: Administração já é coberta por `is_admin()`. Criar `paciente.visualizar` para Administração seria redundante e criaria dependência dupla (função + permissão). Detalhado em §8. |
| **Auditoria** | **Via `is_auditoria()` — não conceder permissão de linha** | Idem. Detalhado em §9. |
| **Gestão Hospitalar** | **Não conceder** | Gestão acessa indicadores e relatórios agregados, não prontuários individuais. Dados nominais de pacientes não são função gerencial. |
| **Leitura/Gestor** | **Não conceder** | Idem ao Gestão Hospitalar. |
| **Sem perfil** | **Não conceder** | `has_permission()` retorna FALSE para usuário sem vínculos. Bloqueio automático. |
| **Inativo** | **Não conceder** | `has_permission()` verifica `u.ativo = true` — bloqueio automático. |

### 4.5 Impacto em `pacientes_select_operacional`

**Expressão atual (Fase A):**
```sql
public.has_permission('paciente.criar')
or public.has_permission('triagem.classificar')
or public.has_permission('consulta.iniciar')
or public.has_permission('exame.visualizar')
or public.has_permission('prescricao.dispensar')
or public.has_permission('transferencia.aprovar_vaga')
or public.is_admin()
or public.is_auditoria()
```

**Expressão proposta (Fase B1):**
```sql
public.has_permission('paciente.visualizar')
or public.is_admin()
or public.is_auditoria()
```

**Acesso mantido:** Recepção (via `paciente.visualizar`), TEN, Enfermeiro, Médico, Farmácia, TEN-RX, Regulação, Admin, Auditoria.

**Acesso removido:** Nenhum acesso legítimo removido — todos os perfis que hoje leem `pacientes` receberão `paciente.visualizar`. O que muda é o mecanismo: a permissão de leitura passa a ser declarada explicitamente, não derivada de permissões de ação.

**Acesso ganho:** Nenhum — nenhum perfil novo passa a ler `pacientes`.

**Risco de quebra:** Baixo, desde que todos os perfis listados em §4.4 recebam `paciente.visualizar` antes da migration de policy.

---

## 5. Especificação de `atendimento.visualizar`

### 5.1 Finalidade

Autorizar leitura da tabela `atendimentos` para perfis que precisam acompanhar o **fluxo operacional** do paciente, sem que essa leitura seja derivada da permissão de abrir um atendimento.

### 5.2 Distinção entre dados operacionais e dados clínicos em `atendimentos`

A tabela `atendimentos` contém campos de natureza distinta:

| Campo | Natureza | Quem precisa ver |
|---|---|---|
| `id`, `paciente_id`, `status_id`, `classificacao_risco_id`, `etapa_atual`, `setor_atual`, `hora_chegada_ts`, `hora_desfecho_ts` | **Operacional** — gestão do fluxo | Todos os perfis assistenciais |
| `queixa_principal` | **Clínico — sensível** | Perfis clínicos (Médico, TEN, Enfermeiro) e operacionais com necessidade contextual |
| `desfecho_id`, `profissional_responsavel_id` | **Clínico / Administrativo** | Médico, Regulação, Admin, Auditoria |
| `deleted_at`, `delete_reason`, `deleted_by` | **Soft-delete / Auditoria** | Admin, Auditoria |

> **Limitação técnica:** Como RLS de linha não filtra colunas, **todos os perfis com `atendimento.visualizar` verão `queixa_principal`**, mesmo que não seja necessário para sua função. A decisão de aceitar essa exposição é institucional — alternativa técnica é view separando campos operacionais de campos clínicos (fora do escopo desta fase).

### 5.3 Farmácia e `atendimentos` — análise crítica

A Farmácia atualmente lê `atendimentos` via `prescricao.dispensar` (Fase A). A questão é: a Farmácia **precisa** ler `atendimentos`?

**Argumento a favor (manter acesso):**
- A Farmácia pode verificar se o atendimento está ativo antes de dispensar a prescrição.
- O `atendimento_id` referenciado na prescrição vincula a dispensação ao episódio correto.

**Argumento contra (remover acesso):**
- A Farmácia acessa prescrições pelo `id` diretamente — não precisa listar atendimentos.
- A leitura de `queixa_principal`, `desfecho_id` e `profissional_responsavel_id` não tem finalidade de dispensação.
- O frontend da Farmácia usa `GsiApi` (localStorage) — não chama Supabase para listar atendimentos.

**Recomendação:** **Não conceder `atendimento.visualizar` à Farmácia.** Farmácia acessa prescrições via `prescricao.visualizar` (Fase B posterior), não via atendimentos. Decisão institucional pendente em §13.2.

### 5.4 Técnico em RX e `atendimentos`

O Técnico em RX precisa ver `atendimentos` para identificar a qual episódio o exame pertence. Porém, o frontend não chama Supabase para listar atendimentos no módulo de exames (usa `GsiApi`). O acesso pode ser condicionado à Fase D (restrição por atendimento vinculado ao exame).

**Recomendação:** **Conceder `atendimento.visualizar` ao TEN-RX**, pois o futuro acesso via API necessitará do `atendimento_id` para contexto. Decisão institucional pendente em §13.3.

### 5.5 Perfis — decisão de concessão

| Perfil | Decisão | Justificativa |
|---|---|---|
| **Recepção** | **Conceder** | Recepção gerencia a fila de entrada e precisa ver o status e a etapa dos atendimentos ativos. Tem `atendimento.abrir`; `atendimento.visualizar` complementa sem redundância. |
| **Técnico em Enfermagem** | **Conceder** | TEN acompanha a fila de triagem e os atendimentos do setor. Necessário para execução do cuidado. |
| **Enfermeiro** | **Conceder** | Idem ao TEN; Enfermeiro coordena o cuidado e precisa da visão do fluxo. |
| **Médico** | **Conceder** | Médico precisa da lista de atendimentos para iniciar consultas, acompanhar observação e solicitar transferência. |
| **Farmácia** | **Não conceder** | Vide §5.3 — Farmácia não precisa listar atendimentos para dispensar prescrições. Decisão institucional pendente. |
| **Técnico em RX** | **Conceder** | Vide §5.4 — necessário para contexto do exame; impacto atual no frontend é zero. |
| **Regulação de Transferência** | **Conceder** | Regulação precisa ver atendimentos com transferência em curso para aprovar vaga. |
| **Administração** | **Via `is_admin()` — não conceder permissão de linha** | Detalhado em §8. |
| **Auditoria** | **Via `is_auditoria()` — não conceder permissão de linha** | Detalhado em §9. |
| **Gestão Hospitalar** | **Não conceder** | Gestão acessa indicadores agregados, não o fluxo individualizado de atendimentos. |
| **Leitura/Gestor** | **Não conceder** | Idem. |
| **Sem perfil** | **Não conceder** | Bloqueio automático. |
| **Inativo** | **Não conceder** | Bloqueio automático. |

### 5.6 Impacto em `atendimentos_select_operacional`

**Expressão atual (Fase A):**
```sql
public.has_permission('atendimento.abrir')
or public.has_permission('triagem.classificar')
or public.has_permission('consulta.iniciar')
or public.has_permission('exame.visualizar')
or public.has_permission('prescricao.dispensar')
or public.has_permission('transferencia.apovar_vaga')
or public.is_admin()
or public.is_auditoria()
```

**Expressão proposta (Fase B1):**
```sql
public.has_permission('atendimento.visualizar')
or public.is_admin()
or public.is_auditoria()
```

**Acesso mantido:** Recepção, TEN, Enfermeiro, Médico, TEN-RX, Regulação, Admin, Auditoria.

**Acesso removido:** Farmácia (não receberá `atendimento.visualizar`).

**Acesso ganho:** Nenhum.

**Risco de quebra:** Baixo para o frontend (Farmácia não chama Supabase para listar atendimentos). Impacto em API direta: Farmácia perde visibilidade de `atendimentos` — compatível com a finalidade do perfil.

---

## 6. Especificação de `consulta.visualizar`

### 6.1 Finalidade clínica

Autorizar leitura da tabela `consultas` exclusivamente para perfis com **necessidade clínica direta de conhecer o diagnóstico, conduta e desfecho proposto** pelo Médico. Não é uma permissão operacional — é uma permissão de acesso a dados de ato médico.

Os campos de `consultas` (`hipotese_diagnostica`, `cid`, `conduta`, `desfecho_proposto`, `observacoes`) são os dados de maior sensibilidade clínica do sistema — constituem o prontuário médico do episódio.

### 6.2 Achado crítico resolvido

A policy `consultas_select_clinico` (Fase A) inclui `observacao.reavaliar` como gate. TEN e Enfermeiro têm `observacao.reavaliar`. Portanto, **ambos leem consultas médicas completas** — o que contraria a Matriz 5B.8.5A, que classifica TEN com acesso `—` a consultas.

`consulta.visualizar` resolve isso: apenas Médico e Enfermeiro receberão essa permissão. TEN não receberá.

### 6.3 Técnico em Enfermagem — exclusão justificada

| Argumento | Posição |
|---|---|
| TEN lê consultas hoje via `observacao.reavaliar` | Acesso não intencional — deve ser corrigido |
| TEN precisa saber a conduta médica para administrar medicação | Informação suficiente: TEN vê a **prescrição** (com `prescricao.visualizar`, Fase B posterior), não a consulta médica |
| TEN precisa saber a hipótese diagnóstica | Não — hipótese diagnóstica é dado exclusivo do ato médico; TEN executa cuidado, não diagnóstico |
| TEN precisa saber o desfecho proposto | Não — desfecho é decisão médica; TEN é informado via prescrição e conduta de enfermagem |

**Decisão:** TEN **não receberá** `consulta.visualizar`.

### 6.4 Enfermeiro — acesso justificado

O Enfermeiro tem responsabilidade de coordenação do cuidado que exige conhecer o plano terapêutico completo. Em hospital de baixa complexidade, o Enfermeiro é referência técnica da equipe de enfermagem e precisa:

- conhecer o diagnóstico para coordenar o cuidado pós-consulta;
- verificar a conduta médica para validar a administração de medicamentos;
- acompanhar o desfecho proposto para planejar a alta ou transferência.

**Decisão:** Enfermeiro **receberá** `consulta.visualizar`.

### 6.5 Perfis — decisão de concessão

| Perfil | Decisão | Justificativa |
|---|---|---|
| **Recepção** | **Não conceder** | Recepção é administrativa. Não acessa prontuário clínico. Regra inegociável da Matriz 5B.8.5A. |
| **Técnico em Enfermagem** | **Não conceder** | Vide §6.3 — acesso atual é não intencional; TEN acessa conduta via prescrição, não via consulta. |
| **Enfermeiro** | **Conceder** | Vide §6.4 — coordenação do cuidado pós-consulta exige visibilidade do plano terapêutico. |
| **Médico** | **Conceder** | Médico é o autor do ato médico registrado em `consultas`. Acesso total e irrestrito. |
| **Farmácia** | **Não conceder** | Farmácia acessa dados de prescrição, não o prontuário médico. Regra inegociável. |
| **Técnico em RX** | **Não conceder** | TEN-RX acessa exames. Conduta médica não é necessária para laudar ou liberar resultado. |
| **Regulação de Transferência** | **Não conceder** | Regulação precisa do diagnóstico para fundamentar a transferência, mas esse dado estará disponível no resumo da transferência — não requer leitura do prontuário médico completo. Decisão institucional pendente em §13.4. |
| **Administração** | **Via `is_admin()` — não conceder permissão de linha** | Detalhado em §8. |
| **Auditoria** | **Via `is_auditoria()` — não conceder permissão de linha** | Detalhado em §9. |
| **Gestão Hospitalar** | **Não conceder** | Gestão não acessa prontuário individual. |
| **Leitura/Gestor** | **Não conceder** | Idem. |
| **Sem perfil** | **Não conceder** | Bloqueio automático. |
| **Inativo** | **Não conceder** | Bloqueio automático. |

### 6.6 Impacto em `consultas_select_clinico`

**Expressão atual (Fase A):**
```sql
public.has_permission('consulta.iniciar')
or public.has_permission('consulta.registrar_conduta')
or public.has_permission('observacao.reavaliar')
or public.is_admin()
or public.is_auditoria()
```

**Expressão proposta (Fase B1):**
```sql
public.has_permission('consulta.visualizar')
or public.is_admin()
or public.is_auditoria()
```

**Acesso mantido:** Médico, Enfermeiro, Admin, Auditoria.

**Acesso removido:** Técnico em Enfermagem (perda de acesso não intencional — **correção desejada**).

**Acesso ganho:** Nenhum.

**Risco de quebra:** Baixo para o frontend — `consultas` não é lida via Supabase em nenhuma função de leitura do frontend (confirmado em 5B.8.5C); apenas em funções de escrita com SELECT interno para verificar existência (`registrarCondutaRealAlta`, `registrarCondutaRealObservacao`, `registrarCondutaRealEstabilizacao`). Essas funções são executadas pelo Médico, que mantém acesso via `consulta.visualizar`.

---

## 7. Matriz principal: perfil × nova permissão

> Legenda:
> - **C** = Conceder (perfil receberá a permissão em `perfil_permissao`)
> - **N** = Não conceder
> - **ADM** = Coberto por `is_admin()` — não recebe permissão de linha
> - **AUD** = Coberto por `is_auditoria()` — não recebe permissão de linha
> - **N\*** = Não conceder com decisão institucional pendente

| Perfil | `paciente.visualizar` | `atendimento.visualizar` | `consulta.visualizar` |
|---|---|---|---|
| **Recepção** | C | C | N |
| **Técnico em Enfermagem** | C | C | **N** *(correção do acesso não intencional)* |
| **Enfermeiro** | C | C | C |
| **Médico** | C | C | C |
| **Farmácia** | C | **N\*** *(pendente §13.2)* | N |
| **Técnico em RX** | C | C | N |
| **Regulação de Transferência** | C | C | **N\*** *(pendente §13.4)* |
| **Administração** | ADM | ADM | ADM |
| **Auditoria** | AUD | AUD | AUD |
| **Gestão Hospitalar** | N | N | N |
| **Leitura/Gestor** | N | N | N |
| **Sem perfil** | N (automático) | N (automático) | N (automático) |
| **Inativo** | N (automático) | N (automático) | N (automático) |

### 7.1 Classificação completa por célula

| Perfil | `paciente.visualizar` | `atendimento.visualizar` | `consulta.visualizar` |
|---|---|---|---|
| Recepção | Conceder | Conceder | Não conceder |
| Técnico em Enfermagem | Conceder | Conceder | Não conceder |
| Enfermeiro | Conceder | Conceder | Conceder |
| Médico | Conceder | Conceder | Conceder |
| Farmácia | Conceder | Não conceder (pendente) | Não conceder |
| Técnico em RX | Conceder | Conceder | Não conceder |
| Regulação de Transferência | Conceder | Conceder | Não conceder (pendente) |
| Administração | Acesso por `is_admin()` | Acesso por `is_admin()` | Acesso por `is_admin()` |
| Auditoria | Acesso por `is_auditoria()` | Acesso por `is_auditoria()` | Acesso por `is_auditoria()` |
| Gestão Hospitalar | Não conceder | Não conceder | Não conceder |
| Leitura/Gestor | Não conceder | Não conceder | Não conceder |
| Sem perfil | Não conceder (automático) | Não conceder (automático) | Não conceder (automático) |
| Inativo | Não conceder (automático) | Não conceder (automático) | Não conceder (automático) |

---

## 8. Administração — análise separada

### 8.1 Deve receber `paciente.visualizar`?

**Não.** O Administrador não precisa de `paciente.visualizar` porque `is_admin()` já concede acesso a `pacientes` via policy. Atribuir `paciente.visualizar` ao perfil Administração criaria uma dependência redundante: se no futuro `is_admin()` for removido das policies, o Administrador manteria acesso via permissão de linha — o que pode não ser intencional.

### 8.2 Deve receber `atendimento.visualizar`?

**Não.** Mesma justificativa de §8.1.

### 8.3 Deve receber `consulta.visualizar`?

**Não.** Mesma justificativa. Além disso, o Administrador não executa atos clínicos — o acesso a consultas é de suporte técnico, já coberto por `is_admin()`.

### 8.4 `is_admin()` deve continuar diretamente nas policies ou migrar para permissão explícita?

**Recomendação: manter `is_admin()` diretamente nas policies.**

Justificativas:
1. `is_admin()` é um wrapper de `has_perfil('Administração')` — já é uma abstração clara.
2. Migrar para permissão explícita exigiria criar ~17 permissões de leitura para Administração — custo alto, benefício marginal.
3. O controle real do Administrador é via `audit_log` e rastreabilidade de acesso — não via restrição de RLS.
4. A migration de hardening (`20260623100028`) já limitou DELETE. O modelo está adequado para o contexto de hospital de baixa complexidade.
5. Regressão potencial: se `is_admin()` for removido das policies sem as permissões correspondentes serem criadas, o Administrador perde acesso imediatamente — risco de quebra operacional grave.

**Critério para revisão futura:** Se o sistema evoluir para múltiplas unidades com Administradores de escopo limitado, reconsiderar a granularidade do `is_admin()`.

---

## 9. Auditoria — análise separada

### 9.1 Deve receber `paciente.visualizar`, `atendimento.visualizar` e `consulta.visualizar`?

**Não.** Auditoria é coberta por `is_auditoria()` em todas as policies. Atribuir permissões de leitura ao perfil Auditoria via `perfil_permissao` criaria:
- Redundância com `is_auditoria()`.
- Dependência dupla sem benefício de segurança.
- Risco de acesso residual se `is_auditoria()` for removido das policies sem as permissões correspondentes serem criadas.

### 9.2 `is_auditoria()` continua diretamente nas policies?

**Sim, com a mesma lógica de §8.4.** `is_auditoria()` é wrapper de `has_perfil('Auditoria')`.

### 9.3 Necessidade futura de trilha de leitura clínica

Em produção real com LGPD, o acesso da Auditoria a dados clínicos nominais deve ser:
- **Registrado:** todo SELECT de Auditoria em `pacientes`, `atendimentos` e `consultas` deve gerar entrada em `audit_log`.
- **Justificado:** o acesso deve ser motivado por processo de auditoria formal — não livre.
- **Limitado no tempo:** janela de auditoria com data de início e fim (a implementar via RPC ou política de aplicação, fora do escopo desta fase).

**Recomendação:** Implementar trilha de acesso de leitura para Auditoria na Fase E (trigger ou RPC de auditoria de SELECT).

### 9.4 Justificativa legal e operacional

| Aspecto | Posição atual | Recomendação |
|---|---|---|
| Base legal | `is_auditoria()` como acesso amplo de controle | Adequado para hospital de baixa complexidade; deve ser registrado como controle compensatório |
| LGPD — Art. 7 | Tratamento justificado por obrigação legal e proteção da vida | Auditoria hospitalar é obrigação legal; acesso ao prontuário é necessário |
| Controle | Nenhum log de leitura hoje | Fase E: implementar `audit_log` para SELECT da Auditoria |
| Acesso histórico | Auditoria acessa todos os registros sem limite temporal | Decisão institucional: definir janela de auditoria por competência |

---

## 10. Usuários com múltiplos perfis

### 10.1 União de permissões (comportamento padrão de RLS)

O PostgreSQL aplica as policies de RLS em `OR`: se **qualquer** policy for satisfeita para a linha, a linha é retornada. No modelo de `has_permission()`, um usuário com dois perfis terá a **união** das permissões de ambos.

Exemplo: usuário com perfil Técnico em Enfermagem **e** Farmácia (improvável mas possível) teria:
- `paciente.visualizar` (de TEN e Farmácia) — lê `pacientes` ✓
- `atendimento.visualizar` (de TEN) — lê `atendimentos` ✓
- `consulta.visualizar` — não tem (nem TEN nem Farmácia recebem) ✗

### 10.2 Riscos de escalada

| Cenário | Risco | Mitigação |
|---|---|---|
| Usuário com TEN + Enfermeiro | Enfermeiro tem `consulta.visualizar`; TEN não tem — mas o usuário teria via Enfermeiro | Risco baixo: perfis clínicos válidos; usuário que tem ambos os perfis é raro e aceita o acesso combinado |
| Usuário com Gestão Hospitalar + qualquer perfil operacional | Gestão não tem nenhuma das 3 permissões — o acesso viria pelo perfil operacional, não pelo gerencial | Sem escalada: Gestão não adiciona permissão de leitura |
| Usuário com Farmácia + Regulação | Farmácia não tem `atendimento.visualizar`; Regulação tem — usuário com ambos leria atendimentos | Risco médio: combinação improvável; acesso via Regulação é aceitável |
| Usuário com qualquer perfil + Administração | Administração é coberta por `is_admin()` — o usuário vê tudo | Risco alto: não criar usuários com perfil Administração + perfil operacional sem necessidade explícita |

### 10.3 Testes obrigatórios para múltiplos perfis

| Combinação | Tabela | Expectativa |
|---|---|---|
| TEN + Enfermeiro | `consultas` | body não-vazio (via Enfermeiro) |
| TEN + Farmácia | `atendimentos` | body vazio (nenhum dos dois tem `atendimento.visualizar` após Fase B1) |
| Gestão Hospitalar + qualquer perfil sem permissão B1 | `pacientes` | body vazio |
| Médico + qualquer perfil | todas as 3 tabelas | body não-vazio (via Médico) |

### 10.4 Comportamento esperado

`has_permission()` verifica a existência da permissão em **qualquer** perfil vinculado ao usuário. Um usuário com perfil TEN + Enfermeiro receberá `paciente.visualizar` via TEN e `consulta.visualizar` via Enfermeiro — o acesso é a **soma** de todas as permissões dos perfis.

---

## 11. Policies afetadas — expressões propostas

### 11.1 `pacientes_select_operacional`

| | Conteúdo |
|---|---|
| **Tabela** | `public.pacientes` |
| **Policy atual** | `pacientes_select_operacional` |
| **Expressão atual** | `has_permission('paciente.criar') OR has_permission('triagem.classificar') OR has_permission('consulta.iniciar') OR has_permission('exame.visualizar') OR has_permission('prescricao.dispensar') OR has_permission('transferencia.aprovar_vaga') OR is_admin() OR is_auditoria()` |
| **Expressão proposta** | `has_permission('paciente.visualizar') OR is_admin() OR is_auditoria()` |
| **Acesso perdido** | Nenhum acesso legítimo — todos os perfis que hoje leem `pacientes` receberão `paciente.visualizar` |
| **Acesso mantido** | Recepção, TEN, Enfermeiro, Médico, Farmácia, TEN-RX, Regulação, Admin, Auditoria |
| **Risco de quebra** | Baixo; condicionado à Fase B2 (vínculos) ser executada antes da Fase B3 (policy) |
| **Teste necessário** | 10 perfis × body não-vazio ou body vazio (ver §12) |

### 11.2 `atendimentos_select_operacional`

| | Conteúdo |
|---|---|
| **Tabela** | `public.atendimentos` |
| **Policy atual** | `atendimentos_select_operacional` |
| **Expressão atual** | `has_permission('atendimento.abrir') OR has_permission('triagem.classificar') OR has_permission('consulta.iniciar') OR has_permission('exame.visualizar') OR has_permission('prescricao.dispensar') OR has_permission('transferencia.apovar_vaga') OR is_admin() OR is_auditoria()` |
| **Expressão proposta** | `has_permission('atendimento.visualizar') OR is_admin() OR is_auditoria()` |
| **Acesso perdido** | Farmácia perde acesso a `atendimentos` (acesso excedente à finalidade de dispensação) |
| **Acesso mantido** | Recepção, TEN, Enfermeiro, Médico, TEN-RX, Regulação, Admin, Auditoria |
| **Risco de quebra** | Baixo para o frontend (Farmácia não chama Supabase para listar atendimentos) |
| **Teste necessário** | Farmácia: body vazio; demais: body não-vazio |

### 11.3 `consultas_select_clinico`

| | Conteúdo |
|---|---|
| **Tabela** | `public.consultas` |
| **Policy atual** | `consultas_select_clinico` |
| **Expressão atual** | `has_permission('consulta.iniciar') OR has_permission('consulta.registrar_conduta') OR has_permission('observacao.reavaliar') OR is_admin() OR is_auditoria()` |
| **Expressão proposta** | `has_permission('consulta.visualizar') OR is_admin() OR is_auditoria()` |
| **Acesso perdido** | Técnico em Enfermagem perde acesso não intencional a `consultas` — **correção desejada** |
| **Acesso mantido** | Médico, Enfermeiro, Admin, Auditoria |
| **Risco de quebra** | Mínimo para o frontend (TEN não acessa `consultas` via Supabase; Médico mantém acesso) |
| **Teste necessário** | TEN: body vazio (**novo teste negativo**); Enfermeiro: body não-vazio; Médico: body não-vazio |

---

## 12. Plano de migration

> Este plano é prospectivo — nenhuma migration será criada nesta etapa (5B.8.5F). A criação ocorrerá na etapa autorizada de implementação.

### 12.1 Sequência obrigatória

A migration da Fase B1 deve ser executada em três partes **na mesma janela** ou com ordem estrita:

**Parte 1 — Criar as 3 permissões (B1a)**
```sql
-- Não executar sem aprovação explícita
INSERT INTO public.permissoes (chave, modulo, descricao)
VALUES
  ('paciente.visualizar',    'Pacientes',    'Visualizar dados de identificação do paciente'),
  ('atendimento.visualizar', 'Atendimentos', 'Visualizar atendimentos e fluxo operacional'),
  ('consulta.visualizar',    'Consulta',     'Visualizar consultas médicas e condutas clínicas')
ON CONFLICT (chave) DO NOTHING;
```

**Parte 2 — Vincular aos perfis (B1b)**
```sql
-- Não executar sem aprovação explícita
-- paciente.visualizar
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT pa.id, p.id
FROM public.perfis_acesso pa, public.permissoes p
WHERE p.chave = 'paciente.visualizar'
  AND pa.nome IN (
    'Recepção', 'Técnico em Enfermagem', 'Enfermeiro', 'Médico',
    'Farmácia', 'Técnico em RX', 'Regulação de Transferência'
  )
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- atendimento.visualizar
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT pa.id, p.id
FROM public.perfis_acesso pa, public.permissoes p
WHERE p.chave = 'atendimento.visualizar'
  AND pa.nome IN (
    'Recepção', 'Técnico em Enfermagem', 'Enfermeiro', 'Médico',
    'Técnico em RX', 'Regulação de Transferência'
  )
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- consulta.visualizar
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT pa.id, p.id
FROM public.perfis_acesso pa, public.permissoes p
WHERE p.chave = 'consulta.visualizar'
  AND pa.nome IN ('Enfermeiro', 'Médico')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;
```

**Parte 3 — Atualizar as 3 policies (B1c)**
```sql
-- Não executar sem aprovação explícita e sem os vínculos da Parte 2 confirmados

-- pacientes_select_operacional
DROP POLICY IF EXISTS pacientes_select_operacional ON public.pacientes;
CREATE POLICY pacientes_select_operacional ON public.pacientes
  FOR SELECT TO authenticated
  USING (
    public.has_permission('paciente.visualizar')
    OR public.is_admin()
    OR public.is_auditoria()
  );

-- atendimentos_select_operacional
DROP POLICY IF EXISTS atendimentos_select_operacional ON public.atendimentos;
CREATE POLICY atendimentos_select_operacional ON public.atendimentos
  FOR SELECT TO authenticated
  USING (
    public.has_permission('atendimento.visualizar')
    OR public.is_admin()
    OR public.is_auditoria()
  );

-- consultas_select_clinico
DROP POLICY IF EXISTS consultas_select_clinico ON public.consultas;
CREATE POLICY consultas_select_clinico ON public.consultas
  FOR SELECT TO authenticated
  USING (
    public.has_permission('consulta.visualizar')
    OR public.is_admin()
    OR public.is_auditoria()
  );
```

### 12.2 O que esta migration NÃO faz

- Não altera policies de INSERT, UPDATE ou DELETE.
- Não altera grants (`SELECT`, `INSERT`, `UPDATE`) nas tabelas.
- Não altera funções auxiliares (`is_admin`, `is_auditoria`, `has_permission`, `is_linked_user`).
- Não altera as outras 14 policies da Fase A.
- Não altera `script.js` nem qualquer arquivo de frontend.
- Não altera `audit_log`, `trigger`, `sequence` ou qualquer outro objeto de banco.

---

## 13. Rollback da Fase B1

### 13.1 Rollback B1c (policies)

```sql
-- Restaura as 3 policies para o estado da Fase A
-- Não executar sem confirmação de que B1b (vínculos) será revertido em seguida

DROP POLICY IF EXISTS pacientes_select_operacional ON public.pacientes;
CREATE POLICY pacientes_select_operacional ON public.pacientes
  FOR SELECT TO authenticated
  USING (
    public.has_permission('paciente.criar')
    OR public.has_permission('triagem.classificar')
    OR public.has_permission('consulta.iniciar')
    OR public.has_permission('exame.visualizar')
    OR public.has_permission('prescricao.dispensar')
    OR public.has_permission('transferencia.aprovar_vaga')
    OR public.is_admin()
    OR public.is_auditoria()
  );

DROP POLICY IF EXISTS atendimentos_select_operacional ON public.atendimentos;
CREATE POLICY atendimentos_select_operacional ON public.atendimentos
  FOR SELECT TO authenticated
  USING (
    public.has_permission('atendimento.abrir')
    OR public.has_permission('triagem.classificar')
    OR public.has_permission('consulta.iniciar')
    OR public.has_permission('exame.visualizar')
    OR public.has_permission('prescricao.dispensar')
    OR public.has_permission('transferencia.aprovar_vaga')
    OR public.is_admin()
    OR public.is_auditoria()
  );

DROP POLICY IF EXISTS consultas_select_clinico ON public.consultas;
CREATE POLICY consultas_select_clinico ON public.consultas
  FOR SELECT TO authenticated
  USING (
    public.has_permission('consulta.iniciar')
    OR public.has_permission('consulta.registrar_conduta')
    OR public.has_permission('observacao.reavaliar')
    OR public.is_admin()
    OR public.is_auditoria()
  );
```

### 13.2 Rollback B1b (vínculos)

```sql
-- Remove apenas os vínculos criados pela Fase B1 — não remove outras permissões
DELETE FROM public.perfil_permissao
WHERE permissao_id IN (
  SELECT id FROM public.permissoes
  WHERE chave IN ('paciente.visualizar', 'atendimento.visualizar', 'consulta.visualizar')
);
```

### 13.3 Rollback B1a (permissões)

```sql
-- Remove as 3 permissões criadas pela Fase B1
-- Só executar APÓS B1b (remover vínculos) e B1c (restaurar policies)
-- e SOMENTE se nenhuma outra frente tiver reutilizado essas chaves
DELETE FROM public.permissoes
WHERE chave IN ('paciente.visualizar', 'atendimento.visualizar', 'consulta.visualizar');
```

> **Atenção:** Executar na ordem reversa: B1c → B1b → B1a. O rollback de B1a só é seguro se nenhuma outra migration posterior tiver adicionado vínculos a essas permissões.

---

## 14. Matriz de testes autenticados

### 14.1 Tabela `pacientes` — 13 perfis

| Perfil | Expectativa pós-B1 | Expectativa atual (Fase A) | Mudança? |
|---|---|---|---|
| Recepção | body não-vazio | body não-vazio | Não (apenas mecanismo muda) |
| Técnico em Enfermagem | body não-vazio | body não-vazio | Não |
| Enfermeiro | body não-vazio | body não-vazio | Não |
| Médico | body não-vazio | body não-vazio | Não |
| Farmácia | body não-vazio | body não-vazio | Não |
| Técnico em RX | body não-vazio | body não-vazio | Não |
| Regulação de Transferência | body não-vazio | body não-vazio | Não |
| Administração | body não-vazio | body não-vazio | Não |
| Auditoria | body não-vazio | body não-vazio | Não |
| Gestão Hospitalar | body vazio | body vazio | Não |
| Leitura/Gestor | body vazio | body vazio | Não |
| Sem perfil | body vazio | body vazio | Não |
| Inativo | body vazio | body vazio | Não |

> `pacientes` não tem mudança de comportamento observável nos testes — apenas o gate muda.

### 14.2 Tabela `atendimentos` — 13 perfis

| Perfil | Expectativa pós-B1 | Expectativa atual (Fase A) | Mudança? |
|---|---|---|---|
| Recepção | body não-vazio | body não-vazio | Não |
| Técnico em Enfermagem | body não-vazio | body não-vazio | Não |
| Enfermeiro | body não-vazio | body não-vazio | Não |
| Médico | body não-vazio | body não-vazio | Não |
| **Farmácia** | **body vazio** | body não-vazio | **SIM — perde acesso** |
| Técnico em RX | body não-vazio | body não-vazio | Não |
| Regulação de Transferência | body não-vazio | body não-vazio | Não |
| Administração | body não-vazio | body não-vazio | Não |
| Auditoria | body não-vazio | body não-vazio | Não |
| Gestão Hospitalar | body vazio | body vazio | Não |
| Leitura/Gestor | body vazio | body vazio | Não |
| Sem perfil | body vazio | body vazio | Não |
| Inativo | body vazio | body vazio | Não |

### 14.3 Tabela `consultas` — 13 perfis

| Perfil | Expectativa pós-B1 | Expectativa atual (Fase A) | Mudança? |
|---|---|---|---|
| Recepção | body vazio | body vazio | Não |
| **Técnico em Enfermagem** | **body vazio** | body não-vazio | **SIM — correção de acesso não intencional** |
| **Enfermeiro** | **body não-vazio** | body não-vazio | Não (mantido via `consulta.visualizar`) |
| Médico | body não-vazio | body não-vazio | Não |
| Farmácia | body vazio | body vazio | Não |
| Técnico em RX | body vazio | body vazio | Não |
| Regulação de Transferência | body vazio | body vazio | Não |
| Administração | body não-vazio | body não-vazio | Não |
| Auditoria | body não-vazio | body não-vazio | Não |
| Gestão Hospitalar | body vazio | body vazio | Não |
| Leitura/Gestor | body vazio | body vazio | Não |
| Sem perfil | body vazio | body vazio | Não |
| Inativo | body vazio | body vazio | Não |

### 14.4 Testes para múltiplos perfis

| Combinação | Tabela | Expectativa |
|---|---|---|
| TEN + Enfermeiro | `consultas` | body não-vazio (Enfermeiro tem `consulta.visualizar`) |
| TEN + Enfermeiro | `atendimentos` | body não-vazio (ambos têm `atendimento.visualizar`) |
| TEN + Farmácia | `atendimentos` | body **vazio** — TEN tem `atendimento.visualizar`, Farmácia não. Se usuário tem TEN, veria. Teste real: usuário **apenas com Farmácia** deve retornar vazio |
| Gestão Hospitalar + Médico | `consultas` | body não-vazio (Médico tem `consulta.visualizar`) |
| Leitura/Gestor (apenas) | todas as 3 | body vazio |

> **Nota:** Testes de múltiplos perfis devem criar um usuário com dois vínculos em `usuario_perfil` e verificar o comportamento combinado. O padrão de seed do `phase-a-select-access.test.js` permite isso via `linkUserToProfile` chamado múltiplas vezes para o mesmo `authUserId`.

### 14.5 Modificações necessárias em `phase-a-select-access.test.js`

| Teste existente | Ação necessária |
|---|---|
| `tecnico-em-enfermagem: le pacientes (status 200, body nao-vazio)` | Manter — sem mudança de comportamento |
| `tecnico-em-enfermagem: le atendimentos (status 200, body nao-vazio)` | Manter — sem mudança de comportamento |
| *Não existe* `tecnico-em-enfermagem: nao ve consultas` | **Adicionar** — novo teste negativo para TEN |
| `farmacia: le atendimentos (body nao-vazio)` | **Alterar para body vazio** (Farmácia perde acesso a `atendimentos`) |
| `enfermeiro: le consultas` | **Adicionar** (Enfermeiro ganha teste de body não-vazio em `consultas`) |

---

## 15. Decisões institucionais pendentes para autorizar a implementação

| Ref. | Decisão | Impacto se não respondida |
|---|---|---|
| **§13.2** | Farmácia deve ou não ter acesso a `atendimentos` após Fase B1? | `atendimentos_select_operacional` não pode ser atualizada com segurança |
| **§13.4** | Regulação deve ter acesso a `consultas` (resumo clínico para fundamentar transferência)? | `consultas_select_clinico` pode ser atualizada sem Regulação; mas a lacuna clínica ficará registrada |
| **§4.3 / §5.2** | Aceita-se que todos os campos de `pacientes` e `atendimentos` (incluindo CPF, queixa_principal) sejam visíveis a todos os perfis com acesso via RLS de linha? Ou é necessário criar view/RPC para filtrar colunas? | Se view/RPC for exigida, a Fase B1 de policies depende de uma Fase de infraestrutura anterior |
| **§9.3** | Auditoria deve ter janela de tempo de acesso ou acesso contínuo? | Não bloqueia Fase B1, mas deve ser decidida antes da produção real |
| **§8.4** | Confirmar que `is_admin()` deve permanecer diretamente nas policies (não migrar para permissão explícita) | Sem confirmação, a arquitetura pode ser revertida desnecessariamente |

---

## 16. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Fase B1b (vínculos) executada sem Fase B1c (policies) | Baixa | Baixo — sem efeito até a policy ser atualizada | Sequenciar corretamente na mesma migration |
| Fase B1c (policies) executada antes de B1b (vínculos) | Baixa | **Alto** — perfis perdem acesso até os vínculos serem criados | Executar B1a → B1b → B1c sempre em sequência |
| Farmácia perder acesso a `atendimentos` sem aviso ao usuário | Média | Baixo (frontend não usa Supabase para listar atendimentos) | Validar com equipe de farmácia; comunicar mudança |
| TEN perder acesso a `consultas` — processo de trabalho impactado | Baixa | Médio | Confirmar com coordenação de enfermagem que TEN não precisa de acesso ao prontuário médico |
| Testes autenticados não atualizados antes da migration | Média | Alto — falsos positivos encobrem regressão | Exigir testes escritos como pré-requisito do GO |
| `consulta.visualizar` atribuída incorretamente ao TEN no futuro | Média (a longo prazo) | Alto — recriaria o acesso não intencional | Documentar a decisão de exclusão do TEN neste documento |

---

## 17. Critérios GO/NO-GO

### 17.1 GO — todos os critérios abaixo devem ser atendidos

- [ ] Decisão sobre Farmácia e `atendimentos` (§13.2) confirmada antes da Fase B1c
- [ ] Decisão sobre `is_admin()` permanecer nas policies (§8.4) confirmada
- [ ] Decisão sobre `is_auditoria()` permanecer nas policies (§9.2) confirmada
- [ ] Decisão sobre RLS de linha ser suficiente ou necessidade de view/RPC (§4.3/§5.2) confirmada
- [ ] Rollback B1c, B1b e B1a redigidos e testados em ambiente local antes da migration B1c
- [ ] Testes em `phase-a-select-access.test.js` atualizados (farmácia/atendimentos e TEN/consultas) antes da migration B1c
- [ ] Suite de segurança 231/231 passando antes da migration B1a
- [ ] Suite comum 228/228 passando antes da migration B1a
- [ ] Aprovação explícita de commit e deploy por responsável técnico

### 17.2 NO-GO — qualquer item abaixo bloqueia

- [ ] Decisão de Farmácia/atendimentos (§13.2) não confirmada
- [ ] Administração ou Auditoria sem definição de arquitetura (§8, §9)
- [ ] Testes não atualizados antes da migration B1c
- [ ] Rollback não testado antes da migration B1c
- [ ] Qualquer teste da suite 231/231 falha após B1b
- [ ] Frontend chama `window.GsiAuth.client.from('atendimentos')` em contexto de Farmácia sem adaptação planejada
- [ ] TEN perde acesso a qualquer tabela além de `consultas` como consequência não planejada da Fase B1c

---

*Documento de especificação — 2026-07-24. Nenhuma migration, permissão, policy, grant, função, dado ou arquivo de código foi criado ou alterado. Aprovação institucional e técnica necessária antes de qualquer implementação.*
