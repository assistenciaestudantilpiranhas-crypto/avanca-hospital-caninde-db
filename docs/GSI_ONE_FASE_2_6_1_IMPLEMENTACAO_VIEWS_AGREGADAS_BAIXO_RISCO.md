# GSI ONE - Fase 2.6.1: Implementação Concluída — Views Agregadas de Baixo Risco

**Fase:** 2.6.1 - Implementação e validação em homologação das views gerenciais de baixo risco
**Data:** 2026-07-28
**Data da aplicação remota:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto validado:** gsi-one-homologacao (`project ref` mascarado)
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Concluída documentalmente após aplicação remota autorizada e validação em homologação

---

## 1. Contexto

Esta fase implementa e valida em homologação as três primeiras views gerenciais, conforme a ordem de risco crescente definida na Fase 2.6 (especificação).

As permissões gerenciais (`gestao.*` e `leitura.*`) existem desde a Fase 2.5, mas não concediam acesso efetivo sem views e controles correspondentes. Esta fase cria as views de menor risco e estabelece o padrão técnico que será seguido nas demais.

Após autorização expressa, a migration foi aplicada no projeto remoto de homologação `gsi-one-homologacao`, com `project ref` mantido mascarado nesta documentação para evitar exposição desnecessária de identificador operacional.


---

## 2. Arquivos criados

| Arquivo | Tipo | Propósito |
| --- | --- | --- |
| `supabase/migrations/20260728000002_create_low_risk_management_views.sql` | Migration | Cria as 3 views e configura GRANTs |
| `supabase/rollback/20260728000002_create_low_risk_management_views_rollback.sql` | Rollback | Remove as 3 views e GRANTs criados |
| `tests/security/management-views-low-risk.test.js` | Testes | 8 suítes, validação via banco local |
| `docs/GSI_ONE_FASE_2_6_1_IMPLEMENTACAO_VIEWS_AGREGADAS_BAIXO_RISCO.md` | Documentação | Este arquivo |

---

## 3. Views implementadas

### 3.1 `public.vw_gestao_indicadores_gerais`

| Atributo | Valor |
| --- | --- |
| **Permissões** | `gestao.indicadores.visualizar` OU `leitura.indicadores.visualizar` |
| **Granularidade** | Semanal (`date_trunc('week', hora_chegada_ts)`) |
| **Fonte** | `atendimentos`, `dom_desfechos` |
| **Supressão** | `HAVING count(*) >= 5` — semanas com < 5 atendimentos são omitidas |
| **Dados proibidos** | Nenhum campo nominal, UUID de paciente ou atendimento individual |

**Colunas:**

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `semana_inicio` | date | Início da semana (segunda-feira) |
| `total_atendimentos` | bigint | Total de atendimentos na semana |
| `total_altas` | bigint | Alta + Alta da observação + Medicação e alta |
| `total_transferencias` | bigint | Transferências reguladas |
| `total_obitos` | bigint | Óbitos registrados |
| `total_evasoes` | bigint | Evasões e desistências |
| `total_com_desfecho` | bigint | Atendimentos com desfecho registrado |
| `pct_com_desfecho` | numeric(5,1) | % de atendimentos com desfecho |

---

### 3.2 `public.vw_gestao_producao_assistencial`

| Atributo | Valor |
| --- | --- |
| **Permissões** | `gestao.producao.visualizar` OU `gestao.relatorios.visualizar` OU `leitura.relatorios.visualizar` |
| **Granularidade** | Semanal por setor (`setor_atual`) |
| **Fonte** | `atendimentos`, `dom_desfechos` |
| **Supressão** | `CASE WHEN count(*) < 5 THEN NULL` por coluna + coluna booleana `suprimido` |
| **Dados proibidos** | Nenhum campo nominal, UUID de paciente ou atendimento |

**Colunas:**

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `semana_inicio` | date | Início da semana |
| `setor` | text | Setor (`setor_atual` ou 'Não informado') |
| `suprimido` | boolean | `true` quando o volume do setor/semana é < 5 |
| `quantidade_atendimentos` | bigint ou NULL | NULL se suprimido |
| `quantidade_altas` | bigint ou NULL | NULL se suprimido |
| `quantidade_transferencias` | bigint ou NULL | NULL se suprimido |
| `quantidade_obitos` | bigint ou NULL | NULL se suprimido |
| `quantidade_evasoes` | bigint ou NULL | NULL se suprimido |
| `quantidade_com_desfecho` | bigint ou NULL | NULL se suprimido |

---

### 3.3 `public.vw_gestao_tempos_assistenciais`

| Atributo | Valor |
| --- | --- |
| **Permissões** | `gestao.tempos.visualizar` OU `leitura.paineis.visualizar` |
| **Granularidade** | Semanal |
| **Fonte** | `atendimentos`, `triagens` (pré-agregada por MIN), `consultas` (pré-agregada por MIN) |
| **Supressão** | `CASE WHEN n_calculado < 5 THEN NULL` por coluna de tempo |
| **Dados proibidos** | Nenhum campo nominal, UUID individual |

**Intervalos calculados:**

| Intervalo | Cálculo | Condição de validade |
| --- | --- | --- |
| Entrada → triagem | `triagens.hora_inicio_ts - atendimentos.hora_chegada_ts` | `hora_inicio_ts > hora_chegada_ts` |
| Triagem → consulta | `consultas.hora_inicio_ts - triagens.hora_fim_ts` | Ambos presentes e positivo |
| Permanência total | `atendimentos.hora_desfecho_ts - atendimentos.hora_chegada_ts` | `hora_desfecho_ts > hora_chegada_ts` |

**Colunas:**

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `semana_inicio` | date | Início da semana |
| `quantidade_registros_base` | bigint | Total de atendimentos na semana |
| `n_calculado_entrada_triagem` | bigint | Registros com intervalo válido entrada→triagem |
| `tempo_medio_entrada_triagem_min` | numeric(10,1) ou NULL | NULL se n < 5 |
| `tempo_mediano_entrada_triagem_min` | numeric(10,1) ou NULL | NULL se n < 5 |
| `n_calculado_triagem_consulta` | bigint | Registros com intervalo válido triagem→consulta |
| `tempo_medio_triagem_consulta_min` | numeric(10,1) ou NULL | NULL se n < 5 |
| `tempo_mediano_triagem_consulta_min` | numeric(10,1) ou NULL | NULL se n < 5 |
| `n_calculado_permanencia` | bigint | Registros com permanência válida |
| `tempo_medio_permanencia_total_min` | numeric(10,1) ou NULL | NULL se n < 5 |
| `tempo_mediano_permanencia_total_min` | numeric(10,1) ou NULL | NULL se n < 5 |

---

## 4. Decisão de arquitetura: SECURITY DEFINER obrigatório

### 4.1 Limitação de SECURITY INVOKER

Em PostgreSQL, `SECURITY INVOKER` (opção `security_invoker = true` na view) faz a view executar com os privilégios do usuário autenticado que a consulta.

Os perfis gerenciais (`Gestão Hospitalar`, `Leitura/Gestor`) **não possuem** `atendimento.visualizar`. A policy `atendimentos_select_operacional` (Fase B1, migration `20260722100031`) bloqueia qualquer `SELECT` em `atendimentos` para usuários sem essa permissão:

```sql
create policy atendimentos_select_operacional on public.atendimentos
  for select to authenticated
  using (
    public.has_permission('atendimento.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

Com `security_invoker = true`, as views retornariam sempre zero linhas para usuários gerenciais. A view passaria pela RLS do usuário antes de agregar — e a RLS bloquearia a leitura de cada linha individual.

### 4.2 Solução adotada: SECURITY DEFINER com controle inline

As views usam o comportamento padrão do PostgreSQL (SECURITY DEFINER): executam com os privilégios do owner (`postgres`), que pode ler `atendimentos` sem restrição de RLS.

O controle de acesso é implementado diretamente no `WHERE` de cada view:

```sql
where
  public.has_permission('gestao.indicadores.visualizar')
  or public.has_permission('leitura.indicadores.visualizar')
```

A função `has_permission()` verifica `auth.uid()` internamente. Para usuário `anon` (não autenticado) ou usuário sem a permissão correta, a expressão retorna `false` e a view retorna zero linhas — sem erro, sem dado.

### 4.3 Equivalência de segurança

Este padrão é equivalente a uma policy de RLS inline na view:

| Propriedade | Policy de RLS | WHERE inline (esta implementação) |
| --- | --- | --- |
| Quem controla o acesso | `pg_policies` | `WHERE has_permission()` na view |
| Comportamento para não autorizado | Retorna `[]` | Retorna `[]` |
| Dados individuais expostos | Nenhum (dependendo da query) | Nenhum (view retorna apenas agregados) |
| Auditável | Sim (pg_policies) | Sim (definição da view em pg_views) |

A diferença é que RLS protege a tabela; o `WHERE` inline protege a view. Como a view só retorna agregados (nunca linhas individuais), o risco residual é baixo e mitigado na arquitetura atual.

### 4.4 Justificativa formal registrada

> "As views gerenciais da Fase 2.6.1 usam SECURITY DEFINER porque os perfis gerenciais não possuem `atendimento.visualizar` e seriam bloqueados pelo RLS da tabela `atendimentos` em modo SECURITY INVOKER. O controle de acesso é implementado via `has_permission()` no WHERE de cada view, garantindo que apenas usuários com a permissão correta recebam dados. Nenhuma linha individual é exposta — apenas agregados. Esta decisão é documentada formalmente e está sujeita a revisão caso o modelo de permissões evolua."

---

## 5. Controle de acesso: GRANTs

| Objeto | Grantee | Privilégio | Ação |
| --- | --- | --- | --- |
| `vw_gestao_indicadores_gerais` | `authenticated` | `SELECT` | `GRANT` |
| `vw_gestao_producao_assistencial` | `authenticated` | `SELECT` | `GRANT` |
| `vw_gestao_tempos_assistenciais` | `authenticated` | `SELECT` | `GRANT` |
| `vw_gestao_indicadores_gerais` | `anon` | `SELECT` | `REVOKE` explícito |
| `vw_gestao_producao_assistencial` | `anon` | `SELECT` | `REVOKE` explícito |
| `vw_gestao_tempos_assistenciais` | `anon` | `SELECT` | `REVOKE` explícito |

Validação remota final em homologação:

| View | Owner | `authenticated` | `anon` | `PUBLIC` |
| --- | --- | --- | --- | --- |
| `vw_gestao_indicadores_gerais` | `postgres` | `SELECT` | Sem privilégios | Sem privilégios |
| `vw_gestao_producao_assistencial` | `postgres` | `SELECT` | Sem privilégios | Sem privilégios |
| `vw_gestao_tempos_assistenciais` | `postgres` | `SELECT` | Sem privilégios | Sem privilégios |

Consulta consolidada de privilégios retornou exatamente:

| table_name | grantee | privilege_type |
| --- | --- | --- |
| `vw_gestao_indicadores_gerais` | `authenticated` | `SELECT` |
| `vw_gestao_producao_assistencial` | `authenticated` | `SELECT` |
| `vw_gestao_tempos_assistenciais` | `authenticated` | `SELECT` |

---

## 6. Impacto em objetos de banco

| Tabela/Objeto | Alteração |
| --- | --- |
| `atendimentos` | Nenhuma |
| `consultas` | Nenhuma |
| `triagens` | Nenhuma |
| `dom_desfechos` | Nenhuma |
| `pacientes` | Nenhuma |
| `permissoes` | Nenhuma |
| `perfis_acesso` | Nenhuma |
| `perfil_permissao` | Nenhuma |
| `pg_policies` (pacientes) | Inalterada |
| `pg_policies` (atendimentos) | Inalterada |
| `pg_policies` (consultas) | Inalterada |

Não houve grants novos em tabelas clínicas. Não houve alteração em policies clínicas. Não houve alteração em dados clínicos.


---

## 7. Supressão de célula pequena — estratégia adotada

| View | Limiar | Estratégia | Representação do suprimido |
| --- | --- | --- | --- |
| `vw_gestao_indicadores_gerais` | n < 5 (por semana) | `HAVING count(*) >= 5` — linha omitida | Linha ausente |
| `vw_gestao_producao_assistencial` | n < 5 (por setor/semana) | `CASE WHEN count(*) < 5 THEN NULL` + coluna `suprimido` | `suprimido = true`, métricas = NULL |
| `vw_gestao_tempos_assistenciais` | n < 5 (por intervalo calculado) | `CASE WHEN n_calculado < 5 THEN NULL` por coluna | Coluna de tempo = NULL, coluna `n_calculado` visível |

**Justificativa da variação de estratégia:**
- Na view de indicadores gerais, semanas com < 5 atendimentos são quase sempre períodos incompletos (início de produção, manutenção) — omiti-las é mais claro do que expor uma linha com métricas parcialmente suprimidas.
- Na view de produção e na de tempos, o setor ou a métrica específica pode ter baixo volume mesmo quando o hospital está em operação normal — o `NULL` com sinalização `suprimido` ou `n_calculado` permite ao gestor entender que há dados, mas não suficientes para exibição segura.

---

## 8. Validação executada

### 8.1 Aplicar a migration localmente

```bash
docker exec -i supabase_db_avanca-hospital-caninde-db psql -U postgres -d postgres \
  < supabase/migrations/20260728000002_create_low_risk_management_views.sql
```

### 8.2 Executar os testes da fase

```bash
npx.cmd vitest run --config vitest.security.config.mjs tests/security/management-views-low-risk.test.js
```

### 8.3 Executar a suíte de segurança completa (verificar ausência de regressão)

```bash
npx.cmd vitest run --config vitest.security.config.mjs
```

Resultado registrado: testes isolados da fase aprovados. A suíte de segurança apresentou falha ambiental pré-existente de coleta em `phase-a-select-access.test.js`; não foi atribuída regressão à Fase 2.6.1.

### 8.4 Executar a suíte padrão (verificar ausência de regressão)

```bash
npx.cmd vitest run
```

Resultado registrado: suíte padrão aprovada.

### 8.5 Testar o rollback

```bash
docker exec -i supabase_db_avanca-hospital-caninde-db psql -U postgres -d postgres \
  < supabase/rollback/20260728000002_create_low_risk_management_views_rollback.sql
```

### 8.6 Reaplicar a migration após rollback

```bash
docker exec -i supabase_db_avanca-hospital-caninde-db psql -U postgres -d postgres \
  < supabase/migrations/20260728000002_create_low_risk_management_views.sql
```

### 8.7 Confirmar ausência de dados nominais via SQL

```sql
-- Confirma colunas das views (nenhuma deve conter campo nominal)
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'vw_gestao_indicadores_gerais',
    'vw_gestao_producao_assistencial',
    'vw_gestao_tempos_assistenciais'
  )
order by table_name, ordinal_position;
```

### 8.8 Confirmar GRANTs

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'vw_gestao_indicadores_gerais',
    'vw_gestao_producao_assistencial',
    'vw_gestao_tempos_assistenciais'
  )
order by table_name, grantee;
```

### 8.9 Confirmar políticas clínicas inalteradas

```sql
select policyname, tablename, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('pacientes', 'atendimentos', 'consultas')
order by tablename, policyname;
```

### 8.10 Aplicação e validação remota em homologação

Aplicação remota autorizada e executada no projeto `gsi-one-homologacao` (`project ref` mascarado).

| Item | Resultado |
| --- | --- |
| Migration aplicada | `20260728000002_create_low_risk_management_views.sql` |
| Migration list local | 34 migrations |
| Migration list remota | 34 migrations |
| Views existentes em `public` | `vw_gestao_indicadores_gerais`, `vw_gestao_producao_assistencial`, `vw_gestao_tempos_assistenciais` |
| Owner das views | `postgres` nas três views |
| Grants finais | `authenticated` somente `SELECT`; `anon` sem privilégios; `PUBLIC` sem privilégios |
| Grants novos em tabelas clínicas | Nenhum |
| Policies clínicas alteradas | Nenhuma |
| Usuários fictícios criados | Nenhum |
| Dados clínicos alterados | Nenhum |

---

## 9. Testes não cobertos nesta fase (requerem usuários fictícios)

Os testes de acesso autenticado via PostgREST (itens 12-15 do plano de testes da Fase 2.6) dependem da criação de usuários fictícios com JWT válido. Esses testes serão implementados na Fase 2.6.2 (criação de usuários fictícios e testes autenticados), no arquivo `tests/security/management-views-auth.test.js`.

| Teste pendente | Motivo |
| --- | --- |
| Gestão Hospitalar com permissão acessa view via PostgREST | Requer usuário fictício com JWT |
| Leitura/Gestor acessa apenas as views permitidas | Requer usuário fictício com JWT |
| Usuário autenticado sem permissão gerencial recebe `[]` | Requer usuário fictício sem perfil gerencial |
| `anon` recebe bloqueio via PostgREST | Pode ser testado via HTTP sem autenticação |

---

## 10. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- |
| View com múltiplos JOINs sem pré-agregação causando contagem incorreta | Médio | Alto | Subqueries com `MIN()` por `atendimento_id` em `triagens` e `consultas` |
| `has_permission()` retornar `true` para usuário `anon` por bug em `auth.uid()` | Muito baixo | Alto | `REVOKE` explícito de `SELECT` para `anon`; `has_permission()` já valida `u.ativo = true` via JOIN com `usuarios` |
| `setor_atual` nulo gerando agrupamento inesperado | Baixo | Baixo | `coalesce(setor_atual, 'Não informado')` no GROUP BY |
| `percentile_cont` em ambiente sem dados suficientes retornar NULL | Baixo | Nenhum | NULL é o comportamento correto e esperado |

---

## 11. Decisões pendentes para fases seguintes

| Ref. | Decisão |
| --- | --- |
| DP-01 | Criação controlada de usuários fictícios e testes autenticados em homologação (Fase 2.6.2) |
| DP-02 | Implementação das views de ocupação e fluxos (risco médio — Fase 2.6.3) |
| DP-03 | Implementação da view de usuários/perfis (requer aprovação específica) |
| DP-04 | Implementação da view de auditoria agregada (requer aprovação específica) |
| DP-05 | Mecanismo de exportação via `gestao.exportar_agregado` (Fase 2.6.X) |
| DP-06 | Views `vw_leitura_indicadores`, `vw_leitura_relatorios`, `vw_leitura_paineis` (Fase 2.6.4) |

---

## 12. Conclusão formal da Fase 2.6.1

A Fase 2.6.1 está formalmente concluída após aplicação remota autorizada e validação em homologação.

Escopo confirmado:

- migration `20260728000002_create_low_risk_management_views.sql` aplicada em homologação;
- 34 migrations locais e 34 migrations remotas;
- três views agregadas existentes no schema `public`;
- owner `postgres` nas três views;
- grants finais restritos a `authenticated` com `SELECT`;
- `anon` e `PUBLIC` sem privilégios nas views;
- nenhum grant novo em tabelas clínicas;
- nenhuma policy clínica alterada;
- nenhum usuário fictício criado;
- nenhum dado clínico alterado;
- nenhuma alteração de frontend;
- nenhuma alteração em tabelas clínicas.

O risco da fase permanece classificado como baixo e mitigado na arquitetura atual, considerando agregação, supressão de baixo volume, ausência de campos nominais e grants restritos.

Próxima etapa: Fase 2.6.2 — criação controlada de usuários fictícios e testes autenticados em homologação.

Ponto de parada: nenhum usuário deve ser criado sem plano, credenciais fictícias controladas, matriz de perfis e autorização expressa.

---

## 13. Referências

- `docs/GSI_ONE_FASE_2_6_ESPECIFICACAO_VIEWS_GERENCIAIS.md`
- `docs/GSI_ONE_FASE_2_6_MATRIZ_DADOS_AGREGADOS_E_ANONIMIZADOS.md`
- `docs/GSI_ONE_FASE_2_6_PLANO_TESTES_VIEWS_E_POLICIES.md`
- `docs/GSI_ONE_FASE_2_5_IMPLEMENTACAO_PERMISSOES_GERENCIAIS.md`
- `supabase/migrations/20260728000002_create_low_risk_management_views.sql`
- `supabase/rollback/20260728000002_create_low_risk_management_views_rollback.sql`
- `tests/security/management-views-low-risk.test.js`
- `supabase/migrations/20260722100031_rls_phase_b1_read_permissions.sql`
