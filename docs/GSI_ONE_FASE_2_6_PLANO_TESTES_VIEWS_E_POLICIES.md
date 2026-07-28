# GSI ONE - Fase 2.6: Plano de Testes — Views e Policies Gerenciais

**Fase:** 2.6 - Especificação de views e acesso gerencial
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Plano de testes — sem arquivo de teste criado, sem migration, sem views, sem policies

---

## 1. Objetivo

Este documento define os casos de teste obrigatórios para validação das views e policies gerenciais a serem criadas na Fase 2.6.

Os testes descritos aqui serão implementados em arquivos `.test.js` sob `tests/security/` seguindo o padrão já estabelecido no projeto (configuração `vitest.security.config.mjs`, helpers `local-supabase.js`).

Nenhum arquivo de teste é criado por este documento.

---

## 2. Arquivo de teste planejado

| Arquivo | Quando criar |
| --- | --- |
| `tests/security/gestao-views.test.js` | Após criação das views e policies, antes da aplicação remota |

---

## 3. Pré-condições de todos os testes

- Banco local ativo (`supabase_db_avanca-hospital-caninde-db`).
- Migration `20260728000001_create_gestao_permissions.sql` aplicada.
- Migration de views e policies da Fase 2.6 aplicada.
- Seed de dados fictícios presente em todas as tabelas de origem, com volume suficiente para validar supressão de célula pequena (mínimo 20 registros por setor).
- Usuários fictícios criados nos perfis `Gestão Hospitalar` e `Leitura/Gestor`.
- Usuário fictício sem permissão gerencial (ex.: perfil `Farmácia`) para testes negativos.

---

## 4. Grupos de teste

---

### GRUPO A — Acesso permitido: Gestão Hospitalar

**Objetivo:** confirmar que o perfil Gestão Hospitalar acessa exatamente as views para as quais tem permissão e obtém dados agregados corretos.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| A-01 | Gestão Hospitalar acessa `vw_gestao_indicadores` | HTTP 200, `data.length > 0` |
| A-02 | Gestão Hospitalar acessa `vw_gestao_producao` | HTTP 200, `data.length > 0` |
| A-03 | Gestão Hospitalar acessa `vw_gestao_tempos` | HTTP 200, `data.length > 0` |
| A-04 | Gestão Hospitalar acessa `vw_gestao_ocupacao` | HTTP 200, `data.length > 0` |
| A-05 | Gestão Hospitalar acessa `vw_gestao_fluxos` | HTTP 200, `data.length > 0` |
| A-06 | Gestão Hospitalar acessa `vw_gestao_setores` | HTTP 200, `data.length > 0` |
| A-07 | Gestão Hospitalar acessa `vw_gestao_usuarios` | HTTP 200, `data.length > 0` |
| A-08 | Gestão Hospitalar acessa `vw_gestao_auditoria_agregada` | HTTP 200, `data.length > 0` |

---

### GRUPO B — Acesso permitido: Leitura/Gestor

**Objetivo:** confirmar que o perfil Leitura/Gestor acessa exatamente as views para as quais tem permissão.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| B-01 | Leitura/Gestor acessa `vw_leitura_indicadores` | HTTP 200, `data.length > 0` |
| B-02 | Leitura/Gestor acessa `vw_leitura_relatorios` | HTTP 200, `data.length > 0` |
| B-03 | Leitura/Gestor acessa `vw_leitura_paineis` | HTTP 200, `data.length > 0` |

---

### GRUPO C — Negação de acesso cruzado entre perfis gerenciais

**Objetivo:** confirmar que Gestão Hospitalar não acessa views de Leitura/Gestor como substituto, e vice-versa.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| C-01 | Leitura/Gestor tenta acessar `vw_gestao_indicadores` | HTTP 200 com `data = []` (RLS bloqueia silenciosamente) |
| C-02 | Leitura/Gestor tenta acessar `vw_gestao_producao` | HTTP 200 com `data = []` |
| C-03 | Leitura/Gestor tenta acessar `vw_gestao_usuarios` | HTTP 200 com `data = []` |
| C-04 | Leitura/Gestor tenta acessar `vw_gestao_auditoria_agregada` | HTTP 200 com `data = []` |
| C-05 | Gestão Hospitalar tenta acessar `vw_leitura_paineis` | HTTP 200 com `data = []` (views distintas, policies distintas) |

> **Nota RLS/PostgREST:** RLS bloqueando SELECT retorna HTTP 200 com body `[]`. HTTP 403 ocorre apenas se o GRANT SELECT estiver ausente.

---

### GRUPO D — Negação para perfis operacionais sem permissão gerencial

**Objetivo:** confirmar que perfis clínicos e operacionais não acessam as views gerenciais.

| ID | Caso de teste | Perfil testado | Critério de aprovação |
| --- | --- | --- | --- |
| D-01 | Recepção tenta acessar `vw_gestao_indicadores` | Recepção | `data = []` |
| D-02 | Técnico em Enfermagem tenta acessar `vw_gestao_producao` | Técnico em Enfermagem | `data = []` |
| D-03 | Médico tenta acessar `vw_gestao_usuarios` | Médico | `data = []` |
| D-04 | Farmácia tenta acessar `vw_gestao_auditoria_agregada` | Farmácia | `data = []` |
| D-05 | Auditoria tenta acessar `vw_gestao_indicadores` | Auditoria | `data = []` |
| D-06 | Usuário sem perfil ativo tenta acessar qualquer view gerencial | (sem perfil) | `data = []` |

---

### GRUPO E — Ausência de dados clínicos individuais

**Objetivo:** confirmar que nenhuma das views gerenciais retorna campos de identificação individual ou dados clínicos.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| E-01 | `vw_gestao_indicadores` não contém campo `nome` | Nenhuma coluna com nome `nome`, `paciente`, `cpf`, `cns` |
| E-02 | `vw_gestao_producao` não contém UUID de paciente | Nenhuma coluna `paciente_id` ou UUID de atendimento individual |
| E-03 | `vw_gestao_tempos` não contém identificador nominal | Nenhuma coluna nominal; apenas métricas agregadas |
| E-04 | `vw_gestao_ocupacao` não contém nome do ocupante | Sem `nome`, `cpf` ou `paciente_id` |
| E-05 | `vw_gestao_fluxos` retorna apenas contagens por status | Todas as colunas são métricas ou dimensões de agrupamento |
| E-06 | `vw_gestao_usuarios` não contém `email` | Campo `email` ausente da view; CPF ausente |
| E-07 | `vw_gestao_auditoria_agregada` não contém `dados_antes` ou `dados_depois` | Campos `dados_antes`, `dados_depois`, `registro_id`, `usuario_id` ausentes |
| E-08 | `vw_leitura_indicadores` não contém nenhum campo nominal | Apenas campos agregados |
| E-09 | `vw_leitura_relatorios` não contém campos de paciente | Sem `nome`, `cpf`, `paciente_id` |
| E-10 | `vw_leitura_paineis` retorna apenas totais e taxas | Sem campos individuais |

---

### GRUPO F — Ausência de identificadores diretos nos dados retornados

**Objetivo:** confirmar que os valores retornados pelas views não contêm UUIDs de pacientes ou registros clínicos.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| F-01 | Nenhum valor de `vw_gestao_indicadores` corresponde a UUID de paciente conhecido | Cruzar UUID dos dados do seed com valores retornados: zero correspondências |
| F-02 | Nenhum valor de `vw_gestao_producao` corresponde a UUID de atendimento individual | Idem |
| F-03 | `vw_gestao_usuarios` não retorna UUID de `auth.users` | Campo `id` ausente ou opaco |
| F-04 | `vw_gestao_auditoria_agregada` não retorna `usuario_id` individual | Campo ausente ou substituído por `total_usuarios_distintos` |

---

### GRUPO G — Supressão de célula pequena

**Objetivo:** confirmar que o limiar mínimo de agregação (n < 5) é aplicado corretamente.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| G-01 | Setor com n=1 em `vw_gestao_ocupacao` retorna valor suprimido | Campo suprimido retorna `NULL` ou marcador `<5` |
| G-02 | Setor com n=3 em `vw_gestao_fluxos` retorna valor suprimido | Campo suprimido |
| G-03 | Setor com n=10 em `vw_gestao_tempos` retorna valor real | Campo não suprimido; valor calculado correto |
| G-04 | Célula com n=4 em `vw_leitura_relatorios` retorna suprimida | Campo suprimido |
| G-05 | Após supressão, o total geral ainda é calculado corretamente | Soma das células não suprimidas bate com total esperado |

---

### GRUPO H — Exportação agregada

**Objetivo:** confirmar que a exportação funciona somente para Gestão Hospitalar com `gestao.exportar_agregado` e gera registro auditável.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| H-01 | Gestão Hospitalar com `gestao.exportar_agregado` consegue exportar `vw_gestao_indicadores` | Exportação retorna dados; registro em `audit_log` criado |
| H-02 | Gestão Hospitalar sem `gestao.exportar_agregado` não consegue exportar | Exportação negada ou inexistente para o usuário |
| H-03 | Leitura/Gestor não consegue exportar nenhuma view | Exportação negada |
| H-04 | Exportação de `vw_gestao_indicadores` não inclui dados nominais | Arquivo exportado não contém `nome`, `cpf`, `cns` |
| H-05 | Registro de auditoria de exportação contém `usuario_id`, `data_hora`, `view_exportada`, `filtros` | Campos obrigatórios presentes no registro de auditoria |

---

### GRUPO I — Auditoria da consulta e exportação

**Objetivo:** confirmar que eventos de exportação e consultas sensíveis são registrados em `audit_log`.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| I-01 | Exportação via `gestao.exportar_agregado` gera entrada em `audit_log` | Linha inserida com `acao = 'gestao_exportacao'` |
| I-02 | Consulta a `vw_gestao_usuarios` gera registro de auditoria | Linha inserida com `tabela_afetada = 'vw_gestao_usuarios'` |
| I-03 | Consulta a `vw_gestao_auditoria_agregada` gera registro | Linha inserida |
| I-04 | Consulta a `vw_gestao_indicadores` (sem exportação) NÃO gera registro de auditoria | `audit_log` sem linha para esta consulta (custo de auditoria proporcional ao risco) |

---

### GRUPO J — RLS nas tabelas de origem

**Objetivo:** confirmar que as policies existentes nas tabelas clínicas não foram alteradas pela criação das views gerenciais.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| J-01 | `pacientes_select_operacional` ainda existe com a expressão da Fase B1 | `pg_policies` confirma policy inalterada |
| J-02 | `atendimentos_select_operacional` ainda existe com a expressão da Fase B1 | Idem |
| J-03 | `consultas_select_clinico` ainda existe com a expressão da Fase B1 | Idem |
| J-04 | Gestão Hospitalar ainda não acessa `pacientes` diretamente | SELECT direto em `pacientes` retorna `[]` |
| J-05 | Gestão Hospitalar ainda não acessa `consultas` diretamente | SELECT direto em `consultas` retorna `[]` |
| J-06 | Leitura/Gestor ainda não acessa `atendimentos` diretamente | SELECT direto em `atendimentos` retorna `[]` |
| J-07 | Total de policies em `pg_policies` não diminuiu após a criação das views | `COUNT(*) >= valor_antes_da_fase_2_6` |

---

### GRUPO K — `security_invoker` e propagação de RLS

**Objetivo:** confirmar que as views com `SECURITY INVOKER` propagam corretamente as restrições de RLS do usuário autenticado.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| K-01 | View `vw_gestao_indicadores` definida com `security_invoker = true` | `pg_views` ou `information_schema.views` confirma a opção |
| K-02 | Usuário sem permissão, ao acessar a view, recebe `[]` (RLS aplicado via INVOKER) | `data = []` |
| K-03 | Remoção temporária de permissão de usuário de Gestão Hospitalar bloqueia o acesso à view | `data = []` após remoção; `data.length > 0` após restauração |

---

### GRUPO L — Testes de regressão

**Objetivo:** confirmar que a criação das views e policies gerenciais não introduziu regressões nos perfis operacionais existentes.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| L-01 | Médico ainda acessa `consultas` normalmente | `data.length > 0` após fase 2.6 |
| L-02 | Técnico em Enfermagem ainda acessa `atendimentos` normalmente | `data.length > 0` |
| L-03 | Recepção ainda acessa `pacientes` normalmente | `data.length > 0` |
| L-04 | Auditoria ainda acessa `audit_log` normalmente | `data.length > 0` |
| L-05 | `npx.cmd vitest run` (suíte padrão) continua 100% aprovada | 228/228 ou mais, 0 falhos |
| L-06 | `npx.cmd vitest run --config vitest.security.config.mjs` continua aprovada para `gestao-permissions.test.js` | 34/34 aprovados |

---

### GRUPO M — Testes negativos de campos proibidos via SQL direto

**Objetivo:** confirmar via consulta SQL direta que os campos proibidos estão ausentes das views.

Estes testes consultam `information_schema.columns` para listar as colunas de cada view e verificar ausência dos campos proibidos.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| M-01 | `vw_gestao_indicadores` não tem coluna `nome`, `cpf`, `cns`, `paciente_id`, `queixa_principal` | `information_schema.columns` não lista esses campos |
| M-02 | `vw_gestao_producao` não tem coluna `nome`, `cpf`, `hipotese_diagnostica`, `conduta` | Idem |
| M-03 | `vw_gestao_tempos` não tem coluna nominal de paciente | Idem |
| M-04 | `vw_gestao_usuarios` não tem coluna `email`, `cpf` (de usuarios), coluna de `auth.users` | Idem |
| M-05 | `vw_gestao_auditoria_agregada` não tem coluna `dados_antes`, `dados_depois`, `usuario_id`, `registro_id` | Idem |
| M-06 | `vw_leitura_indicadores` não tem nenhum campo de paciente | Idem |

---

### GRUPO N — Rollback futuro

**Objetivo:** confirmar que o rollback das views e policies da Fase 2.6 restaura o estado anterior sem afetar as permissões da Fase 2.5.

| ID | Caso de teste | Critério de aprovação |
| --- | --- | --- |
| N-01 | Após rollback da Fase 2.6, as 13 permissões gerenciais da Fase 2.5 ainda existem | `SELECT COUNT(*) FROM permissoes WHERE chave LIKE 'gestao.%' OR chave LIKE 'leitura.%'` retorna 13 |
| N-02 | Após rollback, as views gerenciais não existem | `information_schema.views` não lista `vw_gestao_*` nem `vw_leitura_*` |
| N-03 | Após rollback, as policies gerenciais não existem | `pg_policies` não lista policies das views gerenciais |
| N-04 | Após rollback, as policies das Fases A e B1 continuam intactas | `pg_policies` confirma `pacientes_select_operacional`, `atendimentos_select_operacional`, `consultas_select_clinico` |
| N-05 | Após rollback, os perfis operacionais continuam com acesso inalterado | Médico, TEN, Recepção retornam dados normalmente |

---

### GRUPO O — Critérios formais para homologação

**Objetivo:** definir os critérios mínimos que devem ser atendidos antes da aplicação remota das views e policies.

| Critério | Condição obrigatória |
| --- | --- |
| OC-01 | Todos os casos do Grupo A aprovados (8/8) |
| OC-02 | Todos os casos do Grupo B aprovados (3/3) |
| OC-03 | Todos os casos do Grupo C aprovados (5/5) |
| OC-04 | Todos os casos do Grupo D aprovados (6/6) |
| OC-05 | Todos os casos do Grupo E aprovados (10/10) |
| OC-06 | Todos os casos do Grupo F aprovados (4/4) |
| OC-07 | Todos os casos do Grupo G aprovados (5/5) |
| OC-08 | Grupo H aprovado apenas se exportação for implementada; caso contrário, marcar como N/A com justificativa |
| OC-09 | Grupo I aprovado conforme escopo de auditoria implementado |
| OC-10 | Todos os casos do Grupo J aprovados (7/7) |
| OC-11 | Todos os casos do Grupo K aprovados (3/3) |
| OC-12 | Todos os casos do Grupo L aprovados (6/6) |
| OC-13 | Todos os casos do Grupo M aprovados (6/6) |
| OC-14 | Grupo N (rollback) testado e aprovado antes da aplicação remota |
| OC-15 | Suíte padrão (`vitest run`) sem regressões |
| OC-16 | Suíte de segurança (`vitest.security.config.mjs`) sem falhas novas |
| OC-17 | Documento de resultado de testes (`GSI_ONE_FASE_2_6_RESULTADO_TESTES.md`) produzido com evidências |

---

## 5. Pontos de parada formais

| Ponto | Condição para avançar |
| --- | --- |
| Antes da criação das views | Aprovação da especificação (`GSI_ONE_FASE_2_6_ESPECIFICACAO_VIEWS_GERENCIAIS.md`) e da matriz (`GSI_ONE_FASE_2_6_MATRIZ_DADOS_AGREGADOS_E_ANONIMIZADOS.md`) pelo responsável institucional |
| Antes da criação das policies | Views criadas e Grupos A-G testados e aprovados localmente |
| Antes de criar usuários fictícios | Views e policies criadas; seed de dados fictícios preparado |
| Antes de liberar exportação | Grupos H e I testados e aprovados; mecanismo de auditoria de exportação implementado |
| Antes da aplicação remota | Todos os critérios OC-01 a OC-16 atendidos |

---

## 6. Estrutura sugerida do arquivo de teste

O arquivo `tests/security/gestao-views.test.js` deve seguir o padrão de `tests/security/phase-a-select-access.test.js`:

- verificação de ambiente em collection time (`assertLocalOnlyStatus`);
- `beforeAll` para criação de usuários fictícios e seed;
- `afterAll` para remoção dos usuários criados;
- `cit()` para testes condicionais ao ambiente;
- helpers `queryLocalRows` e `execLocalRows` de `tests/helpers/local-supabase.js`;
- autenticação via PostgREST local (`http://127.0.0.1:54321`) com JWT dos usuários fictícios;
- separação por `describe` correspondente a cada grupo (A, B, C, ...).

---

## 7. Referências

- `docs/GSI_ONE_FASE_2_6_ESPECIFICACAO_VIEWS_GERENCIAIS.md`
- `docs/GSI_ONE_FASE_2_6_MATRIZ_DADOS_AGREGADOS_E_ANONIMIZADOS.md`
- `tests/security/phase-a-select-access.test.js` — padrão de teste autenticado
- `tests/security/gestao-permissions.test.js` — padrão de teste de permissões
- `tests/helpers/local-supabase.js` — helpers de banco local
- `vitest.security.config.mjs` — configuração de testes de segurança
- `supabase/migrations/20260722100031_rls_phase_b1_read_permissions.sql` — policies vigentes
