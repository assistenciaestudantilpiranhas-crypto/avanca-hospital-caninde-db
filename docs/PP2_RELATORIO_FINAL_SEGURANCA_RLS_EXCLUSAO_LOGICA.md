# GSI ONE — Relatório Final: Segurança, RLS e Exclusão Lógica

**Ciclo:** PP2-D · PP2-E · PP2-F · PP2-G · PP2-E3
**Fase do projeto:** 2.6.2 (continuação) — Validação e correção estrutural de segurança
**Período de execução:** 2026-08-02
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto validado:** gsi-one-homologacao
**Padrão aplicado:** GHAES — Global Health AI Engineering Standard
**Status:** Concluído documentalmente após aplicação remota autorizada e validação comportamental aprovada

---

## 1. Objetivo

Validar, corrigir e confirmar no ambiente de homologação que:

1. Os perfis gerenciais (`Gestão Hospitalar`) acessam as views agregadas sem acesso a dados nominais.
2. O perfil `Administração` acessa os registros clínicos individuais enquanto perfis operacionais não os acessam.
3. Registros logicamente excluídos (`deleted_at IS NOT NULL`) são invisíveis a perfis operacionais e permanecem auditáveis por `Administração` e `Auditoria`.
4. A migration PP2-F que corrige a visibilidade da exclusão lógica foi aplicada com sucesso no ambiente de homologação.
5. A fixture de teste PP2-E foi encerrada com exclusão lógica controlada após a migração.

---

## 2. Escopo

**Incluído:**

- Permissões gerenciais: `gestao.indicadores.visualizar`, `gestao.producao.visualizar`, `gestao.tempos.visualizar`
- Permissões clínicas (ausência esperada para gestão): `paciente.visualizar`, `atendimento.visualizar`, `consulta.visualizar`
- Views gerenciais: `vw_gestao_indicadores_gerais`, `vw_gestao_producao_assistencial`, `vw_gestao_tempos_assistenciais`
- Policies SELECT: `pacientes_select_operacional`, `atendimentos_select_operacional`, `consultas_select_clinico`
- Migration de correção estrutural: `20260802000001_fix_soft_delete_visibility.sql`
- Fixture PP2-E: três registros fictícios de homologação, criados e encerrados de forma controlada

**Excluído:**

- Ambiente de produção (não foi tocado em nenhuma etapa)
- Dados reais de pacientes (todo o ciclo usou dados fictícios)
- Outras tabelas e policies além das citadas
- Autenticação real e fluxos de produção

---

## 3. Ambiente

| Atributo | Valor |
|---|---|
| Projeto remoto | gsi-one-homologacao |
| Plataforma | Supabase Cloud — região sa-east-1 |
| PostgreSQL remoto | 17.6.1.147 (engine 17, canal GA) |
| Status durante execução | ACTIVE_HEALTHY |
| Ambiente local | Supabase CLI (Docker), PostgreSQL 17 |
| Supabase CLI | npx supabase |
| Sistema operacional | Windows 11 Pro — PowerShell 5.1 |
| Produção | **não alterada em nenhuma etapa** |

---

## 4. Cronologia

### PP2-D — Validação das permissões gerenciais e views (pré-PP2-F)

**Objetivo:** confirmar que os perfis gerenciais têm as permissões corretas e que as views respondem.

**Perfil testado:** `teste.gestao.hospitalar@homologacao.gsi.invalid`

**Resultado:**

| Permissão | Esperado | Resultado |
|---|---|---|
| `gestao.indicadores.visualizar` | `true` | PASS |
| `gestao.producao.visualizar` | `true` | PASS |
| `gestao.tempos.visualizar` | `true` | PASS |
| `paciente.visualizar` | `false` | PASS |
| `atendimento.visualizar` | `false` | PASS |
| `consulta.visualizar` | `false` | PASS |

| View | HTTP | Resultado |
|---|---|---|
| `vw_gestao_indicadores_gerais` | 200 | PASS |
| `vw_gestao_producao_assistencial` | 200 | PASS |
| `vw_gestao_tempos_assistenciais` | 200 | PASS |

**Veredicto:** APROVADO

---

### PP2-E2 — Validação do isolamento clínico (pré-PP2-F)

**Objetivo:** confirmar que a RLS impede acesso de gestão a registros clínicos individuais, enquanto Administração acessa normalmente.

**Fixture utilizada:**

| Entidade | ID |
|---|---|
| paciente | `454711da-1d81-4994-a56d-ee61007f7046` |
| atendimento | `f19913ed-f017-4ee2-b4bb-5d7a1c47153a` |
| consulta | `272314c1-5f02-4875-abfe-6285491d1c11` |

**Resultado por perfil:**

| Perfil | Tabela | HTTP | Linhas | Esperado | Status |
|---|---|---|---|---|---|
| Gestão Hospitalar | pacientes | 200 | 0 | 0 | PASS |
| Gestão Hospitalar | atendimentos | 200 | 0 | 0 | PASS |
| Gestão Hospitalar | consultas | 200 | 0 | 0 | PASS |
| Administração | pacientes | 200 | 1 | 1 | PASS |
| Administração | atendimentos | 200 | 1 | 1 | PASS |
| Administração | consultas | 200 | 1 | 1 | PASS |

**Veredicto:** APROVADO

---

### PP2-F — Correção estrutural: visibilidade de exclusão lógica

**Problema identificado:** as três views gerenciais e as três policies SELECT operacionais não filtravam registros com `deleted_at IS NOT NULL`. Registros logicamente excluídos permaneciam visíveis para perfis operacionais.

**Solução implementada:**

**F1 — Views gerenciais** (três `CREATE OR REPLACE VIEW`):

- `vw_gestao_indicadores_gerais`: adicionado `a.deleted_at IS NULL` no WHERE antes do `has_permission`
- `vw_gestao_producao_assistencial`: mesmo padrão
- `vw_gestao_tempos_assistenciais`: filtros nas CTEs `triagem_por_atend` (`triagens.deleted_at IS NULL`), `consulta_por_atend` (`consultas.deleted_at IS NULL`) e `intervalos` (`a.deleted_at IS NULL`)

**F2 — Policies SELECT** (DROP + CREATE em três tabelas):

Lógica aplicada nas três policies:

```sql
(has_permission('xxx.visualizar') AND deleted_at IS NULL)
OR is_admin()
OR is_auditoria()
```

Perfis operacionais veem apenas registros ativos. `Administração` e `Auditoria` mantêm acesso irrestrito, incluindo registros logicamente excluídos — necessário para auditoria e rastreabilidade clínica.

**Pré-condição verificada:** coluna `deleted_at timestamptz` confirmada nas tabelas `pacientes`, `atendimentos`, `triagens` e `consultas` (introduzida pela migration `20260709170000`).

**Arquivos produzidos:**

| Arquivo | Tipo |
|---|---|
| `supabase/migrations/20260802000001_fix_soft_delete_visibility.sql` | Migration |
| `supabase/rollback/20260802000001_fix_soft_delete_visibility_rollback.sql` | Rollback |
| `tests/security/pp2f-soft-delete-visibility.test.js` | Testes de segurança |
| `supabase/config.toml` | Correção: `[auth.email] enable_signup = true` |

**Commit:** `f43dbfbe54c905fe448a4539ea3557d459cc0c0b`
**Mensagem:** `security: enforce soft-delete visibility`

**Testes locais (394/394 aprovados):**

```
supabase/migrations: 20 migrations aplicadas via db reset
vitest --config vitest.security.config.mjs
Resultado: 394/394 PASS | 0 FAIL | 0 SKIP
```

---

### PP2-G1 — Aplicação remota da migration PP2-F

**Pré-checagens executadas antes do push:**

- `git status --short`: limpo
- Branch: `main`
- `HEAD` = `origin/main` = `f43dbfbe54c905fe448a4539ea3557d459cc0c0b`
- Único projeto vinculado: `gsi-one-homologacao`
- Dry run (`--dry-run`): somente `20260802000001_fix_soft_delete_visibility.sql`, `seeds: []`, `roles: []`

**Comando executado:**

```
npx supabase db push --linked
```

**Resultado:**

```
Applying migration 20260802000001_fix_soft_delete_visibility.sql...
Finished supabase db push.
```

**Validações pós-aplicação:**

| Verificação | Resultado |
|---|---|
| Migration registrada em `schema_migrations` | `20260802000001` ✓ |
| `vw_gestao_indicadores_gerais` com `a.deleted_at IS NULL` | SIM ✓ |
| `vw_gestao_producao_assistencial` com `a.deleted_at IS NULL` | SIM ✓ |
| `vw_gestao_tempos_assistenciais` com filtros nas 3 CTEs | SIM ✓ |
| Colunas/tipos das views: idênticos ao estado anterior | SIM ✓ |
| `authenticated` SELECT nas 3 views | SIM ✓ |
| `anon` SELECT nas 3 views | NÃO ✓ |
| Policy `pacientes_select_operacional`: lógica com `deleted_at IS NULL` | SIM ✓ |
| Policy `atendimentos_select_operacional`: idem | SIM ✓ |
| Policy `consultas_select_clinico`: idem | SIM ✓ |
| Fixture PP2-E: `deleted_at = null` (ainda ativa) | SIM ✓ |
| Migration list local/remoto: 35/35 sincronizadas | SIM ✓ |

---

### PP2-G2 — Validação comportamental remota pós-PP2-F

**Objetivo:** confirmar que a migration não causou regressões e que a nova lógica de visibilidade se comporta corretamente no remoto.

**Teste 1 — Permissões (pós-migration):**

| Permissão | Esperado | Resultado |
|---|---|---|
| `gestao.indicadores.visualizar` | `true` | PASS |
| `gestao.producao.visualizar` | `true` | PASS |
| `gestao.tempos.visualizar` | `true` | PASS |
| `paciente.visualizar` | `false` | PASS |
| `atendimento.visualizar` | `false` | PASS |
| `consulta.visualizar` | `false` | PASS |

| View | HTTP | Resultado |
|---|---|---|
| `vw_gestao_indicadores_gerais` | 200 | PASS |
| `vw_gestao_producao_assistencial` | 200 | PASS |
| `vw_gestao_tempos_assistenciais` | 200 | PASS |

**Teste 2 — Isolamento clínico (pós-migration, fixture ainda ativa):**

| Perfil | Tabela | HTTP | Linhas | Status |
|---|---|---|---|---|
| Gestão Hospitalar | pacientes | 200 | 0 | PASS |
| Gestão Hospitalar | atendimentos | 200 | 0 | PASS |
| Gestão Hospitalar | consultas | 200 | 0 | PASS |
| Administração | pacientes | 200 | 1 | PASS |
| Administração | atendimentos | 200 | 1 | PASS |
| Administração | consultas | 200 | 1 | PASS |

**Teste 3 — Estado da fixture (pré-limpeza):**

| Registro | `deleted_at` | `delete_reason` |
|---|---|---|
| paciente | null | null |
| atendimento | null | null |
| consulta | null | null |

**Veredicto PP2-G2:** APROVADO

---

### PP2-E3 — Encerramento da fixture PP2-E por exclusão lógica

**Objetivo:** marcar logicamente os três registros fictícios de homologação como excluídos, agora que a PP2-F está ativa e validada.

**Conta utilizada:** `teste.administracao@homologacao.gsi.invalid` (is_admin() = true)

**Pré-checagens executadas antes dos PATCHes:**

1. `is_admin()` = `true` ✓
2. Três registros existentes, `deleted_at = null`, `delete_reason = null` ✓
3. Vínculos: `consulta.atendimento_id` = ID do atendimento; `atendimento.paciente_id` = ID do paciente ✓
4. Confirmação textual exigida: `INATIVAR FIXTURE PP2E` — fornecida ✓

**Operações realizadas (ordem de integridade referencial):**

| Ordem | Tabela | ID | HTTP | Status |
|---|---|---|---|---|
| 1ª | `consultas` | `272314c1-5f02-4875-abfe-6285491d1c11` | 200 | OK |
| 2ª | `atendimentos` | `f19913ed-f017-4ee2-b4bb-5d7a1c47153a` | 200 | OK |
| 3ª | `pacientes` | `454711da-1d81-4994-a56d-ee61007f7046` | 200 | OK |

**Campos preenchidos nos três registros:**

| Campo | Valor |
|---|---|
| `deleted_at` | `2026-08-02T21:34:20.541Z` (UTC, mesmo valor nos três) |
| `deleted_by` | UUID da conta `Administração` autenticada |
| `delete_reason` | `HOMOLOGACAO_PP2E_LIMPEZA_CONTROLADA` |

**Validação pós-limpeza:**

| Verificação | Resultado |
|---|---|
| Administração vê 3 registros com `deleted_at` preenchido | PASS |
| Gestão Hospitalar vê 0 linhas nas 3 tabelas | PASS |
| Views gerenciais respondem HTTP 200 | PASS |
| Classificação final | `sucesso_total` |

**Manifesto:** `C:\Users\Micro\AppData\Local\Temp\gsi_pp2e_cleanup_manifest.json`
**Timestamp de conclusão:** `2026-08-02T21:34:30.990Z`

---

## 5. Migration aplicada

| Atributo | Valor |
|---|---|
| Nome | `20260802000001_fix_soft_delete_visibility.sql` |
| Commit | `f43dbfbe54c905fe448a4539ea3557d459cc0c0b` |
| Mensagem | `security: enforce soft-delete visibility` |
| Data | 2026-08-02 |
| Ambientes | Local (via `db reset`) + `gsi-one-homologacao` (via `db push --linked`) |
| Rollback disponível | `supabase/rollback/20260802000001_fix_soft_delete_visibility_rollback.sql` |
| Produção | **não aplicada** |

**Histórico de migrations pós-ciclo:**

Todas as 35 migrations (`20260623100001` a `20260802000001`) estão sincronizadas entre local e `gsi-one-homologacao`.

---

## 6. Testes executados

### Testes de segurança locais (suíte completa)

```
Configuração : vitest.security.config.mjs (node, testTimeout 30000ms)
Ambiente     : Supabase local (Docker, 127.0.0.1:54321)
Resultado    : 394/394 PASS | 0 FAIL | 0 SKIP
```

Arquivo adicionado ao ciclo:

| Arquivo | Suítes | Cobertura |
|---|---|---|
| `tests/security/pp2f-soft-delete-visibility.test.js` | 8 | Definições das views, ausência de `deleted_at` nas colunas de saída, lógica das policies, supressão de células pequenas, presença da migration |

### Testes comportamentais remotos (PP2-D e PP2-G2)

Executados via scripts PowerShell 5.1 contra `gsi-one-homologacao` com autenticação por `email + senha` (anon key pública). Sem uso de `service_role`.

---

## 7. Estado final da fixture PP2-E

| Registro | Tabela | `deleted_at` | `delete_reason` | Visível para Gestão |
|---|---|---|---|---|
| `454711da-...` | `pacientes` | `2026-08-02T21:34:20.541Z` | `HOMOLOGACAO_PP2E_LIMPEZA_CONTROLADA` | Não |
| `f19913ed-...` | `atendimentos` | `2026-08-02T21:34:20.541Z` | `HOMOLOGACAO_PP2E_LIMPEZA_CONTROLADA` | Não |
| `272314c1-...` | `consultas` | `2026-08-02T21:34:20.541Z` | `HOMOLOGACAO_PP2E_LIMPEZA_CONTROLADA` | Não |

Os três registros permanecem **visíveis para Administração e Auditoria** (is_admin() / is_auditoria() = true), em conformidade com os requisitos de rastreabilidade e auditoria clínica. Nenhum DELETE físico foi executado — protegido por `trigger fn_block_assistential_physical_delete`.

---

## 8. Riscos residuais

| Risco | Classificação | Observação |
|---|---|---|
| PP2-F não aplicada em produção | **Sem impacto imediato** — produção não tem o módulo de exclusão lógica ativo | Aplicar antes de habilitar exclusão lógica em produção |
| Rollback não testado no remoto | Baixo | Rollback validado estruturalmente; é idempotente (`CREATE OR REPLACE` + `DROP/CREATE`) |
| Usuários de teste em `gsi-one-homologacao` | Baixo | Existem somente em homologação; não afetam produção |
| Config `[auth.email] enable_signup = true` | Aceito | Necessário para testes; `[auth] enable_signup = false` bloqueia cadastro público |

---

## 9. Itens fora do escopo deste ciclo

- Aplicação da PP2-F em produção (requer janela de manutenção e autorização separada)
- Cleanup dos usuários de teste fictícios de homologação (PP2-E3 encerrou somente os três registros clínicos da fixture)
- Alterações nas outras 19 tabelas com `deleted_at` além de `pacientes`, `atendimentos` e `consultas` (não possuem policies equivalentes ainda)
- Gráficos ou dashboards de indicadores (fora do escopo de banco)
- Autenticação real e fluxos de produção

---

## 10. Hashes relevantes

| Objeto | Hash / Identificador |
|---|---|
| Commit PP2-F | `f43dbfbe54c905fe448a4539ea3557d459cc0c0b` |
| Migration | `20260802000001_fix_soft_delete_visibility.sql` |
| Timestamp exclusão lógica fixture | `2026-08-02T21:34:20.541Z` UTC |
| Timestamp conclusão manifesto | `2026-08-02T21:34:30.990Z` UTC |

---

## 11. Declaração de não alteração da produção

Nenhum comando remoto foi executado contra o ambiente de produção em nenhuma etapa deste ciclo. Todos os `db push`, `db query --linked` e operações REST foram direcionados exclusivamente ao projeto `gsi-one-homologacao` (`project_ref: vwvevfdjrufdnjaidkxq`). O segundo projeto da organização (`project_ref: xpddlymmzoszmjdauucn`) permaneceu com `linked: false` durante toda a execução e não recebeu nenhuma operação.

---

## 12. Conclusão

O ciclo PP2-D a PP2-E3 cumpriu integralmente seus objetivos:

1. **PP2-D:** permissões gerenciais e views confirmadas funcionais antes da correção.
2. **PP2-E2:** isolamento clínico confirmado — gestão sem acesso a dados nominais individuais.
3. **PP2-F:** defect de visibilidade de exclusão lógica corrigido localmente e validado com 394/394 testes.
4. **PP2-G1:** migration aplicada com sucesso em homologação, sem divergências, sem seeds, sem roles adicionais.
5. **PP2-G2:** todos os comportamentos validados no ambiente remoto — sem regressões.
6. **PP2-E3:** fixture PP2-E encerrada com exclusão lógica controlada, confirmada auditável por Administração e invisível para perfis operacionais.

O ambiente de homologação `gsi-one-homologacao` está com 35 migrations sincronizadas, RLS operacional e correto, e as três views gerenciais servindo dados agregados sem exposição de dados nominais.

---

*Documento gerado em 2026-08-02. Padrão GHAES — Global Health AI Engineering Standard.*
*Produção não foi alterada.*
