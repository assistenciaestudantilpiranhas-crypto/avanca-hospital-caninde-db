# GSI ONE — RLS Fase A: Validação de Dependências do Frontend

**Documento:** GSI_ONE_RLS_FASE_A_DEPENDENCIAS_FRONTEND_5B8_5C  
**Etapa:** 5B.8.5C  
**Status:** Análise concluída — nenhum código ou banco alterado  
**Elaborado em:** 2026-07-24  
**Pré-requisito:** GSI_ONE_RLS_FASE_A_PLANO_TECNICO_5B8_5B.md  

---

## 1. Descoberta crítica — separação entre camada Supabase e GsiApi

Antes de qualquer tabela específica, é necessário registrar o achado mais relevante desta análise:

> **O frontend do GSI ONE possui duas camadas de dados completamente independentes: `GsiApi` (localStorage) e `window.GsiAuth.client` (Supabase real). A maioria dos módulos operacionais — incluindo Farmácia, Transferências, Exames e Indicadores — funciona exclusivamente com `GsiApi.list()`. As consultas ao Supabase real são restritas a um subconjunto pequeno e bem definido de funções.**

Isso significa que a Fase A de restrição de RLS afeta **somente** as funções que chamam `window.GsiAuth.client.from(...)`. Módulos que usam apenas `GsiApi` continuam funcionando independentemente das policies do banco — porque não fazem consulta ao banco.

---

## 2. Inventário completo de consultas Supabase nas 17 tabelas-alvo

### 2.1 Mapa de funções × tabelas Supabase (SELECT)

| Função em script.js | Linha aprox. | Tabela Supabase | Campos selecionados | Quem chama / quando |
|---|---|---|---|---|
| `loadPacientesReais()` | ~547–573 | `pacientes` | `id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia` | Chamada na inicialização; resultado em `pacientesReaisState.porId` |
| `loadAtendimentosReais()` | ~585–616 | `atendimentos` | `id, paciente_id, status_id, classificacao_risco_id, desfecho_id, queixa_principal, etapa_atual, setor_atual, hora_chegada_ts, hora_desfecho_ts, pacientes(nome, cpf, cartao_sus)` | Chamada na inicialização + join embed com `pacientes` |
| `findPacienteRealDuplicado()` | ~960–988 | `pacientes` | `id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia` | Chamada por `createPacienteRealFromLocal()` durante `save-patient` |
| `createPacienteRealFromLocal()` | ~997–1034 | `pacientes` | INSERT + SELECT confirmação (`id`) | Recepção ao salvar novo paciente |
| `createAtendimentoRealFromLocal()` | ~1043–1130 | `atendimentos` + `dom_status_atendimento` | INSERT + SELECT campos básicos do atendimento | Recepção ao abrir atendimento (`start-care`) |
| `updateAtendimentoRealConsultaInicio()` | ~1132–1157 | `atendimentos` | UPDATE + SELECT básico | Médico ao iniciar consulta |
| `updateAtendimentoRealTriagem()` | ~1160–1220 | `triagens` (INSERT) + `atendimentos` (UPDATE) | `triagens`: todos os campos de triagem; `atendimentos`: status, etapa, setor | Técnico em Enfermagem / Enfermeiro ao salvar triagem |
| `updateAtendimentoRealConsultaInicio()` | ~1225–1323 | `consultas` (INSERT) + `atendimentos` (UPDATE) | `consultas`: campos de início; `atendimentos`: status, etapa | Médico ao iniciar consulta |
| `registrarCondutaRealAlta()` | ~1325–1440 | `consultas` (UPDATE SELECT) + `atendimentos` (UPDATE) | `consultas`: SELECT para verificar existência; UPDATE conduta, desfecho; `atendimentos`: UPDATE desfecho | Médico ao registrar conduta de alta |
| `registrarCondutaRealObservacao()` | ~1441–1548 | `consultas` (SELECT/UPDATE) + `observacoes` (INSERT) + `atendimentos` (UPDATE) | `consultas`: SELECT; `observacoes`: INSERT tipo/inicio; `atendimentos`: UPDATE status | Médico ao encaminhar para observação |
| `registrarCondutaRealEstabilizacao()` | ~1441–1548 | `consultas` (SELECT/UPDATE) + `estabilizacoes` (INSERT) + `atendimentos` (UPDATE) | `consultas`: SELECT; `estabilizacoes`: INSERT; `atendimentos`: UPDATE status | Médico ao encaminhar para estabilização |
| `registrarTransferenciaReal()` | ~1549–1598 | `transferencias` (INSERT) + `atendimentos` (UPDATE) | `transferencias`: INSERT campos de solicitação; `atendimentos`: UPDATE status, etapa, setor | Médico ao solicitar transferência |
| `aprovarVagaTransferenciaReal()` | ~1607–1626 | `transferencias` | UPDATE `status_id, hora_aprovacao_vaga_ts` + SELECT básico | Regulação ao aprovar vaga |
| `confirmarChecklistTransferenciaReal()` | ~1637–1669 | `checklist_transferencia_itens` (INSERT) + `transferencias` (UPDATE) | `checklist_transferencia_itens`: INSERT itens; `transferencias`: UPDATE `checklist_confirmado_em` | Enfermeiro ao confirmar checklist |
| `confirmarSaidaTransferenciaReal()` | ~1681–1740 | `transferencias` (UPDATE) + `atendimentos` (UPDATE) | `transferencias`: UPDATE status concluída, hora_saída; `atendimentos`: UPDATE desfecho | Enfermeiro ao confirmar saída |
| `updateAtendimentoRealFromLocal()` | ~1769–1810 | `atendimentos` (UPDATE) + `pacientes` (SELECT confirmar) | `atendimentos`: UPDATE campos de triagem; `pacientes`: SELECT confirmação `id` | Múltiplas ações de fluxo |
| `loadAuditoriaDados()` | ~4098–4135 | `audit_log` + `usuarios` | `audit_log`: todos os campos; `usuarios`: nome | Tela de Auditoria (Admin/Auditoria) |

### 2.2 Tabelas NÃO consultadas via Supabase pelo frontend

As tabelas abaixo estão entre as 17 tabelas-alvo da Fase A, mas **nenhuma função do frontend as consulta via `window.GsiAuth.client.from()`** no código atual. Elas são acessadas exclusivamente via `GsiApi.list()` (localStorage):

| Tabela | Como é acessada no frontend | Impacto de nova policy SELECT |
|---|---|---|
| `triagens` | Somente em INSERT/UPDATE por `updateAtendimentoRealTriagem()` | **Zero impacto na leitura** — nenhuma função faz SELECT em `triagens` |
| `consultas` | SELECT interno em funções de UPDATE (verificar existência antes de conduta) | Impacto apenas em funções de escrita de fluxo clínico |
| `evolucoes_enfermagem` | Não consultada via Supabase em nenhuma função identificada | **Zero impacto** |
| `observacoes` | INSERT por `registrarCondutaRealObservacao()`; sem SELECT direto de leitura | Impacto apenas na escrita |
| `reavaliacoes_observacao` | Não consultada via Supabase | **Zero impacto** |
| `estabilizacoes` | INSERT por `registrarCondutaRealEstabilizacao()`; sem SELECT direto de leitura | Impacto apenas na escrita |
| `checklist_estabilizacao_itens` | Não consultada via Supabase | **Zero impacto** |
| `prescricoes` | Exclusivamente via `GsiApi.list("prescricoes")` | **Zero impacto** — Farmácia usa localStorage |
| `prescricao_itens` | Não consultada via Supabase | **Zero impacto** |
| `exames` | Exclusivamente via `GsiApi.list("exames")` | **Zero impacto** |
| `estoque_itens` | Não consultada via Supabase | **Zero impacto** |
| `estoque_movimentacoes` | Não consultada via Supabase | **Zero impacto** |

---

## 3. Análise por perfil

### 3.1 Farmácia

**Conclusão: GO — nenhum ajuste necessário antes da Fase A.**

A tela de Farmácia (`function farmacia()`, linha ~2805) **não faz nenhuma consulta Supabase**. Toda a lógica usa exclusivamente:

- `GsiApi.list("prescricoes")` — lista de prescrições em localStorage
- `GsiApi.list("estoque")` — lista de estoque em localStorage
- `GsiApi.update("prescricoes", ...)` — atualização local ao dispensar

**Tabelas Supabase consultadas pela Farmácia:**

| Tabela | Tipo de acesso | Ocorrência |
|---|---|---|
| `pacientes` | SELECT (indireto) | Via `loadPacientesReais()` na inicialização, mas apenas para sincronizar estado; falha não impede funcionamento |
| `atendimentos` | SELECT (indireto) | Via `loadAtendimentosReais()` na inicialização; mesmo comportamento |
| Nenhuma tabela clínica | — | **A Farmácia não consulta triagens, consultas, observações, exames ou qualquer dado clínico via Supabase** |

**Campos exibidos na tela de Farmácia:**

- `p.paciente` — nome do paciente (localStorage)
- `p.medicamento`, `p.dose`, `p.via`, `p.horario`, `p.prescritor` — da prescrição local
- `p.status` — status da prescrição (local)
- `s.nome`, `s.quantidade`, `s.minimo`, `s.situacao`, `s.validade`, `s.local` — do estoque local

**Nenhum dado clínico** (triagem, consulta, evolução, observação) é exibido ou consultado pela tela de Farmácia.

**Risco de quebra:** Zero. A Farmácia pode perder acesso às tabelas `triagens`, `consultas`, etc. no banco sem nenhum efeito visível no frontend.

---

### 3.2 Recepção

**Conclusão: GO — com atenção a `loadPacientesReais` e `loadAtendimentosReais`.**

A Recepção usa duas consultas Supabase diretamente:

#### `loadPacientesReais()` (linha ~547)

```javascript
.from("pacientes")
.select("id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia")
```

- Campos: apenas dados de cadastro administrativo — sem dados clínicos.
- Após a Fase A, a Recepção continua com acesso via `has_permission('paciente.criar')`.
- **Sem impacto** na leitura de pacientes.

#### `loadAtendimentosReais()` (linha ~585)

```javascript
.from("atendimentos")
.select("id, paciente_id, status_id, classificacao_risco_id, desfecho_id, queixa_principal, etapa_atual, setor_atual, hora_chegada_ts, hora_desfecho_ts, pacientes(nome, cpf, cartao_sus)")
```

- Inclui join embed com `pacientes(nome, cpf, cartao_sus)`.
- Após a Fase A, a Recepção continua com acesso via `has_permission('atendimento.abrir')`.
- **Sem impacto** na leitura de atendimentos.
- O campo `queixa_principal` é exibido na tela de atendimentos e é necessário para a Recepção acompanhar a fila.

#### Funções de escrita da Recepção (INSERT/UPDATE)

- `createPacienteRealFromLocal()` — INSERT em `pacientes` + SELECT de confirmação
- `createAtendimentoRealFromLocal()` — INSERT em `atendimentos`
- `findPacienteRealDuplicado()` — SELECT filtrado em `pacientes` por CPF/CNS

Todas essas funções têm policies de INSERT/UPDATE próprias que **não são alteradas pela Fase A**. Nenhum impacto.

**Verificação de acesso indevido da Recepção a dados clínicos:**

A Recepção **não tem rotas** para triagem, consulta, enfermagem, observação, exames, farmácia ou transferências no frontend. Não existe nenhuma chamada Supabase da Recepção a essas tabelas. O bloqueio de leitura na Fase A é proteção de banco (defense in depth), não correção de funcionalidade existente.

**Risco de quebra:** Zero. `loadPacientesReais` e `loadAtendimentosReais` continuam funcionando com as permissions propostas.

**Campo `queixa_principal` em `atendimentos`:** Este campo é selecionado por `loadAtendimentosReais` e é visível na tela de atendimentos para **todos os perfis** que têm acesso à lista de atendimentos. A Recepção o usa para identificar o paciente na fila. Após a Fase A, isso continua funcionando.

---

### 3.3 Regulação de Transferência

**Conclusão: GO — com uma ressalva importante documentada.**

A Regulação usa as seguintes funções Supabase:

#### `aprovarVagaTransferenciaReal()` (linha ~1607)

```javascript
.from("transferencias").update({...}).eq("id", ...).select("id, atendimento_id, status_id, hora_aprovacao_vaga_ts")
```

- Apenas UPDATE em `transferencias`. Após a Fase A, a Regulação mantém acesso via `has_permission('transferencia.aprovar_vaga')`. **Sem impacto.**

#### `registrarTransferenciaReal()` (chamada indireta — pode ser invocada por Médico, não Regulação)

Após análise dos action gates:
- `TRANSFERENCIA_SOLICITAR_ACTION_RULE` → exige `transferencia.solicitar` ou perfil `Médico`
- `TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE` → exige `transferencia.aprovar_vaga` ou perfil `Regulação de Transferência`

A Regulação **não solicita** transferência — apenas aprova vaga e cancela. Ela usa `aprovarVagaTransferenciaReal()` (UPDATE em `transferencias`) — sem SELECT de triagem ou consulta.

**Tela de transferências (`function transferencias()`, linha ~3294):**

Usa exclusivamente `GsiApi.list("transferencias")` — **sem consulta Supabase**. Exibe:
- `t.paciente` — nome do paciente (localStorage)
- `t.motivo`, `t.destino`, `t.status`, `t.acompanhante`, `t.checklist`, `t.saida` — dados da transferência local

**Nenhum dado clínico** (triagem, consulta) é exibido na tela de transferências.

**Ressalva documentada:** O plano técnico 5B.8.5B levantou a hipótese de que a Regulação pode precisar de um "resumo clínico" de `consultas` para documentar a referência de transferência. A análise do frontend **não confirma essa necessidade** no código atual — a tela de transferências não exibe nem consulta dados de triagem ou consulta. A Regulação opera com `motivo`, `destino` e `status` — todos em localStorage.

**Decisão:** A policy de `consultas` proposta (que bloqueia Regulação) está alinhada com o frontend atual. Se houver demanda futura de exibir o diagnóstico/CID na tela de transferências, isso deve ser implementado via campo específico em `transferencias` (não via leitura de `consultas`).

**Risco de quebra:** Zero para o frontend atual.

---

### 3.4 Técnico em Enfermagem

**Conclusão: GO — com ressalva sobre transferências (checklist).**

O Técnico em Enfermagem usa as seguintes consultas Supabase diretas:

#### `updateAtendimentoRealTriagem()` (linha ~1160)

```javascript
.from("triagens").insert({...})  // INSERT
.from("atendimentos").update({...}) // UPDATE
```

- Apenas escrita. Policies de INSERT/UPDATE em `triagens` e `atendimentos` não são alteradas na Fase A. **Sem impacto.**

**Tela de transferências (`function transferencias()`):**

A tela de transferências usa `GsiApi.list("transferencias")` — sem consulta Supabase. O Técnico em Enfermagem pode visualizar a tela localmente sem precisar de policy SELECT em `transferencias` no banco.

**Funções de checklist de transferência:**

`confirmarChecklistTransferenciaReal()` (linha ~1637) — INSERT em `checklist_transferencia_itens` + UPDATE em `transferencias`. Requer permissão `transferencia.confirmar_checklist` (Enfermeiro, não Técnico em Enfermagem).

> **Achado relevante:** A pesquisa no banco de permissões (migration `20260623100026`) confirma que `transferencia.confirmar_checklist` foi vinculada ao perfil `Enfermeiro`, **não ao Técnico em Enfermagem**. O Técnico em Enfermagem não tem permissão de checklist de transferência no seed atual.

**A policy proposta em `transferencias_select_operacional`** (que bloqueia Técnico em Enfermagem por não ter permissão de transferência) está **alinhada com as permissões reais do banco**. O Técnico em Enfermagem não executa ações de transferência via Supabase — apenas visualiza a tela local (GsiApi).

**Risco de quebra:** Zero — o Técnico em Enfermagem não consulta `transferencias` via Supabase.

---

### 3.5 Gestão Hospitalar e Leitura/Gestor

**Conclusão: GO — com impacto funcional esperado e documentado.**

**Não existe nenhuma rota no frontend** para `Gestão Hospitalar` ou `Leitura/Gestor`:

- `routePermissions` foi explicitamente atualizado para remover esses perfis de indicadores e relatórios (comentário linha 53–55: *"os dois últimos nunca existiram no seed real (perfis_acesso)"*).
- Nenhuma rota exige esses perfis: `indicadores: { permissoes: [], perfis: [] }` e `relatorios: { permissoes: [], perfis: [] }` — bloqueados para todos exceto Admin.

**Impacto no frontend após Fase A:**

Um usuário com perfil `Gestão Hospitalar` ou `Leitura/Gestor` verá apenas:

- Dashboard (sempre visível)
- Tela de saída (sempre visível)
- Nenhum módulo operacional (já bloqueado pelo `routePermissions`)

As consultas `loadPacientesReais()` e `loadAtendimentosReais()` retornarão array vazio `[]` após a Fase A (sem `has_permission()` correspondente). Isso é **comportamento esperado e correto** — esses perfis não devem ver dados nominais de pacientes.

**Risco de quebra:** Nenhum no frontend (rotas já bloqueadas). Efeito esperado: API retorna vazio para esses perfis.

---

### 3.6 Médico

**Conclusão: GO — sem impacto negativo; perfil mantido com acesso completo às tabelas clínicas.**

O Médico usa as seguintes consultas Supabase (escrita com SELECT embutido):

- `updateAtendimentoRealConsultaInicio()` — UPDATE em `atendimentos` + INSERT em `consultas`
- `registrarCondutaRealAlta()` — SELECT em `consultas` (verificação) + UPDATE em `consultas` + UPDATE em `atendimentos`
- `registrarCondutaRealObservacao()` — SELECT em `consultas` + INSERT em `observacoes` + UPDATE em `atendimentos`
- `registrarCondutaRealEstabilizacao()` — SELECT em `consultas` + INSERT em `estabilizacoes` + UPDATE em `atendimentos`
- `registrarTransferenciaReal()` — INSERT em `transferencias` + UPDATE em `atendimentos`

Todos esses SELECT internos são feitos durante operações de fluxo clínico ativo. Após a Fase A, o Médico mantém acesso via `has_permission('consulta.iniciar')` e `has_permission('consulta.registrar_conduta')`. **Sem impacto.**

---

### 3.7 Técnico em RX / Diagnóstico e Exames

**Achado:** A tela `exames()` usa exclusivamente `GsiApi.list("exames")` — sem consulta Supabase a `exames`. A policy de SELECT em `exames` proposta na Fase A não tem efeito no frontend atual.

Porém, é necessário confirmar se o perfil `Técnico em RX` possui a permissão `exame.visualizar` no seed. O comentário em `routePermissions` (linha 44) menciona `"Técnico em RX"` como perfil de exames, mas o seed de `perfis_acesso` (migration `20260623100004`) lista `'Diagnóstico/Exames'`. Se `Técnico em RX` é um alias ou perfil separado, a policy de `exames` pode não cobrir esse usuário. **Verificação necessária antes da migration.**

---

## 4. Consultas com join embed que cruzam tabelas

### `loadAtendimentosReais()` — join embed `pacientes(nome, cpf, cartao_sus)`

```javascript
.from("atendimentos")
.select("..., pacientes(nome, cpf, cartao_sus)")
```

Este SELECT usa um join embutido (PostgREST foreign key embed) que acessa `pacientes` como parte da query de `atendimentos`. Para que funcione, o usuário precisa de SELECT em **ambas** as tabelas.

**Após a Fase A:**

- Se o usuário tem acesso a `atendimentos` mas não a `pacientes`, o PostgREST pode retornar as linhas de `atendimentos` com o campo `pacientes` como `null` — ou pode retornar erro dependendo da configuração.
- Para todos os perfis propostos que têm acesso a `atendimentos` (Recepção, Técnico em Enfermagem, Médico, Farmácia, Regulação), a policy proposta em `pacientes` também concede acesso via `has_permission()` correspondente.

**Verificação:** A consistência entre policies de `atendimentos` e `pacientes` é preservada nas propostas da Fase A. Nenhum perfil recebe acesso a `atendimentos` sem receber acesso correspondente a `pacientes`.

---

## 5. Funções de carregamento global — impacto por perfil

As duas funções `loadPacientesReais()` e `loadAtendimentosReais()` são chamadas na inicialização para **qualquer perfil autenticado**. Elas silenciam erros de RLS e continuam funcionando com array vazio se o banco bloquear.

```javascript
// linha ~565–569
} catch (err) {
  // Falha de rede/RLS/sessao nao deve impedir o uso do sistema local
  console.error("GSI Pacientes reais: erro ao carregar public.pacientes", err);
  pacientesReaisState.error = "Não foi possível sincronizar pacientes reais com o servidor.";
}
```

**Consequência:** Se a Fase A bloquear o acesso de um perfil a `pacientes` ou `atendimentos`, o frontend **não exibirá erro** — apenas `pacientesReaisState.porId` ficará vazio. O sistema continua funcional via `GsiApi` (localStorage).

**Isso é um comportamento de proteção** — o frontend foi projetado para tolerar falhas de RLS sem quebrar. Não há risco de tela branca ou crash.

---

## 6. Tabela consolidada de impacto por módulo

| Módulo (função no JS) | Tabela Supabase | Perfis que a chamam | Acesso após Fase A | Impacto |
|---|---|---|---|---|
| `loadPacientesReais()` | `pacientes` SELECT | Todos os perfis (inicialização) | Continua para perfis assistenciais; retorna `[]` para Gestão/Leitura | Nenhum visível |
| `loadAtendimentosReais()` | `atendimentos` SELECT + `pacientes` embed | Todos os perfis (inicialização) | Continua para perfis assistenciais; retorna `[]` para Gestão/Leitura | Nenhum visível |
| `findPacienteRealDuplicado()` | `pacientes` SELECT filtrado | Recepção (save-patient) | Continua via `paciente.criar` | Nenhum |
| `createPacienteRealFromLocal()` | `pacientes` INSERT + SELECT | Recepção | Não alterado (policy de INSERT não muda) | Nenhum |
| `createAtendimentoRealFromLocal()` | `atendimentos` INSERT | Recepção | Não alterado (policy de INSERT não muda) | Nenhum |
| `updateAtendimentoRealTriagem()` | `triagens` INSERT + `atendimentos` UPDATE | Técnico em Enfermagem / Enfermeiro | Não alterado (policies de escrita não mudam) | Nenhum |
| `updateAtendimentoRealConsultaInicio()` | `atendimentos` UPDATE + `consultas` INSERT | Médico | Não alterado | Nenhum |
| `registrarCondutaRealAlta/Obs/Estab()` | `consultas` SELECT interno + escrita | Médico | SELECT interno continua via `consulta.iniciar` | Nenhum |
| `registrarTransferenciaReal()` | `transferencias` INSERT + `atendimentos` UPDATE | Médico | Não alterado | Nenhum |
| `aprovarVagaTransferenciaReal()` | `transferencias` UPDATE | Regulação | Não alterado | Nenhum |
| `confirmarChecklistTransferenciaReal()` | `checklist_transferencia_itens` INSERT + `transferencias` UPDATE | Enfermeiro | Não alterado | Nenhum |
| `confirmarSaidaTransferenciaReal()` | `transferencias` UPDATE + `atendimentos` UPDATE | Enfermeiro | Não alterado | Nenhum |
| `farmacia()` | **Nenhuma** (GsiApi only) | Farmácia | Sem mudança | **Zero** |
| `exames()` | **Nenhuma** (GsiApi only) | Qualquer | Sem mudança | **Zero** |
| `transferencias()` | **Nenhuma** (GsiApi only) | Qualquer | Sem mudança | **Zero** |
| `indicadores()` | **Nenhuma** (GsiApi only) | Admin | Sem mudança | **Zero** |
| `relatorios()` | **Nenhuma** (GsiApi only) | Admin | Sem mudança | **Zero** |
| `loadAuditoriaDados()` | `audit_log` + `usuarios` SELECT | Admin / Auditoria | Não alterado (`audit_log` policy não muda) | Nenhum |

---

## 7. Campos mínimos por perfil — confirmação do que está em uso

### Recepção

Campos efetivamente usados via Supabase:
- `pacientes`: `id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia`
- `atendimentos`: `id, paciente_id, status_id, classificacao_risco_id, desfecho_id, queixa_principal, etapa_atual, setor_atual, hora_chegada_ts, hora_desfecho_ts`

Nenhum campo clínico (triagem, consulta, prescrição) é consultado.

### Farmácia

Campos via Supabase: **nenhum** — tudo via localStorage.

### Regulação

Campos via Supabase: apenas UPDATE em `transferencias` — sem SELECT de leitura de dados clínicos.

### Técnico em Enfermagem

Campos via Supabase: INSERT em `triagens`, UPDATE em `atendimentos` — sem SELECT de triagens para exibição.

### Gestão Hospitalar / Leitura/Gestor

Campos via Supabase: `loadPacientesReais` e `loadAtendimentosReais` na inicialização — retornarão `[]` após a Fase A, sem efeito visível (frontend usa GsiApi como fallback).

---

## 8. Riscos de quebra — conclusão da análise

| Perfil | Risco de quebra no frontend | Nível | Observação |
|---|---|---|---|
| Farmácia | Nenhum | **Zero** | Não usa Supabase para dados clínicos |
| Recepção | Nenhum | **Zero** | Continua com acesso a `pacientes` e `atendimentos` |
| Regulação | Nenhum | **Zero** | Não consulta dados clínicos via Supabase |
| Técnico em Enfermagem | Nenhum | **Zero** | Não consulta `transferencias` via Supabase |
| Gestão Hospitalar | Impacto esperado e correto | **Intencional** | Retorna `[]` em `loadPacientesReais` e `loadAtendimentosReais` |
| Leitura/Gestor | Impacto esperado e correto | **Intencional** | Idem |
| Médico | Nenhum | **Zero** | Mantém todas as permissões de consulta |
| Enfermeiro | Nenhum | **Zero** | Mantém todas as permissões clínicas |
| Auditoria | Nenhum | **Zero** | `audit_log` não é alterado |

**Risco identificado que permanece:** A tela `exames()` usa `GsiApi` — não faz consulta Supabase. Porém a policy de INSERT em `exames` usa `has_permission('exame.solicitar')`. Isso não é alterado na Fase A. Não há risco de quebra.

**Risco do join embed em `loadAtendimentosReais`:** JOIN `pacientes(nome, cpf, cartao_sus)` requer SELECT em ambas as tabelas. Confirmado que todos os perfis com acesso a `atendimentos` na proposta da Fase A também têm acesso a `pacientes`. Consistência garantida.

---

## 9. Ajustes necessários antes da migration

### 9.1 Obrigatórios (bloqueadores)

| Ajuste | Razão | Responsável |
|---|---|---|
| Confirmar que `Técnico em RX` possui `exame.visualizar` no seed | A policy proposta usa essa permissão; se o perfil usa nome diferente, a policy não cobre o usuário | Revisar migration `20260623100004_acesso.sql` |
| Atualizar `tests/security/policies.test.js` | Os testes verificam nomes de policies e o predicado `is_linked_user()` em ≥10 SELECT policies — ambos mudarão | Criar junto com a migration |
| Criar script de rollback completo | Deve existir antes de aplicar a migration em qualquer ambiente compartilhado | Criar antes da migration |

### 9.2 Recomendados (não bloqueadores)

| Ajuste | Razão |
|---|---|
| Adicionar fixtures de Farmácia, Gestão Hospitalar e Leitura/Gestor em `tests/fixtures/security-users.js` | Para testes autenticados futuros da Fase A |
| Registrar em comentário de migration que `Gestão Hospitalar` e `Leitura/Gestor` perdem acesso intencionalmente | Rastreabilidade e conformidade GHAES |

### 9.3 Não necessários (confirmados dispensáveis)

| Item | Motivo |
|---|---|
| Revisar tela de Farmácia para acesso a triagens/consultas | Farmácia não consulta Supabase nessas tabelas — confirmado |
| Revisar tela de Transferências para dependência de `consultas` | Regulação não consulta dados clínicos via Supabase — confirmado |
| Ajustar `loadAtendimentosReais` para Farmácia | A query atual continuará funcionando; retorno pode ser menor mas sem efeito visível |

---

## 10. Itens que não exigem ajuste

| Item | Status |
|---|---|
| Módulo Farmácia (tela, dispensação, estoque) | **Sem ajuste** — não usa Supabase para dados clínicos |
| Módulo Exames (tela) | **Sem ajuste** — usa GsiApi |
| Módulo Transferências (tela) | **Sem ajuste** — usa GsiApi |
| Módulo Indicadores (tela) | **Sem ajuste** — usa GsiApi |
| Módulo Relatórios (tela) | **Sem ajuste** — usa GsiApi |
| Recepção — fluxo de cadastro de paciente | **Sem ajuste** — políticas de INSERT não mudam |
| Médico — fluxo de consulta e conduta | **Sem ajuste** — SELECT interno em `consultas` continua via `consulta.iniciar` |
| Enfermeiro — checklist de transferência | **Sem ajuste** — INSERT/UPDATE em `checklist_transferencia_itens` e `transferencias` não muda |
| Técnico em Enfermagem — triagem | **Sem ajuste** — INSERT em `triagens` não muda |
| Auditoria — `audit_log` | **Sem ajuste** — policy não muda |

---

## 11. Decisão go/no-go por perfil

| Perfil | Decisão | Justificativa |
|---|---|---|
| Farmácia | **GO** | Não usa Supabase para dados clínicos; zero risco de quebra |
| Recepção | **GO** | Acesso a `pacientes` e `atendimentos` mantido via permissions propostas |
| Gestão Hospitalar | **GO** | Perda de acesso é intencional e esperada; rotas já bloqueadas no frontend |
| Leitura/Gestor | **GO** | Idem |
| Regulação de Transferência | **GO** | Não consulta dados clínicos via Supabase; ações de escrita não mudam |
| Técnico em Enfermagem | **GO** | Não consulta `transferencias` via Supabase; triagem mantida |
| Médico | **GO** | Todas as permissions propostas cobrem o acesso necessário |
| Enfermeiro | **GO** | Todas as permissions propostas cobrem o acesso necessário |
| Auditoria | **GO** | `audit_log` não muda; acesso clínico amplo mantido via `is_auditoria()` |
| Administração | **GO** | Curto-circuito `is_admin()` preservado em todas as policies |

**Decisão geral:** **GO para criação da migration da Fase A**, condicionada aos 3 ajustes obrigatórios da seção 9.1.

---

## 12. Critérios para autorizar a migration

### Técnicos (obrigatórios — bloqueadores)

- [ ] **Confirmar** que `Técnico em RX` possui `exame.visualizar` em `perfil_permissao` (query no banco local)
- [ ] **Criar** script de rollback completo (DROP das novas policies + CREATE das originais com `is_linked_user()`)
- [ ] **Atualizar** `tests/security/policies.test.js` para refletir os novos nomes e predicados das policies

### Decisões de produto (resolvidas nesta análise)

- [x] Farmácia não precisa de acesso a triagens ou consultas via banco — **confirmado**
- [x] Regulação não consulta `consultas` no frontend atual — **confirmado**; bloqueio está correto
- [x] Técnico em Enfermagem não precisa de policy SELECT em `transferencias` — **confirmado**
- [x] Gestão Hospitalar e Leitura/Gestor podem perder acesso funcional — **confirmado como intencional**

### Autorização institucional (obrigatória para produção)

- [ ] Aprovação explícita por responsável técnico do projeto antes de aplicar em qualquer ambiente compartilhado

---

*Documento de análise — 2026-07-24. Nenhuma migration, tabela, policy, function, grant ou arquivo de código foi criado ou alterado.*
