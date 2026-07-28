# GSI ONE - Fase 2.5: Implementação Local das Permissões Gerenciais

**Fase:** 2.5 - Implementação local das permissões gerenciais
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Implementação local concluída — sem aplicação remota, sem commit, sem push

---

## 1. Contexto

Este documento registra a implementação local das permissões gerenciais aprovadas nas Fases 2.3 e 2.4.

A Fase 2.5 criou os seguintes arquivos:

| Arquivo | Finalidade |
| --- | --- |
| `supabase/migrations/20260728000001_create_gestao_permissions.sql` | Migration principal |
| `supabase/rollback/20260728000001_create_gestao_permissions_rollback.sql` | Rollback correspondente |
| `tests/security/gestao-permissions.test.js` | Testes automatizados de segurança |

Estado confirmado no momento da implementação:

| Item | Estado |
| --- | --- |
| Ambiente | computador do trabalho |
| Branch | `main` limpa |
| Commit base | `a977e78 docs: approve and specify managerial permissions` |
| Projeto remoto | `gsi-one-homologacao` com 32 migrations aplicadas |
| Alteração remota | Nenhuma nesta fase |
| Usuários fictícios | Nenhum criado |

---

## 2. Migration criada

### 2.1 Arquivo

`supabase/migrations/20260728000001_create_gestao_permissions.sql`

### 2.2 Estrutura da migration

A migration está organizada em três partes dentro de um único bloco `DO $$` (transação atômica):

| Parte | Código | Descrição |
| --- | --- | --- |
| G0 | Validação de pré-condição | Localiza os dois perfis pelo nome; aborta com `RAISE EXCEPTION` se ausentes — nenhuma permissão ou vínculo é criado |
| G1b | Criação de permissões | Insere as 13 permissões gerenciais com `ON CONFLICT (chave) DO NOTHING` |
| G1c | Vínculo perfil → permissão | Vincula usando os IDs resolvidos em G0, sem ID hardcoded; `ON CONFLICT DO NOTHING` |

**Perfis:** a migration **não cria perfis**. Os perfis `Gestão Hospitalar` e `Leitura/Gestor` devem preexistir. A ausência de qualquer um dos dois aborta a migration antes de qualquer INSERT.

**Atomicidade:** todo o bloco executa dentro de uma transação implícita do PostgreSQL. Se G0 falhar, nenhuma permissão ou vínculo é criado. Não há estado parcial possível.

### 2.3 Permissões criadas

#### Gestão Hospitalar — 10 permissões

| Chave | Módulo | Dado nominal | Exportação |
| --- | --- | --- | --- |
| `gestao.indicadores.visualizar` | Gestão | Não | Não |
| `gestao.relatorios.visualizar` | Gestão | Não por padrão | Não |
| `gestao.producao.visualizar` | Gestão | Não | Não |
| `gestao.tempos.visualizar` | Gestão | Não por padrão | Não |
| `gestao.ocupacao.visualizar` | Gestão | Não por padrão | Não |
| `gestao.fluxos.visualizar` | Gestão | Não por padrão | Não |
| `gestao.setores.visualizar` | Gestão | Não | Não |
| `gestao.usuarios.visualizar` | Gestão | Não — apenas lista gerencial | Não |
| `gestao.auditoria_agregada.visualizar` | Gestão | Não — recorte agregado | Não |
| `gestao.exportar_agregado` | Gestão | Não por padrão | Sim — apenas dados agregados |

#### Leitura/Gestor — 3 permissões

| Chave | Módulo | Dado nominal | Exportação |
| --- | --- | --- | --- |
| `leitura.indicadores.visualizar` | Leitura | Não | Não |
| `leitura.relatorios.visualizar` | Leitura | Não por padrão | Não |
| `leitura.paineis.visualizar` | Leitura | Não | Não |

### 2.4 Permissões NÃO criadas nesta fase

| Permissão | Razão |
| --- | --- |
| `gestao.dados_nominais.visualizar` | Aprovação condicional — não automática; requer decisão individual por caso |
| `gestao.auditoria.visualizar` (integral) | Pendente de decisão sobre recorte |
| `gestao.configuracoes.editar` | Não aprovada |
| `gestao.exportar_nominal` | Não aprovada |
| Qualquer permissão clínica | Proibição explícita — sem exceção |

### 2.5 Propriedades da migration

| Propriedade | Valor |
| --- | --- |
| Cria perfis | **Não** — perfis devem preexistir; ausência aborta a migration |
| Idempotente | Sim — `ON CONFLICT DO NOTHING` em todas as inserções |
| IDs hardcoded | Não — IDs resolvidos dinamicamente em G0 e reutilizados em G1c |
| Falha controlada | Sim — G0 lança `RAISE EXCEPTION` antes de qualquer INSERT se perfil ausente |
| Atomicidade | Sim — único bloco `DO $$`, transação implícita do PostgreSQL |
| Altera RLS | Não |
| Altera policies | Não |
| Altera grants | Não |
| Altera usuários | Não |
| Altera migrations anteriores | Não |
| Altera permissões clínicas | Não |

---

## 3. Rollback criado

### 3.1 Arquivo

`supabase/rollback/20260728000001_create_gestao_permissions_rollback.sql`

### 3.2 Estrutura do rollback

| Parte | Código | Descrição |
| --- | --- | --- |
| R1b | Remoção de vínculos | `DELETE` em `perfil_permissao` para as 13 permissões gerenciais |
| R1a | Remoção de permissões | `DELETE` em `permissoes` para as 13 chaves gerenciais |
| R1c | Perfis | Não removidos automaticamente — comentário documenta remoção manual opcional |

### 3.3 Propriedades do rollback

| Propriedade | Valor |
| --- | --- |
| Remove somente o que foi criado | Sim |
| Remove perfis automaticamente | Não — perfis podem ter vínculos de usuário preexistentes |
| Toca em permissões clínicas | Não |
| Altera RLS, policies ou grants | Não |
| Seguro para reexecução | Sim — `DELETE WHERE chave IN (...)` é idempotente |

### 3.4 Validação pós-rollback

Após executar o rollback, verificar:

```sql
-- Deve retornar zero linhas
SELECT chave FROM public.permissoes
WHERE chave LIKE 'gestao.%' OR chave LIKE 'leitura.%';

-- Deve retornar 0
SELECT COUNT(*) FROM public.perfil_permissao pp
JOIN public.permissoes p ON p.id = pp.permissao_id
WHERE p.chave LIKE 'gestao.%' OR p.chave LIKE 'leitura.%';
```

---

## 4. Testes criados

### 4.1 Arquivo

`tests/security/gestao-permissions.test.js`

### 4.2 Suites e casos de teste

| Suite | Casos |
| --- | --- |
| Existência das permissões | Todas as 10 `gestao.*` existem; todas as 3 `leitura.*` existem; sem duplicidades; permissões não aprovadas não foram criadas |
| Vínculos Gestão Hospitalar | Perfil existe; recebe exatamente as 10 permissões aprovadas; não recebe `paciente.visualizar`; não recebe `atendimento.visualizar`; não recebe `consulta.visualizar`; não recebe nenhuma permissão clínica ou de escrita; sem vínculos duplicados |
| Vínculos Leitura/Gestor | Perfil existe; recebe exatamente as 3 permissões aprovadas; não recebe `paciente.visualizar`; não recebe `atendimento.visualizar`; não recebe `consulta.visualizar`; não recebe nenhuma permissão clínica ou de escrita; sem vínculos duplicados |
| Isolamento de perfis operacionais | Nenhum dos 9 perfis operacionais existentes recebe permissões `gestao.*` ou `leitura.*` |
| Idempotência | Total de 13 registros gerenciais em `permissoes`; Gestão Hospitalar com exatamente 10 vínculos `gestao.*`; Leitura/Gestor com exatamente 3 vínculos `leitura.*` |
| Verificação pós-rollback | Documenta comportamento esperado após rollback; não falha com migration aplicada |

### 4.3 Total de casos

- Suite 1 (existência): 5 casos
- Suite 2 (Gestão Hospitalar): 6 casos
- Suite 3 (Leitura/Gestor): 6 casos
- Suite 4 (isolamento): 9 casos (um por perfil operacional)
- Suite 5 (idempotência): 3 casos
- Suite 6 (rollback): 2 casos documentais

**Total: 31 casos de teste**

### 4.4 Padrão de execução

Testes de segurança usam o config dedicado `vitest.security.config.mjs`:

```
npx.cmd vitest run --config vitest.security.config.mjs tests/security/gestao-permissions.test.js
npx.cmd vitest run --config vitest.security.config.mjs
```

Suíte padrão (unit + integration):

```
npx.cmd vitest run
```

Pré-condição: banco local ativo com migration 20260728000001 aplicada.

### 4.5 Resultados reais dos testes (2026-07-28)

| Execução | Comando | Aprovados | Falhos | Ignorados |
| --- | --- | --- | --- | --- |
| Teste isolado Fase 2.5 | `vitest run --config vitest.security.config.mjs tests/security/gestao-permissions.test.js` | **34** | 0 | 0 |
| Suíte de segurança completa | `vitest run --config vitest.security.config.mjs` | **102** | 0 | 1 suite* |
| Suíte padrão (unit + integration) | `vitest run` | **228** | 0 | 0 |

*A suite `phase-a-select-access.test.js` falha na inicialização com erro pré-existente de ambiente: o CLI Supabase não consegue resolver a chave de serviço local porque o `project_id = gsi-one-homologacao` no `supabase/config.toml` não corresponde ao nome do container ativo (`supabase_db_avanca-hospital-caninde-db`). Esta falha é anterior à Fase 2.5 e não está relacionada às permissões gerenciais.

---

## 5. O que esta fase NÃO faz

Esta fase deliberadamente não inclui:

| Item | Razão |
| --- | --- |
| Views agregadas | Fase posterior após validação dos vínculos |
| Policies de RLS para as views | Depende das views |
| Grants para tabelas gerenciais | Depende das views e policies |
| Aplicação no ambiente remoto | Requer autorização expressa e validação local prévia |
| Criação de usuários fictícios de teste | Requer autorização expressa pós-validação |
| Permissões pendentes (`gestao.dados_nominais`, `gestao.auditoria` integral) | Aguardam decisão institucional |
| Alteração de migrations anteriores | Proibida |
| Alteração de RLS existente | Proibida nesta fase |

---

## 6. Impacto de acesso efetivo

As permissões criadas nesta fase **não concedem acesso efetivo a dados** porque:

- Nenhuma policy de RLS foi criada ou alterada para as tabelas gerenciais.
- Nenhuma view gerencial foi criada.
- As permissões `gestao.*` e `leitura.*` existem na tabela `permissoes` e estão vinculadas em `perfil_permissao`, mas a função `has_permission()` só é invocada pelas policies de RLS — que ainda não foram criadas para o escopo gerencial.
- As tabelas clínicas (`pacientes`, `atendimentos`, `consultas`, etc.) continuam com as policies existentes, que não referenciam as novas permissões gerenciais.

O impacto real de acesso ocorrerá na Fase 2.6, quando as views e policies forem criadas.

---

## 7. Impacto em RLS nesta fase

| Área | Impacto |
| --- | --- |
| Tabelas clínicas | Nenhum — policies não alteradas |
| Tabelas de domínio | Nenhum |
| `audit_log` | Nenhum |
| `perfis_acesso` | Apenas inserção dos dois perfis gerenciais (sem RLS alterada) |
| `permissoes` | Apenas inserção das 13 novas permissões (sem RLS alterada) |
| `perfil_permissao` | Apenas inserção dos vínculos (sem RLS alterada) |

---

## 8. Decisões pendentes remanescentes

| Ref. | Pendência | Impacto |
| --- | --- | --- |
| D-NOM | `gestao.dados_nominais.visualizar`: quando criar e como controlar a concessão individual? | Fase futura — depende de decisão institucional |
| D-AUD | `gestao.auditoria.visualizar` integral: recorte temporal e funcional? | Fase futura |
| D-VIEWS | Quais views agregadas criar e com qual estrutura de dados? | Fase 2.6 |
| D-RLS | Quais policies de RLS criar para as views gerenciais? | Fase 2.6 |
| D-EXPORT | `gestao.exportar_agregado`: quais relatórios, formatos e controles de auditoria? | Fase 2.6 |
| D-USU | Usuários fictícios: quando criar e quais perfis usar para validação integrada? | Após Fase 2.6 |

---

## 9. Riscos técnicos residuais

| Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- |
| View gerencial futura com JOIN que expõe dado clínico individual não intencional | Médio | Alto | Revisar cada view antes de criar a policy de RLS correspondente |
| Policy de RLS futura com escopo mais amplo que o necessário | Médio | Alto | Teste explícito de isolamento por perfil antes de ativação |
| `gestao.dados_nominais.visualizar` atribuída automaticamente em migration futura por erro | Baixo | Alto | Controle de concessão individual documentado; teste obrigatório de ausência de atribuição automática |
| Permissão clínica vinculada por acidente ao perfil gerencial em migration futura | Baixo | Muito alto | Lista de proibições no teste da Suite 2 e Suite 3 validada a cada `db reset` |

---

## 10. Próxima etapa habilitada — Fase 2.6

Com a Fase 2.5 concluída, a Fase 2.6 poderá:

1. Criar as views agregadas e anonimizadas necessárias.
2. Criar as policies de RLS para as views, garantindo acesso restrito por permissão.
3. Validar o acesso efetivo de cada perfil via testes autenticados (padrão da `phase-a-select-access.test.js`).
4. Criar usuários fictícios de teste nos dois perfis gerenciais.
5. Executar a suíte completa de segurança pós-views.
6. Propor aplicação no ambiente remoto após validação local completa.

A Fase 2.6 requer autorização expressa antes de qualquer alteração em RLS, policies ou grants.

---

## 11. Comandos de validação local

```
-- Verificar permissoes gerenciais criadas
SELECT chave, modulo FROM public.permissoes
WHERE chave LIKE 'gestao.%' OR chave LIKE 'leitura.%'
ORDER BY modulo, chave;

-- Verificar vinculos de Gestao Hospitalar
SELECT p.chave
FROM public.permissoes p
JOIN public.perfil_permissao pp ON pp.permissao_id = p.id
JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
WHERE pa.nome = 'Gestão Hospitalar'
ORDER BY p.chave;

-- Verificar vinculos de Leitura/Gestor
SELECT p.chave
FROM public.permissoes p
JOIN public.perfil_permissao pp ON pp.permissao_id = p.id
JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
WHERE pa.nome = 'Leitura/Gestor'
ORDER BY p.chave;

-- Confirmar ausencia de vinculos clinicos proibidos
SELECT p.chave, pa.nome
FROM public.permissoes p
JOIN public.perfil_permissao pp ON pp.permissao_id = p.id
JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
WHERE pa.nome IN ('Gestão Hospitalar', 'Leitura/Gestor')
  AND p.chave IN (
    'paciente.visualizar', 'atendimento.visualizar', 'consulta.visualizar'
  );
-- Esperado: zero linhas
```

---

## 12. Histórico da fase

| Etapa | Data | Resultado |
| --- | --- | --- |
| Fase 2.3 — Matriz preliminar | 2026-07-27 | Aprovada |
| Fase 2.4 — Aprovação definitiva e especificação técnica | 2026-07-28 | Aprovada |
| Fase 2.5 — Implementação local | 2026-07-28 | Migration, rollback e testes criados localmente |
| Fase 2.6 — Views, policies e validação integrada | Pendente | Aguarda autorização |
