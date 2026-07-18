# GSI ONE - Estrategia de refatoracao segura - 6A.3

## 1. Objetivo

Definir uma estrategia progressiva para modularizar o frontend do GSI ONE sem reescrita total, preservando os fluxos assistenciais ja validados e permitindo rollback por etapa.

Esta etapa e exclusivamente documental. Nao cria modulos, nao altera codigo e nao muda comportamento funcional.

## 2. Principios obrigatorios

- Refatoracao incremental, com escopo pequeno e verificavel.
- Comportamento preservado antes, durante e depois de cada extracao.
- Nenhuma mudanca funcional oculta dentro de refatoracao.
- Um dominio por etapa, evitando misturar areas clinicas e administrativas.
- Commits pequenos, revisaveis e revertiveis.
- Testes antes e depois de cada etapa.
- Compatibilidade temporaria com `script.js`.
- Sem alteracao simultanea de frontend, banco e RLS.
- Nenhuma exclusao de codigo antigo antes da validacao equivalente.
- Preservacao do GDS, do GHAES, da auditabilidade e da seguranca assistencial.

## 3. Estrategia de transicao

A transicao deve manter convivencia temporaria entre:

- `script.js` atual como ponto de entrada legado;
- novos modulos por dominio;
- funcoes adaptadoras expostas para o legado;
- servicos compartilhados de dados;
- estado legado em memoria;
- Supabase como persistencia real;
- `localStorage`/`GsiApi` enquanto ainda forem necessarios para compatibilidade.

Modelo recomendado:

1. Criar modulos pequenos que exportam funcoes equivalentes as funcoes legadas.
2. Manter `script.js` chamando adaptadores temporarios.
3. Validar equivalencia com testes e smoke manual.
4. Migrar chamadas uma a uma.
5. Remover codigo legado somente apos cobertura equivalente e validacao funcional.

Para evitar duplicacao e divergencia:

- handlers devem ter um unico ponto de registro por acao;
- inicializacao global deve continuar centralizada ate existir `core/app.js`;
- eventos DOM nao podem ser registrados no modulo e no legado ao mesmo tempo;
- Supabase deve ter uma camada unica de servico por tabela/dominio;
- `GsiApi` deve continuar como adaptador legado, nao como segunda regra de negocio;
- caches em memoria devem ter dono claro e estrategia de invalidacao;
- funcoes migradas devem preservar payload, ordem das escritas e mensagens criticas;
- renderizadores nao devem disparar chamadas duplicadas ao Supabase;
- cada extracao deve registrar qual fonte de verdade esta sendo usada.

## 4. Estrutura futura sugerida

```text
src/
  core/
    app.js
    router.js
    state.js
    config.js
  auth/
  permissions/
  services/
    supabase-client.js
    patients-service.js
    attendances-service.js
    triage-service.js
    transfer-service.js
  ui/
    toast.js
    modal.js
    table.js
    form.js
  patients/
  reception/
  attendances/
  triage/
  consultation/
  nursing/
  pharmacy/
  exams/
  stabilization/
  observation/
  transfers/
  dashboard/
  reports/
  settings/
  shared/
```

| Diretorio | Responsabilidade | Dependencias permitidas | Dependencias proibidas | Risco |
|---|---|---|---|---|
| `core/` | Bootstrap, ciclo de vida, router, estado minimo e configuracao | `auth`, `permissions`, `services`, `ui`, modulos de pagina | Regras clinicas detalhadas, queries diretas em componentes | Alto |
| `auth/` | Adaptador de sessao e `window.GsiAuth` | `services/supabase-client`, `shared` | DOM de pagina, regras clinicas | Medio |
| `permissions/` | Rotas, permissoes e gates de acao | `auth`, `shared` | Supabase direto, DOM direto | Alto |
| `services/` | Acesso a dados, Supabase, repositories e adaptadores `GsiApi` | `auth`, `shared` | Renderizacao HTML, eventos DOM | Alto |
| `ui/` | Toasts, modais, tabelas, formularios e componentes visuais | `shared` | Queries Supabase, regras clinicas complexas | Baixo/Medio |
| `patients/` | Cadastro, edicao, visualizacao e compatibilidade local/real | `services`, `ui`, `shared`, `permissions` | Mudar status assistencial sem caso de uso | Alto |
| `reception/` | Entrada, fila inicial, chamada e abertura de atendimento | `patients`, `attendances`, `services`, `ui` | Escritas clinicas de triagem/consulta | Alto |
| `attendances/` | Episodio assistencial, status, etapa, setor e timestamps | `services`, `shared`, `permissions` | Renderizacao global, regra de paciente cadastral | Alto |
| `triage/` | Classificacao de risco e conclusao da triagem | `attendances`, `services`, `ui`, `shared` | Criar paciente/atendimento sem gate explicito | Alto |
| `consultation/` | Inicio de consulta, condutas e desfechos | `attendances`, `services`, `transfers`, `observation`, `stabilization` | Alterar RLS ou grants | Alto |
| `nursing/` | Evolucao, sinais, procedimentos e checklist de enfermagem | `services`, `ui`, `permissions` | Desfecho medico sem regra explicita | Medio/Alto |
| `pharmacy/` | Prescricoes, dispensacao e estoque | `services`, `ui`, `shared` | Alteracao direta de saldo sem regra | Medio |
| `exams/` | Solicitacao, status, resultado e resultado critico | `services`, `ui`, `shared` | Expor resultado a perfil indevido | Medio |
| `stabilization/` | Sala de estabilizacao, checklist e evolucao | `attendances`, `services`, `ui` | Saida/desfecho sem caso de uso validado | Alto |
| `observation/` | Observacoes, reavaliacao, alta e encaminhamento | `attendances`, `services`, `ui` | Transferencia/desfecho sem permissoes | Alto |
| `transfers/` | Solicitacao, vaga, checklist e saida 5B.6.4 | `attendances`, `services`, `ui`, `permissions` | Ignorar checklist, alterar atendimento sem Supabase | Alto |
| `dashboard/` | Indicadores operacionais e cards | `services`, `shared`, `ui` | Escritas clinicas | Medio |
| `reports/` | Relatorios, impressao e fichas tecnicas | `dashboard`, `services`, `ui` | Mutacao assistencial | Medio |
| `settings/` | Configuracoes e auditoria | `services`, `permissions`, `ui` | Alterar policies/RLS pelo frontend | Medio/Alto |
| `shared/` | Formatadores, validacoes puras, datas, textos e constantes | Nenhuma dependencia de dominio | DOM, Supabase, `GsiApi` | Baixo |

## 5. Camadas propostas

- Apresentacao: renderizadores, componentes, modais, tabelas e toasts.
- Casos de uso: orquestracao de fluxos como abrir atendimento, salvar triagem e confirmar transferencia.
- Regras de negocio: validacoes, transicoes permitidas, pre-condicoes e invariantes assistenciais.
- Acesso a dados: repositories Supabase e adaptadores `GsiApi`/localStorage.
- Autenticacao: sessao e identidade do usuario.
- Autorizacao: perfis, permissoes, guards e bloqueios de acao.
- Estado: caches em memoria, invalidacao e sincronizacao.
- Infraestrutura: cliente Supabase, configuracao, logs e tratamento de erro.

Componentes de UI nao devem executar diretamente regras clinicas ou queries complexas. Eles devem receber dados prontos e disparar comandos para casos de uso.

## 6. Ordem segura de extracao

### Fase 1 - risco baixo

- formatadores;
- validacoes puras;
- datas e horarios;
- notificacoes;
- utilitarios;
- constantes;
- componentes visuais simples.

### Fase 2 - risco baixo/medio

- cliente Supabase;
- tratamento de erros;
- carregamento de dominios;
- persistencia local;
- servicos somente leitura.

### Fase 3 - risco medio

- autenticacao;
- sessao;
- perfis;
- permissoes;
- router;
- navegacao.

### Fase 4 - risco medio/alto

- dashboard;
- relatorios;
- configuracoes;
- painel de chamada;
- exames;
- farmacia.

### Fase 5 - risco alto

- pacientes;
- recepcao;
- atendimentos;
- triagem;
- consulta;
- enfermagem;
- observacao;
- estabilizacao;
- transferencia.

## 7. Estrategia por funcao critica

| Funcao | Modulo de destino | Dependencias atuais | Pre-requisitos | Testes necessarios | Adaptador temporario | Remocao do legado |
|---|---|---|---|---|---|---|
| `createPacienteRealFromLocal` | `services/patients-service.js` e `patients/` | `window.GsiAuth.client`, `findPacienteRealDuplicado`, payload local | CT de cadastro/duplicidade e contrato de payload | CT-008 a CT-012, RLS pacientes | `script.js` chama `PatientsService.createFromLocal` | Apos equivalencia e sem divergencia local/Supabase |
| `updatePacienteRealFromLocal` | `services/patients-service.js` | `GsiAuth`, `pacientesReaisState`, `GsiApi` | Teste de preservacao de campos clinicos | CT-011, regressao paciente | wrapper `updatePacienteRealFromLocal` | Apos edicao validar merge sem perda clinica |
| `createAtendimentoRealFromLocal` | `services/attendances-service.js` | status domain, Supabase, paciente real | Testes de atendimento ativo e status inicial | CT-013 a CT-018 | `AttendancesService.createFromLocal` | Apos teste anti-duplicidade |
| `updateAtendimentoRealTriagem` | `services/triage-service.js` | classificacao domain, Supabase, caches | Fluxo recepcao-atendimento-triagem coberto | CT-019 a CT-025 | `TriageService.saveResult` | Apos salvar triagem equivalente |
| `registrarCondutaRealAlta` | `services/consultation-service.js` | consultas, atendimentos, desfechos | Testes de consulta/desfecho | CT-026, CT-027 | `ConsultationService.registerDischarge` | Apos validar ordem consulta -> atendimento |
| `registrarCondutaRealObservacao` | `services/consultation-service.js`, `observation/` | consultas, observacoes, atendimentos | Testes observacao e status | CT-028, CT-034 a CT-036 | `ConsultationService.routeToObservation` | Apos validar admissao e reavaliacao |
| `registrarCondutaRealEstabilizacao` | `services/consultation-service.js`, `stabilization/` | consultas, estabilizacoes, atendimentos | Testes estabilizacao | CT-029, CT-037, CT-038 | `ConsultationService.routeToStabilization` | Apos validar checklist e status |
| `registrarTransferenciaReal` | `services/transfer-service.js` | status transferencia, atendimentos, Supabase | Testes transferencia inicial | CT-039 | `TransferService.request` | Apos validar solicitacao e cache |
| `aprovarVagaTransferenciaReal` | `services/transfer-service.js` | Supabase, status transferencia | Testes de regulacao | CT-040 | `TransferService.approveVacancy` | Apos validar permissao de regulacao |
| `confirmarChecklistTransferenciaReal` | `services/transfer-service.js` | checklist, Supabase, `transferSafetyChecklist` | Testes checklist completo/incompleto | CT-041, CT-042 | `TransferService.confirmChecklist` | Apos validar itens e timestamp |
| `confirmarSaidaTransferenciaReal` | `services/transfer-service.js` | transferencias, atendimentos, status/desfecho domains | Testes 5B.6.4 completos | CT-043 a CT-045 | `TransferService.confirmDeparture` | Apos validar saida, desfecho e rollback parcial |
| `isRouteAllowed` | `permissions/routes.js` | `window.GsiAuth`, `routePermissions` | Matriz de perfis definida | CT-001 a CT-007, CT-051, CT-054 | `Permissions.isRouteAllowed` | Apos menu e guards equivalentes |
| `isActionAllowed` | `permissions/actions.js` | `window.GsiAuth`, regras `*_ACTION_RULE` | Testes de permissao por acao | CT-019, CT-021, CT-031, CT-045 | `Permissions.isActionAllowed` | Apos bloqueios equivalentes |
| `handleSession` | `auth/session.js` | Evento `gsiauth:ready`, `GsiAuth` | Definir funcao explicita se hoje estiver implícita no listener | CT-001 a CT-006 | Listener legado chama `Auth.handleSessionReady` | Apos sessao carregar sem render duplicado |
| `renderPage` | `core/router.js` | `pages`, `content`, loaders, guards | Registro de rotas e fallback | Smoke, CT dashboard/rotas | `renderPage` delega para `Router.render` | Apos hash routing e pages equivalentes |
| `handleAction` | `core/actions-dispatcher.js` | Quase todos dominios, DOM, `GsiApi`, Supabase | Testes por dominio e dispatcher legado | CTs criticos por acao | Dispatcher legado chama action modules | Apos todas actions migradas e sem handler duplicado |

## 8. Estrategia para `handleAction`

`handleAction` deve ser decomposto por dominio, mantendo temporariamente um dispatcher legado.

Modulos sugeridos:

- `patientActions`;
- `receptionActions`;
- `triageActions`;
- `consultationActions`;
- `nursingActions`;
- `transferActions`;
- `sharedActions`.

Estrategia:

1. Criar um mapa `action -> handler` por dominio.
2. Preservar os gates atuais no dispatcher legado enquanto cada dominio migra.
3. Migrar primeiro actions sem Supabase e sem mudanca assistencial.
4. Migrar actions com Supabase somente apos testes de integracao.
5. Impedir registro duplo de listeners: o clique global continua chamando um dispatcher unico.
6. Manter assinatura compativel: `(action, button)` ate a transicao estabilizar.
7. Remover blocos antigos de `handleAction` apenas quando o handler modular tiver teste e comportamento equivalente.

## 9. Estrategia para `renderPage`

`renderPage` deve evoluir para um router com registro explicito de rotas:

- `routeId`;
- renderizador do modulo;
- guard de rota;
- loaders necessarios;
- fallback de erro;
- titulo/metadados quando aplicavel.

Diretrizes:

- preservar hash routing atual durante a transicao;
- manter `pages` como registro legado ate o novo router cobrir todas as rotas;
- centralizar guards em `permissions/`;
- usar layout compartilhado para menu, cabecalho e conteudo;
- permitir carregamento assincrono com estado de loading;
- tratar erro de loader sem quebrar toda a aplicacao;
- evitar que renderizadores chamem Supabase diretamente sem service;
- impedir re-render duplicado em `hashchange` e `gsiauth:ready`.

## 10. Estado e fonte de verdade

Plano de estado:

- Supabase e a fonte persistente real de pacientes, atendimentos, dominios, configuracoes, auditoria e transferencias persistidas.
- Estado em memoria e cache temporario, com dono claro e invalidacao apos escrita.
- `localStorage` deve ficar restrito a preferencias justificadas e compatibilidade temporaria.
- `GsiApi` deve ser tratado como adaptador legado/local, nao como regra definitiva.
- Dados ficticios devem ser isolados por prefixo `TESTE_` e nunca misturados com dados reais.
- Escritas devem atualizar Supabase primeiro quando o fluxo real exigir consistencia.
- Falhas parciais devem ser tratadas explicitamente, sem fallback silencioso que crie divergencia.
- Caches devem ser invalidados apos create/update relevante.
- IDs de ponte como `pacienteSupabaseId` e `atendimentoSupabaseId` devem ser preservados ate migracao completa.

## 11. Banco e seguranca

A modularizacao:

- nao altera migrations automaticamente;
- nao altera RLS junto com extracao de frontend;
- nao amplia grants;
- nao contorna policies;
- nao move regras criticas apenas para o frontend;
- preserva auditabilidade;
- exige testes negativos por perfil e tentativa direta no Supabase;
- deve manter SECURITY DEFINER, grants e policies sob revisao separada;
- nao deve introduzir service role no frontend;
- nao deve relaxar validacoes para acomodar modulo novo.

## 12. Estrategia de branches e commits

- Usar uma branch por bloco de refatoracao.
- Preferir prefixo `codex/` quando a branch for criada por Codex.
- Fazer commits pequenos, com escopo unico e mensagem clara.
- Nao fazer push direto para `main` durante refatoracao.
- Exigir revisao antes de merge.
- Manter possibilidade de cherry-pick/revert por etapa.
- Nao misturar modulos nao relacionados no mesmo commit.
- Nao combinar refatoracao frontend com alteracao de migration/RLS no mesmo commit.

## 13. Criterios de entrada por etapa

Nenhuma extracao deve comecar sem:

- casos de teste definidos;
- comportamento atual documentado;
- funcoes dependentes identificadas;
- estado Git limpo;
- backup ou patch da etapa anterior, quando aplicavel;
- criterio de rollback definido;
- lista de arquivos esperados;
- confirmacao de que a etapa nao toca banco/RLS;
- smoke test manual definido para fluxo afetado.

## 14. Criterios de saida por etapa

Cada etapa so termina quando:

- testes passam;
- comportamento equivalente foi confirmado;
- nao ha regressao;
- nao ha novo erro de console;
- nao ha consulta duplicada;
- nao ha alteracao indevida de permissoes;
- nao ha divergencia local/Supabase;
- documentacao foi atualizada;
- codigo legado foi removido apenas apos equivalencia comprovada;
- `git diff` mostra apenas arquivos do escopo.

## 15. Rollback

Rollback deve ser planejado por etapa:

- rollback por commit quando a etapa ja estiver commitada;
- feature flag quando houver convivencia de modulo novo e legado;
- adaptador legado mantido ate equivalencia;
- restauracao do modulo anterior sem mudar banco;
- preservacao de migrations ja aplicadas;
- interrupcao imediata se houver falha em RLS, perda de dados, duplicidade de atendimento, transferencia sem checklist ou erro assistencial critico;
- registro do motivo do rollback no documento da etapa ou PR.

## 16. Matriz de risco

| Modulo | Risco | Impacto | Dependencias | Testes necessarios | Ordem sugerida | Rollback |
|---|---|---|---|---|---|---|
| `shared` | Baixo | Erros de formatacao/validacao | Nenhuma ou minima | Unitarios puros | 1 | Reverter commit |
| `ui` | Baixo/Medio | Modais, toasts ou formularios quebrados | DOM, shared | Unitarios/funcionais leves | 2 | Voltar componente legado |
| `services/supabase-client` | Medio | Falha geral de dados | `GsiAuth`, Supabase | Integracao e smoke | 3 | Adaptador legado direto |
| `permissions` | Alto | Bypass ou bloqueio indevido | Auth, regras de perfil | Permissoes/RLS negativas | 4 | Reverter para regras em `script.js` |
| `auth` | Medio/Alto | Sessao nao carrega ou usuario indevido | `GsiAuth`, router | Auth e smoke | 5 | Listener legado |
| `router` | Alto | Rotas indisponiveis ou render duplicado | pages, permissions, DOM | Funcionais por rota | 6 | `renderPage` legado |
| `dashboard` | Medio | Indicadores errados | GsiApi/Supabase, shared | Regressao indicadores | 7 | Renderizador legado |
| `reports` | Medio | Relatorio/impressao inconsistente | dashboard, ui | Funcionais/manual | 8 | Modal legado |
| `settings` | Medio/Alto | Config indevida ou auditoria exposta | Supabase, permissions | RLS/permissao | 9 | Tela legada |
| `exams` | Medio | Resultado ou status incorreto | patients, services | Funcionais e permissao | 10 | Handlers legados |
| `pharmacy` | Medio | Estoque/prescricao incorretos | services/GsiApi | Funcionais e negativos | 11 | Handlers legados |
| `patients` | Alto | Identidade/duplicidade/perda clinica | Supabase, GsiApi | CT paciente completos | 12 | Service legado |
| `reception` | Alto | Fluxo inicial quebrado | patients, attendances | Recepcao -> Atendimento | 13 | Actions legadas |
| `attendances` | Alto | Status/timestamp/desfecho errado | Supabase domains | Integracao/banco | 14 | Service legado |
| `triage` | Alto | Classificacao ou transicao errada | attendances, permissions | CT triagem | 15 | Handler legado |
| `consultation` | Alto | Desfecho clinico errado | attendances, services | CT consulta/desfecho | 16 | Handler legado |
| `nursing` | Medio/Alto | Evolucao/checklist indevido | permissions, patients | Permissao/funcional | 17 | Handler legado |
| `observation` | Alto | Alta/reavaliacao/status errado | consultation, attendances | CT observacao | 18 | Render/actions legados |
| `stabilization` | Alto | Checklist/encaminhamento errado | consultation, attendances | CT estabilizacao | 19 | Render/actions legados |
| `transfers` | Alto | Saida sem checklist/desfecho errado | attendances, domains, Supabase | CT 5B.6.4 | 20 | Adapter legado e revert |

## 17. Primeira implementacao futura sugerida

O primeiro bloco funcional futuro deve ser de baixo risco:

- formatadores;
- toast/notificacoes;
- validacoes puras;
- constantes.

Nao implementar nesta etapa. Antes de iniciar, definir testes unitarios, confirmar estado Git limpo e criar branch propria.

## 18. Itens proibidos nesta etapa

- Nao alterar `script.js`.
- Nao alterar HTML.
- Nao alterar CSS.
- Nao criar `src/`.
- Nao instalar dependencias.
- Nao alterar banco.
- Nao alterar migrations.
- Nao alterar RLS.
- Nao alterar policies.
- Nao fazer `git add`.
- Nao fazer commit.
- Nao fazer push.

## 19. Riscos criticos identificados

- `handleAction` e o maior ponto de acoplamento, pois mistura DOM, permissoes, Supabase, `GsiApi`, toasts e navegacao.
- `renderPage` pode causar renderizacao duplicada, loader duplicado ou bypass de guards se for extraido sem registro de rotas testado.
- Transferencia 5B.6.4 exige ordem segura: solicitacao, aprovacao, checklist completo, saida, fechamento de atendimento e desfecho.
- Recepcao -> Atendimento -> Triagem nao deve ser dividido antes de testes cobrirem paciente real, atendimento real, status e permissao.
- A coexistencia entre `GsiApi`/localStorage e Supabase pode gerar duas fontes de verdade se services nao tiverem contrato claro.
- Segurança real deve permanecer no banco/RLS; frontend modular nao pode virar camada unica de protecao.
