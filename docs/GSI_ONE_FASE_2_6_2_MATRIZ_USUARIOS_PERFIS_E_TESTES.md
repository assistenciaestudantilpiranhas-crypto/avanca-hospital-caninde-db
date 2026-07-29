# GSI ONE - Fase 2.6.2: Matriz de Usuários, Perfis e Testes

**Fase:** 2.6.2 - Matriz de planejamento para usuários fictícios em homologação
**Data:** 2026-07-29
**Projeto remoto alvo:** gsi-one-homologacao (`project ref` mascarado)
**Status:** Planejamento - usuários ainda não criados

---

## 1. Regras gerais da matriz

Esta matriz define usuários fictícios propostos para testes autenticados. Nenhum identificador abaixo representa usuário real, credencial real ou autorização de criação.

Campos de data, prazo e responsável devem ser preenchidos somente na execução futura autorizada.

---

## 2. Permissões de referência

### Gestão Hospitalar

Permissões esperadas do perfil Gestão Hospitalar para esta fase:

- `gestao.indicadores.visualizar`
- `gestao.relatorios.visualizar`
- `gestao.producao.visualizar`
- `gestao.tempos.visualizar`
- `gestao.ocupacao.visualizar`
- `gestao.fluxos.visualizar`
- `gestao.setores.visualizar`
- `gestao.usuarios.visualizar`
- `gestao.auditoria_agregada.visualizar`
- `gestao.exportar_agregado`

Permissões proibidas ou não aprovadas para os testes da Fase 2.6.2:

- `gestao.dados_nominais.visualizar`
- `gestao.exportar_nominal`
- `gestao.configuracoes.editar`
- permissões clínicas nominais não aprovadas;
- escrita em tabelas clínicas;
- acesso individual a prontuário, prescrição ou exame.

### Leitura/Gestor

Permissões esperadas do perfil Leitura/Gestor:

- `leitura.indicadores.visualizar`
- `leitura.relatorios.visualizar`
- `leitura.paineis.visualizar`

Permissões proibidas:

- qualquer `gestao.*`;
- qualquer permissão de escrita;
- acesso nominal a usuários, pacientes, atendimentos, prontuários, prescrições ou exames;
- exportação nominal;
- configuração do sistema.

---

## 3. Matriz de usuários propostos

| Identificador lógico | Nome fictício | Perfil esperado | Estado | Data de criação futura | Prazo de validade | Responsável |
| --- | --- | --- | --- | --- | --- | --- |
| `teste.gestao.hospitalar` | Usuário Fictício Gestão Hospitalar | Gestão Hospitalar | Ativo | A definir | Máximo sugerido: 7 dias | A definir |
| `teste.leitura.gestor` | Usuário Fictício Leitura Gestor | Leitura/Gestor | Ativo | A definir | Máximo sugerido: 7 dias | A definir |
| `teste.sem.permissao` | Usuário Fictício Sem Permissão | Perfil existente sem permissões gerenciais, a definir | Ativo | A definir | Máximo sugerido: 7 dias | A definir |
| `teste.sem.perfil` | Usuário Fictício Sem Perfil | Nenhum vínculo em `usuario_perfil` | Ativo em `auth.users`; sem vínculo operacional | A definir | Máximo sugerido: 7 dias | A definir |
| `teste.usuario.inativo` | Usuário Fictício Inativo | Perfil a definir para teste negativo | Inativo em `public.usuarios` | A definir | Máximo sugerido: 7 dias | A definir |
| `teste.perfil.clinico` | Usuário Fictício Perfil Clínico | Perfil clínico não gerencial, preferencialmente Técnico em Enfermagem se aplicável | Ativo | A definir | Máximo sugerido: 7 dias | A definir |

---

## 4. Matriz detalhada por usuário

### 4.1 `teste.gestao.hospitalar`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Gestão Hospitalar |
| Perfil esperado | Gestão Hospitalar |
| Permissões esperadas | `gestao.indicadores.visualizar`, `gestao.relatorios.visualizar`, `gestao.producao.visualizar`, `gestao.tempos.visualizar` e demais `gestao.*` aprovadas |
| Permissões proibidas | Dados nominais, escrita, configuração, prontuário individual, prescrição individual, exame individual, tabelas clínicas diretas |
| Estado | Ativo |
| Finalidade | Validar acesso gerencial agregado pelas três views da Fase 2.6.1 |
| Cenários de teste | Acessar as três views; negar tabelas clínicas diretas; negar escrita; negar dados nominais |
| Procedimento de bloqueio | Desativar em `public.usuarios` ou bloquear no Auth, conforme estratégia aprovada |
| Procedimento de exclusão | Remover vínculo, remover registro institucional se compatível, remover Auth e validar ausência de órfãos |
| Evidências necessárias | JWT usado sem expor segredo, perfil efetivo, permissões efetivas, resultado agregado das três views, negativas clínicas |
| Critério de aprovação | Recebe dados agregados nas três views e não recebe acesso nominal, clínico direto ou escrita |
| Critério de revogação | Qualquer acesso nominal, escrita indevida, grant inesperado ou uso fora do prazo |

### 4.2 `teste.leitura.gestor`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Leitura Gestor |
| Perfil esperado | Leitura/Gestor |
| Permissões esperadas | `leitura.indicadores.visualizar`, `leitura.relatorios.visualizar`, `leitura.paineis.visualizar` |
| Permissões proibidas | `gestao.*`, escrita, dados nominais, usuários nominais, tabelas clínicas diretas, exportação nominal |
| Estado | Ativo |
| Finalidade | Validar leitura consultiva agregada pelas permissões `leitura.*` |
| Cenários de teste | Acessar três views; confirmar ausência de `gestao.*`; negar escrita e tabelas clínicas |
| Procedimento de bloqueio | Desativar em `public.usuarios` ou bloquear no Auth, conforme estratégia aprovada |
| Procedimento de exclusão | Remover vínculo, remover registro institucional se compatível, remover Auth e validar ausência de órfãos |
| Evidências necessárias | Perfil efetivo, permissões `leitura.*`, resultado agregado das views, negativas de acesso nominal |
| Critério de aprovação | Acesso apenas agregado e consultivo, sem escrita nem dados nominais |
| Critério de revogação | Qualquer permissão `gestao.*`, acesso nominal ou escrita indevida |

### 4.3 `teste.sem.permissao`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Sem Permissão |
| Perfil esperado | Perfil existente sem permissões gerenciais, a definir na execução |
| Permissões esperadas | Nenhuma `gestao.*` ou `leitura.*` |
| Permissões proibidas | Todas as permissões gerenciais e acesso direto a tabelas clínicas fora do perfil |
| Estado | Ativo |
| Finalidade | Validar negação para usuário autenticado sem permissão gerencial |
| Cenários de teste | Autenticar; consultar views; esperar zero linhas ou negação documentada; negar tabelas clínicas |
| Procedimento de bloqueio | Desativar ou bloquear credencial temporária |
| Procedimento de exclusão | Remover vínculo, registro institucional e Auth conforme runbook |
| Evidências necessárias | Permissões efetivas sem chaves gerenciais, resultado negativo nas views, negativas clínicas |
| Critério de aprovação | Nenhuma view retorna dados gerenciais |
| Critério de revogação | Qualquer retorno gerencial ou grant inesperado |

### 4.4 `teste.sem.perfil`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Sem Perfil |
| Perfil esperado | Sem vínculo em `public.usuario_perfil` |
| Permissões esperadas | Nenhuma |
| Permissões proibidas | Todas as permissões operacionais, clínicas e gerenciais |
| Estado | Autenticável, sem vínculo operacional |
| Finalidade | Validar que `public.has_permission()` retorna `false` sem perfil |
| Cenários de teste | Autenticar; confirmar ausência de vínculo; consultar views; esperar zero linhas ou negação documentada |
| Procedimento de bloqueio | Bloquear Auth se criado; não criar vínculo durante o teste negativo |
| Procedimento de exclusão | Remover Auth e qualquer registro institucional criado para teste, se existir |
| Evidências necessárias | Ausência de vínculo, `has_permission = false`, negação das três views |
| Critério de aprovação | Nenhuma view retorna dados e nenhuma permissão efetiva é reconhecida |
| Critério de revogação | Vínculo acidental, retorno gerencial ou permissão efetiva indevida |

### 4.5 `teste.usuario.inativo`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Inativo |
| Perfil esperado | Perfil a definir para teste negativo, possivelmente gerencial |
| Permissões esperadas | Nenhuma efetiva enquanto `public.usuarios.ativo = false` |
| Permissões proibidas | Todas as permissões efetivas após inativação |
| Estado | Inativo em `public.usuarios` |
| Finalidade | Validar que `u.ativo = false` impede `public.has_permission()` |
| Cenários de teste | Autenticar; confirmar inatividade; consultar views; esperar zero linhas ou negação documentada |
| Procedimento de bloqueio | Manter inativo; bloquear Auth se necessário |
| Procedimento de exclusão | Remover vínculo, registro institucional e Auth conforme runbook |
| Evidências necessárias | Estado inativo, permissões efetivas falsas, negação das três views |
| Critério de aprovação | Inatividade impede acesso gerencial mesmo com vínculo planejado |
| Critério de revogação | Qualquer acesso gerencial efetivo com `ativo = false` |

### 4.6 `teste.perfil.clinico`

| Campo | Definição |
| --- | --- |
| Nome fictício | Usuário Fictício Perfil Clínico |
| Perfil esperado | Perfil clínico não gerencial, preferencialmente Técnico em Enfermagem se aplicável |
| Permissões esperadas | Apenas permissões clínicas já existentes do perfil escolhido |
| Permissões proibidas | `gestao.*`, `leitura.*`, exportação nominal, configuração, acesso gerencial agregado não autorizado |
| Estado | Ativo |
| Finalidade | Validar negação cruzada: acesso clínico não implica acesso gerencial |
| Cenários de teste | Autenticar; confirmar permissões clínicas existentes; consultar views; esperar zero linhas ou negação documentada |
| Procedimento de bloqueio | Desativar ou bloquear credencial temporária |
| Procedimento de exclusão | Remover vínculo, registro institucional e Auth conforme runbook |
| Evidências necessárias | Perfil clínico efetivo, ausência de permissões gerenciais, negativas nas views |
| Critério de aprovação | Perfil clínico conserva suas regras clínicas e não acessa views gerenciais |
| Critério de revogação | Qualquer acesso gerencial por perfil clínico |

---

## 5. Cenários de teste por view

| View | Gestão Hospitalar | Leitura/Gestor | Sem permissão | Sem perfil | Inativo | Perfil clínico | Anon |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `vw_gestao_indicadores_gerais` | Retorna agregado | Retorna agregado via `leitura.indicadores.visualizar` | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Negado |
| `vw_gestao_producao_assistencial` | Retorna agregado | Retorna agregado via `leitura.relatorios.visualizar` | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Negado |
| `vw_gestao_tempos_assistenciais` | Retorna agregado | Retorna agregado via `leitura.paineis.visualizar` | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Zero linhas ou negação | Negado |

---

## 6. Testes negativos obrigatórios

| Teste | Resultado esperado |
| --- | --- |
| Acesso direto a `public.pacientes` por Gestão Hospitalar | Negado ou zero linhas conforme RLS vigente |
| Acesso direto a `public.atendimentos` por Gestão Hospitalar | Negado ou zero linhas conforme RLS vigente |
| Acesso direto a `public.consultas` por Gestão Hospitalar | Negado ou zero linhas conforme RLS vigente |
| Escrita em tabelas clínicas por perfis gerenciais | Negada |
| Acesso a dados nominais por Leitura/Gestor | Negado |
| Acesso a usuários nominalmente por Leitura/Gestor | Negado |
| Exportação nominal | Negada |
| Acesso a configurações | Negado |
| Usuário sem vínculo chama `public.has_permission()` | `false` |
| Usuário inativo chama `public.has_permission()` | `false` |

---

## 7. Evidências mínimas por usuário

| Identificador lógico | Evidências mínimas |
| --- | --- |
| `teste.gestao.hospitalar` | Perfil, permissões `gestao.*`, retorno agregado das três views, negativas de tabelas clínicas, ausência de escrita |
| `teste.leitura.gestor` | Perfil, permissões `leitura.*`, retorno agregado das três views, negativa de usuários nominais e escrita |
| `teste.sem.permissao` | Perfil escolhido, ausência de permissões gerenciais, zero linhas ou negação nas views |
| `teste.sem.perfil` | Ausência de vínculo, `has_permission = false`, zero linhas ou negação nas views |
| `teste.usuario.inativo` | `ativo = false`, `has_permission = false`, zero linhas ou negação nas views |
| `teste.perfil.clinico` | Perfil clínico efetivo, ausência de permissões gerenciais, negativa nas views |

---

## 8. Critérios globais de revogação

Revogar, bloquear ou excluir imediatamente os usuários fictícios se ocorrer:

- exposição de dado nominal;
- acesso gerencial por usuário sem permissão;
- escrita não autorizada;
- acesso direto indevido a tabelas clínicas;
- uso de e-mail real ou credencial registrada em documento;
- expiração do prazo de validade;
- uso fora de homologação;
- solicitação do responsável institucional.
