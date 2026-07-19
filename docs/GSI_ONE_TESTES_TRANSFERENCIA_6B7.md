# GSI ONE - Testes integrados da transferencia regulada 5B.6.4 - 6B.7

## Objetivo

Criar cobertura automatizada simulada para o fluxo completo de transferencia regulada 5B.6.4, preservando `script.js`, banco, migrations, RLS, policies e comportamento real.

## Sequencia real mapeada no `script.js`

Funcoes analisadas: `registrarTransferenciaReal`, `aprovarVagaTransferenciaReal`, `confirmarChecklistTransferenciaReal`, `confirmarSaidaTransferenciaReal` e os blocos de `handleAction` para `save-transfer`, `transfer-status`, `transfer-checklist`, `confirm-transfer-checklist` e `transfer-departure`.

Sequencia observada:

1. `save-transfer` exige atendimento local com `atendimentoSupabaseId`; sem ele o fluxo para com mensagem para iniciar atendimento antes da transferencia.
2. `registrarTransferenciaReal` insere em `public.transferencias` com status `em_analise`, motivo, destino, transporte e `hora_solicitacao_ts`.
3. Apos inserir a transferencia, atualiza `public.atendimentos` para `em_transferencia_regulada`, etapa `Em transferencia regulada` e setor `Regulacao de Transferencias`.
4. `aprovarVagaTransferenciaReal` atualiza apenas a transferencia para `vaga_confirmada` e `hora_aprovacao_vaga_ts`.
5. `confirmarChecklistTransferenciaReal` grava itens em `public.checklist_transferencia_itens` e depois marca `checklist_confirmado_em` na transferencia.
6. `confirmarSaidaTransferenciaReal` atualiza `public.transferencias` para `concluida` e grava `hora_saida_ts`.
7. Depois da transferencia concluida, atualiza `public.atendimentos` com status `desfecho_registrado`, desfecho `transferencia_regulada`, `hora_desfecho_ts`, etapa `Transferencia concluida` e setor `Transferencia regulada`.

A ordem transferencia -> atendimento e mantida nos testes porque o legado documenta dependencias de trigger e risco parcial quando a segunda etapa falha.

## Modulos criados

- `src/transfers/transfer-rules.js`: regras puras de payload, status, checklist, saida, atendimento encerrado e desfecho.
- `src/transfers/transfer-service.js`: servico com Supabase injetado para inserir solicitacao, aprovar vaga, confirmar checklist, confirmar saida e atualizar atendimento.
- `src/transfers/transfer-flow.js`: orquestrador testavel com permissoes injetadas para solicitar, aprovar, confirmar checklist, confirmar saida e executar o fluxo completo.

Nenhum modulo acessa DOM, `window`, `localStorage`, Supabase Cloud ou `GsiApi` real.

## Permissoes

Foram exercitadas as permissoes:

- `transferencia.solicitar`;
- `transferencia.aprovar_vaga`;
- `transferencia.confirmar_checklist`;
- `transferencia.confirmar_saida`.

O legado associa solicitacao ao perfil Medico, aprovacao a Regulacao de Transferencia, checklist e saida ao Enfermeiro, com curto-circuito para Administracao via `isActionAllowed`. Nos testes, as chaves de permissao foram usadas como contrato funcional para evitar diferenca de encoding nos nomes de perfis.

## Fixtures e mocks

- `tests/fixtures/transfers.js`: status de transferencia, status de atendimento, desfechos, checklist completo/incompleto, solicitacao e transferencia ficticias com prefixo `TESTE_`.
- `tests/helpers/mock-supabase-query.js`: reutilizado sem novas alteracoes nesta etapa; representa inserts e updates em memoria.

Tabelas simuladas:

- `transferencias`;
- `atendimentos`;
- `checklist_transferencia_itens`;
- `dom_status_transferencia`;
- `dom_status_atendimento`;
- `dom_desfechos`.

## Cenarios cobertos

Foram criados 61 testes novos:

- 19 testes de regras de transferencia;
- 17 testes de servico de transferencia;
- 25 testes integrados do fluxo regulado.

Os cenarios integrados cobrem: solicitacao valida, destino ausente, atendimento real ausente, aprovacao, aprovacao duplicada, checklist incompleto/completo, saida, desfecho do atendimento, etapa e setor finais, saida sem vaga, saida sem checklist, usuario sem permissao, regulacao, enfermeiro, perfil nao autorizado, erro ao criar solicitacao, erro ao aprovar vaga, erro no checklist, erro ao atualizar transferencia na saida, falha parcial ao atualizar atendimento, chamada repetida de saida, id local sem id Supabase, atendimento encerrado e payload incompleto.

## Falhas parciais

Foram documentadas e testadas duas falhas parciais coerentes com o legado:

- solicitacao inserida, mas atendimento nao atualizado para `em_transferencia_regulada`;
- transferencia concluida, mas atendimento nao atualizado para `desfecho_registrado`.

Em ambos os casos, os modulos retornam `ok: false` e `falhaParcial: true`, sem sucesso falso e sem DELETE fisico.

## Riscos de inconsistencia

A principal fragilidade permanece no legado: ausencia de transacao/RPC entre `transferencias` e `atendimentos`. Se a segunda atualizacao falhar, pode haver estado parcial que exige reconciliacao operacional ou processo futuro de housekeeping. Tambem ha risco de divergencia se `script.js` evoluir e os modulos testaveis nao forem atualizados.

## Limitacoes

Os modulos criados sao equivalentes testaveis e nao substituem o fluxo real. Nao validam DOM, renderizacao, mensagens visuais, cache global `transferenciasReaisState`, `GsiApi`, `window.GsiAuth` real nem policies/RLS no banco.

## Proximos passos 6B.8

Avancar para cobertura simulada dos proximos fluxos assistenciais com maior risco de transicao de status, priorizando estabilizacao, observacao, consulta/desfecho ou reconciliacao de falhas parciais, sem refatorar `script.js` ainda.

## Validacao

Validacao executada:

- `npm.cmd run test:run`: 15 arquivos, 228 testes aprovados.
- `npm.cmd run lint`: executar na validacao final da tarefa.
- `npm.cmd run format:check`: executar na validacao final da tarefa.
- `npm.cmd run qa`: executar na validacao final da tarefa.

Nenhuma conexao Cloud, credencial, `service_role`, migration, RLS ou policy foi usada ou alterada.
