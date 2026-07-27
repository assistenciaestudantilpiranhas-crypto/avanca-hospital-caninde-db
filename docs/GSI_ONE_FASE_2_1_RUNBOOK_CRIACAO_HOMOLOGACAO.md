# GSI ONE — Fase 2.1: Runbook de Criação do Ambiente de Homologação

**Etapa:** 2.1 — Preparação Controlada do Projeto Supabase de Homologação
**Data de criação:** 2026-07-26
**Repositório:** avanca-hospital-caninde-db
**Padrão aplicado:** GHAES — Global Health AI Engineering Standard
**Status:** Procedimento documentado — aguardando autorização para execução

---

## 1. Objetivo

Estabelecer o procedimento seguro, manual e reproduzível para:

1. Criar o projeto Supabase de homologação `gsi-one-homologacao`;
2. Vincular o repositório local ao projeto remoto via CLI;
3. Validar o estado das migrations antes de qualquer aplicação remota;
4. Definir políticas de segredos, senhas e variáveis de ambiente;
5. Documentar os pontos formais de parada que requerem autorização explícita.

Este runbook **não executa** nenhuma migration remota, não cria usuários e não aplica dados. Cobre apenas a preparação do ambiente e a vinculação segura.

---

## 2. Pré-requisitos

### 2.1 Ferramentas

| Ferramenta           | Versão confirmada | Verificação                        |
|----------------------|-------------------|------------------------------------|
| Supabase CLI         | 2.109.1           | `npx supabase --version`           |
| Node.js              | Disponível        | `node --version`                   |
| Git                  | Disponível        | `git --version`                    |

### 2.2 Acesso e conta

| Pré-requisito                                       | Situação          |
|-----------------------------------------------------|-------------------|
| Conta Supabase com acesso à organização do GSI      | A validar         |
| Permissão para criar projetos na organização        | A validar         |
| Acesso ao terminal com variáveis de ambiente locais | Disponível        |
| Gerenciador de senhas para registrar DB password    | Responsabilidade do desenvolvedor |

### 2.3 Estado do repositório

| Componente                     | Estado confirmado em 2026-07-26             |
|-------------------------------|---------------------------------------------|
| Branch                        | `main` — sincronizada com `origin/main`     |
| Último commit                 | `e194a06` — docs: remove trailing whitespace from phase 2 plan |
| Working tree                  | Limpo — sem alterações pendentes            |
| Migrations locais             | 31 arquivos em `supabase/migrations/`       |
| Rollbacks disponíveis         | 3 arquivos em `supabase/rollback/`          |
| `supabase/config.toml`        | Ausente — requer `npx supabase init` antes do link |
| Ambiente local Docker         | Offline — Docker Desktop não está ativo     |
| Fase 1                        | Concluída                                   |

---

## 3. Estado Atual do Repositório

```
Branch:  main (sincronizada com origin/main)
Commit:  e194a06 docs: remove trailing whitespace from phase 2 plan
Status:  working tree limpo
```

Migrations presentes (31 arquivos — ordem de aplicação):

```
supabase/migrations/
  20260623100001_dominios.sql
  20260623100002_usuarios.sql
  20260623100003_audit_log.sql
  20260623100004_acesso.sql
  20260623100005_pacientes.sql
  20260623100006_atendimentos.sql
  20260623100007_clinico.sql
  20260623100008_exames.sql
  20260623100009_estoque.sql
  20260623100010_prescricoes.sql
  20260623100011_transferencias.sql
  20260623100012_rls_policies.sql
  20260623100013_audit_triggers.sql
  20260623100014_updated_at_estoque_triggers.sql
  20260623100015_regras_fluxo_assistencial.sql
  20260623100016_hardening_funcoes.sql
  20260623100017_bootstrap_admin.sql
  20260623100018_fix_bootstrap_admin_ambiguity.sql
  20260623100019_configuracoes_sistema.sql
  20260623100020_renomear_perfis_oficiais.sql
  20260623100021_compatibilizar_rls_perfis_renomeados.sql
  20260623100022_grants_tabelas_operacionais.sql
  20260623100023_grants_tabelas_observacao_estabilizacao_transferencia.sql
  20260623100024_perfil_enfermeiro_transferencia_checklist.sql
  20260623100025_grant_select_tabelas_acesso_authenticated.sql
  20260623100026_ampliar_perfil_enfermeiro_fluxo_assistencial.sql
  20260623100027_grant_select_dom_tables_authenticated.sql
  20260623100028_hardening_dangerous_grants.sql
  20260709170000_block_delete_assistencial_audit_append_only.sql
  20260722100029_rls_select_phase_a_positive_permissions.sql
  20260722100030_grant_tabelas_clinicas_estendidas.sql
  20260722100031_rls_phase_b1_read_permissions.sql
```

Rollbacks disponíveis:

```
supabase/rollback/
  20260722100029_rls_select_phase_a_positive_permissions_rollback.sql
  20260722100030_grant_tabelas_clinicas_estendidas_rollback.sql
  20260722100031_rls_phase_b1_read_permissions_rollback.sql
```

---

## 4. Nome Oficial do Projeto de Homologação

```
gsi-one-homologacao
```

Regras de nomenclatura aplicadas:

- minúsculas com hifens;
- sem números de versão (nome estável);
- sem referências geográficas no nome técnico;
- identificável como ambiente de teste por convenção interna.

---

## 5. Separação entre Ambientes

### Princípio fundamental

```
local  ≠  homologação  ≠  produção
```

Cada ambiente possui:

- projeto Supabase separado e independente;
- banco PostgreSQL independente;
- chaves diferentes (anon key, service role key);
- URLs diferentes;
- usuários diferentes;
- dados diferentes.

**Nenhuma credencial de produção é reutilizada em homologação, em nenhuma hipótese.**

### Tabela comparativa

| Parâmetro              | Local (desenvolvimento)                    | Homologação                            | Produção                               |
|------------------------|--------------------------------------------|----------------------------------------|----------------------------------------|
| Plataforma             | Supabase CLI — Docker local                | Supabase (projeto na nuvem)            | Supabase (projeto na nuvem separado)   |
| Nome do projeto        | `avanca-hospital-caninde-db` (local)       | `gsi-one-homologacao`                  | A validar                              |
| API URL                | `http://127.0.0.1:54321`                   | `https://<REF-HOMOLOGACAO>.supabase.co` | `https://<REF-PRODUCAO>.supabase.co`  |
| Banco PostgreSQL        | `127.0.0.1:54322`                          | Nuvem Supabase                         | Nuvem Supabase                         |
| Dados                  | Fictícios — seed local                     | Exclusivamente fictícios               | Dados reais do hospital                |
| Reset                  | `npx supabase db reset`                    | Via CLI com projeto linkado            | Nunca — apenas migrations              |
| Credenciais            | `.env.local` (não commitado)               | Variáveis de ambiente locais           | Gerenciadas pelo responsável técnico   |
| Acesso externo         | Não — apenas loopback                      | Restrito à equipe de desenvolvimento   | Restrito ao hospital                   |

---

## 6. Procedimento Manual para Criação do Projeto Supabase

**Este procedimento é manual e executado pelo desenvolvedor no painel Supabase.**
**Não existe automatização — nenhum comando de CLI cria o projeto remotamente.**

### Passos

1. Acessar o painel Supabase: `https://supabase.com/dashboard`
2. Clicar em **New Project**
3. Selecionar a **organização** correta do GSI (não criar em organização pessoal)
4. Preencher os campos:
   - **Name:** `gsi-one-homologacao`
   - **Database Password:** senha segura conforme seção 8
   - **Region:** South America (São Paulo) — conforme seção 7
5. Confirmar criação
6. Aguardar o provisionamento (pode levar alguns minutos)
7. Anotar as informações geradas:
   - **Project Ref** (identificador único, formato: `abcdefghijklmnop`)
   - **Project URL** (formato: `https://<REF>.supabase.co`)
   - **Anon Key** (chave pública)
   - **Service Role Key** (chave privada — nunca exposta)
8. Salvar todas as informações no gerenciador de senhas da equipe

> **Atenção:** Não registrar nenhuma dessas informações em arquivo de texto simples, no repositório ou em qualquer canal não seguro.

---

## 7. Região Recomendada e Critério de Escolha

**Região:** `South America (São Paulo)` — identificador AWS: `sa-east-1`

**Critério de escolha:**

| Fator                         | Justificativa                                                          |
|-------------------------------|------------------------------------------------------------------------|
| Localização dos usuários      | Hospital municipal no Brasil — latência mínima para usuários brasileiros |
| Conformidade LGPD             | Dados de saúde mantidos em território nacional                         |
| Conformidade RIPD             | Alinhamento com o Relatório de Impacto à Proteção de Dados             |
| Consistência com produção     | Usar a mesma região que a produção facilitará comparações              |
| Disponibilidade da região     | `sa-east-1` é região estável e suportada pelo Supabase                 |

> **Nota:** Se o projeto de produção já existe em outra região, usar a mesma região na homologação para maximizar consistência operacional. Verificar com o responsável técnico antes de criar.

---

## 8. Política para Senha do Banco

### Regras absolutas

| Regra                                                            |
|------------------------------------------------------------------|
| Nunca reutilizar senha de produção em homologação                |
| Nunca salvar senha em arquivo rastreado pelo git                 |
| Nunca registrar senha em documentação pública ou neste runbook   |
| Nunca compartilhar senha por canal não seguro (e-mail, chat)     |
| Comprimento mínimo: 16 caracteres                                |
| Complexidade obrigatória: letras maiúsculas, minúsculas, números e símbolo |
| Armazenamento: gerenciador de senhas da equipe (ex: Bitwarden, 1Password) |
| Rotação: obrigatória a cada suspeita de exposição                |

### Geração da senha

Usar o gerador do próprio gerenciador de senhas. Nunca criar senha manualmente ou usar padrões previsíveis.

### Após a criação

A senha do banco é usada apenas internamente pelo Supabase. O desenvolvedor precisará dela para compor a `SUPABASE_DB_URL`. Manter registrada exclusivamente no gerenciador de senhas.

---

## 9. Política para Organização Supabase

| Regra                                                                     |
|---------------------------------------------------------------------------|
| Criar o projeto na organização oficial do GSI — não em conta pessoal      |
| Se a organização ainda não existir: criá-la antes, com nome `gsi-saude` ou equivalente |
| Membros da organização: apenas desenvolvedores autorizados                |
| Não adicionar membros sem aprovação explícita do responsável técnico      |
| Separar membros de homologação e produção se a plataforma permitir        |

---

## 10. Identificação Segura do Project Ref

O **Project Ref** é o identificador único do projeto no Supabase. Formato: sequência alfanumérica de ~20 caracteres (ex: `abcdefghijklmnopqrst`).

### Como obter

Após criar o projeto no painel:

- Painel Supabase → Project → Settings → General → Reference ID
- Ou: extrair da URL do painel: `https://supabase.com/dashboard/project/<PROJECT_REF>`

### Como usar com segurança

- Usar apenas como argumento no comando `npx supabase link` (seção 12)
- Não commitar o Project Ref em arquivo rastreado
- Não incluir o Project Ref em logs públicos ou relatórios não mascarados
- Em documentação interna, usar sempre `<PROJECT_REF>` como placeholder

### Mascaramento em relatórios

Ao relatar o resultado do `supabase link`, exibir apenas os primeiros 4 e últimos 4 caracteres:

```
Project Ref: abcd...rstu  (mascarado)
```

---

## 11. Procedimento de Autenticação da CLI

A autenticação da CLI Supabase usa um token de acesso pessoal (Personal Access Token — PAT).

### Como gerar o token

1. Acessar: `https://supabase.com/dashboard/account/tokens`
2. Clicar em **Generate new token**
3. Nomear: `gsi-homologacao-cli-2026`
4. Copiar o token gerado (exibido uma única vez)
5. Salvar no gerenciador de senhas

### Como autenticar a CLI

```bash
# Modelo de comando — não executar sem o token em mãos
npx supabase login
```

A CLI abrirá o navegador ou solicitará o token diretamente. Após a autenticação, o token é armazenado localmente pela CLI — **nunca** em arquivo rastreado pelo git.

### Regras de segurança do token

| Regra                                                              |
|--------------------------------------------------------------------|
| Nunca salvar o token em arquivo (`.env`, `.sh`, `.json`, etc.)     |
| Nunca commitar o token                                             |
| Nunca exibir o token em logs públicos                              |
| Revogar imediatamente em caso de suspeita de exposição             |
| Token é pessoal — cada desenvolvedor usa o seu próprio             |

### Verificação de autenticação atual

```bash
# Verificar se já há autenticação válida (não expõe token)
npx supabase projects list
```

Se retornar a lista de projetos: autenticação válida. Se retornar erro: executar `npx supabase login` primeiro.

> **Nota do repositório:** Em 2026-07-26, o ambiente Docker local estava offline, portanto `npx supabase status` retornou erro de conexão — isso é esperado em máquina sem Docker ativo. Não impede a autenticação remota.

---

## 12. Procedimento de Vinculação

**Este procedimento só deve ser executado após o PONTO DE PARADA 1 (seção 28).**

### Pré-condições

- Projeto `gsi-one-homologacao` criado e provisionado no painel Supabase
- CLI autenticada com token válido (seção 11)
- Project Ref disponível (seção 10)
- Working tree do git limpo

### Comando de vinculação

```bash
# Modelo — substituir <PROJECT_REF> pelo valor real
npx supabase link --project-ref <PROJECT_REF>
```

A CLI solicitará a senha do banco de dados (configurada na criação do projeto). Esta senha não será salva em arquivo — será solicitada apenas neste momento ou via variável de ambiente `SUPABASE_DB_PASSWORD`.

### Alternativa com variável de ambiente (não interativa)

```bash
# Modelo — nunca salvar este comando em arquivo rastreado
SUPABASE_DB_PASSWORD=<senha-do-banco> npx supabase link --project-ref <PROJECT_REF>
```

### Pré-requisito: `supabase/config.toml`

O comando `npx supabase link` exige que o diretório `supabase/` já esteja inicializado com um `config.toml`. Este arquivo é criado pelo comando:

```bash
# Modelo — inicializa a configuração local do projeto Supabase
npx supabase init
```

**Sequência obrigatória:**

1. Verificar se `supabase/config.toml` existe no repositório
2. Se ausente: executar `npx supabase init` para criá-lo
3. Revisar o `config.toml` gerado antes de prosseguir
4. Somente após a revisão: executar `npx supabase link`

> **Importante:** `supabase init` e `supabase link` são comandos distintos com funções distintas. O `init` inicializa a estrutura local. O `link` vincula essa estrutura ao projeto remoto. Executar `link` sem `init` resultará em erro se o `config.toml` estiver ausente.

### O que o `supabase link` faz

- Vincula o diretório local (já inicializado via `supabase init`) ao projeto remoto
- Registra o Project Ref no arquivo `supabase/.temp/` (local, não rastreado)
- Configura a CLI para operações remotas neste projeto
- **Não cria nem modifica o `supabase/config.toml`**
- **Não aplica nenhuma migration**
- **Não cria nenhum usuário**
- **Não altera nenhum dado**

### Verificação após vinculação

```bash
# Verificar migrations remotas vs locais
npx supabase migration list
```

---

## 13. Procedimento para Não Salvar Secrets no Git

### Arquivos protegidos pelo .gitignore

O `.gitignore` já cobre (confirmado na Fase 1):

```
.env
.env.local
.env.*.local
*.env
supabase/.temp/
```

### Regras complementares

| Ação                                              | Status       |
|---------------------------------------------------|--------------|
| Nunca commitar `.env.local`                       | Protegido    |
| Nunca commitar token da CLI Supabase              | Protegido    |
| Nunca commitar Project Ref em arquivo rastreado   | Responsabilidade do desenvolvedor |
| Nunca commitar senha do banco                     | Responsabilidade do desenvolvedor |
| Nunca commitar service role key                   | Responsabilidade do desenvolvedor |
| Nunca commitar anon key de produção               | Responsabilidade do desenvolvedor |

### Verificação antes de qualquer commit

```bash
git status -sb
git diff --stat
git diff --check
```

Inspecionar qualquer arquivo não reconhecido antes de commitar.

---

## 14. Variáveis Necessárias para Homologação

| Variável                    | Obrigatória | Finalidade                                      |
|-----------------------------|-------------|-------------------------------------------------|
| `SUPABASE_URL`              | Sim         | URL da API do projeto de homologação            |
| `SUPABASE_ANON_KEY`         | Sim         | Chave pública para frontend e testes            |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim         | Script de provisionamento e testes admin        |
| `SUPABASE_DB_URL`           | Sim         | Testes de integração diretos no banco           |
| `SUPABASE_DB_PASSWORD`      | Condicional | Alternativa para `supabase link` não-interativo |
| `GSI_HOMOLOGACAO_PASSWORD`  | Sim         | Senha dos usuários fictícios (Fase 2.2)         |

---

## 15. Local Seguro para Configuração das Variáveis

### Desenvolvimento local

Arquivo `.env.local` na raiz do repositório (já coberto pelo `.gitignore`):

```bash
# .env.local — NUNCA commitar
SUPABASE_URL=https://<REF>.supabase.co
SUPABASE_ANON_KEY=<anon-key-da-homologacao>
SUPABASE_SERVICE_ROLE_KEY=<service-role-da-homologacao>
SUPABASE_DB_URL=postgresql://postgres:<db-password>@<REF>.supabase.co:5432/postgres
```

### Deploy no Netlify (frontend de homologação)

Painel Netlify → Site → Site configuration → Environment variables:

- `SUPABASE_URL` → adicionar
- `SUPABASE_ANON_KEY` → adicionar
- `SUPABASE_SERVICE_ROLE_KEY` → **nunca adicionar** (ver seção 18)

### Scripts administrativos

Variáveis exportadas manualmente no terminal antes de executar o script:

```bash
export SUPABASE_URL=https://<REF>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-da-homologacao>
export GSI_HOMOLOGACAO_PASSWORD=<senha-dos-usuarios-ficticios>
```

Estas exportações duram apenas a sessão do terminal — não persistem.

---

## 16. Diferença entre as Chaves do Supabase

### SUPABASE_URL

- O que é: endpoint da API REST do projeto Supabase
- Formato: `https://<PROJECT_REF>.supabase.co`
- Uso: base para todas as chamadas de API do frontend e scripts
- Sensibilidade: baixa — identifica o projeto, mas não concede acesso por si só

### SUPABASE_ANON_KEY (também chamada de Publishable Key)

- O que é: JWT público com role `anon`
- Uso: frontend (navegador), chamadas públicas
- Acesso concedido: apenas o que as políticas RLS permitem para `anon`
- Sensibilidade: baixa — pode ser exposta no frontend com segurança, desde que RLS esteja ativo
- Nomenclatura no painel: pode aparecer como "anon key" ou "publishable key"

### SUPABASE_SERVICE_ROLE_KEY (também chamada de Secret Key)

- O que é: JWT com role `service_role` — ignora todas as políticas RLS
- Uso: scripts administrativos, CI/CD, operações de provisionamento
- Acesso concedido: acesso irrestrito a todo o banco de dados
- Sensibilidade: **crítica** — nunca expor ao navegador, nunca commitar
- Nomenclatura no painel: pode aparecer como "service role key" ou "secret key"

### SUPABASE_DB_URL

- O que é: string de conexão direta ao banco PostgreSQL
- Formato: `postgresql://postgres:<password>@<REF>.supabase.co:5432/postgres`
- Uso: testes de integração que precisam de conexão direta, psql
- Sensibilidade: **crítica** — contém senha do banco — nunca expor

---

## 17. Chaves Permitidas no Frontend

| Chave               | Permitida no frontend | Condição                          |
|---------------------|------------------------|-----------------------------------|
| `SUPABASE_URL`      | Sim                    | Sempre — necessária para chamadas |
| `SUPABASE_ANON_KEY` | Sim                    | Desde que RLS esteja ativo        |

O frontend (`auth.js`, `script.js`) deve usar **apenas** estas duas chaves.

---

## 18. Chaves Proibidas no Frontend

| Chave                       | Proibida | Motivo                                         |
|-----------------------------|----------|------------------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Sim      | Ignora RLS — acesso irrestrito ao banco        |
| `SUPABASE_DB_URL`           | Sim      | Expõe credenciais de acesso direto ao banco    |
| Qualquer senha de banco     | Sim      | Risco de comprometimento total do banco        |

Expor a service role key no frontend é equivalente a dar acesso irrestrito de leitura e escrita ao banco de dados para qualquer visitante do site.

---

## 19. Procedimento de Validação da Conexão

Após o `supabase link` (após PONTO DE PARADA 1), validar a conexão antes de prosseguir:

```bash
# Verificar projetos autenticados
npx supabase projects list

# Verificar link ativo
npx supabase migration list
```

Resultado esperado do `migration list`:

- Lista as migrations locais (coluna LOCAL)
- Lista as migrations remotas (coluna REMOTE)
- Indica quais estão pendentes de aplicação

Se o comando retornar erro: verificar autenticação (seção 11) e Project Ref (seção 10).

---

## 20. Procedimento para Verificar Migrations Pendentes

Após a vinculação, antes de qualquer aplicação:

```bash
# Listar status de todas as migrations
npx supabase migration list
```

Interpretar o resultado:

| Status na coluna REMOTE | Significado                              |
|-------------------------|------------------------------------------|
| Vazio                   | Migration não aplicada no projeto remoto |
| Timestamp presente      | Migration já aplicada                    |

Para um projeto recém-criado, todas as 31 migrations aparecerão como pendentes na coluna REMOTE.

```bash
# Verificar diferença entre banco local e remoto (após link)
npx supabase db diff
```

Este comando compara o estado atual do schema remoto com o schema esperado pelas migrations locais.

---

## 21. Procedimento Futuro de Dry Run

**Não executar nesta etapa.** Reservado para após PONTO DE PARADA 2.

```bash
# Modelo — simula a aplicação das migrations sem executar
npx supabase db push --dry-run
```

O dry run exibe quais SQLs seriam executados sem alterar o banco. Permite auditar as migrations antes da aplicação real.

### O que verificar no dry run

- Nenhuma migration altera tabelas de produção (ambientes separados)
- Nenhuma migration contém dados reais
- A sequência de aplicação está correta (ordem cronológica)
- Nenhuma migration foi modificada após o planejamento

---

## 22. Procedimento Futuro de Aplicação das Migrations

**Não executar nesta etapa.** Reservado para após PONTO DE PARADA 3.

```bash
# Modelo — aplicar todas as migrations pendentes no projeto vinculado
npx supabase db push
```

### Pré-condições para execução

- Dry run executado e auditado (seção 21)
- PONTO DE PARADA 3 aprovado (seção 28)
- Nenhuma migration modificada após revisão
- Backup do estado atual do banco remoto (se houver dados)
- Autorização explícita do responsável técnico

### Sequência de aplicação

O Supabase CLI aplica as migrations na ordem cronológica dos timestamps. As 31 migrations serão aplicadas nesta ordem:

```
20260623100001 → 20260623100002 → ... → 20260722100031
```

Após a aplicação, verificar com `npx supabase migration list` que todas aparecem como aplicadas.

---

## 23. Procedimento de Rollback

### Rollback de migration específica

Para reverter uma das três migrations com rollback documentado:

```bash
# Modelo — executar via psql ou SQL Editor do painel Supabase
psql $SUPABASE_DB_URL -f supabase/rollback/<arquivo>_rollback.sql
```

Rollbacks disponíveis:

| Migration original                                              | Arquivo de rollback                                                   |
|-----------------------------------------------------------------|-----------------------------------------------------------------------|
| `20260722100029_rls_select_phase_a_positive_permissions.sql`    | `20260722100029_rls_select_phase_a_positive_permissions_rollback.sql` |
| `20260722100030_grant_tabelas_clinicas_estendidas.sql`          | `20260722100030_grant_tabelas_clinicas_estendidas_rollback.sql`        |
| `20260722100031_rls_phase_b1_read_permissions.sql`              | `20260722100031_rls_phase_b1_read_permissions_rollback.sql`           |

### Rollback completo (reset de homologação)

Em caso de estado inconsistente no banco de homologação:

1. Acessar o painel Supabase → projeto `gsi-one-homologacao`
2. Database → Reset database (ou via painel Settings → Danger Zone)
3. Re-aplicar todas as migrations: `npx supabase db push`
4. Re-executar o script de provisionamento (Fase 2.2)
5. Validar o estado final

> **Importante:** O reset em homologação é seguro — não há dados reais. O mesmo procedimento em produção é **proibido** sem aprovação explícita formal.

---

## 24. Procedimento de Validação Pós-Migration

Após aplicação das migrations (após PONTO DE PARADA 3), validar:

```bash
# Confirmar que todas as migrations estão aplicadas
npx supabase migration list

# Verificar diff residual (deve retornar vazio ou mínimo)
npx supabase db diff
```

Via painel Supabase → SQL Editor, validar estrutura:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar políticas RLS
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar funções críticas
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## 25. Procedimento para Criação Posterior dos Usuários Fictícios

**Esta etapa pertence à Fase 2.2 — não executar agora.**

Após aprovação e conclusão da aplicação das migrations:

```bash
# 1. Configurar variáveis de ambiente
export SUPABASE_URL=https://<REF>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-da-homologacao>
export GSI_HOMOLOGACAO_PASSWORD=<senha-segura-de-homologacao>

# 2. Executar script de provisionamento (a ser criado na Fase 2.2)
node scripts/provision-homologacao.js

# 3. Verificar resultado (sem exibir senha)
# O script exibe: e-mails provisionados, perfis vinculados, status
```

Os 9 usuários operacionais a provisionar:

```
recepcao.teste@gsi.local          → Recepção
tecnico.enfermagem.teste@gsi.local → Técnico em Enfermagem
enfermeiro.teste@gsi.local        → Enfermeiro
medico.teste@gsi.local            → Médico
farmacia.teste@gsi.local          → Farmácia
rx.teste@gsi.local                → Técnico em RX
regulacao.teste@gsi.local         → Regulação de Transferência
administracao.teste@gsi.local     → Administração
auditoria.teste@gsi.local         → Auditoria
```

Todos os e-mails usam o domínio `@gsi.local` — nunca existem em produção.

---

## 26. Procedimento de Desvinculação Segura

Caso seja necessário desvincular o repositório do projeto de homologação:

```bash
# Remover vinculação local (não altera o projeto remoto)
# O arquivo supabase/.temp/ guarda a configuração do link
# Limpar manualmente ou via git clean (apenas arquivos não rastreados)
```

Para revogar o acesso da CLI ao projeto:

1. Acessar o painel Supabase → Account → Access Tokens
2. Revogar o token `gsi-homologacao-cli-2026`
3. Gerar novo token se necessário

Para remover um usuário fictício do banco remoto (Fase 2.2):

```bash
# Usar o modo --deprovision do script de provisionamento (a ser criado)
node scripts/provision-homologacao.js --deprovision
```

---

## 27. Riscos

| Risco                                                    | Probabilidade | Impacto   | Mitigação                                                        |
|----------------------------------------------------------|---------------|-----------|------------------------------------------------------------------|
| Uso acidental de credencial de produção em homologação   | Baixa         | Crítico   | Nomes distintos + variáveis separadas + verificação manual       |
| Token CLI salvo em arquivo rastreado                     | Baixa         | Alto      | `.gitignore` cobre `supabase/.temp/` + revisão antes de commit   |
| Project Ref exposto em log público                       | Média         | Médio     | Mascaramento obrigatório em relatórios (seção 10)                |
| `supabase link` executado no projeto errado              | Baixa         | Alto      | Verificar Project Ref antes de executar + `projects list`        |
| Senha do banco gerada fracamente                         | Baixa         | Alto      | Usar gerador do gerenciador de senhas (seção 8)                  |
| Ambiente Docker offline impede testes locais             | Confirmada    | Baixo     | Docker offline não impede operações remotas via CLI              |
| Ausência de `supabase/config.toml` local                 | Confirmada    | Médio     | Executar `npx supabase init` antes do link; revisar o arquivo gerado |
| Migration aplicada em ordem errada                       | Baixa         | Alto      | `supabase db push` aplica na ordem cronológica automaticamente   |
| Dados fictícios inseridos com dados reais por engano     | Baixa         | Crítico   | Prefixo `TESTE_` + revisão antes de aplicar seed                 |
| Acumulação de dados inconsistentes no banco              | Média         | Baixo     | Reset periódico do ambiente de homologação (procedure na seção 23) |

---

## 28. Pontos de Parada Obrigatórios

### PONTO DE PARADA 1

**Momento:** Após a criação manual do projeto remoto `gsi-one-homologacao` no painel Supabase e antes de executar `npx supabase link`.

**Condições para prosseguir:**

- [ ] Projeto `gsi-one-homologacao` criado e provisionado no painel Supabase
- [ ] Project Ref anotado no gerenciador de senhas
- [ ] Senha do banco registrada no gerenciador de senhas
- [ ] Anon key registrada
- [ ] Service role key registrada
- [ ] CLI autenticada (`npx supabase projects list` retorna sucesso)
- [ ] `supabase/config.toml` verificado — se ausente: executar `npx supabase init` e revisar o arquivo gerado antes de prosseguir
- [ ] Working tree do git limpo (`git status -sb`)
- [ ] Autorização explícita do responsável técnico para executar o link

**Ação de parada:** Reportar ao responsável técnico e aguardar autorização documentada antes de executar o `supabase link`.

---

### PONTO DE PARADA 2

**Momento:** Após o `npx supabase link` e antes de qualquer `db push`, `db push --dry-run` ou migration remota.

**Condições para prosseguir:**

- [ ] `npx supabase link` executado com sucesso
- [ ] `npx supabase projects list` confirma o projeto correto vinculado
- [ ] `npx supabase migration list` exibe as 31 migrations locais como pendentes no remoto
- [ ] Nenhuma migration já aplicada remotamente (banco recém-criado)
- [ ] Confirmação de que o projeto vinculado é homologação — não produção
- [ ] Autorização explícita do responsável técnico para prosseguir ao dry run

**Ação de parada:** Reportar o resultado do `migration list` ao responsável técnico e aguardar autorização para o dry run.

---

### PONTO DE PARADA 3

**Momento:** Após auditoria das migrations pendentes (incluindo dry run) e antes da aplicação real com `npx supabase db push`.

**Condições para prosseguir:**

- [ ] Dry run executado: `npx supabase db push --dry-run`
- [ ] Output do dry run revisado — nenhuma anomalia
- [ ] Nenhuma migration contém dado real
- [ ] Sequência de aplicação correta (ordem cronológica confirmada)
- [ ] Nenhuma migration foi modificada após a revisão do plano
- [ ] Rollbacks das últimas 3 migrations revisados e disponíveis
- [ ] Autorização explícita e documentada do responsável técnico para aplicar

**Ação de parada:** Apresentar o output do dry run completo ao responsável técnico. Aguardar aprovação formal documentada (mensagem, e-mail ou registro formal) antes de executar o `db push`.

---

## 29. Critérios para Autorizar a Aplicação das Migrations

A aplicação das migrations no projeto de homologação só pode ser autorizada quando:

| Critério                                                                 | Verificação                     |
|--------------------------------------------------------------------------|---------------------------------|
| Projeto `gsi-one-homologacao` criado e acessível                         | Painel Supabase                 |
| CLI autenticada e vinculada ao projeto correto                           | `supabase projects list`        |
| `migration list` mostra as 31 migrations pendentes                       | Output do comando               |
| Dry run executado sem erros                                              | Output do `db push --dry-run`   |
| Nenhuma migration contém dado real                                       | Revisão manual                  |
| Rollbacks das últimas 3 migrations disponíveis e revisados               | `supabase/rollback/`            |
| Working tree do git limpo                                                | `git status -sb`                |
| Nenhuma credencial real no repositório                                   | `git diff --check`              |
| Autorização formal do responsável técnico                                | Registro documentado            |
| Confirmação de separação de ambientes (não é o projeto de produção)      | Project Ref confirmado          |

---

## 30. Checklist Operacional

### Fase de preparação (esta etapa)

- [ ] GHAES-SESSION.md lido e aplicado
- [ ] Arquivos obrigatórios lidos (AGENTS.md, CLAUDE.md, docs de fase, .env.example, migrations)
- [ ] Estado do repositório confirmado (branch, commit, working tree)
- [ ] Supabase CLI versão confirmada: 2.109.1
- [ ] Docker local offline — registrado (não impede operações remotas)
- [ ] Runbook criado: `docs/GSI_ONE_FASE_2_1_RUNBOOK_CRIACAO_HOMOLOGACAO.md`
- [ ] Nenhum arquivo funcional alterado
- [ ] Nenhuma migration criada ou modificada
- [ ] Nenhum projeto remoto criado
- [ ] Nenhum usuário criado
- [ ] Nenhum seed criado
- [ ] Nenhum commit ou push realizado

### PONTO DE PARADA 1 — aguardando

- [ ] Projeto `gsi-one-homologacao` criado no painel Supabase
- [ ] Project Ref registrado no gerenciador de senhas
- [ ] Senha do banco registrada no gerenciador de senhas
- [ ] Chaves (anon, service role) registradas no gerenciador de senhas
- [ ] CLI autenticada: `npx supabase login`
- [ ] Autenticação validada: `npx supabase projects list`
- [ ] `supabase/config.toml` verificado — se ausente: executar `npx supabase init`
- [ ] `supabase/config.toml` gerado revisado antes de prosseguir
- [ ] Autorização recebida para executar o link

### Após PONTO DE PARADA 1

- [ ] `npx supabase link --project-ref <PROJECT_REF>` executado
- [ ] Link confirmado sem erro
- [ ] `npx supabase migration list` executado
- [ ] Output registrado para revisão

### PONTO DE PARADA 2 — aguardando

- [ ] Resultado do `migration list` reportado ao responsável técnico
- [ ] 31 migrations confirmadas como pendentes no remoto
- [ ] Nenhuma migration já aplicada indevidamente
- [ ] Autorização recebida para prosseguir ao dry run

### Após PONTO DE PARADA 2

- [ ] `npx supabase db push --dry-run` executado
- [ ] Output do dry run auditado
- [ ] Nenhuma anomalia identificada

### PONTO DE PARADA 3 — aguardando

- [ ] Output do dry run apresentado ao responsável técnico
- [ ] Autorização formal e documentada recebida para aplicar

### Após PONTO DE PARADA 3

- [ ] `npx supabase db push` executado
- [ ] `npx supabase migration list` confirma todas as 31 migrations aplicadas
- [ ] `npx supabase db diff` retorna vazio ou mínimo residual
- [ ] Estrutura do banco validada via SQL Editor
- [ ] RLS ativo confirmado via `pg_policies`

### Fase 2.2 (próxima etapa — não nesta fase)

- [ ] Script `scripts/provision-homologacao.js` criado e revisado
- [ ] 9 usuários operacionais provisionados
- [ ] Vínculos de perfil validados
- [ ] Testes de autenticação executados
- [ ] Testes de RLS executados

---

## Controle de Versão deste Documento

| Versão | Data       | Autor        | Alteração                                      |
|--------|------------|--------------|------------------------------------------------|
| 1.0    | 2026-07-26 | Erick Gomes  | Criação — runbook da Etapa 2.1                 |

---

*Este documento segue o padrão GHAES — Global Health AI Engineering Standard.*
*Referência: https://github.com/erickgomesal/ghaes*
