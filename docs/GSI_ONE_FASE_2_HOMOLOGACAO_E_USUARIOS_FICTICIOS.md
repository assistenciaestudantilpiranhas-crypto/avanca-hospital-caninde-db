# GSI ONE — Fase 2: Ambiente de Homologação e Usuários Fictícios

**Fase:** 2 — Ambiente de Homologação e Usuários Fictícios
**Data de planejamento:** 2026-07-25
**Repositório:** avanca-hospital-caninde-db
**Commit de referência:** 903519f security: protect repository secrets and document audit
**Padrão aplicado:** GHAES — Global Health AI Engineering Standard
**Status:** Plano aprovado — aguardando autorização para execução

---

## 1. Objetivo da Fase 2

Criar um ambiente de homologação seguro, reproduzível e completamente fictício que permita:

- validar o banco de dados com dados reais de teste (sem dados reais de pacientes);
- testar autenticação e autorização com todos os perfis do sistema;
- executar testes de RLS com usuários reais autenticados no Supabase Auth;
- simular fluxos assistenciais completos sem risco de exposição ou contaminação de dados;
- treinar desenvolvedores no sistema sem risco de acesso a dados reais;
- servir como base para revisões, demonstrações e validações internas.

---

## 2. Estado Atual do Projeto

| Componente                          | Estado                                      |
|-------------------------------------|---------------------------------------------|
| Banco local (Supabase CLI)          | Ativo, com todas as migrations aplicadas    |
| Projeto Supabase na nuvem           | Não criado para homologação                 |
| Projeto Supabase de produção        | Existe — separado e protegido               |
| Usuários fictícios no banco         | Nenhum criado                               |
| Seed de homologação                 | Inexistente                                 |
| Script de provisionamento           | Inexistente                                 |
| RLS                                 | Ativo e testado no ambiente local           |
| Testes autenticados                 | Existentes — rodam contra banco local       |
| `.env.example`                      | Criado na Fase 1                            |

---

## 3. Escopo da Fase 2

Esta fase cobre:

- criação do projeto Supabase de homologação (`gsi-one-homologacao`);
- aplicação de todas as migrations no projeto de homologação;
- criação dos usuários fictícios aprovados com perfis vinculados;
- criação de dados fictícios mínimos para validação de fluxos;
- configuração das variáveis de ambiente para o ambiente de homologação;
- validação de autenticação e RLS por perfil;
- documentação do procedimento completo para reprodução futura.

---

## 4. Itens Fora do Escopo

| Item                                              | Motivo                                      |
|---------------------------------------------------|---------------------------------------------|
| Qualquer dado real de paciente                    | Proibido por política GHAES e LGPD          |
| Qualquer credencial de produção                   | Ambientes estritamente separados            |
| Alteração de migrations existentes                | Proibido por política GHAES                 |
| Novas migrations nesta fase                       | Apenas se estritamente necessário           |
| Integração com sistemas externos (RNDS, DATASUS)  | Fase futura                                 |
| Módulo de faturamento                             | Fase 5                                      |
| Importação de SIGTAP real                         | Fase 6                                      |
| Alteração do frontend (`script.js`, `auth.js`)    | Fase 3 e posteriores                        |
| Automação de CI/CD para homologação               | Fase futura                                 |

---

## 5. Arquitetura dos Ambientes

### 5.1 Local (desenvolvimento)

| Parâmetro              | Valor                                   |
|------------------------|-----------------------------------------|
| Ferramenta             | Supabase CLI (`npx supabase start`)     |
| API URL                | `http://127.0.0.1:54321`                |
| Banco PostgreSQL        | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Auth (Studio)          | `http://127.0.0.1:54323`                |
| Dados                  | Fictícios — seed local                  |
| Reset                  | `npx supabase db reset`                 |
| Migrations             | Aplicadas automaticamente no reset      |
| Acesso externo         | Não — apenas loopback                   |

### 5.2 Homologação

| Parâmetro              | Valor                                            |
|------------------------|--------------------------------------------------|
| Plataforma             | Supabase (projeto na nuvem)                      |
| Nome do projeto        | `gsi-one-homologacao`                            |
| Região                 | South America (São Paulo) — `sa-east-1`          |
| API URL                | Obtida após criação do projeto (não hardcodar)   |
| Dados                  | Exclusivamente fictícios                         |
| Reset                  | Via `supabase db push` ou `supabase db reset --linked` |
| Migrations             | Aplicadas via CLI com projeto linkado            |
| Acesso                 | Restrito à equipe de desenvolvimento             |
| Credenciais            | Variáveis de ambiente — nunca em arquivo rastreado |

### 5.3 Produção

| Parâmetro              | Valor                                            |
|------------------------|--------------------------------------------------|
| Plataforma             | Supabase (projeto na nuvem separado)             |
| Dados                  | Dados reais do hospital                          |
| Acesso                 | Restrito ao hospital e à equipe autorizada       |
| Migrations             | Aplicadas com aprovação explícita                |
| Credenciais            | Gerenciadas pelo responsável técnico             |
| Separação              | NUNCA compartilhar chaves, URLs ou banco com homologação |

### 5.4 Regra de separação entre ambientes

```
local     ≠  homologação  ≠  produção

- Projetos Supabase diferentes;
- Bancos PostgreSQL diferentes;
- Chaves diferentes (anon key, service role key);
- URLs diferentes;
- Usuários diferentes;
- Dados diferentes;
- Nenhuma credencial de produção é usada em homologação.
```

---

## 6. Nome Aprovado do Projeto de Homologação

**`gsi-one-homologacao`**

Regras de nomenclatura:

- nome em minúsculas com hifens;
- sem números de versão (o nome deve ser estável);
- sem referências geográficas no nome técnico;
- identificável como ambiente de teste por convenção interna (não por exposição pública).

---

## 7. Política de Dados Fictícios

### Regras absolutas

| Regra                                                         | Aplicação                     |
|---------------------------------------------------------------|-------------------------------|
| Nenhum CPF real                                               | Todos os ambientes            |
| Nenhum CNS real                                               | Todos os ambientes            |
| Nenhum nome completo de paciente real                         | Todos os ambientes            |
| Nenhum telefone real                                          | Todos os ambientes            |
| Nenhum endereço real de paciente                              | Todos os ambientes            |
| Nenhum prontuário real                                        | Todos os ambientes            |
| Nenhum dado de saúde real                                     | Todos os ambientes            |
| CPFs fictícios matematicamente inválidos                      | Formato reconhecidamente falso |
| CNS série 700 (reservada para testes)                         | Formato reconhecidamente falso |
| Nomes claramente fictícios ou prefixados com `TESTE_`         | Identificação visual imediata  |
| Dados de homologação nunca migrados para produção             | Isolamento garantido           |

### Padrão de CPF fictício aprovado

```
Formato: 000.000.000-00
Exemplos aprovados:
  111.111.111-11
  222.222.222-22
  000.000.001-00
  000.000.002-00
```

CPFs com dígito verificador matematicamente inválido — não passam em validação real.

### Padrão de CNS fictício aprovado

```
Série: 700 0000 0000 XXX
Exemplos:
  700 0000 0000 001
  700 0000 0000 002
```

### Padrão de nomes fictícios aprovado

```
Prefixo TESTE_ + nome descritivo do caso:
  TESTE_Paciente Adulto Masculino
  TESTE_Paciente Pediatrico
  TESTE_Paciente Obstetrico
  TESTE_Gestante 32 Semanas
```

---

## 8. Política de Credenciais

### Usuários fictícios

| Regra                                                          |
|----------------------------------------------------------------|
| E-mails no domínio `@gsi.local` — nunca existem em produção   |
| Senhas nunca salvas em arquivo rastreado                       |
| Senhas fornecidas via variável de ambiente no momento da criação |
| Senhas de homologação nunca iguais às de produção              |
| Troca de senha após qualquer suspeita de exposição             |

### Credenciais de infraestrutura

| Chave                       | Onde usar                              | Onde nunca usar           |
|-----------------------------|----------------------------------------|---------------------------|
| `SUPABASE_URL`              | Frontend, scripts de desenvolvimento  | —                         |
| `SUPABASE_ANON_KEY`         | Frontend (leitura pública via RLS)     | —                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts administrativos, CI/CD         | Frontend, arquivos rastreados |
| `SUPABASE_DB_URL`           | Testes de integração locais            | Frontend, arquivos rastreados |

---

## 9. Política de Segredos

| Regra                                                                          |
|--------------------------------------------------------------------------------|
| Nenhuma chave real em arquivo rastreado pelo git                                |
| Nenhuma senha em arquivo rastreado pelo git                                     |
| Nenhuma URL de produção hardcoded em código-fonte                               |
| `.env`, `.env.local`, `.env.*.local` — cobertos pelo `.gitignore` (Fase 1)    |
| Variáveis de ambiente de homologação: configuradas no painel Netlify ou CLI    |
| Variáveis de ambiente de produção: gerenciadas pelo responsável técnico        |
| Service role nunca exposta ao navegador em nenhum ambiente                     |
| Rotação de chaves: procedimento a ser documentado antes de ir a produção       |
| Suspeita de vazamento: revogar imediatamente no painel Supabase                |

---

## 10. Estratégia de Reprodução do Banco por Migrations

O ambiente de homologação reproduz o banco de produção exclusivamente por migrations.

### Princípio

```
Nenhum dump de produção → nenhuma importação de esquema manual.
Apenas migrations na ordem numérica aplicadas sequencialmente.
O banco de homologação é uma construção determinista a partir do zero.
```

### Sequência atual de migrations (a ser aplicada na ordem)

| Arquivo                                                           | Conteúdo                                |
|-------------------------------------------------------------------|-----------------------------------------|
| `20260623100001_dominios.sql`                                     | Domínios e enumerações                  |
| `20260623100002_usuarios.sql`                                     | Tabela de usuários                      |
| `20260623100003_audit_log.sql`                                    | Trilha de auditoria                     |
| `20260623100004_acesso.sql`                                       | Perfis, permissões, vínculos + seeds    |
| `20260623100005_pacientes.sql`                                    | Tabela de pacientes                     |
| `20260623100006_atendimentos.sql`                                 | Tabela de atendimentos                  |
| `20260623100007_clinico.sql`                                      | Tabelas clínicas                        |
| `20260623100008_exames.sql`                                       | Tabela de exames                        |
| `20260623100009_estoque.sql`                                      | Tabela de estoque                       |
| `20260623100010_prescricoes.sql`                                  | Tabela de prescrições                   |
| `20260623100011_transferencias.sql`                               | Tabela de transferências                |
| `20260623100012_rls_policies.sql`                                 | Políticas RLS                           |
| `20260623100013_audit_triggers.sql`                               | Triggers de auditoria                   |
| `20260623100014_updated_at_estoque_triggers.sql`                  | Triggers de updated_at                  |
| `20260623100015_regras_fluxo_assistencial.sql`                    | Regras do fluxo assistencial            |
| `20260623100016_hardening_funcoes.sql`                            | Hardening de funções                    |
| `20260623100017_bootstrap_admin.sql`                              | Função de bootstrap do admin            |
| `20260623100018_fix_bootstrap_admin_ambiguity.sql`                | Correção de ambiguidade                 |
| `20260623100019_configuracoes_sistema.sql`                        | Configurações do sistema                |
| `20260623100020_renomear_perfis_oficiais.sql`                     | Renomeação dos perfis oficiais          |
| `20260623100021_compatibilizar_rls_perfis_renomeados.sql`         | RLS pós-renomeação                      |
| `20260623100022_grants_tabelas_operacionais.sql`                  | Grants operacionais                     |
| `20260623100023_grants_tabelas_observacao_estabilizacao_transferencia.sql` | Grants adicionais            |
| `20260623100024_perfil_enfermeiro_transferencia_checklist.sql`    | Perfil Enfermeiro                       |
| `20260623100025_grant_select_tabelas_acesso_authenticated.sql`    | Grants de acesso autenticado            |
| `20260623100026_ampliar_perfil_enfermeiro_fluxo_assistencial.sql` | Ampliação do perfil Enfermeiro          |
| `20260623100027_grant_select_dom_tables_authenticated.sql`        | Grants em tabelas de domínio            |
| `20260623100028_hardening_dangerous_grants.sql`                   | Remoção de grants perigosos             |
| `20260709170000_block_delete_assistencial_audit_append_only.sql`  | Proteção audit append-only              |
| `20260722100029_rls_select_phase_a_positive_permissions.sql`      | RLS Fase A — permissões positivas       |
| `20260722100030_grant_tabelas_clinicas_estendidas.sql`            | Grants clínicos estendidos              |
| `20260722100031_rls_phase_b1_read_permissions.sql`                | RLS Fase B1 — permissões de leitura     |

**Total: 31 migrations** — todas devem ser aplicadas na ordem acima antes de qualquer dado.

---

## 11. Estratégia de Aplicação de Migrations

### No ambiente local

```bash
npx supabase db reset
# Aplica todas as migrations em ordem + seed local, se existir
```

### No ambiente de homologação (procedimento futuro)

```bash
# 1. Linkar o projeto de homologação
npx supabase link --project-ref <REF_HOMOLOGACAO>

# 2. Verificar status das migrations
npx supabase migration list

# 3. Aplicar migrations pendentes
npx supabase db push

# 4. Verificar resultado
npx supabase migration list
```

**Pré-condições:**
- projeto `gsi-one-homologacao` criado no painel Supabase;
- `SUPABASE_ACCESS_TOKEN` configurado;
- desenvolvedor com permissão no projeto;
- nenhuma migration de produção pendente.

---

## 12. Estratégia de Rollback

### Rollbacks disponíveis

O repositório possui rollbacks para as últimas três migrations críticas:

| Migration                              | Rollback correspondente                              |
|----------------------------------------|------------------------------------------------------|
| `20260722100029_rls_select_phase_a...` | `20260722100029_rls_select_phase_a..._rollback.sql`  |
| `20260722100030_grant_tabelas_clinicas...` | `20260722100030_grant_tabelas_clinicas..._rollback.sql` |
| `20260722100031_rls_phase_b1...`       | `20260722100031_rls_phase_b1..._rollback.sql`        |

### Procedimento de rollback em homologação

```bash
# Executar o rollback correspondente via psql ou Supabase SQL editor
# Nunca editar migrations já aplicadas — sempre usar rollback explícito
psql $SUPABASE_DB_URL -f supabase/rollback/<arquivo>_rollback.sql
```

### Rollback completo (reset de homologação)

Em caso de estado inconsistente, o ambiente de homologação pode ser resetado:

```bash
# Via painel Supabase: Database → Reset database
# Em seguida re-aplicar todas as migrations:
npx supabase db push
```

O reset em homologação é seguro — não há dados reais.

---

## 13. Estratégia de Usuários Fictícios

### Princípio de provisionamento

A criação de usuários fictícios segue este fluxo:

```
1. Usuário criado em auth.users via Admin API (service role)
2. Registro criado manualmente em public.usuarios (INSERT)
3. Vínculo criado em public.usuario_perfil (INSERT)
4. Vínculo de permissões já existe via perfil_permissao (seed da migration 20260623100004)
```

### Reutilização do bootstrap existente

A função `public.bootstrap_primeiro_admin(p_auth_user_id, p_nome, p_email, ...)` existe no banco (migration `20260623100017`) e foi criada especificamente para vincular o **primeiro administrador** ao perfil 'Administração'.

**Ela NÃO é reutilizável para os demais usuários fictícios**, pois:
- verifica se já existe um administrador ativo e falha se existir;
- é restrita ao perfil 'Administração';
- tem semântica de inicialização única.

**Conclusão:** será necessário um script específico de provisionamento para os usuários de homologação, conforme descrito na seção 21.

---

## 14. Lista dos Usuários Aprovados

### Usuários operacionais (9 contas)

| E-mail                               | Perfil vinculado            | Categoria profissional sugerida |
|--------------------------------------|-----------------------------|---------------------------------|
| `recepcao.teste@gsi.local`           | Recepção                    | Recepcionista                   |
| `tecnico.enfermagem.teste@gsi.local` | Técnico em Enfermagem       | Técnico em Enfermagem           |
| `enfermeiro.teste@gsi.local`         | Enfermeiro                  | Enfermeiro                      |
| `medico.teste@gsi.local`             | Médico                      | Médico                          |
| `farmacia.teste@gsi.local`           | Farmácia                    | Farmacêutico                    |
| `rx.teste@gsi.local`                 | Técnico em RX               | Técnico em Radiologia           |
| `regulacao.teste@gsi.local`          | Regulação de Transferência  | Regulador                       |
| `administracao.teste@gsi.local`      | Administração               | Administrador de Sistema        |
| `auditoria.teste@gsi.local`          | Auditoria                   | Auditor                         |

### Usuários de validação (3 contas — proposta)

| E-mail                               | Situação                          | Finalidade do teste              |
|--------------------------------------|-----------------------------------|----------------------------------|
| `sem.perfil.teste@gsi.local`         | Ativo — sem perfil vinculado      | Validar bloqueio por RLS sem perfil |
| `inativo.teste@gsi.local`            | Inativo (`ativo = false`)         | Validar bloqueio de usuário inativo |
| `multiplo.perfil.teste@gsi.local`    | Ativo — Farmácia + Técnico em Enfermagem | Validar acesso com múltiplos perfis |

**Estas 3 contas são propostas documentais — não serão criadas nesta fase.**

---

## 15. Mapeamento Usuário → Perfil

| Usuário fictício                     | Perfil no banco (`perfis_acesso.nome`) |
|--------------------------------------|----------------------------------------|
| `recepcao.teste@gsi.local`           | Recepção                               |
| `tecnico.enfermagem.teste@gsi.local` | Técnico em Enfermagem                  |
| `enfermeiro.teste@gsi.local`         | Enfermeiro                             |
| `medico.teste@gsi.local`             | Médico                                 |
| `farmacia.teste@gsi.local`           | Farmácia                               |
| `rx.teste@gsi.local`                 | Técnico em RX                          |
| `regulacao.teste@gsi.local`          | Regulação de Transferência             |
| `administracao.teste@gsi.local`      | Administração                          |
| `auditoria.teste@gsi.local`          | Auditoria                              |

**Nota sobre nomes de perfis:** a migration `20260623100020` renomeou perfis. Os nomes acima são os nomes pós-renomeação. O script de provisionamento deve buscar o perfil pelo nome atual — nunca por ID hardcoded.

---

## 16. Mapeamento Perfil → Permissões Esperadas

Extraído das migrations `20260623100004_acesso.sql`, `20260623100024`, `20260623100026`:

### Recepção

| Permissão             | Chave                   |
|-----------------------|-------------------------|
| Cadastrar paciente    | `paciente.criar`        |
| Abrir atendimento     | `atendimento.abrir`     |

### Técnico em Enfermagem

| Permissão                         | Chave                             |
|-----------------------------------|-----------------------------------|
| Registrar alergia                 | `paciente.alergia.registrar`      |
| Registrar comorbidade             | `paciente.comorbidade.registrar`  |
| Classificar risco na triagem      | `triagem.classificar`             |
| Registrar evolução de enfermagem  | `enfermagem.evolucao.registrar`   |
| Reavaliar em observação           | `observacao.reavaliar`            |
| Marcar checklist de estabilização | `estabilizacao.checklist_item`    |

### Enfermeiro

| Permissão                         | Chave                             |
|-----------------------------------|-----------------------------------|
| Registrar alergia                 | `paciente.alergia.registrar`      |
| Registrar comorbidade             | `paciente.comorbidade.registrar`  |
| Classificar risco na triagem      | `triagem.classificar`             |
| Registrar evolução de enfermagem  | `enfermagem.evolucao.registrar`   |
| Reavaliar em observação           | `observacao.reavaliar`            |
| Marcar checklist de estabilização | `estabilizacao.checklist_item`    |
| Confirmar checklist transferência | `transferencia.confirmar_checklist` |
| Confirmar saída de transferência  | `transferencia.confirmar_saida`   |

### Médico

| Permissão                         | Chave                             |
|-----------------------------------|-----------------------------------|
| Registrar alergia                 | `paciente.alergia.registrar`      |
| Registrar comorbidade             | `paciente.comorbidade.registrar`  |
| Iniciar consulta                  | `consulta.iniciar`                |
| Registrar conduta                 | `consulta.registrar_conduta`      |
| Reavaliar em observação           | `observacao.reavaliar`            |
| Solicitar exame                   | `exame.solicitar`                 |
| Visualizar exames                 | `exame.visualizar`                |
| Criar prescrição                  | `prescricao.criar`                |
| Solicitar transferência           | `transferencia.solicitar`         |

### Farmácia

| Permissão                 | Chave                    |
|---------------------------|--------------------------|
| Dispensar prescrição      | `prescricao.dispensar`   |
| Movimentar estoque        | `estoque.movimentar`     |

### Técnico em RX

| Permissão                 | Chave                        |
|---------------------------|------------------------------|
| Visualizar exames         | `exame.visualizar`           |
| Liberar resultado         | `exame.liberar_resultado`    |
| Marcar resultado crítico  | `exame.marcar_critico`       |

### Regulação de Transferência

| Permissão                 | Chave                          |
|---------------------------|--------------------------------|
| Aprovar vaga              | `transferencia.aprovar_vaga`   |

### Administração

| Permissão                  | Chave                      |
|----------------------------|----------------------------|
| Cadastrar paciente         | `paciente.criar`           |
| Abrir atendimento          | `atendimento.abrir`        |
| Movimentar estoque         | `estoque.movimentar`       |
| Gerenciar configurações    | `configuracoes.gerenciar`  |

### Auditoria

| Permissão                  | Chave                      |
|----------------------------|----------------------------|
| Visualizar exames          | `exame.visualizar`         |
| Visualizar auditoria       | `auditoria.visualizar`     |

---

## 17. Usuário Sem Perfil

**Conta:** `sem.perfil.teste@gsi.local`

- Criado em `auth.users` e em `public.usuarios` (`ativo = true`);
- Nenhum registro em `public.usuario_perfil`;
- Nenhum registro em `public.perfil_permissao` vinculado;
- Deve ter acesso negado a todas as tabelas clínicas por RLS;
- Utilizado para validar que autenticação sem perfil não confere permissão.

**Resultado esperado nos testes:**
- `SELECT` em `pacientes` → vazio (RLS bloqueia);
- `SELECT` em `atendimentos` → vazio;
- `INSERT` em qualquer tabela clínica → erro de permissão;
- Login bem-sucedido no Supabase Auth (autenticação ≠ autorização).

---

## 18. Usuário Inativo

**Conta:** `inativo.teste@gsi.local`

- Criado em `auth.users` e em `public.usuarios` com `ativo = false`;
- Pode ter um perfil vinculado (ex: Recepção) para testar que perfil + inativo = bloqueio;
- A função `has_perfil()` deve verificar `ativo = true` — usuário inativo não passa;
- Deve ter acesso negado mesmo com perfil válido vinculado.

**Resultado esperado nos testes:**
- Login no Supabase Auth: bem-sucedido (Auth não sabe do campo `ativo`);
- `SELECT` em `pacientes` → vazio (RLS verifica `ativo = true`);
- Nenhuma operação de escrita permitida.

---

## 19. Usuário com Múltiplos Perfis

**Conta:** `multiplo.perfil.teste@gsi.local`

- Criado em `auth.users` e em `public.usuarios` (`ativo = true`);
- Dois registros em `public.usuario_perfil`: Farmácia + Técnico em Enfermagem;
- Deve ter acesso à união das permissões de ambos os perfis;
- Testa que `has_permission()` considera todos os perfis vinculados ao usuário.

**Permissões esperadas (união):**

| Permissão                          | Origem do perfil      |
|------------------------------------|-----------------------|
| `prescricao.dispensar`             | Farmácia              |
| `estoque.movimentar`               | Farmácia              |
| `paciente.alergia.registrar`       | Técnico em Enfermagem |
| `paciente.comorbidade.registrar`   | Técnico em Enfermagem |
| `triagem.classificar`              | Técnico em Enfermagem |
| `enfermagem.evolucao.registrar`    | Técnico em Enfermagem |
| `observacao.reavaliar`             | Técnico em Enfermagem |
| `estabilizacao.checklist_item`     | Técnico em Enfermagem |

---

## 20. Estratégia de Senhas

### Regras absolutas

- Senhas nunca salvas em arquivo rastreado;
- Senhas nunca registradas em documentação pública;
- Senhas de homologação nunca iguais às de produção;
- Senhas fornecidas via variável de ambiente no momento da execução do script;
- Comprimento mínimo: 12 caracteres;
- Complexidade: letras maiúsculas, minúsculas, números e símbolo;
- Uma senha por ambiente — todas as contas de homologação podem usar a mesma senha (o isolamento é por ambiente, não por usuário);
- Troca obrigatória se houver suspeita de exposição.

### Variável de ambiente para o script

```bash
# Exemplo de execução (senha NÃO aparece em arquivo):
export GSI_HOMOLOGACAO_PASSWORD="<senha-segura>"
node scripts/provision-homologacao.js
```

---

## 21. Estratégia de Provisionamento

### Opção preferencial: script administrativo local controlado

**Características:**

- execução manual, controlada pelo desenvolvedor;
- leitura de senha via variável de ambiente (`GSI_HOMOLOGACAO_PASSWORD`);
- leitura de service role via `SUPABASE_SERVICE_ROLE_KEY` (variável de ambiente);
- criação idempotente — re-execução não duplica usuários nem vínculos;
- criação do usuário em `auth.users` via Admin API do Supabase;
- inserção em `public.usuarios` via SQL direto (service role ignora RLS);
- busca do perfil pelo nome (`perfis_acesso.nome`) — não por ID hardcoded;
- inserção em `public.usuario_perfil` se ainda não existir;
- relatório final exibindo e-mails provisionados — sem exibir senha;
- possibilidade de modo `--dry-run` para validação sem escrita;
- possibilidade de remoção segura (`--deprovision`) para limpeza.

**Localização prevista:**

```
scripts/provision-homologacao.js   ← a ser criado na execução da Fase 2
```

**Este script será rastreado pelo git.** Ele não conterá credenciais — apenas a lógica de criação. As credenciais virão exclusivamente de variáveis de ambiente.

### Alternativa: SQL manual via painel Supabase

Para ambientes sem acesso ao CLI, a criação pode ser feita manualmente:

1. Criar usuário no painel Supabase: Authentication → Users → New User;
2. Copiar o UUID gerado;
3. Executar no SQL Editor:

```sql
-- Substituir valores fictícios conforme o usuário
INSERT INTO public.usuarios (id, nome, categoria_profissional, email, ativo)
VALUES (
  '<UUID-copiado>',
  'TESTE_Nome do Perfil',
  'Categoria Profissional',
  'perfil.teste@gsi.local',
  true
);

INSERT INTO public.usuario_perfil (usuario_id, perfil_id)
SELECT '<UUID-copiado>', id
FROM public.perfis_acesso
WHERE nome = '<Nome Exato do Perfil>';
```

Esta alternativa é válida, porém menos reproduzível e mais propensa a erro manual.

---

## 22. Estratégia de Desprovisionamento

Para remover um usuário fictício sem deixar rastros inconsistentes:

1. Remover da `public.usuario_perfil` (CASCADE automático via FK, se configurado);
2. Remover de `public.usuarios`;
3. Remover de `auth.users` via painel Supabase ou Admin API;
4. Verificar `audit_log` para confirmar que registros fictícios foram gerados apenas em homologação.

O script de provisionamento incluirá a opção `--deprovision` para automatizar os passos 1 a 3.

---

## 23. Dados Fictícios Mínimos Necessários

### Objetivo

Permitir validação dos fluxos assistenciais completos sem necessidade de inserção manual a cada teste.

Os dados fictícios serão organizados em `supabase/seed/homologacao/` — a ser criado na execução da Fase 2. Estes arquivos **não serão aplicados automaticamente** pelo `supabase db reset` local (que usa `supabase/seed.sql` se existir). Serão aplicados manualmente no ambiente de homologação ou via script de setup.

---

## 24. Pacientes Fictícios

Mínimo de 10 pacientes fictícios cobrindo os casos de uso principais:

| Nome                             | Perfil do caso                         | Observação                              |
|----------------------------------|----------------------------------------|-----------------------------------------|
| TESTE_Adulto Masculino 45a       | Adulto masculino, 45 anos              | Caso mais comum — dor torácica          |
| TESTE_Adulto Feminino 30a        | Adulto feminino, 30 anos               | Queixa ginecológica                     |
| TESTE_Pediatrico 5a              | Criança, 5 anos                        | Febre — observação pediátrica           |
| TESTE_Pediatrico Lactente        | Criança < 2 anos                       | Caso de risco pediátrico                |
| TESTE_Gestante 32 Semanas        | Gestante, 3º trimestre                 | Observação obstétrica                   |
| TESTE_Idoso 75a                  | Idoso, 75 anos                         | Múltiplas comorbidades                  |
| TESTE_Alta Complexidade          | Adulto — sala de estabilização         | Risco Vermelho                          |
| TESTE_Transferencia Regulada     | Adulto — transferência necessária      | Regulação ativa                         |
| TESTE_Alta Medica                | Adulto — alta simples                  | Desfecho Alta                           |
| TESTE_Evasao                     | Adulto — evasão/desistência            | Desfecho Evasão                         |

**Campos obrigatórios por paciente:**
- `nome` (prefixado `TESTE_`)
- `cpf` (fictício, inválido matematicamente)
- `cartao_sus` (série 700)
- `data_nascimento` (fictícia)
- `municipio`
- `perfil_residencia`

---

## 25. Atendimentos Fictícios

Para cada paciente fictício: um atendimento associado, cobrindo todos os status possíveis:

| Status de atendimento          | Quantidade mínima |
|-------------------------------|-------------------|
| Aguardando triagem             | 2                 |
| Em triagem                     | 1                 |
| Aguardando consulta            | 2                 |
| Em consulta                    | 1                 |
| Em observação clínica          | 1                 |
| Em observação pediátrica       | 1                 |
| Em observação obstétrica       | 1                 |
| Sala de estabilização          | 1                 |
| Transferência regulada         | 1                 |
| Alta                           | 2                 |
| Evasão                         | 1                 |

---

## 26. Fluxos Assistenciais Fictícios

Para validação de fluxo completo, ao menos um atendimento deve completar o percurso:

**Fluxo 1 — Adulto com alta:**
```
Chegada → Acolhimento → Triagem (Amarelo) → Consulta → Evolução de Enfermagem → Alta
```

**Fluxo 2 — Pediátrico com observação:**
```
Chegada → Acolhimento → Triagem (Verde) → Observação Pediátrica → Alta
```

**Fluxo 3 — Estabilização e transferência:**
```
Chegada → Acolhimento → Triagem (Vermelho) → Sala de Estabilização → Solicitação de Transferência → Transferência Regulada
```

**Fluxo 4 — Obstétrico:**
```
Chegada → Acolhimento → Triagem (Amarelo) → Observação Obstétrica → Alta
```

---

## 27. Dados Fictícios de Exames

Mínimo para validação do módulo:

- 3 solicitações de exame (status: solicitado, em andamento, com resultado);
- 1 exame com resultado crítico (`marcar_critico`);
- 1 exame liberado (`liberar_resultado`);
- Solicitações vinculadas a pacientes fictícios existentes.

---

## 28. Dados Fictícios de Farmácia

Mínimo para validação do módulo:

- 5 itens de estoque (medicamentos fictícios: `TESTE_Dipirona 500mg`, `TESTE_Soro Fisiológico 0,9% 250ml`, etc.);
- 2 prescrições vinculadas a consultas fictícias;
- 1 prescrição dispensada;
- 1 movimentação de estoque registrada.

---

## 29. Dados Fictícios de Transferências

Mínimo para validação do módulo:

- 2 transferências em status diferentes:
  - 1 solicitada (aguardando aprovação de vaga);
  - 1 com checklist confirmado pelo Enfermeiro;
  - 1 com saída confirmada.
- Destino fictício: `TESTE_Hospital de Referência Sergipe`.
- Motivo: `TESTE_Necessidade de especialidade não disponível`.

---

## 30. Dados Fictícios de Faturamento (Futuro)

O módulo de faturamento (Fase 5) ainda não existe. Para homologação futura:

- estrutura mínima: vínculo atendimento → procedimento SIGTAP;
- competência fictícia: `2026-07` (formato `AAAA-MM`);
- pelo menos 3 procedimentos registrados por atendimento fictício;
- 1 competência fechada para validação de relatório BPA.

Estes dados **não serão criados na Fase 2** — documentados aqui para planejamento.

---

## 31. Política de Limpeza e Reset

### Quando resetar o ambiente de homologação

- Após conclusão de cada fase de testes;
- Quando há inconsistência de dados;
- Quando uma nova migration é aplicada e os dados antigos são incompatíveis;
- Quando qualquer suspeita de contaminação com dados reais.

### Procedimento de reset

1. Acesso ao painel Supabase do projeto `gsi-one-homologacao`;
2. Database → Reset database (ou via CLI: `supabase db reset --linked`);
3. Re-aplicação de migrations: `npx supabase db push`;
4. Re-execução do script de provisionamento;
5. Re-aplicação do seed de dados fictícios;
6. Validação pós-reset: testes de autenticação e RLS.

### Proteção de dados reais após limpeza

Em homologação, o reset é seguro — não há dados reais. A preocupação de proteção se aplica exclusivamente ao ambiente de produção.

---

## 32. Auditoria

- A tabela `audit_log` está ativa em homologação (mesma estrutura de produção);
- Toda operação de escrita nos fluxos fictícios gera registro auditável;
- O `audit_log` de homologação deve permanecer independente do de produção;
- Testes de auditoria devem verificar que ações fictícias geram entradas corretas;
- O `audit_log` em homologação é append-only (migration `20260709170000`);
- Nenhuma limpeza manual do `audit_log` durante testes — apenas via reset completo.

---

## 33. Logs

- Logs do Supabase CLI: visíveis via `npx supabase logs`;
- Logs da API: painel Supabase → Logs → API;
- Logs de autenticação: painel Supabase → Logs → Auth;
- Erros de RLS: aparecem como HTTP 200 com body vazio (PostgREST não expõe detalhes de RLS);
- Para depuração de RLS: executar `SET ROLE authenticated; SET request.jwt.claims TO ...;` direto no SQL Editor.

---

## 34. Testes de Autenticação

Cobrir, por usuário fictício:

- Login com credenciais corretas → sucesso;
- Login com senha incorreta → falha esperada;
- Login com e-mail não cadastrado → falha esperada;
- Sessão ativa após login → token válido;
- Logout → token invalidado;
- Sessão expirada → comportamento correto.

**Arquivo de referência:** `tests/unit/auth-session.test.js`

---

## 35. Testes de RLS

Cobrir, por tabela e por perfil:

- `SELECT` em `pacientes`: cada perfil vê o que deve ver;
- `INSERT` em `atendimentos`: apenas Recepção e Administração;
- `UPDATE` em tabelas clínicas: apenas perfis com permissão correspondente;
- `DELETE` em tabelas assistenciais: bloqueado para todos (migration `20260709170000`);
- Auditoria: `INSERT` direto em `audit_log` bloqueado para `authenticated`.

**Arquivo de referência:** `tests/security/rls-grants.test.js`, `tests/security/phase-a-select-access.test.js`

---

## 36. Testes por Perfil

Para cada perfil, validar:

- acesso às permissões listadas na seção 16 (devem funcionar);
- bloqueio nas permissões não listadas (devem falhar silenciosamente por RLS);
- identificação correta do perfil via `has_perfil()`;
- permissões corretas via `has_permission()`.

---

## 37. Testes de Múltiplos Perfis

Para `multiplo.perfil.teste@gsi.local`:

- login → sucesso;
- `has_perfil('Farmácia')` → true;
- `has_perfil('Técnico em Enfermagem')` → true;
- `has_permission('prescricao.dispensar')` → true (Farmácia);
- `has_permission('triagem.classificar')` → true (Técnico em Enfermagem);
- `has_permission('consulta.iniciar')` → false (nenhum dos dois perfis possui);
- `SELECT` em `atendimentos` → retorna registros vinculados (ambas as permissões concedem acesso).

---

## 38. Testes de Usuário Inativo

Para `inativo.teste@gsi.local`:

- login no Supabase Auth → sucesso (Auth não verifica `ativo`);
- `SELECT` em `pacientes` → vazio (RLS verifica `ativo = true`);
- `has_perfil()` → deve retornar false para usuário inativo;
- `has_permission()` → deve retornar false para usuário inativo;
- nenhuma operação de escrita permitida.

---

## 39. Testes de Usuário Sem Perfil

Para `sem.perfil.teste@gsi.local`:

- login no Supabase Auth → sucesso;
- `SELECT` em `pacientes` → vazio;
- `SELECT` em `atendimentos` → vazio;
- `has_perfil()` → false;
- `has_permission()` → false;
- `INSERT` em qualquer tabela clínica → erro de permissão ou vazio.

---

## 40. Critérios de Aprovação da Fase 2

| Critério                                                              | Verificação              |
|-----------------------------------------------------------------------|--------------------------|
| Projeto `gsi-one-homologacao` criado e acessível                      | Painel Supabase          |
| Todas as 31 migrations aplicadas sem erro                             | `supabase migration list` |
| 9 usuários operacionais criados e autenticáveis                       | Testes de login           |
| Vínculos de perfil corretos para todos os 9 usuários                  | SQL direto ou testes      |
| RLS validado: cada perfil acessa somente o que deve                   | `tests/security/`         |
| Usuário sem perfil bloqueado                                          | Teste direto              |
| Usuário inativo bloqueado                                             | Teste direto              |
| Usuário com múltiplos perfis com acesso correto                       | Teste direto              |
| Dados fictícios mínimos inseridos e acessíveis                        | SELECT no banco           |
| Nenhuma credencial real no repositório                                | `git status -sb`          |
| Nenhuma credencial de produção usada em homologação                   | Revisão manual            |
| `audit_log` registrando operações corretamente                        | Testes de auditoria       |

---

## 41. Riscos

| Risco                                               | Probabilidade | Impacto   | Mitigação                                                   |
|-----------------------------------------------------|---------------|-----------|-------------------------------------------------------------|
| Uso acidental de credencial de produção em homologação | Baixo      | Crítico   | Ambientes com nomes distintos + variáveis separadas         |
| Dado real inserido por engano em homologação        | Baixo         | Crítico   | Todos os dados prefixados com `TESTE_` + revisão            |
| Migration aplicada em ordem errada                  | Baixo         | Alto      | `supabase db push` aplica na ordem correta automaticamente  |
| Senha de homologação exposta via log                | Médio         | Médio     | Script sem `console.log` de senha + variável de ambiente    |
| Script de provisionamento com bug silencioso        | Médio         | Médio     | Modo `--dry-run` + verificação pós-execução                 |
| Usuário fictício com perfil errado                  | Médio         | Médio     | Busca por nome de perfil (não por ID) + teste de validação  |
| Testes passando em local mas falhando em homologação | Médio        | Alto      | Testes executados também em homologação antes de aprovar    |
| Acumulação de dados fictícios inconsistentes        | Alto          | Baixo     | Reset periódico do ambiente de homologação                  |

---

## 42. Dependências

| Dependência                                     | Tipo           | Responsável            |
|-------------------------------------------------|----------------|------------------------|
| Conta Supabase com plano free ou pago           | Infraestrutura | Desenvolvedor          |
| Criação manual do projeto `gsi-one-homologacao` | Infraestrutura | Desenvolvedor          |
| Configuração de variáveis de ambiente           | Configuração   | Desenvolvedor          |
| Definição da senha de homologação               | Segurança      | Desenvolvedor          |
| Script de provisionamento criado e testado      | Desenvolvimento | Desenvolvedor          |
| Fase 1 concluída (Fase 2 depende de Fase 1)     | Sequencial     | Concluída              |

---

## 43. Procedimento Futuro: Criação do Projeto Remoto

Quando autorizado, o desenvolvedor executará:

1. Acesso ao painel Supabase: [supabase.com/dashboard](https://supabase.com/dashboard)
2. New Project → Organization: selecionar organização do GSI
3. Name: `gsi-one-homologacao`
4. Region: South America (São Paulo)
5. Database password: senha segura, salva em gerenciador de senhas (não no repositório)
6. Anotar: Project URL, anon key, service role key
7. Salvar nas variáveis de ambiente locais (não commitar)

---

## 44. Procedimento Futuro: Configuração de Variáveis de Ambiente

Após criação do projeto, configurar localmente:

```bash
# .env.local (não commitado — coberto pelo .gitignore)
SUPABASE_URL=https://<REF>.supabase.co
SUPABASE_ANON_KEY=<anon-key-da-homologacao>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-da-homologacao>
SUPABASE_DB_URL=postgresql://postgres:<db-password>@<REF>.supabase.co:5432/postgres
```

Para o Netlify (deploy de homologação):
- Settings → Environment variables → Add variables
- Adicionar `SUPABASE_URL` e `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** vai ao Netlify como variável de build pública

---

## 45. Procedimento Futuro: Criação das Contas

```bash
# 1. Configurar variáveis de ambiente
export SUPABASE_URL=https://<REF>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
export GSI_HOMOLOGACAO_PASSWORD=<senha-segura>

# 2. Executar script de provisionamento (a ser criado)
node scripts/provision-homologacao.js

# 3. Verificar resultado
# Script exibe: usuários criados, perfis vinculados — sem exibir senha
```

---

## 46. Procedimento Futuro: Validação

Após provisionamento:

```bash
# Executar testes autenticados contra homologação
SUPABASE_URL=https://<REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run test:run -- tests/security/

# Verificar login de cada usuário fictício
# Verificar permissões por perfil
# Verificar bloqueio de usuário sem perfil e inativo
```

---

## 47. Procedimento Futuro: Encerramento da Fase 2

A Fase 2 é encerrada quando:

1. Todos os critérios da seção 40 estão satisfeitos;
2. Testes de segurança passam em homologação;
3. Documento atualizado com resultado da execução;
4. Aprovação explícita do desenvolvedor;
5. Commit do documento e do script de provisionamento (sem credenciais).

---

## 48. Próximos Passos

### Para iniciar a execução da Fase 2

1. Autorizar criação do projeto `gsi-one-homologacao` no Supabase;
2. Criar projeto manualmente no painel (ver seção 43);
3. Configurar variáveis de ambiente locais (ver seção 44);
4. Autorizar criação do script `scripts/provision-homologacao.js`;
5. Executar provisionamento (ver seção 45);
6. Executar validação (ver seção 46);
7. Encerrar fase (ver seção 47).

### Fase 3 (após conclusão da Fase 2)

- Eliminar hardcoding de `auth.js` via variáveis de build (ver Achado A1 da auditoria);
- Criar arquitetura de rotas e páginas próprias;
- Estabelecer padrão de navegação sem pop-ups.

---

## Controle de Versão deste Documento

| Versão | Data       | Autor        | Alteração                                   |
|--------|------------|--------------|---------------------------------------------|
| 1.0    | 2026-07-25 | Erick Gomes  | Criação — planejamento formal da Fase 2     |

---

*Este documento segue o padrão GHAES — Global Health AI Engineering Standard.*
*Referência: https://github.com/erickgomesal/ghaes*
