# GSI ONE - Fase 2.6.2: Plano de Usuários Fictícios em Homologação

**Fase:** 2.6.2 - Planejamento controlado de usuários fictícios para testes autenticados em homologação
**Data:** 2026-07-29
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto alvo:** gsi-one-homologacao (`project ref` mascarado)
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Planejamento documental - nenhuma criação de usuário autorizada nesta etapa

---

## 1. Objetivo

Definir o plano técnico, operacional e de segurança para criação futura de usuários fictícios em homologação, destinados a testes autenticados das views gerenciais da Fase 2.6.1.

Esta fase não cria usuários, senhas, migrations, seeds, registros em banco, credenciais reais ou alterações de frontend. A execução futura depende de autorização expressa em ponto de parada formal.

---

## 2. Estado confirmado

| Item | Estado |
| --- | --- |
| Ambiente | Computador de casa |
| Branch esperada | `main` limpa e sincronizada com `origin/main` |
| Último commit informado | `1d9de0e docs: conclude low-risk management views deployment` |
| Projeto remoto | `gsi-one-homologacao` |
| Migration list | 34 locais e 34 remotas |
| Permissões gerenciais | Aplicadas |
| Views gerenciais | Três views aplicadas e validadas |
| Usuários fictícios | Nenhum criado até o momento |
| Autorização de criação | Não concedida nesta etapa |

---

## 3. Escopo permitido

Criar documentação de planejamento para:

- matriz de usuários fictícios, perfis, permissões esperadas e cenários de teste;
- procedimento futuro de criação, vínculo, validação, bloqueio e exclusão;
- política de credenciais temporárias fora do repositório;
- evidências mínimas exigidas para aprovação da Fase 2.6.2;
- pontos de parada formais antes de qualquer ação em homologação.

---

## 4. Fora de escopo nesta etapa

É proibido nesta etapa:

- criar usuário em `auth.users`;
- inserir registros em `public.usuarios`;
- inserir vínculos em `public.usuario_perfil`;
- criar senhas ou credenciais reais;
- executar Supabase CLI;
- executar SQL remoto;
- criar migration ou seed;
- alterar RLS, policies, grants ou tabelas clínicas;
- alterar frontend;
- versionar sem autorização expressa.

---

## 5. Perfis de teste planejados

| Identificador lógico | Perfil esperado | Finalidade |
| --- | --- | --- |
| `teste.gestao.hospitalar` | Gestão Hospitalar | Validar acesso gerencial agregado pelas permissões `gestao.*` |
| `teste.leitura.gestor` | Leitura/Gestor | Validar acesso consultivo agregado pelas permissões `leitura.*` |
| `teste.sem.permissao` | Perfil sem permissão gerencial | Validar negação em views gerenciais para usuário autenticado sem permissão |
| `teste.sem.perfil` | Sem vínculo em `usuario_perfil` | Validar `public.has_permission()` retornando `false` |
| `teste.usuario.inativo` | Perfil definido, mas `public.usuarios.ativo = false` | Validar bloqueio por inatividade, se a estrutura permitir teste seguro |
| `teste.perfil.clinico` | Perfil clínico não gerencial | Validar negação cruzada de acesso gerencial por perfil clínico |

O usuário inativo só deve ser criado se a execução futura confirmar que o teste pode ser feito sem risco operacional e sem afetar usuários reais.

---

## 6. Padrão de identidade fictícia

Todos os usuários devem usar identidade claramente fictícia:

- nomes artificiais e inequivocamente de teste;
- e-mails reservados exclusivamente para homologação;
- nenhum e-mail pessoal, institucional real ou de servidor real;
- nenhum CPF, CNS, telefone, endereço, registro profissional real ou dado de paciente;
- nenhum nome de servidor, profissional, paciente ou gestor real;
- identificadores lógicos sem segredo e sem UUID completo.

Sugestão de nomes fictícios:

| Identificador lógico | Nome fictício proposto |
| --- | --- |
| `teste.gestao.hospitalar` | Usuário Fictício Gestão Hospitalar |
| `teste.leitura.gestor` | Usuário Fictício Leitura Gestor |
| `teste.sem.permissao` | Usuário Fictício Sem Permissão |
| `teste.sem.perfil` | Usuário Fictício Sem Perfil |
| `teste.usuario.inativo` | Usuário Fictício Inativo |
| `teste.perfil.clinico` | Usuário Fictício Perfil Clínico |

---

## 7. Domínio de e-mail para homologação

Nenhum domínio deve ser presumido sem verificar a configuração atual do projeto de homologação.

Opções aceitáveis para decisão futura:

| Opção | Condição de uso | Observação |
| --- | --- | --- |
| Domínio controlado pelo projeto | Preferencial, se existir domínio de homologação controlado | Permite governança e rastreabilidade |
| Subdomínio dedicado de homologação | Aceitável se administrado pelo responsável do projeto | Deve ficar separado de produção |
| Domínio reservado para testes | Aceitável se compatível com Supabase Auth e política do projeto | Não deve depender de caixa postal real |

Ponto obrigatório: o domínio final deve ser aprovado antes de qualquer criação. Os e-mails não devem ser criados nesta documentação.

---

## 8. Política de credenciais

- Senhas devem ser temporárias e geradas somente no momento da criação futura.
- Credenciais devem ficar fora do repositório.
- Nenhuma senha deve ser registrada em Markdown, Git, log, terminal compartilhado ou screenshot.
- Não usar a mesma senha para todos os usuários.
- Não habilitar recuperação pública de senha nesta fase.
- O responsável pelas credenciais deve ser definido antes do PP1.
- A troca, bloqueio ou exclusão deve ser registrada como evidência operacional, sem expor segredo.

---

## 9. Estratégia de testes

Os testes devem ser planejados por múltiplas vias, sem usar `service_role` como identidade de usuário final:

| Via | Uso permitido |
| --- | --- |
| SQL Editor | Conferências administrativas controladas, com resultados mascarados quando envolver identidade |
| PostgREST com JWT | Teste principal de comportamento autenticado como usuário final |
| Helper automatizado existente | Execução repetível quando compatível com o ambiente de homologação |
| Testes negativos | Validação de negação para `anon`, sem perfil, sem permissão, inativo e perfil clínico |
| Autenticação real | Confirmação de emissão de JWT e comportamento do projeto remoto |

---

## 10. Critérios de aprovação da fase

A Fase 2.6.2 só poderá ser considerada aprovada após execução futura autorizada e evidências mínimas de que:

- Gestão Hospitalar acessa as três views e recebe apenas dados agregados;
- Leitura/Gestor acessa as três views pelas permissões `leitura.*`;
- usuários sem permissão, sem vínculo e inativo não recebem dados gerenciais;
- perfil clínico não recebe acesso gerencial por possuir permissões clínicas;
- `anon` não acessa as views;
- tabelas clínicas diretas permanecem protegidas;
- não há acesso nominal, escrita, exportação nominal ou configuração indevida;
- cleanup foi concluído ou retenção temporária foi aprovada com prazo.

---

## 11. Retenção

A validade máxima inicial sugerida para usuários fictícios é de 7 dias após a criação futura. Ao final dos testes, cada usuário deve ser excluído ou desativado, salvo autorização expressa de retenção temporária.

Renovação exige nova revisão, data de expiração atualizada e justificativa registrada.

---

## 12. Ponto de parada

Nenhum usuário deve ser criado sem:

- matriz aprovada;
- domínio de e-mail aprovado;
- credenciais fictícias controladas;
- responsável pelas credenciais definido;
- confirmação de projeto não produtivo;
- autorização expressa.

---

## 13. Impacto GHAES

| Dimensão | Impacto |
| --- | --- |
| Banco de dados | Nenhum nesta etapa |
| RLS/policies | Nenhum nesta etapa |
| Grants | Nenhum nesta etapa |
| Dados clínicos | Nenhum nesta etapa |
| Usuários | Nenhum criado nesta etapa |
| Frontend | Nenhum |
| Auditoria | Planejamento exige evidências e cleanup auditável na etapa futura |
