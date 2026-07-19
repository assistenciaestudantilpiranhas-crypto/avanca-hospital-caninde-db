# GSI ONE - Testes integrados do fluxo Recepcao -> Atendimento -> Triagem - 6B.6

## Objetivo

Criar cobertura automatizada isolada e simulada para o fluxo Recepcao -> cadastro/localizacao do paciente -> abertura ou reutilizacao de atendimento ativo -> triagem -> persistencia da classificacao -> avanco para aguardando_consulta, sem alterar o comportamento real do `script.js`.

## Sequencia real mapeada no `script.js`

Funcoes analisadas: `findPacienteRealDuplicado`, `createPacienteRealFromLocal`, `updatePacienteRealFromLocal`, `createAtendimentoRealFromLocal`, `obterAtendimentoAtivoReal`, `obterOuCriarAtendimentoAtivoReal`, `atendimentoRealById`, `registrarTriagemReal`, `updateAtendimentoRealTriagem`, alem dos blocos `start-care`, `open-triage-modal` e `save-triage` em `handleAction`.

Sequencia observada:

1. Recepcao salva/promove o cadastro real em `public.pacientes`, buscando duplicidade por CPF e CNS.
2. O sistema localiza atendimento ativo em `public.atendimentos` pelos status ativos de `public.dom_status_atendimento`.
3. Se nao houver atendimento ativo e o usuario puder abrir atendimento, cria episodio em `public.atendimentos` com `aguardando_triagem` e `Aguardando triagem`.
4. Na triagem, a classificacao sugerida e a confirmada sao resolvidas em `public.dom_classificacao_risco` antes da gravacao clinica.
5. `registrarTriagemReal` insere em `public.triagens` ou atualiza a triagem existente do mesmo atendimento, evitando duplicidade por novo clique.
6. `updateAtendimentoRealTriagem` atualiza `status_id` para `aguardando_consulta`, `classificacao_risco_id` e `etapa_atual` para `Aguardando consulta`.
7. O legado bloqueia criacao implicita por usuario de triagem sem permissao de recepcao/abertura e orienta abrir o atendimento pela Recepcao.

## Pre-condicoes, estados e tabelas

Pre-condicoes principais: sessao carregada, permissoes coerentes, paciente real para salvar triagem, atendimento real ativo para usuario sem permissao de abertura, classificacoes existentes no dominio, status `aguardando_consulta` existente.

Tabelas simuladas: `pacientes`, `atendimentos`, `triagens`, `dom_classificacao_risco`, `dom_status_atendimento`.

Estados cobertos: paciente novo, paciente existente, atendimento ativo, atendimento encerrado, atendimento aguardando triagem, atendimento aguardando consulta, falha antes do atendimento, falha antes da triagem e falha parcial apos inserir triagem.

## Modulos criados

- `src/triage/triage-rules.js`: validacoes puras de triagem, normalizacao de classificacao, payload de insert em `triagens` e payload de update em `atendimentos`.
- `src/triage/triage-service.js`: servico com cliente Supabase injetado para resolver classificacoes/status, inserir ou atualizar triagem e atualizar atendimento.
- `src/reception/reception-triage-flow.js`: orquestrador testavel do fluxo, com servicos e permissoes injetados, sem DOM, `window`, `localStorage`, Supabase Cloud ou `GsiApi` real.

## Fixtures e mocks

- `tests/fixtures/triage.js`: pacientes, triagem, classificacoes de risco e status de atendimento com dados ficticios `TESTE_`.
- `tests/helpers/mock-supabase-query.js`: ampliado para manter `rows` em memoria em inserts e updates, preservando o contrato antigo usado pelas etapas anteriores.

## Cenarios cobertos

Regras de triagem: 15 testes cobrindo paciente/atendimento obrigatorios, classificacoes validas, diferenca entre sugerida e confirmada, horarios, payload incompleto, classificacao inexistente, `null`/`undefined`, status final, etapa e setor.

Servico de triagem: 11 testes cobrindo busca de classificacao/status, insert novo, update idempotente, horarios, erros em dominio, insert de triagem, update de atendimento, retorno de ids reais e falha parcial sem sucesso falso.

Fluxo integrado: 20 testes cobrindo os 20 cenarios obrigatorios da etapa, incluindo paciente novo, paciente existente, atendimento ativo, atendimento encerrado, CPF/CNS conflitante, nome divergente, permissoes, tecnico em enfermagem conforme regra atual, classificacoes iguais/diferentes, erros de paciente/atendimento/triagem/update, chamada duplicada, segunda execucao e payload incompleto.

## Permissoes relevantes

Foram exercitadas as chaves `paciente.criar`, `atendimento.abrir` e `triagem.classificar`. O comportamento atual do frontend permite `triagem.classificar` para Enfermeiro e Tecnico em Enfermagem; os testes registram esse contrato sem criar autorizacao nova.

## Falhas parciais identificadas

Quando a triagem ja foi inserida e a atualizacao do atendimento falha, o servico retorna `ok: false`, `falhaParcial: true`, a triagem persistida e o erro original. Essa compensacao nao desfaz a triagem porque o fluxo legado tambem nao executa DELETE fisico nem rollback client-side.

## Divergencias entre local e Supabase

O fluxo testavel preserva a ponte local/Supabase por ids reais, mas nao executa renderizacao, `GsiApi`, `localStorage`, cache global de `script.js` ou mensagens visuais. A verificacao de duplicidade segue CPF/CNS textual, como os modulos de pacientes da 6B.5.

## Limitacoes e riscos

Os modulos sao equivalentes para teste, nao substituem o legado em producao. Existe risco de divergencia futura se `script.js` evoluir sem atualizar estes modulos. As regras de negocio continuam misturadas ao HTML/DOM no legado; estes testes reduzem risco de refatoracao, mas nao provam a interface real.

## Proximos passos 6B.7

Avancar para testes simulados dos proximos pontos assistenciais somente depois de confirmar que o contrato Recepcao -> Atendimento -> Triagem permanece estavel. Priorizar consulta medica, enfermagem e transicoes de status sem mover `script.js` ainda.

## Validacao

Validacao executada durante a etapa:

- `npm.cmd run test:run`: 12 arquivos, 167 testes aprovados.
- `npm.cmd run lint`: executar na validacao final da tarefa.
- `npm.cmd run format:check`: executar na validacao final da tarefa.
- `npm.cmd run qa`: executar na validacao final da tarefa.

Nenhuma conexao Cloud, credencial, `service_role`, migration, RLS ou policy foi usada ou alterada.
