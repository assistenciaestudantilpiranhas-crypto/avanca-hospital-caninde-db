# GSI ONE - Testes automatizados de RLS e grants - 6B.8

## Objetivo

Criar testes reproduziveis para validar RLS, grants, policies, funcoes e regras basicas de seguranca no Supabase local do GSI ONE, sem conectar ao Supabase Cloud e sem alterar migrations antigas, policies, grants, funcoes ou triggers.

## Ambiente

Repositorio confirmado: `C:\Users\Micro\Documents\Codex\avanca-hospital-caninde-db`.

Ambiente local validado:

- Docker Desktop ativo.
- `npx.cmd supabase status` retornou endpoints locais em `127.0.0.1`.
- `npx.cmd supabase db reset` executado com sucesso no banco local.
- Migrations aplicadas ate `20260709170000_block_delete_assistencial_audit_append_only.sql`.
- O CLI informou ausencia de `supabase/seed.sql`; nao havia seed para executar.

## Protecao contra Cloud

O helper `tests/helpers/local-supabase.js` executa `npx.cmd supabase status`, valida `API_URL`, `DB_URL`, `REST_URL` e `GRAPHQL_URL`, e recusa execucao quando o host nao e `localhost` ou `127.0.0.1`, ou quando encontra `supabase.co`. As consultas sao executadas via `docker exec` no container local `supabase_db_*`.

Nenhuma chave local ou Cloud foi gravada no repositorio.

## Comandos

Scripts criados:

- `npm.cmd run security:test`: executa somente a suite `tests/security` contra Supabase local ja disponivel.
- `npm.cmd run security:reset-and-test`: executa `npx.cmd supabase db reset` e depois `security:test`.

A suite normal continua separada:

- `npm.cmd run test:run`: ignora `tests/security/**/*.test.js` e continua sem depender do Docker.

## Consultas usadas

Foram criados SQLs de inventario em `tests/security/sql`:

- `assert-rls-enabled.sql`;
- `assert-dangerous-grants-absent.sql`;
- `assert-domain-select-preserved.sql`;
- `assert-policies.sql`;
- `assert-security-definer.sql`;
- `assert-audit-log.sql`.

Essas consultas leem catalogos `pg_catalog`, `information_schema` e `pg_policies`.

## Resultados

Apos reset local:

- 35 tabelas public inventariadas com RLS habilitado.
- 0 grants perigosos encontrados para `anon`/`authenticated` em `TRUNCATE`, `TRIGGER`, `REFERENCES` e `DELETE`.
- 7 tabelas `dom_*` com SELECT preservado para `authenticated`.
- 88 policies public inventariadas.
- 12 funcoes `SECURITY DEFINER` public inventariadas.
- 77 triggers public nao internos inventariados.

## RLS

Os testes falham se qualquer tabela public perder `relrowsecurity = true`. `relforcerowsecurity` e apenas inventariado; FORCE RLS nao foi alterado nesta etapa.

Tabelas operacionais criticas verificadas: `pacientes`, `atendimentos`, `triagens`, `consultas`, `transferencias`, `audit_log`, `estoque_movimentacoes` e `prescricoes`.

Tabelas de dominio tambem inventariadas: `dom_status_atendimento`, `dom_desfechos`, `dom_classificacao_risco`, `dom_status_transferencia`, `dom_status_prescricao` e `dom_status_exame`.

## Grants

A suite valida ausencia de grants diretos perigosos para `anon` e `authenticated`:

- `TRUNCATE`;
- `TRIGGER`;
- `REFERENCES`;
- `DELETE`.

Nao foi criada nenhuma excecao.

## Policies

Os testes validam:

- existencia de policy SELECT nas tabelas clinicas principais;
- inexistencia de tabela clinica sem policy aplicavel;
- policies administrativas contendo `is_admin()`;
- policies de escrita nao concedidas a `anon`;
- comandos `ALL` inventariados;
- policies com `is_linked_user()` inventariadas;
- leitura de `audit_log` restrita a administracao/auditoria.

## SECURITY DEFINER

Foram validadas funcoes conhecidas:

- `bootstrap_primeiro_admin`;
- `current_user_id`;
- `has_perfil`;
- `has_permission`;
- `is_admin`;
- `is_auditoria`;
- `is_linked_user`;
- `fn_validate_atendimento_transicao`;
- `fn_block_assistential_physical_delete`;
- `fn_block_audit_log_update_delete`.

As funcoes `SECURITY DEFINER` inventariadas possuem `search_path` configurado. `bootstrap_primeiro_admin` permanece `SECURITY DEFINER` e sem EXECUTE para `anon` no inventario testado.

## Audit Log e Triggers

Foram validados:

- RLS habilitado em `audit_log`;
- ausencia de UPDATE/DELETE direto em `audit_log` para `anon`/`authenticated`;
- triggers de bloqueio `trg_block_update_audit_log` e `trg_block_delete_audit_log`;
- triggers de auditoria em tabelas assistenciais criticas;
- triggers `updated_at`;
- triggers de estoque;
- trigger de transicao de atendimento;
- triggers de bloqueio de exclusao fisica em tabelas assistenciais.

A minimizacao de OLD/NEW JSON em auditabilidade segue como pendencia futura; nada foi alterado nesta etapa.

## Usuarios Ficticios e Perfis

Foram criadas fixtures diagnosticas para:

- usuario autenticado sem perfil;
- usuario inativo;
- Recepcao;
- Enfermeiro;
- Medico;
- Administracao;
- anon/sem permissao.

Os testes nao criam dados reais nem usuarios no banco. Eles verificam o inventario de policies/grants aplicavel aos contratos atuais.

## is_linked_user

Achado critico: `is_linked_user()` nao recebe parametros de linha. A funcao e usada amplamente como predicado de SELECT, indicando que o comportamento atual confirma usuario ativo/perfil, mas nao comprova vinculo linha/paciente/atendimento. Esse risco deve seguir para 5B.8.5 como ponto critico de revisao de RLS.

Nenhuma alteracao foi feita em `is_linked_user`.

## Limitacoes

A suite valida catalogo e contratos de seguranca no Supabase local. Ela nao substitui testes end-to-end autenticados via API REST nem cria usuarios reais. O uso de `docker exec` exige Docker Desktop e Supabase local ativo.

## Proximos passos 6B.9

Priorizar testes autenticados por API local com usuarios ficticios reais, incluindo matriz de acesso por perfil e validacao pratica de SELECT/INSERT/UPDATE sob RLS, ainda sem alterar policies automaticamente.
