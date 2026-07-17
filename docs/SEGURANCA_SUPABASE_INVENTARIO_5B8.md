# Segurança Supabase - Inventário 5B.8

Documento interno de inventário de segurança para o banco Supabase do GSI ONE.

Escopo desta etapa: diagnóstico e organização de trabalho. Este documento não altera código, banco, RLS, grants, policies, funções, triggers, audit logs ou fluxo assistencial.

## 1. Resumo dos achados do DataSec Guardian

A revisão preliminar apontou riscos estruturais que devem ser inventariados antes de qualquer hardening:

- `is_linked_user()` pode estar amplo demais para tabelas assistenciais sensíveis.
- Há grants para `authenticated` que podem estar permissivos, especialmente em tabelas operacionais e clínicas.
- Existem policies `FOR ALL`, que misturam leitura, escrita, atualização e exclusão sob a mesma regra.
- Funções `SECURITY DEFINER` precisam de revisão de escopo, `search_path`, privilégios e necessidade real.
- `audit_log` armazena JSON completo de registros antes/depois, com risco de excesso de dados sensíveis.
- O modelo futuro precisa de vínculo real por atendimento, não apenas usuário autenticado/vinculado de forma ampla.

## 2. Classificação dos riscos

### Riscos críticos imediatos

- Exposição de dados clínicos ou identificáveis por policies amplas baseadas apenas em usuário vinculado.
- Grants de escrita para `authenticated` em tabelas sensíveis quando a restrição real depende exclusivamente de RLS.
- Policies `FOR ALL` em tabelas assistenciais que podem permitir operações indesejadas se a condição for ampla.
- Funções `SECURITY DEFINER` sem `search_path` seguro ou com privilégios executáveis além do necessário.

### Riscos altos

- `audit_log` com `dados_antes` e `dados_depois` em JSON completo, podendo armazenar CPF, CNS, telefone, dados clínicos, prescrições, exames ou observações.
- Falta de separação explícita entre leitura assistencial, escrita assistencial, atualização administrativa e exclusão lógica.
- Grants `DELETE` para `authenticated` em tabelas onde DELETE físico deve ser bloqueado ou restrito a admin/trigger.
- Ausência de vínculo granular por atendimento, setor, equipe, plantão ou responsabilidade assistencial.

### Melhorias futuras

- Substituir policies amplas por policies específicas por operação (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Introduzir vínculo assistencial real por atendimento, como equipe responsável, setor, escala, profissional ou participação no atendimento.
- Minimizar `audit_log` para registrar metadados e diffs controlados, evitando payload clínico completo quando não necessário.
- Criar RPCs transacionais para operações críticas de fluxo assistencial.
- Documentar matriz de acesso por tabela, perfil, permissão e operação.

### Pontos que precisam de confirmação

- Lista final de tabelas sensíveis em produção.
- Quais grants atuais são efetivamente necessários para PostgREST funcionar sob RLS.
- Quais funções `SECURITY DEFINER` são indispensáveis e quais podem ser `SECURITY INVOKER`.
- Quais policies `FOR ALL` estão em vigor após todas as migrations aplicadas.
- Se DELETE físico já está bloqueado por trigger para todas as tabelas assistenciais críticas.
- Se o `audit_log` atual contém dados pessoais ou clínicos completos em produção.

## 3. Consultas SQL de inventário

As consultas abaixo devem ser executadas em ambiente controlado. Não fazem alteração no banco.

### 3.1 RLS e FORCE RLS

```sql
select
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  c.relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;
```

### 3.2 Policies

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

### 3.3 Policies `FOR ALL`

```sql
select
  schemaname,
  tablename,
  policyname,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and cmd = 'ALL'
order by tablename, policyname;
```

### 3.4 Grants perigosos para `authenticated`

```sql
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('authenticated', 'anon', 'public')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, grantee, privilege_type;
```

### 3.5 Grants de leitura ampla

```sql
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('authenticated', 'anon', 'public')
  and privilege_type = 'SELECT'
order by table_name, grantee;
```

### 3.6 Funções `SECURITY DEFINER`

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as config,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;
```

### 3.7 Privilégios `EXECUTE` em funções

```sql
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.routine_privileges
where routine_schema = 'public'
  and privilege_type = 'EXECUTE'
  and grantee in ('authenticated', 'anon', 'public')
order by routine_name, grantee;
```

### 3.8 Triggers

```sql
select
  event_object_schema as schema,
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;
```

### 3.9 Triggers por tabela e função chamada

```sql
select
  n.nspname as schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  not t.tgisinternal as user_trigger,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and not t.tgisinternal
order by c.relname, t.tgname;
```

### 3.10 Inventário do `audit_log`

```sql
select
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'audit_log'
order by ordinal_position;
```

```sql
select
  tabela_afetada,
  acao,
  count(*) as total,
  min(created_at) as primeiro_evento,
  max(created_at) as ultimo_evento
from public.audit_log
group by tabela_afetada, acao
order by total desc, tabela_afetada, acao;
```

## 4. Plano de fases

### 5B.8.1 - Inventário

- Levantar RLS, FORCE RLS, policies, grants, funções, privilégios `EXECUTE`, triggers e estrutura do `audit_log`.
- Classificar riscos por criticidade.
- Não alterar banco nesta fase.

### 5B.8.2 - Hardening grants

- Revisar grants para `authenticated`, `anon` e `public`.
- Reduzir privilégios perigosos quando houver policy/RPC alternativa validada.
- Evitar revogações que quebrem PostgREST sem plano de teste.

### 5B.8.3 - Revisão policies

- Substituir policies `FOR ALL` por policies específicas por operação quando necessário.
- Separar leitura, inserção, atualização e exclusão.
- Preservar regras assistenciais já validadas.

### 5B.8.4 - `SECURITY DEFINER`

- Inventariar funções `SECURITY DEFINER`.
- Validar `search_path`, ownership, grants de `EXECUTE` e necessidade real.
- Reduzir superfície de execução para perfis mínimos.

### 5B.8.5 - Vínculo real por atendimento

- Definir modelo de vínculo assistencial por atendimento.
- Avaliar tabelas de equipe, setor, plantão, profissional responsável ou participação no cuidado.
- Migrar policies de leitura/escrita sensível para vínculo assistencial mais granular.

### 5B.8.6 - `audit_log` minimizado

- Reduzir armazenamento de JSON completo quando houver dados sensíveis.
- Definir campos auditáveis mínimos por tabela.
- Preservar rastreabilidade sem expor desnecessariamente dados pessoais ou clínicos.

## 5. O que não deve ser feito agora

- Não revogar grants ainda.
- Não alterar RLS ainda.
- Não mexer em `is_linked_user()` ainda.
- Não alterar `audit_log` ainda.
- Não alterar funções `SECURITY DEFINER` ainda.
- Não alterar migrations antigas.
- Não alterar fluxo assistencial recém-validado.
- Não alterar `script.js`.
- Não alterar banco.

## 6. Critérios para avançar

- Inventário SQL executado e salvo.
- Lista de objetos críticos revisada.
- Plano de rollback definido para qualquer hardening futuro.
- Teste de login e operações por perfil definido antes de qualquer revogação.
- Validação explícita de que o fluxo Recepção -> Triagem -> Consulta não será quebrado por mudanças de segurança.
