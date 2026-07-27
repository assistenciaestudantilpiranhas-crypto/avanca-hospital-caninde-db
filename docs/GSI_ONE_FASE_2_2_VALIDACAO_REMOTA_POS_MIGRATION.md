# GSI ONE - Fase 2.2: Validacao Remota Pos-Migration

**Fase:** 2.2 - Validacao remota pos-migration
**Data:** 2026-07-27
**Repositorio:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Project ref:** vwve...idkxq
**Padrao aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Roteiro criado - execucao manual a validar

---

## 1. Objetivo

Validar, em modo somente leitura, se a estrutura remota do projeto de homologacao esta coerente com as migrations aplicadas, sem modificar banco, usuarios, policies, dados clinicos, frontend ou historico de migrations.

---

## 2. Escopo

Esta etapa cobre a criacao de:

- `scripts/validate-remote-staging.sql`
- `docs/GSI_ONE_FASE_2_2_VALIDACAO_REMOTA_POS_MIGRATION.md`

Esta etapa nao cobre:

- criacao de usuarios ficticios;
- insercao de seed;
- alteracao de RLS;
- nova migration;
- alteracao do frontend;
- execucao remota do SQL.

---

## 3. Estado Inicial

Estado informado para inicio da etapa:

| Item | Estado |
| --- | --- |
| Computador | computador do trabalho |
| Caminho | `C:\Users\ENFERMAGEM\Documents\Codex\avanca-hospital-caninde-db` |
| Branch | `main` sincronizada com `origin/main` |
| Working tree | limpo |
| Projeto remoto | `gsi-one-homologacao` |
| Project ref | `vwve...idkxq` |
| CLI Supabase | vinculada |
| Migrations locais/remotas | 32 locais e 32 remotas, conforme estado confirmado da sessao |
| Contas ficticias | nenhuma criada |
| Dados reais | nenhum inserido |
| Frontend | ainda aponta para Supabase local |
| Stash | `stash@{0}` preservado e nao aplicado |

Observacao: documentos anteriores registravam 31 migrations em fases previas. Para a Fase 2.2, prevalece o estado operacional informado nesta sessao: 32 locais e 32 remotas, a validar na execucao manual pelo historico remoto.

---

## 4. Ambiente Validado

Ambiente alvo da validacao:

| Componente | Valor |
| --- | --- |
| Supabase project | `gsi-one-homologacao` |
| Tipo | Homologacao |
| Banco | PostgreSQL gerenciado pelo Supabase |
| Schema principal | `public` |
| Auth | `auth.users`, consultado somente por contagem |
| Storage | Fora do escopo |
| Vault/secrets | Fora do escopo |

---

## 5. Referencia do Projeto

O identificador do projeto deve ser exibido apenas de forma parcialmente mascarada:

```text
vwve...idkxq
```

Nao registrar anon key, service role key, senha do banco, `SUPABASE_DB_URL`, tokens, secrets ou qualquer credencial neste documento.

---

## 6. Metodologia

A validacao usa apenas consultas de leitura sobre:

- `information_schema.tables`;
- `information_schema.triggers`;
- `information_schema.role_table_grants`;
- `pg_catalog.pg_class`;
- `pg_catalog.pg_namespace`;
- `pg_catalog.pg_proc`;
- `pg_policies`;
- tabelas oficiais de perfis e permissoes;
- contagens agregadas de tabelas clinicas;
- `auth.users` somente por `COUNT(*)`;
- `supabase_migrations.schema_migrations`.

O SQL nao consulta dados identificaveis de pacientes, nao lista e-mails de usuarios e nao lista UUIDs de `auth.users`.

---

## 7. Consultas Executadas

O roteiro manual esta em `scripts/validate-remote-staging.sql` e inclui as secoes:

1. quantidade de tabelas `public`;
2. lista de tabelas `public`;
3. tabelas com RLS;
4. tabelas sem RLS;
5. quantidade de policies;
6. lista de policies;
7. quantidade de funcoes `public`;
8. lista de funcoes;
9. quantidade de triggers;
10. lista de triggers;
11. privilegios perigosos para `anon`;
12. privilegios perigosos para `authenticated`;
13. privilegios de DELETE;
14. privilegios de TRUNCATE;
15. privilegios de REFERENCES;
16. privilegios de TRIGGER;
17. perfis oficiais;
18. permissoes oficiais;
19. relacao perfil-permissoes;
20. quantidade de usuarios em `auth.users`;
21. contagens agregadas de tabelas clinicas;
22. existencia do bootstrap administrativo;
23. existencia das permissoes B1;
24. existencia das policies da Fase A;
25. existencia das policies da Fase B1;
26. historico de migrations;
27. consistencia perfil-permissao;
28. duplicidade em perfis;
29. duplicidade em permissoes;
30. duplicidade em vinculos perfil-permissao.

---

## 8. Tabelas Esperadas

Espera-se que o schema `public` contenha as tabelas estruturais, de dominio, acesso, assistenciais e administrativas criadas pelas migrations, incluindo:

- `usuarios`, `perfis_acesso`, `permissoes`, `perfil_permissao`, `usuario_perfil`;
- `audit_log`;
- dominios `dom_*`;
- `pacientes` e tabelas complementares do paciente;
- `atendimentos`, `chamadas`;
- `triagens`, `consultas`, `evolucoes_enfermagem`;
- `observacoes`, `reavaliacoes_observacao`, `estabilizacoes`;
- `checklist_estabilizacao_itens`;
- `exames`;
- `estoque_itens`, `estoque_movimentacoes`;
- `prescricoes`, `prescricao_itens`;
- `transferencias`, `checklist_transferencia_itens`;
- `configuracoes_sistema`.

Qualquer ausencia deve ser tratada como falha ou como item `a validar` se decorrer de migration posterior nao documentada neste arquivo.

---

## 9. RLS Esperado

Todas as tabelas sensiveis do schema `public` devem permanecer com RLS habilitado.

Resultado esperado:

- tabelas assistenciais com RLS habilitado;
- tabelas de acesso com RLS habilitado;
- `audit_log` com RLS habilitado e modelo append-only;
- nenhuma tabela sensivel sem RLS.

Tabelas sem RLS devem ser revisadas individualmente.

---

## 10. Policies Esperadas

Espera-se a presenca das policies estruturais da migration inicial de RLS, das policies especificas de fluxo assistencial e das policies de leitura positiva das Fases A e B1.

A validacao da Fase A verifica a existencia das 17 policies SELECT positivas em tabelas operacionais e clinicas.

A validacao da Fase B1 verifica se:

- `pacientes_select_operacional` usa `paciente.visualizar`;
- `atendimentos_select_operacional` usa `atendimento.visualizar`;
- `consultas_select_clinico` usa `consulta.visualizar`.

---

## 11. Funcoes Esperadas

Espera-se encontrar funcoes publicas de apoio a RLS, auditoria, fluxo assistencial, estoque, protecao de exclusao fisica e bootstrap administrativo, incluindo:

- `current_user_id`;
- `is_linked_user`;
- `has_perfil`;
- `has_permission`;
- `is_admin`;
- `is_auditoria`;
- `audit_text_to_uuid`;
- `fn_audit_trigger`;
- `fn_set_updated_at`;
- `fn_estoque_itens_protect_quantidade`;
- `fn_estoque_aplicar_movimentacao`;
- `fn_block_update_delete`;
- `dom_codigo`;
- `dom_ordem`;
- `fn_validate_atendimento_transicao`;
- `bootstrap_primeiro_admin`;
- `fn_block_assistential_physical_delete`;
- `fn_block_audit_log_update_delete`.

Funcoes `security definer` devem ser revisadas com atencao, sem expor corpo da funcao no relatorio.

---

## 12. Triggers Esperados

Espera-se encontrar triggers de:

- auditoria em tabelas assistenciais e administrativas;
- `updated_at` onde aplicavel;
- controle de estoque;
- bloqueio de alteracao indevida em movimentacoes de estoque;
- validacao de transicao de atendimento;
- bloqueio de exclusao fisica assistencial;
- bloqueio de alteracao direta no `audit_log`.

---

## 13. Privilegios Esperados

Resultado esperado para roles `anon` e `authenticated`:

- nenhum privilegio `TRUNCATE`;
- nenhum privilegio `TRIGGER`;
- nenhum privilegio `REFERENCES`;
- nenhum privilegio `DELETE` direto em tabelas sensiveis.

O role `authenticated` pode ter privilegios minimos de leitura e escrita somente onde RLS e policies limitam a operacao por perfil.

---

## 14. Perfis Esperados

Perfis oficiais esperados:

- `Recepcao`;
- `Tecnico em Enfermagem`;
- `Enfermeiro`;
- `Medico`;
- `Farmacia`;
- `Tecnico em RX`;
- `Regulacao de Transferencia`;
- `Administracao`;
- `Auditoria`.

Nota: os nomes no banco podem conter acentuacao. A revisao manual deve comparar semanticamente os perfis oficiais e registrar divergencias como `a validar`.

---

## 15. Permissoes Esperadas

As permissoes oficiais devem incluir as permissoes operacionais historicas e as permissoes especificas de leitura da Fase B1:

- `paciente.visualizar`;
- `atendimento.visualizar`;
- `consulta.visualizar`.

Permissoes sem perfil associado devem ser revisadas para confirmar se sao reserva tecnica ou falha de vinculacao.

---

## 16. Validacao das Permissoes da Fase B1

Critérios especificos:

- `paciente.visualizar` existe;
- `atendimento.visualizar` existe;
- `consulta.visualizar` existe;
- `pacientes_select_operacional` referencia `paciente.visualizar`;
- `atendimentos_select_operacional` referencia `atendimento.visualizar`;
- `consultas_select_clinico` referencia `consulta.visualizar`;
- `Farmacia` nao deve depender de acesso amplo a `atendimentos`;
- `Tecnico em Enfermagem` nao deve receber leitura de `consultas` sem finalidade direta.

---

## 17. Validacao de Ausencia de Dados Reais

O roteiro nao exibe dados de pacientes. A avaliacao desta etapa usa apenas contagens:

- pacientes;
- atendimentos;
- triagens;
- consultas;
- evolucoes_enfermagem;
- prescricoes;
- exames;
- transferencias;
- movimentacoes de estoque;
- audit_log.

Como nenhuma conta ficticia foi criada e nenhum dado real foi inserido, o resultado esperado inicial e zero nas tabelas clinicas. Qualquer contagem maior que zero deve ser investigada antes de prosseguir.

---

## 18. Validacao de Auth.Users sem Expor Identidades

A consulta sobre `auth.users` retorna somente:

- quantidade total de usuarios.

Nao sao exibidos:

- e-mails;
- UUIDs;
- telefones;
- metadados;
- provedores de autenticacao;
- timestamps individuais.

Resultado esperado nesta etapa: `0` usuarios, pois nenhuma conta ficticia foi criada.

---

## 19. Criterios de Conformidade

A etapa e considerada conforme quando:

- o SQL executa sem erro no ambiente de homologacao;
- a contagem de migrations remotas corresponde ao estado esperado;
- as tabelas esperadas existem;
- RLS esta habilitado nas tabelas sensiveis;
- nao ha privilegios perigosos para `anon` ou `authenticated`;
- as permissoes B1 existem;
- as policies B1 referenciam as permissoes de leitura corretas;
- `auth.users` retorna apenas contagem e esta coerente com a etapa;
- tabelas clinicas nao possuem registros inesperados;
- nao ha duplicidade em perfis, permissoes ou vinculos.

---

## 20. Criterios de Falha

Considerar falha se qualquer uma das situacoes ocorrer:

- tabela assistencial esperada ausente;
- tabela sensivel sem RLS;
- policy B1 ausente ou sem permissao B1 correspondente;
- privilegio perigoso para `anon` ou `authenticated`;
- usuario em `auth.users` antes da etapa de provisionamento;
- registro em tabela clinica antes da etapa de seed ficticio;
- duplicidade em perfil, permissao ou vinculo perfil-permissao;
- erro ao ler `supabase_migrations.schema_migrations`;
- qualquer indicio de dado real ou credencial.

---

## 21. Riscos

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Executar o SQL no projeto errado | Alto | Conferir nome do projeto e project ref mascarado antes da execucao |
| Interpretar contagem maior que zero sem investigar | Alto | Pausar e classificar origem dos registros |
| Expor saida completa em canal inseguro | Medio | Compartilhar apenas resumo e achados |
| Confundir ausencia de linha em consulta de falha com erro | Medio | Validar que consultas de duplicidade e privilegios perigosos podem retornar vazio em estado conforme |
| Divergencia entre documentacao antiga e estado atual de migrations | Medio | Usar historico remoto como fonte de validacao manual |

---

## 22. Achados

Achados desta preparacao:

- roteiro SQL de validacao remota criado em modo somente leitura;
- documento da Fase 2.2 criado;
- nenhuma execucao remota realizada nesta etapa;
- nenhuma conta ficticia criada;
- nenhum seed aplicado;
- `stash@{0}` preservado e nao aplicado;
- contagem local observada de migrations deve ser reconciliada na execucao manual com o estado confirmado da sessao.

---

## 23. Pendencias

- Executar manualmente `scripts/validate-remote-staging.sql` no projeto `gsi-one-homologacao`;
- registrar os resultados agregados, sem dados sensiveis;
- reconciliar contagem do historico remoto com o estado esperado;
- aprovar ou bloquear a criacao de usuarios ficticios somente apos a validacao.

---

## 24. Proxima Etapa

Se a validacao for conforme, a proxima etapa recomendada e preparar a criacao controlada de usuarios ficticios de homologacao, ainda sem dados reais e com credenciais fora do repositorio.

Se houver falha, pausar a Fase 2.2, registrar o achado, identificar a migration ou objeto afetado e corrigir somente com autorizacao explicita.

---

## 25. Checklist de Execucao Manual

Antes de executar:

- [ ] Confirmar projeto no painel Supabase: `gsi-one-homologacao`;
- [ ] Confirmar project ref mascarado: `vwve...idkxq`;
- [ ] Confirmar que nao e producao;
- [ ] Confirmar que nenhuma credencial sera copiada para o documento;
- [ ] Abrir o SQL Editor do Supabase no projeto correto;
- [ ] Colar `scripts/validate-remote-staging.sql`;
- [ ] Conferir visualmente que o script contem apenas consultas de leitura;
- [ ] Executar;
- [ ] Salvar apenas resultados agregados e metadados permitidos;
- [ ] Confirmar `auth.users` por contagem, sem identidades;
- [ ] Confirmar tabelas clinicas por contagem, sem dados de pacientes;
- [ ] Registrar achados como Conforme, Falha ou A validar;
- [ ] Nao criar usuarios;
- [ ] Nao aplicar seed;
- [ ] Nao alterar migrations;
- [ ] Nao alterar RLS;
- [ ] Nao alterar frontend;
- [ ] Nao aplicar `stash@{0}`.

---

## Controle de Versao

| Versao | Data | Alteracao |
| --- | --- | --- |
| 1.0 | 2026-07-27 | Criacao do roteiro de validacao remota pos-migration |

---

*Este documento segue o padrao GHAES - Global Health AI Engineering Standard.*
