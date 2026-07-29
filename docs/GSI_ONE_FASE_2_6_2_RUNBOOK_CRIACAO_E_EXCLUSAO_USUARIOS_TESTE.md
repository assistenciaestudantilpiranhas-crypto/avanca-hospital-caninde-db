# GSI ONE - Fase 2.6.2: Runbook de Criação e Exclusão de Usuários de Teste

**Fase:** 2.6.2 - Runbook operacional para usuários fictícios em homologação
**Data:** 2026-07-29
**Projeto remoto alvo:** gsi-one-homologacao (`project ref` mascarado)
**Status:** Planejamento - execução futura depende de autorização expressa

---

## 1. Regra principal

Este runbook é um plano de execução futura. Nenhum comando deve ser executado durante a etapa documental.

A execução futura deve ocorrer somente em homologação, com autorização expressa em cada ponto de parada. Não usar `service_role` como identidade de usuário final nos testes de acesso; `service_role` só pode ser usado para operação administrativa controlada quando autorizado.

---

## 2. Proibições desta etapa

Não executar:

- `supabase auth admin create-user`;
- SQL remoto;
- criação em `auth.users`;
- `INSERT` em `public.usuarios`;
- `INSERT` em `public.usuario_perfil`;
- migration;
- seed;
- `db push`;
- `db reset`;
- criação de senha;
- alteração de frontend;
- stash;
- `git add`;
- commit;
- push.

---

## 3. Pré-requisitos para execução futura

Antes de qualquer criação futura, reunir:

- matriz aprovada da Fase 2.6.2;
- projeto `gsi-one-homologacao` confirmado e mascarado;
- confirmação de que o projeto não é produção;
- domínio de e-mail aprovado;
- responsável pelas credenciais definido;
- estratégia de confirmação de e-mail definida;
- prazo de validade definido, máximo inicial sugerido de 7 dias;
- forma de armazenamento temporário de credenciais fora do repositório;
- autorização expressa.

---

## 4. PP1 - Antes de criar qualquer usuário

Ponto de parada obrigatório. Confirmar e registrar:

| Checagem | Resultado esperado |
| --- | --- |
| Projeto | `gsi-one-homologacao` |
| `project ref` | Conferido e mascarado na documentação |
| Ambiente | Homologação; não produção |
| `auth.users` | Vazio ou usuários existentes identificados de forma mascarada |
| Matriz | Aprovada |
| Domínio de e-mail | Aprovado |
| Responsável pelas credenciais | Definido |
| Autorização | Expressa antes de continuar |

Sem PP1 aprovado, nenhum usuário pode ser criado.

---

## 5. Criação futura no Auth

Procedimento planejado, não executado nesta etapa:

1. Criar usuários fictícios no Auth conforme matriz aprovada.
2. Gerar senhas temporárias distintas no momento da criação.
3. Não registrar senhas em Markdown, Git, log, terminal compartilhado ou screenshot.
4. Confirmar e-mail conforme estratégia aprovada.
5. Registrar apenas quantidade e identificadores lógicos, sem UUID completo.

E-mails devem seguir o domínio aprovado no PP1. Não usar e-mails pessoais, institucionais reais ou de servidores reais.

---

## 6. PP2 - Após criar usuários no Auth, antes de criar vínculos

Ponto de parada obrigatório. Confirmar e registrar:

| Checagem | Resultado esperado |
| --- | --- |
| Quantidade criada | Igual à matriz aprovada |
| Identificadores | Listados de forma lógica ou mascarada |
| UUIDs | Não expostos completos |
| `email_confirmed` | Conforme estratégia aprovada |
| Vínculos automáticos | Nenhum perfil vinculado automaticamente, salvo comportamento explicitamente aprovado |
| Credenciais | Fora do repositório |
| Autorização | Expressa antes de continuar |

Sem PP2 aprovado, nenhum vínculo em `public.usuarios` ou `public.usuario_perfil` deve ser criado.

---

## 7. Criação futura de registros institucionais e vínculos

Procedimento planejado, não executado nesta etapa:

1. Criar ou validar registro em `public.usuarios` compatível com o usuário Auth.
2. Usar nomes fictícios e e-mails de homologação.
3. Marcar `ativo = true` para usuários ativos da matriz.
4. Marcar `ativo = false` para `teste.usuario.inativo`, se o teste for aprovado como seguro.
5. Criar vínculo em `public.usuario_perfil` apenas para usuários que devem ter perfil.
6. Não criar vínculo para `teste.sem.perfil`.
7. Não conceder permissões individualmente fora dos perfis aprovados.
8. Não alterar `perfil_permissao` nesta fase.

---

## 8. PP3 - Após vínculos, antes dos testes

Ponto de parada obrigatório. Confirmar e registrar:

| Checagem | Resultado esperado |
| --- | --- |
| Perfil de cada usuário | Igual à matriz aprovada |
| Permissões efetivas | Igual ao perfil planejado |
| Usuário sem perfil | Sem linha em `usuario_perfil` |
| Usuário inativo | `public.usuarios.ativo = false` |
| Permissões proibidas | Ausentes |
| Grants diretos novos | Nenhum em tabelas clínicas |
| Policies clínicas | Inalteradas |
| Autorização | Expressa antes de testar |

Sem PP3 aprovado, não executar testes autenticados.

---

## 9. Execução futura dos testes

Executar testes planejados por:

- SQL Editor, quando aplicável e com mascaramento de identidade;
- PostgREST com JWT real de cada usuário fictício;
- helper automatizado existente, se compatível;
- testes negativos para `anon`, sem permissão, sem perfil, inativo e perfil clínico;
- autenticação real no projeto de homologação.

Não usar `service_role` como identidade final de usuário.

---

## 10. Evidências mínimas

Registrar, sem expor segredo:

- quantidade de usuários criados;
- perfil de cada usuário;
- permissões efetivas;
- resultado das três views;
- negação de acesso direto a tabelas clínicas;
- negação para `anon`;
- negação para usuário sem permissão;
- negação para usuário sem vínculo;
- negação para usuário inativo;
- ausência de colunas nominais nas views;
- ausência de escrita;
- cleanup final ou retenção temporária autorizada.

UUIDs e e-mails devem ser mascarados quando não forem necessários ao entendimento técnico.

---

## 11. PP4 - Após testes, antes de manter ou excluir usuários

Ponto de parada obrigatório. Apresentar:

| Checagem | Resultado esperado |
| --- | --- |
| Resultados dos testes | Consolidados por usuário e cenário |
| Falhas | Classificadas e atribuídas, se existirem |
| Retenção | Excluir ou preservar temporariamente |
| Prazo de validade | Data de expiração registrada se preservar |
| Responsável | Confirmado |
| Autorização | Expressa antes de cleanup ou retenção |

Sem PP4 aprovado, não manter usuários além do prazo mínimo operacional necessário.

---

## 12. Política de retenção

- Validade máxima inicial sugerida: 7 dias.
- Após os testes, excluir ou desativar.
- Não deixar credenciais permanentes.
- Registrar data de expiração.
- Revisar antes de qualquer renovação.
- Renovação exige autorização expressa e nova justificativa.

---

## 13. Procedimento de cleanup futuro

Procedimento planejado:

1. Bloquear ou desativar usuário.
2. Remover vínculos em `public.usuario_perfil`.
3. Remover registro em `public.usuarios`, se compatível com a arquitetura e auditoria.
4. Remover usuário em `auth.users`.
5. Validar ausência de órfãos.
6. Validar `audit_log`.
7. Confirmar que dados fictícios clínicos de teste foram removidos, se algum dado clínico fictício tiver sido criado em fase futura autorizada.
8. Registrar conclusão.

A etapa atual não autoriza criação de dados clínicos fictícios. O item 7 existe apenas como controle preventivo para fases futuras.

---

## 14. Validações pós-cleanup

Confirmar:

- nenhum usuário fictício ativo fora do prazo;
- nenhum vínculo órfão em `usuario_perfil`;
- nenhum registro institucional incompatível em `public.usuarios`;
- nenhuma credencial preservada em local indevido;
- nenhuma alteração em RLS, policies ou grants clínicos;
- evidência de auditoria compatível com a arquitetura;
- documentação final sem segredos.

---

## 15. Critérios de interrupção

Interromper a execução futura se houver:

- dúvida sobre o projeto ser homologação;
- domínio de e-mail não aprovado;
- credencial exposta;
- usuário real identificado na matriz;
- usuário existente não mapeado;
- permissão efetiva divergente da matriz;
- acesso nominal inesperado;
- acesso direto indevido a tabela clínica;
- falha de cleanup.

---

## 16. Registro final esperado

Ao concluir a execução futura, registrar:

- arquivos alterados;
- objetos de banco afetados;
- usuários criados, mascarados;
- vínculos criados e removidos;
- RLS impact;
- impacto no fluxo assistencial;
- validação executada;
- riscos e pendências;
- decisão de retenção ou exclusão;
- confirmação de ausência de segredos versionados.
