# GSI ONE - Mapa de modulos e responsabilidades do script.js - 6A.1

## 1. Objetivo da analise

Esta analise documenta a organizacao atual do arquivo `script.js` do frontend do GSI ONE para preparar uma modularizacao futura, progressiva e segura.

O objetivo desta etapa e exclusivamente arquitetural e documental. O fluxo assistencial existente deve ser preservado, especialmente Recepcao -> Atendimento -> Triagem e os fluxos clinicos ja conectados a atendimento, consulta, observacao, estabilizacao e transferencia.

Esta etapa nao realiza refatoracao, nao cria modulos, nao altera persistencia e nao altera regras de negocio.

## 2. Visao geral do script.js

- Tamanho aproximado: 6.187 linhas.
- Natureza atual: arquivo monolitico de frontend, com menus, permissao de rotas, componentes HTML, renderizacao de paginas, modais, manipulacao de eventos, persistencia local, cache em memoria, integracao Supabase e regras assistenciais.
- Principais responsabilidades concentradas:
  - definicao de menu, rotas e setores;
  - gates de permissoes por rota e por acao;
  - componentes compartilhados de HTML, tabela, formulario, metricas, badges, modais e toasts;
  - carregamento e compatibilizacao de dados locais com registros reais Supabase;
  - funcoes de dominio para pacientes, atendimentos, triagem, consulta, observacao, estabilizacao e transferencias;
  - renderizacao de todas as paginas da aplicacao;
  - um dispatcher central `handleAction`;
  - listeners globais de navegacao, clique, hash, impressao e auth-ready.
- Dependencias globais:
  - `window.GsiAuth`, incluindo `isReady`, `client`, `hasPerfil`, `hasPermission`, `getCurrentUser` e `signOut`;
  - `GsiApi`, usado como camada local/demo para `list`, `create`, `update` e `resetDemoData`;
  - DOM global por IDs: `appContent`, `sideNav`, `sidebar`, `overlay`, `mobileMenu`, `sectorSelect`, `userMenuButton`, `userMenuPanel`, `userMenuProfileBadge`, `userMenuProfileSelect`;
  - APIs de navegador: `window.location.hash`, `localStorage`, `speechSynthesis`, `window.print`, eventos globais.
- Integracoes Supabase:
  - consultas e escritas diretas via `window.GsiAuth.client.from(...)`;
  - tabelas identificadas: `pacientes`, `atendimentos`, `dom_status_atendimento`, `dom_classificacao_risco`, `dom_desfechos`, `dom_tipos_observacao`, `dom_status_transferencia`, `consultas`, `observacoes`, `estabilizacoes`, `transferencias`, `checklist_transferencia_itens`, `configuracoes_sistema`, `audit_log`, `usuarios`;
  - nao ha uso aparente de service role no `script.js`; as chamadas dependem da sessao e das policies/RLS aplicadas pelo Supabase.
- Persistencia local e estado em memoria:
  - `GsiApi` concentra listas locais/demo para `pacientes`, `atendimentos`, `chamadas`, `exames`, `prescricoes`, `transferencias` e `estoque`;
  - `localStorage` guarda perfil operacional (`gsi_saude_perfil_operacional`) e preferencias do painel de chamada/audio;
  - caches em memoria: `pacientesReaisState`, `atendimentosReaisState`, `statusAtendimentoState`, `classificacaoRiscoState`, `desfechosState`, `tiposObservacaoState`, `statusTransferenciaState`, `transferenciasReaisState`, `configSistemaState`, `auditoriaState`, `auditoriaFiltros`, `tvRefreshTimer`;
  - existem dados demonstrativos/localStorage em uso via `GsiApi` e acao `reset-demo`.

## 3. Inventario por dominio funcional

| Dominio | Principais funcoes/blocos | Variaveis/objetos associados | Tabelas Supabase utilizadas | Paginas/rotas relacionadas | Depende de | Acoplamento | Risco |
|---|---|---|---|---|---|---|---|
| Inicializacao da aplicacao | definicao de menus, DOM refs, listeners globais, `renderPage(currentPage)` | `menuItems`, `sectorOptions`, `currentPage`, refs DOM, `pages`, `tvRefreshTimer` | indireto por paginas carregadas | todas | DOM, router, auth, pages | alto | alto |
| Autenticacao e sessao | gates com `window.GsiAuth`, evento `gsiauth:ready`, `demo-logout` | `window.GsiAuth` | indireto; cliente Supabase autenticado | todas, `sair` | auth.js, Supabase client | alto | alto |
| Usuarios, perfis e permissoes | `isRouteAllowed`, `isActionAllowed`, regras `*_ACTION_RULE`, arrays de gated actions | `routePermissions`, `ALWAYS_VISIBLE_ROUTES`, `operationalProfiles` | `usuarios` em auditoria; permissoes via `GsiAuth` | todas | auth, rotas, acoes | alto | alto |
| Roteamento e navegacao | `renderNav`, `renderPage`, listener `hashchange`, side nav, setor | `pages`, `currentPage`, `sectorSelect` | indireto | todas | permissoes, renderizadores, DOM | alto | alto |
| Renderizacao de paginas | `dashboard`, `pacientes`, `atendimentos`, `triagem`, `consulta`, `farmacia`, `exames`, `transferencias`, `indicadores`, `relatorios`, `configuracoes`, `auditoria` etc. | `content`, `pages`, helpers HTML | varias, quando render chama loaders | todas | GsiApi, Supabase, UI, permissoes | alto | alto |
| Componentes compartilhados | `tag`, `status`, `actionButton`, `pageHead`, `metric`, `table`, `field`, `selectField`, `yesNoField`, `openModal`, `showToast` | `appModal`, `toastRoot`, `riskClass` | nenhuma direta | todas | DOM, helpers | medio | medio |
| Pacientes | `loadPacientesReais`, `listPacientesCompat`, `patientById`, `findPacienteRealDuplicado`, `createPacienteRealFromLocal`, `updatePacienteRealFromLocal`, `openRegisterPatient`, `openEditPatientModal`, `openPatientModal` | `pacientesReaisState`, regras de paciente | `pacientes` | `pacientes`, varias paginas clinicas | GsiApi, auth, Supabase, formularios | alto | alto |
| Atendimentos | `loadAtendimentosReais`, `listAtendimentosCompat`, `atendimentoRealById`, `createAtendimentoRealFromLocal`, `updateAtendimentoRealConsultaInicio`, `atendimentos`, `atendimentosOperational`, `atendimentoStageInfo` | `atendimentosReaisState`, `statusAtendimentoState` | `atendimentos`, `dom_status_atendimento` | `atendimentos` | pacientes, Supabase, triagem, consulta | alto | alto |
| Recepcao | `pacientes`, `openRegisterPatient`, `save-patient`, `start-care`, `call-patient`, `painelChamada` | `PACIENTE_CREATE_ACTION_RULE`, `ATENDIMENTO_OPEN_ACTION_RULE` | `pacientes`, `atendimentos` | `pacientes`, `atendimentos`, `painel-chamada` | pacientes, atendimentos, chamadas | alto | alto |
| Triagem e classificacao de risco | `suggestRisk`, `classificacao`, `triagem`, `openRiskModal`, `openTriageModal`, `save-risk`, `save-triage`, `updateAtendimentoRealTriagem` | `TRIAGEM_ACTION_RULE`, `riskClass`, `classificacaoRiscoState` | `atendimentos`, `dom_classificacao_risco` | `risco`, `triagem` | pacientes, atendimentos, permissao | alto | alto |
| Consulta medica | `consulta`, `openCallConsultModal`, `openStartConsultModal`, `openConductModal`, `conductClinicalSummary`, `registrarCondutaRealAlta`, `registrarCondutaRealObservacao`, `registrarCondutaRealEstabilizacao` | `CONSULTA_INICIAR_ACTION_RULE`, `CONSULTA_CONDUTA_ACTION_RULE`, medicos e consultorios ficticios | `consultas`, `atendimentos`, `observacoes`, `estabilizacoes`, `dom_desfechos`, `dom_tipos_observacao` | `consulta` | pacientes, atendimentos, exames, prescricoes, transferencias | alto | alto |
| Enfermagem | `enfermagem`, `openNursingModal`, `save-nursing-evolution` | `ENFERMAGEM_ACTION_RULE` | nenhuma direta identificada; escrita local via `GsiApi` | `enfermagem` | pacientes, permissoes, observacao | medio | medio |
| Prescricoes | `openPrescriptionModal`, `save-prescription`, `farmacia`, `rx-status` | `PRESCRICAO_CRIAR_ACTION_RULE`, `PRESCRICAO_DISPENSAR_ACTION_RULE` | nenhuma direta identificada; local via `GsiApi` | `farmacia`, `consulta` | pacientes, consulta, farmacia | medio | medio |
| Farmacia e estoque | `farmacia`, `openStockModal`, `save-stock`, `request-restock`, `rx-status` | `ESTOQUE_MOVIMENTAR_ACTION_RULE` | nenhuma direta identificada; local via `GsiApi` | `farmacia` | prescricoes, estoque local | medio | medio |
| Exames | `exames`, `openExamModal`, `openExamReleaseModal`, `examActions`, `inferExamOrigin`, `save-exam`, `save-exam-release`, `cancel-exam` | `EXAME_SOLICITAR_ACTION_RULE`, `EXAMES_GERENCIAR_ACTION_RULE`, `validExamOrigins` | nenhuma direta identificada; local via `GsiApi` | `exames`, `consulta`, observacoes | pacientes, consulta, observacao | medio | medio |
| Estabilizacao | `estabilizacao`, `stabilizationChecklistModalBody`, `openStabilizationChecklistModal`, `route-to-stabilization`, `toggle-stabilization-checklist-item`, `registrarCondutaRealEstabilizacao` | `stabilizationSafetyChecklist`, `ESTABILIZACAO_CHECKLIST_ACTION_RULE` | `estabilizacoes`, `atendimentos`, `consultas` | `estabilizacao` | consulta, observacao, pacientes | alto | alto |
| Observacoes | `observacaoClinica`, `observacaoPediatrica`, `observacaoObstetrica`, `observationQueuePage`, `openObservationReassessModal`, `save-observation-reassess`, `discharge-observation`, `registrarCondutaRealObservacao` | `OBSERVACAO_*_ACTION_RULE`, tipos observacao | `observacoes`, `atendimentos`, `consultas`, `dom_tipos_observacao` | `observacao-clinica`, `observacao-pediatrica`, `observacao-obstetrica` | consulta, pacientes, atendimentos | alto | alto |
| Transferencias e regulacao | `transferencias`, `openTransferModal`, `registrarTransferenciaReal`, `aprovarVagaTransferenciaReal`, `openTransferChecklistModal`, `confirmarChecklistTransferenciaReal`, `confirmarSaidaTransferenciaReal`, `isTransferInProgress`, `isTransferDepartureConfirmed` | `TRANSFERENCIA_*_ACTION_RULE`, `transferSafetyChecklist`, `statusTransferenciaState`, `transferenciasReaisState` | `transferencias`, `atendimentos`, `checklist_transferencia_itens`, `dom_status_transferencia` | `transferencias` | consulta, observacao, atendimentos, pacientes, permissoes | alto | alto |
| Dashboard e indicadores | `dashboard`, `indicadores`, `riskBar`, `barChart`, `countBy`, `getMobilidadeStats`, `mobilidadeAssistencialSection`, indicadores estrategicos | `valoresEstimados`, `municipioUf`, `localMunicipioAliases` | nenhuma direta; local via `GsiApi` | `dashboard`, `indicadores` | pacientes, atendimentos, exames, prescricoes, estoque, transferencias | medio | medio |
| Relatorios | `relatorios`, `openReportPreview`, `openMobilidadeReportModal`, `openObservatorioFichaTecnicaModal`, `print-report` | helpers de indicadores e tempos | nenhuma direta | `relatorios` | indicadores, DOM, impressao | medio | medio |
| Configuracoes | `loadConfiguracoesSistema`, `saveConfiguracaoSistema`, `configuracoes`, `toggle-config` | `configToggles`, `configSistemaState`, `CONFIGURACOES_ACTION_RULE` | `configuracoes_sistema` | `configuracoes` | auth, Supabase, permissoes | medio | alto |
| Chamadas/painel de chamada | `createCallRecord`, `normalizeCallRecord`, `painelChamada`, `painelTv`, `supportsCallAudio`, `isCallAudioActive`, `speakCall`, `announceLatestCallIfNeeded` | `callAudioStorageKey`, `lastSpokenCallStorageKey`, `tvRefreshTimer` | nenhuma direta; local via `GsiApi` | `painel-chamada`, `painel-tv` | pacientes, atendimentos, localStorage, browser audio | medio | medio |
| Persistencia local | `data`, chamadas `GsiApi.list/create/update/resetDemoData`, helpers de relacao | colecoes `pacientes`, `atendimentos`, `chamadas`, `exames`, `prescricoes`, `transferencias`, `estoque` | nenhuma direta | todas | GsiApi, localStorage | alto | alto |
| Integracao Supabase | loaders de dominios, criacao/atualizacao real, auditoria, configuracoes | estados `*State`, `window.GsiAuth.client` | todas as tabelas listadas na visao geral | varias | auth, RLS, dominios assistenciais | alto | alto |
| Tratamento de erros e notificacoes | `friendlySupabaseError`, `showToast`, `console.error` em fluxos Supabase | `toastRoot` | indireto | todas | UI, Supabase, handleAction | medio | medio |

## 4. Funcoes criticas

- Criam ou atualizam pacientes:
  - `createPacienteRealFromLocal`;
  - `updatePacienteRealFromLocal`;
  - handlers `save-patient` e `save-edit-patient`;
  - `openRegisterPatient` e `openEditPatientModal` como entrada de dados.
- Criam atendimento:
  - `createAtendimentoRealFromLocal`;
  - handler `start-care`;
  - criacoes locais de atendimento via `GsiApi.create("atendimentos", ...)`.
- Normalizam atendimento ativo:
  - `listAtendimentosCompat`;
  - `atendimentoRealById`;
  - `atendimentoStageInfo`;
  - `isPatientEligibleForStartCare`;
  - `isPatientActiveCare`;
  - `isPatientOperationalVisible`.
- Salvam triagem:
  - `updateAtendimentoRealTriagem`;
  - `openTriageModal`;
  - handlers `save-risk` e `save-triage`;
  - `getClassificacaoRiscoIdByCodigo`.
- Avancam status assistencial:
  - `updateAtendimentoRealConsultaInicio`;
  - `registrarCondutaRealAlta`;
  - `registrarCondutaRealObservacao`;
  - `registrarCondutaRealEstabilizacao`;
  - handlers `start-care`, `save-start-consult`, `save-conduct`, `discharge-patient`, `discharge-observation`, `route-to-stabilization`, `transfer-status`, `transfer-departure`.
- Controlam permissoes:
  - `isRouteAllowed`;
  - `isActionAllowed`;
  - constantes `routePermissions`, `*_ACTION_RULE` e arrays `*_GATED_ACTIONS`.
- Fazem login/logout ou sessao:
  - login e carga primaria ficam em `auth.js`/`window.GsiAuth`;
  - `script.js` reage a `gsiauth:ready`;
  - handler `demo-logout` chama `window.GsiAuth.signOut`.
- Carregam sessao/dados dependentes da sessao:
  - `loadPacientesReais`;
  - `loadAtendimentosReais`;
  - `loadStatusAtendimentoDomain`;
  - `loadClassificacaoRiscoDomain`;
  - `loadDesfechosDomain`;
  - `loadTiposObservacaoDomain`;
  - `loadStatusTransferenciaDomain`;
  - `loadConfiguracoesSistema`;
  - `loadAuditoria`.
- Salvam transferencias:
  - `registrarTransferenciaReal`;
  - `aprovarVagaTransferenciaReal`;
  - `confirmarChecklistTransferenciaReal`;
  - `confirmarSaidaTransferenciaReal`;
  - handlers `save-transfer`, `transfer-status`, `confirm-transfer-checklist`, `transfer-departure`.
- Confirmam checklist e saida:
  - `openTransferChecklistModal`;
  - `confirmarChecklistTransferenciaReal`;
  - `confirmarSaidaTransferenciaReal`;
  - handlers `confirm-transfer-checklist` e `transfer-departure`.
- Interagem diretamente com Supabase:
  - todos os loaders `load*Domain`, `loadPacientesReais`, `loadAtendimentosReais`, `loadConfiguracoesSistema`, `loadAuditoria`;
  - `findPacienteRealDuplicado`;
  - `createPacienteRealFromLocal`;
  - `updatePacienteRealFromLocal`;
  - `createAtendimentoRealFromLocal`;
  - `updateAtendimentoRealTriagem`;
  - `updateAtendimentoRealConsultaInicio`;
  - `registrarCondutaRealAlta`;
  - `registrarCondutaRealObservacao`;
  - `registrarCondutaRealEstabilizacao`;
  - `registrarTransferenciaReal`;
  - `aprovarVagaTransferenciaReal`;
  - `confirmarChecklistTransferenciaReal`;
  - `confirmarSaidaTransferenciaReal`;
  - `saveConfiguracaoSistema`.

## 5. Acoplamentos e riscos

- Funcoes muito grandes:
  - `handleAction` concentra grande parte da mutacao de estado, regras de permissao, DOM, chamadas Supabase, `GsiApi` e navegacao;
  - `openPatientModal` monta prontuario/linha do tempo com muitas dependencias;
  - `indicadores`, `mobilidadeAssistencialSection`, `openMobilidadeReportModal` agregam regra analitica e HTML;
  - `consulta`, `transferencias`, `observationQueuePage` e renderizadores similares misturam consultas locais, regras e markup.
- Funcoes com multiplas responsabilidades:
  - handlers de `save-conduct`, `start-care`, `save-triage`, `save-transfer` e `transfer-departure` validam permissao, leem formulario, atualizam Supabase, atualizam `GsiApi`, exibem toast e roteiam pagina;
  - renderizadores frequentemente tambem filtram dados, calculam status e produzem HTML.
- Dependencia de variaveis globais:
  - `currentPage`, `pages`, refs DOM, `window.GsiAuth`, `GsiApi`, caches `*State`, `transferenciasReaisState`, `configSistemaState`, `auditoriaState`.
- Duplicacoes:
  - padrao repetido de validar `window.GsiAuth.client`;
  - padrao repetido de buscar atendimento local por `pacienteId`;
  - blocos parecidos para registrar conduta real em alta, observacao e estabilizacao;
  - blocos repetidos de `GsiApi.update("pacientes")` e `GsiApi.update("atendimentos")` apos eventos assistenciais.
- Regras de negocio misturadas com HTML:
  - elegibilidade de acoes, status assistencial, descricoes de risco, filas e botoes aparecem dentro dos templates das paginas;
  - paginas clinicas decidem texto, permissao, status e layout no mesmo bloco.
- Consultas Supabase dentro de funcoes de renderizacao:
  - `renderPage` aciona loaders reais para pacientes/atendimentos e dominios;
  - paginas como configuracoes e auditoria dependem de loaders Supabase proximos ao ciclo de renderizacao.
- Manipulacao direta do DOM espalhada:
  - `content.innerHTML`, modais, toasts, menu lateral, painel de usuario, filtros de auditoria, impressao e eventos globais ficam no mesmo arquivo.
- Dependencias circulares ou implicitas:
  - paginas dependem de `GsiApi`, `GsiAuth`, permissao, componentes e estado global;
  - `handleAction` depende de quase todos os dominios e tambem chama `renderPage`, que por sua vez monta acoes que retornam ao `handleAction`;
  - dominios assistenciais usam simultaneamente registro local e registro real Supabase, com ponte por IDs como `pacienteSupabaseId`, `atendimentoSupabaseId` e cache em memoria.
- Trechos que nao devem ser movidos sem testes:
  - `start-care`;
  - `save-triage`;
  - `save-start-consult`;
  - `save-conduct`;
  - funcoes `registrarCondutaReal*`;
  - funcoes `registrarTransferenciaReal`, `aprovarVagaTransferenciaReal`, `confirmarChecklistTransferenciaReal`, `confirmarSaidaTransferenciaReal`;
  - gates `isRouteAllowed` e `isActionAllowed`;
  - compatibilizacao `listPacientesCompat` e `listAtendimentosCompat`;
  - loaders de dominios Supabase;
  - `renderPage` e `handleAction`.

## 6. Proposta inicial de modulos futuros

Proposta documental, sem criacao de arquivos nesta etapa:

```text
src/
  core/
  auth/
  permissions/
  router/
  ui/
  patients/
  attendances/
  reception/
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
  services/
  shared/
```

| Modulo proposto | Responsabilidade principal |
|---|---|
| `core/` | bootstrap da aplicacao, estado global minimo e composicao dos modulos |
| `auth/` | adaptador para `window.GsiAuth`, sessao, logout e eventos de auth |
| `permissions/` | regras de rota, regras de acao e helpers de autorizacao |
| `router/` | hash routing, menu, setor atual e protecao de rota |
| `ui/` | componentes DOM compartilhados: modal, toast, tabela, campos e badges |
| `patients/` | cadastro, edicao, compatibilidade local/real e visualizacao de paciente |
| `attendances/` | abertura de atendimento, estado assistencial e ponte com atendimento real |
| `reception/` | fila de recepcao, chamada inicial e abertura do fluxo assistencial |
| `triage/` | classificacao de risco, formulario de triagem e atualizacao do atendimento |
| `consultation/` | chamada/inicio de consulta e registro de condutas/desfechos |
| `nursing/` | evolucao de enfermagem e acoes de enfermagem |
| `pharmacy/` | prescricoes, dispensacao e estoque |
| `exams/` | solicitacao, execucao, cancelamento e liberacao de exames |
| `stabilization/` | sala de estabilizacao, checklist e encaminhamentos |
| `observation/` | observacoes clinica, pediatrica e obstetrica, reavaliacao e alta |
| `transfers/` | solicitacao, regulacao, checklist e saida da transferencia |
| `dashboard/` | painel inicial e metricas operacionais |
| `reports/` | relatorios, fichas tecnicas, pre-visualizacao e impressao |
| `settings/` | configuracoes do sistema e auditoria |
| `services/` | clientes Supabase, repositories e adaptadores de `GsiApi` |
| `shared/` | formatadores, sanitizadores, tempo, texto, calculos puros e constantes comuns |

## 7. Ordem segura de modularizacao

1. Extrair utilitarios puros e sem efeito colateral: `escapeHtml`, `normalizeText`, `displayText`, `formatDateBR`, calculos de tempo, idade, percentuais e sanitizacao.
2. Extrair notificacoes e componentes basicos de UI: `showToast`, `openModal`, `closeModal`, campos, tabelas, badges e botoes.
3. Extrair formatadores e componentes compartilhados de prontuario, timeline, metricas e cards, mantendo os contratos atuais.
4. Criar uma camada documental/codificada de servicos Supabase, inicialmente como wrapper fino para `window.GsiAuth.client.from(...)`, sem mudar payloads nem ordem das escritas.
5. Separar adaptadores de persistencia local `GsiApi`, preservando nomes de colecoes e comportamento atual.
6. Modularizar autenticacao e sessao como adaptador de `GsiAuth`, sem alterar `auth.js`.
7. Modularizar permissoes por rota e acao, mantendo exatamente as mesmas regras.
8. Modularizar router e renderizacao de navegacao, com testes de rotas permitidas/bloqueadas.
9. Migrar dominios de menor risco: dashboard, relatorios, painel de chamada, configuracoes visuais.
10. Migrar dominios operacionais locais: farmacia, estoque, exames e enfermagem.
11. Migrar pacientes e atendimentos somente com testes cobrindo ponte local/Supabase.
12. Migrar dominios assistenciais criticos por ultimo: Recepcao -> Atendimento -> Triagem, consulta, observacoes, estabilizacao e transferencias.

## 8. Itens que nao devem ser alterados nesta etapa

- Nao alterar `script.js`.
- Nao alterar HTML.
- Nao alterar CSS.
- Nao alterar migrations.
- Nao alterar banco.
- Nao alterar RLS.
- Nao alterar policies.
- Nao alterar fluxo Recepcao -> Atendimento -> Triagem.
- Nao alterar transferencia 5B.6.4.
- Nao criar modulos ainda.
- Nao fazer `git add`.
- Nao fazer commit.
- Nao fazer push.

## 9. Validacoes desta etapa

- Documento criado: `docs/GSI_ONE_MAPA_MODULOS_SCRIPT_JS_6A1.md`.
- Escopo esperado: apenas criacao documental.
- Validacoes solicitadas a executar apos a criacao:
  - `git status -sb`;
  - `git diff --stat`.

## 10. Pontos criticos para atencao imediata

- `script.js` ja aparece modificado no status inicial antes desta etapa; esta analise nao avalia se essa modificacao pendente e esperada.
- O maior risco tecnico imediato e o dispatcher `handleAction`, pois concentra permissoes, formularios, Supabase, `GsiApi`, DOM, toasts e navegacao.
- Os fluxos `start-care`, `save-triage`, `save-conduct` e transferencia/checklist/saida sao pontos de seguranca assistencial e nao devem ser movidos sem testes de regressao.
- Ha coexistencia de estado local/demo e estado real Supabase. A ponte por `pacienteSupabaseId`, `atendimentoSupabaseId` e caches em memoria deve ser preservada ate existir uma estrategia de migracao testada.
- As chamadas Supabase dependem diretamente de RLS e da sessao real; qualquer modularizacao futura deve manter a ordem das escritas, especialmente em consulta/desfecho e transferencias.
