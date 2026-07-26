# GSI ONE — Auditoria de Repositório e Segredos

**Fase:** 1 — Organização do Repositório e Proteção de Segredos
**Data de execução:** 2026-07-25
**Repositório:** avanca-hospital-caninde-db
**Commit de referência:** 56774cf docs: define modular evolution plan
**Padrão aplicado:** GHAES — Global Health AI Engineering Standard
**Status:** Auditoria concluída

---

## 1. Objetivo

Auditar o repositório antes de qualquer evolução funcional para garantir que:

- nenhum segredo real está versionado;
- o `.gitignore` cobre todas as categorias de risco;
- o `.env.example` documenta as variáveis reais usadas pelo projeto;
- os achados estão classificados e registrados;
- as recomendações estão formalizadas para orientar as fases seguintes.

---

## 2. Escopo

### Arquivos verificados (rastreados pelo git)

Total de arquivos rastreados: **112 arquivos** (excluindo `.git/` e `node_modules/`)

Categorias auditadas:

- arquivos JavaScript de frontend (`auth.js`, `script.js`, `api.js`)
- módulos de serviço (`src/**/*.js`)
- testes (`tests/**/*.js`)
- fixtures de teste (`tests/fixtures/*.js`)
- helpers de teste (`tests/helpers/*.js`)
- migrations SQL (`supabase/migrations/*.sql`)
- rollbacks SQL (`supabase/rollback/*.sql`)
- documentação (`docs/*.md`)
- configuração (`package.json`, `vitest.config.mjs`, `netlify.toml`, `.gitignore`)

### Não rastreados verificados

- Arquivos `.env*` na árvore de trabalho: **nenhum encontrado**
- Arquivos `.dump`, `.sql.gz`, `.backup`: **nenhum encontrado**
- Arquivos temporários sensíveis: **nenhum encontrado**

---

## 3. Estado Inicial

| Critério                              | Estado encontrado             |
|---------------------------------------|-------------------------------|
| Arquivos `.env` versionados           | Nenhum                        |
| Arquivos `.env.example` existentes    | Não existia — criado nesta fase |
| Dumps de banco versionados            | Nenhum                        |
| `.gitignore` cobrindo `.env`          | Não cobria — corrigido        |
| `.gitignore` cobrindo dumps           | Não cobria — corrigido        |
| Chave cloud Supabase hardcoded        | Não encontrada                |
| Chave local Supabase hardcoded        | Encontrada (avaliada abaixo)  |
| CPF/CNS reais                         | Não encontrados               |
| Dados de pacientes reais              | Não encontrados               |
| Credenciais de produção               | Não encontradas               |

---

## 4. Arquivos Verificados

### Métodos de busca aplicados

| Padrão buscado                            | Ferramenta usada         |
|-------------------------------------------|--------------------------|
| `SUPABASE_URL`, `SUPABASE_KEY`, `anon_key`, `service_role` | grep em arquivos rastreados |
| `eyJ` (JWT pattern)                       | grep com regex           |
| `sb_[a-zA-Z0-9]{20,}` (Supabase key new format) | grep com regex     |
| `password`, `senha`, `secret`, `token`, `credential` | grep em não-.md  |
| `process.env`, `import.meta.env`          | grep em JS/MJS           |
| `supabase.co` (cloud URL)                 | grep em todos os formatos |
| CPF: `[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}` | grep com regex     |
| Dumps: `*.dump`, `*.sql.gz`, `*.backup`   | find                     |
| Arquivos `.env*`                          | find                     |

---

## 5. Achados

### Achado A1 — Chave anon local hardcoded em `auth.js`

**Arquivo:** `auth.js`, linha 15
**Tipo:** JWT hardcoded em arquivo rastreado
**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwi...` (mascarado)
**URL associada:** `http://127.0.0.1:54321` (linha 14)
**Payload decodificado:** `{"iss":"supabase-demo","role":"anon","exp":1983812996}`

**Classificação de risco:** MÉDIO — risco estrutural, não risco imediato de exposição.

**Por que não é crítico agora:**
- O emissor (`iss`) é `supabase-demo` — identificador da instalação local padrão do Supabase CLI.
- Esta chave é a chave anon padrão gerada por **toda** instalação local do Supabase. É pública e documentada oficialmente.
- A URL é `127.0.0.1:54321` — loopback local, nunca exposta externamente.
- Esta chave não tem acesso a nenhum projeto Supabase na nuvem.

**Por que é um risco estrutural:**
- O arquivo `auth.js` é servido pelo Netlify ao navegador. Se um desenvolvedor substituir a URL local por uma URL de produção e esquecer de trocar a chave, haverá vazamento real.
- O padrão de hardcoding em arquivo rastreado precisa ser eliminado antes da migração para ambiente remoto.
- Não existe proteção estrutural que impeça esse erro de acontecer acidentalmente.

**Recomendação:** eliminar o hardcoding substituindo por leitura de variável de ambiente na camada de build (ex: variável Netlify/CI injetada em tempo de build). Isso deve ser feito na **Fase 3** (Arquitetura de Rotas), como parte da configuração do ambiente de staging.

---

### Achado A2 — `supabase_url` e `service_role` referenciados em docs

**Arquivos:** vários em `docs/`
**Tipo:** referência textual/explicativa (não hardcoding de valor real)
**Exemplos encontrados:**
- `docs/GSI_ONE_QA_SETUP_6B2.md` — documenta como obter a chave para testes locais
- `docs/GSI_ONE_FUNDACAO_QA_DIAGNOSTICO_6B1.md` — referência ao processo de setup

**Classificação de risco:** BAIXO — documentação instrucional, sem valores reais.
**Nenhuma ação necessária.**

---

### Achado A3 — `example.supabase.co` em arquivo de teste

**Arquivo:** `tests/security/rls-grants.test.js`, linhas 32–33
**Tipo:** URL de exemplo em teste de validação negativa
**Valor:** `https://example.supabase.co` e `postgresql://postgres:x@example.supabase.co/postgres`

**Classificação de risco:** BAIXO — é um teste que valida explicitamente a **rejeição** de conexões cloud. O helper `local-supabase.js` usa esse padrão para lançar erro quando detecta `supabase.co` — o teste confirma que o guard funciona.
**Nenhuma ação necessária.**

---

### Achado A4 — CPF e CNS fictícios em `api.js` e fixtures de teste

**Arquivos:** `api.js` (linhas 6–16), `tests/fixtures/patients.js`, `tests/integration/reception-triage-flow.test.js`
**Tipo:** dados de pacientes fictícios para demonstração e testes

**`api.js`:** CPFs no formato `123.456.789-00`, `234.567.891-00`, etc. — sequenciais, não passam na validação algorítmica de CPF real. CNS no formato `700 0000 0000 001` — série 700 é reconhecidamente fictícia e usada para testes SUS.

**`tests/fixtures/`:** CPF `111.222.333-44` — obviamente fictício.

**Classificação de risco:** BAIXO — dados deliberadamente fictícios e claramente identificáveis como tal.
**Ação recomendada (não urgente):** adicionar comentário explícito `// DADOS FICTÍCIOS — não usar em produção` no cabeçalho de `api.js`, para clareza durante revisões de segurança. Isso pode ser feito quando `api.js` for tocado por outra razão.

---

### Achado A5 — `SERVICE_KEY` em testes de segurança autenticados

**Arquivo:** `tests/security/phase-a-select-access.test.js`
**Tipo:** uso de chave de serviço em testes de integração
**Origem da chave:** lida em runtime via `resolveLocalServiceKey()` de `tests/helpers/local-supabase.js`, que executa `npx supabase status -o env` e lê a saída do processo — nunca de variável hardcoded ou arquivo rastreado.

**Classificação de risco:** BAIXO — a chave nunca é armazenada no repositório; é lida dinamicamente do processo Supabase local em execução.
**Nenhuma ação necessária.**

---

### Achado A6 — `.gitignore` incompleto

**Arquivo:** `.gitignore`
**Situação encontrada:** o arquivo não cobria arquivos `.env`, dumps de banco (`*.dump`, `*.sql.gz`), arquivos de backup (`*.bak`) nem arquivos de sistema (`*.DS_Store`, `Thumbs.db`).

**Classificação de risco:** ALTO — sem cobertura de `.env`, qualquer arquivo `.env.local` criado por um desenvolvedor poderia ser acidentalmente commitado com chaves reais.

**Ação realizada:** `.gitignore` atualizado nesta fase. Detalhes na seção 10.

---

### Achado A7 — Ausência de `.env.example`

**Situação encontrada:** o projeto não possuía documentação das variáveis de ambiente necessárias.
**Classificação de risco:** MÉDIO — sem `.env.example`, desenvolvedores não sabem quais variáveis configurar, aumentando o risco de hardcoding.

**Ação realizada:** `.env.example` criado nesta fase. Detalhes na seção 11.

---

## 6. Riscos Classificados

| ID  | Achado                                         | Risco     | Ação necessária           |
|-----|------------------------------------------------|-----------|---------------------------|
| A1  | JWT anon local hardcoded em `auth.js`          | MÉDIO     | Eliminar na Fase 3        |
| A2  | Referências textuais a service_role em docs    | BAIXO     | Nenhuma                   |
| A3  | `example.supabase.co` em teste de validação    | BAIXO     | Nenhuma                   |
| A4  | CPF/CNS fictícios em `api.js` e fixtures       | BAIXO     | Comentário (não urgente)  |
| A5  | `SERVICE_KEY` lida em runtime nos testes       | BAIXO     | Nenhuma                   |
| A6  | `.gitignore` sem cobertura de `.env` e dumps   | ALTO      | Corrigido nesta fase      |
| A7  | Ausência de `.env.example`                     | MÉDIO     | Corrigido nesta fase      |

**Nenhum segredo real de produção foi encontrado no repositório.**

---

## 7. Segredos Encontrados — Detalhamento

### auth.js — JWT local hardcoded

| Campo                | Valor                                        |
|----------------------|----------------------------------------------|
| Arquivo              | `auth.js`, linha 15                          |
| Tipo                 | JWT anon key — Supabase local (dev padrão)   |
| Emissor (`iss`)      | `supabase-demo` (instalação local padrão)    |
| Papel (`role`)       | `anon` (sem privilégios)                     |
| URL associada        | `http://127.0.0.1:54321` (loopback local)    |
| Valor (mascarado)    | `eyJhbGci....[payload]....CRXP1A7W...`       |
| Acesso a produção    | Não — chave local padrão, não vinculada a projeto remoto |
| Rotação necessária   | Não — chave local pública e padrão           |
| Ação requerida       | Eliminar hardcoding antes de ir para staging |

---

## 8. Situação do .gitignore

### Antes desta fase

```
superpowers/
claude-code/
.claude/
node_modules/
.netlify/
dist/
build/
*.log
supabase/.branches/
supabase/.temp/
supabase/snippets/
_audit_export/
.npm-cache/
.supabase-home/
```

**Lacunas identificadas:**
- `.env`, `.env.local`, `.env.*.local` — **não cobertos** (risco ALTO)
- `*.dump`, `*.sql.gz`, `*.backup`, `*.bak` — **não cobertos**
- `Thumbs.db`, `.DS_Store`, `*.tmp` — **não cobertos**

### Após esta fase

Adicionado ao `.gitignore`:

```
# Secrets e configuração local — NUNCA versionar
.env
.env.local
.env.*.local
*.env

# Dumps e backups de banco — NUNCA versionar
*.dump
*.sql.gz
*.backup
*.bak
supabase/seed/prod/

# Arquivos temporários e de sistema
*.tmp
Thumbs.db
.DS_Store
```

---

## 9. Situação do .env.example

### Antes desta fase

Arquivo inexistente.

### Após esta fase

Arquivo `.env.example` criado com as variáveis reais identificadas pelo projeto:

| Variável                    | Uso                                                          | Exposição permitida |
|-----------------------------|--------------------------------------------------------------|---------------------|
| `SUPABASE_URL`              | URL da API Supabase (local ou remoto)                        | Frontend (pública)  |
| `SUPABASE_ANON_KEY`         | Chave anon pública (leitura limitada por RLS)                | Frontend (pública)  |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin total)                               | **Nunca no frontend** |
| `SUPABASE_DB_URL`           | Connection string para testes de integração (docker exec)    | **Nunca no frontend** |

---

## 10. Separação entre Chaves de Frontend e Backend

### Chaves que PODEM ir ao navegador

| Chave           | Motivo                                                          |
|-----------------|-----------------------------------------------------------------|
| `SUPABASE_URL`  | É uma URL pública — não confere privilégio por si só            |
| `SUPABASE_ANON_KEY` | Chave de leitura pública — protegida por RLS no banco      |

**Condição obrigatória:** RLS ativo e configurado corretamente em todas as tabelas sensíveis. Se o RLS falhar, a anon key expõe dados. Por isso o projeto mantém testes de RLS contínuos.

### Chaves que NUNCA podem ir ao navegador

| Chave                       | Motivo                                                         |
|-----------------------------|----------------------------------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Ignora RLS completamente — acesso total ao banco               |
| `SUPABASE_DB_URL`           | Conexão direta ao PostgreSQL — permite queries arbitrárias     |

**Regra explícita registrada em `auth.js`** (linha 12–13):
> "Para apontar para um projeto remoto no futuro, trocar estes dois valores em uma alteração explícita e revisada — nunca usar a chave service_role aqui, pois este arquivo é servido ao navegador."

---

## 11. Riscos no GitHub

| Risco                                              | Mitigação atual                              |
|----------------------------------------------------|----------------------------------------------|
| Push acidental de `.env.local` com chaves reais    | `.gitignore` atualizado nesta fase           |
| Dump de produção versionado                        | `.gitignore` atualizado nesta fase           |
| Hardcoding de chave real em `auth.js` no futuro    | Documentação + revisão obrigatória           |
| Branch `main` sem proteção configurada             | Recomendado configurar no GitHub (ver seção 17) |
| CPF/CNS reais inseridos em fixtures                | Convenção de nomenclatura `@gsi.local` / `@gsi.test` |

---

## 12. Alterações Realizadas

| Arquivo              | Operação     | Descrição                                              |
|----------------------|--------------|--------------------------------------------------------|
| `.gitignore`         | Atualizado   | Adicionadas regras para `.env*`, dumps, backups, sistema |
| `.env.example`       | Criado       | Documenta variáveis reais usadas pelo projeto          |
| `docs/GSI_ONE_AUDITORIA_REPOSITORIO_E_SEGREDOS.md` | Criado | Este documento |

### Arquivos NÃO alterados

Todos os demais arquivos foram preservados sem alteração:

- `auth.js` — o hardcoding local foi documentado e será corrigido na Fase 3
- `script.js` — sem alteração
- `api.js` — sem alteração
- `index.html` — sem alteração
- `style.css` — sem alteração
- Migrations — sem alteração
- Rollbacks — sem alteração
- Testes — sem alteração
- Fixtures — sem alteração
- Documentação existente — sem alteração

---

## 13. Alterações Não Realizadas

| Item não realizado                                | Motivo                                                          |
|---------------------------------------------------|-----------------------------------------------------------------|
| Remoção do hardcoding em `auth.js`                | Requer decisão de build pipeline — Fase 3                       |
| Configuração de proteção de branch no GitHub      | Ação no GitHub — fora do escopo de arquivo (seção 17)          |
| Criação de usuários fictícios                     | Fase 2                                                          |
| Qualquer alteração no banco ou migrations         | Fora do escopo desta fase                                       |
| Commit ou push                                    | Aguardando autorização explícita do desenvolvedor               |

---

## 14. Recomendações

### R1 — Eliminar hardcoding em `auth.js` (Fase 3)

Substituir as constantes hardcoded por variáveis injetadas em tempo de build:

```js
// Antes (atual — apenas local):
const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = "eyJ...";

// Depois (com build pipeline):
// Variáveis injetadas pelo Netlify/CI via __GSI_CONFIG__ ou similar
const SUPABASE_URL = window.__GSI_CONFIG__?.supabaseUrl ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = window.__GSI_CONFIG__?.supabaseAnonKey ?? "";
```

O arquivo `__gsi-config.js` seria gerado no build e ignorado pelo git. Alternativa: usar Netlify environment variables com substituição de texto via plugin de build.

### R2 — Configurar proteção de branch `main` no GitHub

No GitHub: Settings → Branches → Branch protection rules → `main`:

- [ ] Require a pull request before merging
- [ ] Require approvals (1 mínimo)
- [ ] Require status checks to pass before merging
- [ ] Do not allow bypassing the above settings

### R3 — Adicionar comentário de dados fictícios em `api.js`

Quando `api.js` for tocado por outra razão, adicionar no cabeçalho:

```js
// DADOS FICTÍCIOS — CPF, CNS, nomes e telefones são inventados.
// CPFs no formato 123.456.789-00 não são matematicamente válidos.
// CNS série 700 é reservada para testes. Nunca usar dados reais aqui.
```

### R4 — Documentar processo de rotação de chaves

Criar `docs/GSI_ONE_ROTACAO_CHAVES.md` antes de ir para produção, descrevendo:

- como revogar e gerar nova anon key no Supabase;
- como atualizar variáveis de ambiente no Netlify;
- procedimento para suspeita de vazamento.

---

## 15. Critérios de Encerramento da Fase 1

| Critério                                          | Status        |
|---------------------------------------------------|---------------|
| `.gitignore` cobre `.env*`                        | ✓ Concluído   |
| `.gitignore` cobre dumps e backups                | ✓ Concluído   |
| `.env.example` criado com variáveis reais         | ✓ Concluído   |
| Auditoria de segredos executada e documentada     | ✓ Concluído   |
| Nenhum segredo real encontrado no repositório     | ✓ Confirmado  |
| Achados classificados por risco                   | ✓ Concluído   |
| Recomendações formalizadas                        | ✓ Concluído   |
| Nenhum arquivo funcional alterado                 | ✓ Confirmado  |
| Nenhuma migration criada                          | ✓ Confirmado  |
| Commit/push não realizado sem autorização         | ✓ Aguardando  |

---

## 16. Próximos Passos

### Imediatos (antes do próximo commit)

1. Revisar este documento e o `.gitignore` atualizado.
2. Revisar o `.env.example` criado.
3. Autorizar o commit desta fase.

### Fase 2 — Ambiente de Homologação e Usuários Fictícios

- Criar projeto Supabase de staging (fora do repositório — ação manual).
- Criar seed de usuários fictícios em `supabase/seed/`.
- Testar RLS no ambiente de staging com os usuários fictícios.

### Fase 3 — Arquitetura de Rotas e Páginas Próprias

- Resolver o hardcoding de `auth.js` via variáveis de build.
- Estabelecer padrão de navegação sem pop-ups.
- Criar router baseado em hash ou path.

---

## Controle de Versão deste Documento

| Versão | Data       | Autor        | Alteração                          |
|--------|------------|--------------|------------------------------------|
| 1.0    | 2026-07-25 | Erick Gomes  | Criação — auditoria da Fase 1      |

---

*Este documento segue o padrão GHAES — Global Health AI Engineering Standard.*
*Referência: https://github.com/erickgomesal/ghaes*
