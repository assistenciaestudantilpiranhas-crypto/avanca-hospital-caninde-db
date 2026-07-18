# GSI ONE - Plano de testes dos fluxos assistenciais - 6A.2

## 1. Objetivo

Este plano define a cobertura mínima de testes para proteger os fluxos já validados do GSI ONE antes de qualquer modularização do `script.js`.

Os objetivos principais são:

- evitar regressões durante a futura modularização;
- preservar o fluxo assistencial e administrativo já implementado;
- cobrir frontend, Supabase, permissões, RLS, banco e transições assistenciais;
- garantir que nenhum teste use dados reais de pacientes;
- criar rastreabilidade entre requisitos, tabelas, funções críticas e riscos.

Esta etapa é apenas documental. Nenhum teste automatizado será criado agora.

## 2. Estratégia de testes

### Testes unitários

Devem cobrir funções puras ou quase puras, sem acesso direto a DOM, Supabase ou `GsiApi`, como normalização de texto, formatação, cálculo de idade, cálculo de tempos, badges, filtros e regras simples de elegibilidade.

### Testes de integração

Devem validar a comunicação entre frontend, `GsiAuth`, `GsiApi`, Supabase e funções de domínio, especialmente nos pontos que sincronizam estado local com registros reais.

### Testes funcionais

Devem executar fluxos completos na interface, simulando o comportamento esperado por perfil, com validação de mensagens, bloqueios, páginas, modais, mudanças de status e persistência.

### Testes de regressão

Devem proteger fluxos críticos já validados antes de qualquer extração de módulo, especialmente Recepção -> Atendimento -> Triagem, consulta, observação, estabilização e transferência 5B.6.4.

### Testes de permissões

Devem garantir que cada ação e rota respeite o perfil e as permissões esperadas no frontend, sem considerar isso como substituto de segurança real.

### Testes de RLS

Devem validar diretamente no Supabase que usuários não autorizados não conseguem ler, inserir, atualizar ou excluir registros clínicos fora das policies previstas.

### Testes de banco

Devem validar constraints, triggers, domínios, foreign keys, grants, ausência de privilégios perigosos e imutabilidade de campos críticos.

### Testes negativos

Devem tentar executar fluxos inválidos: paciente duplicado, atendimento ativo duplicado, triagem sem atendimento real, saída de transferência sem checklist, usuário sem perfil, usuário inativo e manipulação direta de payload.

### Testes manuais assistenciais

Devem ser executados com roteiros clínicos fictícios para confirmar aderência operacional e segurança do paciente em jornadas completas.

### Smoke tests

Devem validar rapidamente login, menu, dashboard, cadastro de paciente fictício, abertura de atendimento, triagem, consulta, transferência e logout após alterações relevantes.

## 3. Ambientes

| Ambiente | Uso | Regras |
|---|---|---|
| Local com Supabase | Desenvolvimento e testes automatizados iniciais | Usar Supabase local, seeds fictícios e banco descartável |
| Homologação | Validação funcional, assistencial e segurança antes de produção | Usar dados fictícios controlados e contas por perfil |
| Produção | Apenas smoke controlado e monitoramento | Não criar pacientes fictícios sem procedimento aprovado; nunca usar dados reais em teste manual não autorizado |

Dados fictícios são obrigatórios em todos os testes planejados. É proibido usar dados reais de pacientes. Todo dado de teste deve ser claramente identificado por prefixo `TESTE_`.

## 4. Perfis que devem ser testados

- Recepção;
- Técnico em Enfermagem;
- Enfermeiro;
- Médico;
- Regulação de Transferência;
- Administração;
- Auditoria, quando aplicável;
- usuário autenticado sem perfil;
- usuário inativo;
- usuário sem permissão específica.

## 5. Fluxos prioritários

### 5.1 Autenticação

- login válido;
- login inválido;
- sessão expirada;
- logout;
- usuário inativo;
- usuário sem perfil;
- múltiplos perfis;
- carregamento correto das permissões.

### 5.2 Recepção e paciente

- cadastrar paciente novo;
- localizar paciente existente;
- impedir duplicidade por CPF/CNS;
- preservar identidade real do paciente;
- atualizar cadastro;
- abrir atendimento;
- impedir atendimento ativo duplicado;
- validar obrigatoriedade dos campos.

### 5.3 Atendimento

- criação com status `aguardando_triagem`;
- timestamps;
- etapa e setor atuais;
- transições permitidas;
- transições inválidas;
- imutabilidade de timestamps críticos;
- encerramento por desfecho.

### 5.4 Triagem

- acesso por Enfermeiro;
- classificação sugerida;
- classificação confirmada;
- horários de início e fim;
- persistência em `public.triagens`, quando a tabela/fluxo estiver habilitado;
- avanço para `aguardando_consulta`;
- impedir triagem sem paciente/atendimento real;
- impedir usuário sem permissão;
- reclassificação, se aplicável.

### 5.5 Consulta médica

- iniciar consulta;
- registrar conduta;
- alta;
- observação;
- estabilização;
- transferência;
- solicitação de exames;
- prescrição;
- impedir perfil não autorizado.

### 5.6 Enfermagem

- registrar evolução;
- sinais vitais;
- procedimentos;
- checklist;
- reavaliação;
- permissões de Técnico em Enfermagem e Enfermeiro;
- diferença entre executar e supervisionar, quando aplicável.

### 5.7 Observação

- admitir;
- reavaliar;
- registrar evolução;
- alta;
- transferência;
- tempo de permanência;
- status do atendimento;
- perfis autorizados.

### 5.8 Estabilização

- encaminhar;
- registrar checklist;
- evolução;
- saída;
- integração com transferência;
- bloqueios de permissão.

### 5.9 Transferência 5B.6.4

- criar solicitação;
- aprovar vaga;
- checklist incompleto;
- checklist completo;
- confirmar saída;
- atualizar transferência para concluída;
- atualizar atendimento para desfecho registrado;
- gravar desfecho transferência regulada;
- `hora_saida_ts`;
- `hora_desfecho_ts`;
- impedir saída sem checklist;
- impedir usuário não autorizado.

### 5.10 Farmácia e estoque

- prescrição pendente;
- dispensação;
- movimentação de estoque;
- falta de medicamento;
- bloqueio de alteração direta de saldo;
- impedir `DELETE` físico.

### 5.11 Exames

- solicitar;
- atualizar status;
- registrar resultado;
- comunicar resultado crítico;
- restringir perfil.

### 5.12 Dashboard

- cards por perfil;
- ausência de dados não autorizados;
- consistência com banco;
- filtros;
- dados por unidade no futuro.

## 6. Testes de segurança

Os testes de segurança devem confirmar:

- RLS habilitado em tabelas clínicas e administrativas sensíveis;
- policies por tabela coerentes com perfis e permissões;
- grants perigosos ausentes;
- ausência de `TRUNCATE`, `TRIGGER`, `REFERENCES` e `DELETE` indevidos;
- usuário sem perfil não acessa dados clínicos;
- validação de `is_linked_user`;
- funções `SECURITY DEFINER` revisadas, com escopo mínimo e `search_path` seguro;
- proteção de `audit_log`;
- tentativa de manipulação direta pelo frontend sem bypass de RLS;
- bloqueio de acesso cruzado entre perfis;
- impossibilidade de exclusão física de registro clínico por perfis operacionais;
- auditoria preservada em eventos sensíveis.

## 7. Casos de teste

| ID | Módulo | Cenário | Pré-condição | Perfil | Passos | Resultado esperado | Prioridade | Tipo | Automatizável |
|---|---|---|---|---|---|---|---|---|---|
| CT-001 | Autenticação | Login válido | Usuário ativo com perfil | Recepção | Acessar login e informar credenciais válidas | Sessão carregada, menu conforme perfil | P0 | Funcional | Sim |
| CT-002 | Autenticação | Login inválido | Usuário inexistente ou senha errada | N/A | Tentar login inválido | Acesso negado sem carregar dados clínicos | P0 | Negativo | Sim |
| CT-003 | Autenticação | Sessão expirada | Sessão inválida | Médico | Abrir app com token expirado | Usuário redirecionado/bloqueado e dados não carregam | P0 | Integração | Sim |
| CT-004 | Autenticação | Logout | Usuário autenticado | Qualquer | Acionar sair/logout | Sessão encerrada e dados protegidos | P1 | Funcional | Sim |
| CT-005 | Autenticação | Usuário inativo | Conta marcada como inativa | Qualquer | Fazer login | Acesso negado ou sem permissões operacionais | P0 | Permissão | Sim |
| CT-006 | Autenticação | Usuário sem perfil | Conta ativa sem perfil | Sem perfil | Fazer login | Menu clínico não aparece e RLS bloqueia dados | P0 | RLS/Permissão | Sim |
| CT-007 | Permissões | Múltiplos perfis | Usuário com dois perfis válidos | Enfermeiro + Técnico | Login e navegação | Permissões combinadas sem ampliar além do previsto | P1 | Permissão | Sim |
| CT-008 | Recepção | Cadastrar paciente novo | CPF/CNS fictícios únicos | Recepção | Preencher cadastro obrigatório e salvar | Paciente criado em `pacientes` e vinculado localmente | P0 | Integração | Sim |
| CT-009 | Recepção | Impedir duplicidade por CPF | Paciente TESTE já existente | Recepção | Cadastrar mesmo CPF | Sistema impede duplicidade ou vincula ao real existente conforme regra | P0 | Negativo | Sim |
| CT-010 | Recepção | Impedir duplicidade por CNS | Paciente TESTE já existente | Recepção | Cadastrar mesmo CNS | Sistema impede duplicidade ou vincula ao real existente conforme regra | P0 | Negativo | Sim |
| CT-011 | Recepção | Atualizar cadastro | Paciente TESTE existente | Recepção | Editar campos permitidos | Dados cadastrais atualizados sem perder campos clínicos | P1 | Integração | Sim |
| CT-012 | Recepção | Campos obrigatórios | Formulário vazio/parcial | Recepção | Tentar salvar | Salvamento bloqueado com orientação | P1 | Negativo | Sim |
| CT-013 | Atendimento | Abrir atendimento | Paciente real vinculado | Recepção | Acionar abrir atendimento | Atendimento criado com status `aguardando_triagem` | P0 | Integração | Sim |
| CT-014 | Atendimento | Impedir atendimento ativo duplicado | Paciente com atendimento ativo | Recepção | Tentar abrir novo atendimento | Novo atendimento não é criado | P0 | Negativo | Sim |
| CT-015 | Atendimento | Timestamps de chegada | Atendimento recém-criado | Recepção | Abrir atendimento e consultar banco | `hora_chegada_ts` preenchido e consistente | P1 | Banco | Sim |
| CT-016 | Atendimento | Etapa e setor iniciais | Atendimento recém-criado | Recepção | Consultar atendimento | `etapa_atual` e `setor_atual` coerentes com fila inicial | P1 | Banco | Sim |
| CT-017 | Atendimento | Transição inválida | Atendimento aguardando triagem | Médico | Tentar finalizar sem consulta válida | Banco/frontend bloqueia transição inválida | P0 | Negativo | Sim |
| CT-018 | Atendimento | Imutabilidade de chegada | Atendimento criado | Administração ou tentativa direta | Tentar alterar `hora_chegada_ts` indevidamente | Alteração bloqueada ou auditada conforme regra | P0 | Segurança/Banco | Sim |
| CT-019 | Triagem | Enfermeiro acessa triagem | Atendimento aguardando triagem | Enfermeiro | Abrir triagem | Acesso permitido | P0 | Permissão | Sim |
| CT-020 | Triagem | Técnico acessa triagem | Atendimento aguardando triagem | Técnico em Enfermagem | Abrir triagem | Acesso permitido | P0 | Permissão | Sim |
| CT-021 | Triagem | Usuário sem permissão bloqueado | Atendimento aguardando triagem | Recepção | Tentar salvar triagem | Ação bloqueada sem escrita clínica | P0 | Permissão | Sim |
| CT-022 | Triagem | Classificação sugerida | Sinais vitais fictícios | Enfermeiro | Preencher triagem | Sistema sugere classificação coerente | P1 | Unitário/Funcional | Sim |
| CT-023 | Triagem | Classificação confirmada | Atendimento real existente | Enfermeiro | Salvar triagem | Atendimento avança para aguardando consulta | P0 | Integração | Sim |
| CT-024 | Triagem | Impedir triagem sem atendimento real | Paciente local sem atendimento real | Enfermeiro | Tentar salvar triagem | Bloqueio orienta abertura pela Recepção | P0 | Negativo | Sim |
| CT-025 | Triagem | Horários de início/fim | Triagem completa | Enfermeiro | Iniciar e salvar triagem | Timestamps registrados sem regressão | P1 | Integração | Sim |
| CT-026 | Consulta | Iniciar consulta | Atendimento pós-triagem | Médico | Chamar/iniciar consulta | Atendimento muda para em consulta | P0 | Integração | Sim |
| CT-027 | Consulta | Registrar alta | Consulta iniciada | Médico | Registrar conduta de alta | Atendimento encerrado com desfecho alta | P0 | Integração | Sim |
| CT-028 | Consulta | Encaminhar observação | Consulta iniciada | Médico | Registrar observação clínica | Observação criada e atendimento atualizado | P0 | Integração | Sim |
| CT-029 | Consulta | Encaminhar estabilização | Consulta iniciada | Médico | Registrar estabilização | Estabilização criada e status atualizado | P0 | Integração | Sim |
| CT-030 | Consulta | Solicitar transferência | Consulta iniciada | Médico | Abrir solicitação de transferência | Transferência criada com status inicial | P0 | Integração | Sim |
| CT-031 | Consulta | Perfil não autorizado | Atendimento em consulta | Recepção | Tentar registrar conduta | Ação bloqueada | P0 | Permissão | Sim |
| CT-032 | Enfermagem | Registrar evolução | Paciente em cuidado ativo | Técnico em Enfermagem | Salvar evolução | Evolução registrada sem alterar desfecho | P1 | Funcional | Sim |
| CT-033 | Enfermagem | Enfermeiro registra evolução | Paciente em cuidado ativo | Enfermeiro | Salvar evolução | Evolução registrada conforme permissão | P1 | Permissão | Sim |
| CT-034 | Observação | Reavaliar paciente | Paciente em observação | Médico ou Enfermeiro | Salvar reavaliação | Reavaliação anexada ao módulo correto | P0 | Funcional | Sim |
| CT-035 | Observação | Alta da observação | Paciente em observação | Médico | Acionar alta | Status/desfecho de alta da observação | P0 | Funcional | Sim |
| CT-036 | Observação | Bloqueio de alta por perfil | Paciente em observação | Técnico em Enfermagem | Tentar alta | Ação bloqueada | P0 | Permissão | Sim |
| CT-037 | Estabilização | Registrar checklist | Paciente em estabilização | Enfermeiro | Marcar item de checklist | Checklist salvo conforme permissão | P1 | Permissão | Sim |
| CT-038 | Estabilização | Bloquear checklist médico | Paciente em estabilização | Médico | Tentar marcar item | Médico visualiza, mas não executa checklist se regra exigir | P1 | Permissão | Sim |
| CT-039 | Transferência | Criar solicitação | Atendimento elegível | Médico | Solicitar transferência | Registro criado em `transferencias` | P0 | Integração | Sim |
| CT-040 | Transferência | Aprovar vaga | Transferência solicitada | Regulação de Transferência | Confirmar vaga | Status atualizado e horário de aprovação registrado | P0 | Integração | Sim |
| CT-041 | Transferência | Impedir saída sem checklist | Vaga confirmada sem checklist | Enfermeiro | Tentar confirmar saída | Saída bloqueada | P0 | Negativo | Sim |
| CT-042 | Transferência | Confirmar checklist completo | Vaga confirmada | Enfermeiro | Confirmar checklist | Itens gravados e transferência marcada com checklist | P0 | Integração | Sim |
| CT-043 | Transferência 5B.6.4 | Confirmar saída | Checklist completo | Enfermeiro | Confirmar saída | Transferência concluída, atendimento com desfecho registrado | P0 | Integração | Sim |
| CT-044 | Transferência 5B.6.4 | Gravar timestamps finais | Saída confirmada | Enfermeiro | Consultar banco | `hora_saida_ts` e `hora_desfecho_ts` preenchidos | P0 | Banco | Sim |
| CT-045 | Transferência 5B.6.4 | Bloquear usuário não autorizado | Checklist completo | Recepção | Tentar confirmar saída | Ação bloqueada e banco não altera | P0 | Permissão/RLS | Sim |
| CT-046 | Farmácia | Dispensar prescrição | Prescrição pendente | Farmácia | Alterar status para dispensado | Prescrição atualizada e auditável | P1 | Funcional | Sim |
| CT-047 | Estoque | Bloquear alteração direta de saldo | Item existente | Usuário sem permissão | Tentar movimentar estoque | Alteração bloqueada | P0 | Segurança | Sim |
| CT-048 | Estoque | Impedir DELETE físico | Registro de estoque | Farmácia ou tentativa direta | Tentar excluir fisicamente | Exclusão bloqueada ou proibida por grants/policies | P0 | RLS/Banco | Sim |
| CT-049 | Exames | Solicitar exame | Consulta ativa | Médico | Solicitar exame | Exame criado com status solicitado | P1 | Funcional | Sim |
| CT-050 | Exames | Resultado crítico | Exame em execução | Técnico em RX | Liberar como crítico | Resultado registrado e comunicado à equipe | P1 | Funcional | Sim |
| CT-051 | Dashboard | Cards por perfil | Usuário com perfil | Recepção/Médico/Administração | Abrir dashboard | Cards compatíveis com perfil e sem dados indevidos | P1 | Permissão | Sim |
| CT-052 | Dashboard | Consistência com banco | Dados TESTE conhecidos | Administração | Comparar contagens | Indicadores compatíveis com banco/filtros | P2 | Regressão | Sim |
| CT-053 | Auditoria | Leitura permitida | Eventos de teste existentes | Auditoria | Abrir auditoria | Eventos visíveis sem edição | P1 | Permissão/RLS | Sim |
| CT-054 | Auditoria | Bloqueio para perfil operacional | Eventos existentes | Recepção | Tentar acessar auditoria | Acesso negado | P0 | RLS/Permissão | Sim |
| CT-055 | Segurança | Usuário sem perfil acessa Supabase | Conta sem perfil | Sem perfil | Consultar tabela clínica diretamente | RLS bloqueia leitura/escrita | P0 | RLS | Sim |
| CT-056 | Segurança | Grants perigosos ausentes | Banco migrado | Administração técnica | Validar grants | Sem `TRUNCATE`, `TRIGGER`, `REFERENCES` e `DELETE` indevidos | P0 | Banco | Sim |
| CT-057 | Segurança | Proteção de audit_log | Evento auditado | Usuário comum | Tentar alterar/excluir audit_log | Operação bloqueada | P0 | RLS/Banco | Sim |
| CT-058 | Smoke | Jornada mínima | Ambiente homologação com seeds TESTE | Perfis necessários | Login, paciente, atendimento, triagem, consulta, transferência, logout | Fluxo completo sem erro crítico | P0 | Smoke/Manual | Não |

Total de casos de teste: 58.

## 8. Critérios de severidade

| Severidade | Definição | Exemplo |
|---|---|---|
| Bloqueante | Impede uso seguro do sistema ou bloqueia validação da etapa | RLS permite acesso clínico indevido; fluxo Recepção -> Atendimento -> Triagem quebrado |
| Crítica | Causa risco assistencial, perda de dados ou desfecho incorreto | Saída de transferência sem checklist; atendimento finalizado com desfecho errado |
| Alta | Afeta fluxo importante ou permissão relevante, com contorno limitado | Enfermeiro sem acesso esperado à triagem; duplicidade de atendimento ativo |
| Média | Afeta experiência, indicadores ou operações não críticas | Card incorreto no dashboard; filtro de relatório inconsistente |
| Baixa | Problema visual, texto ou ajuste sem impacto assistencial direto | Mensagem de toast pouco clara |

## 9. Critérios de aceite antes da modularização

Antes de modularizar `script.js`, não pode haver:

- regressão no fluxo Recepção -> Atendimento -> Triagem;
- duplicidade de atendimento ativo;
- perda de dados;
- bypass de permissões;
- falha de RLS;
- saída de transferência sem checklist;
- exclusão física de registro clínico;
- alteração indevida de timestamps;
- divergência entre estado local e Supabase;
- usuário sem perfil acessando dados clínicos;
- usuário inativo operando fluxo assistencial;
- inconsistência entre status local e status real em Supabase.

## 10. Matriz de rastreabilidade

| Requisito | Fluxo | Tabela | Função crítica | Caso de teste | Risco coberto |
|---|---|---|---|---|---|
| Login seguro | Autenticação | `usuarios`, auth Supabase | `window.GsiAuth`, `isRouteAllowed` | CT-001 a CT-007 | acesso indevido, sessão inválida |
| Cadastro único | Recepção/Paciente | `pacientes` | `createPacienteRealFromLocal`, `findPacienteRealDuplicado` | CT-008 a CT-012 | duplicidade, identidade incorreta |
| Atendimento ativo único | Atendimento | `atendimentos`, `dom_status_atendimento` | `createAtendimentoRealFromLocal` | CT-013 a CT-018 | atendimento duplicado, status inicial errado |
| Triagem segura | Triagem | `atendimentos`, `dom_classificacao_risco`, `triagens` quando aplicável | `updateAtendimentoRealTriagem`, `suggestRisk` | CT-019 a CT-025 | triagem sem vínculo real, classificação inválida |
| Consulta e desfecho | Consulta médica | `consultas`, `atendimentos`, `dom_desfechos` | `registrarCondutaRealAlta`, `registrarCondutaRealObservacao`, `registrarCondutaRealEstabilizacao` | CT-026 a CT-031 | desfecho incorreto, perfil indevido |
| Evolução assistencial | Enfermagem/Observação | registros locais e tabelas clínicas futuras | `openNursingModal`, `openObservationReassessModal` | CT-032 a CT-036 | evolução perdida, alta indevida |
| Estabilização | Estabilização | `estabilizacoes`, `atendimentos` | `registrarCondutaRealEstabilizacao`, checklist local | CT-037 a CT-038 | checklist indevido, status errado |
| Transferência regulada | Transferência 5B.6.4 | `transferencias`, `checklist_transferencia_itens`, `atendimentos`, `dom_status_transferencia` | `registrarTransferenciaReal`, `aprovarVagaTransferenciaReal`, `confirmarChecklistTransferenciaReal`, `confirmarSaidaTransferenciaReal` | CT-039 a CT-045 | saída sem checklist, desfecho não registrado |
| Farmácia segura | Farmácia/Estoque | `prescricoes`, `estoque` ou coleções locais atuais | handlers `rx-status`, `save-stock` | CT-046 a CT-048 | alteração indevida de estoque, delete físico |
| Exames | Exames | `exames` ou coleção local atual | `openExamModal`, `openExamReleaseModal` | CT-049 a CT-050 | resultado crítico não comunicado |
| Indicadores por perfil | Dashboard | tabelas assistenciais agregadas | `dashboard`, `indicadores` | CT-051 a CT-052 | exposição de dado não autorizado |
| Auditoria preservada | Auditoria | `audit_log`, `usuarios` | `loadAuditoria` | CT-053, CT-054, CT-057 | auditabilidade removida |
| Segurança SQL | Banco/RLS | grants e policies | migrations/policies, funções SQL | CT-055 a CT-058 | grants perigosos, RLS fraca |

## 11. Ordem de automação

1. Utilitários puros e formatadores.
2. Regras de permissões de rota e ação.
3. Autenticação, sessão e carregamento de perfil.
4. Pacientes e validações cadastrais.
5. Atendimentos, status e timestamps.
6. Triagem e classificação de risco.
7. Consulta médica e desfechos.
8. Transferência 5B.6.4, incluindo checklist e saída.
9. Observação e estabilização.
10. Enfermagem, farmácia, estoque e exames.
11. Dashboard, relatórios, configurações e auditoria.
12. Smoke tests completos em homologação.

## 12. Ferramentas sugeridas

Possibilidades para etapas futuras, sem instalação nesta fase:

- Vitest ou Jest para unitários;
- Playwright para fluxos funcionais e smoke tests;
- Supabase local para integração, RLS e banco;
- SQL de validação para grants, policies, constraints e triggers;
- GitHub Actions para execução automatizada em PR;
- lint e formatter para padronização sem alterar regra de negócio.

## 13. Dados de teste

Padrão obrigatório:

- nomes claramente fictícios, por exemplo `TESTE_PACIENTE_TRIAGEM_001`;
- CPF/CNS únicos e reservados para teste;
- nenhum dado real de paciente;
- possibilidade de limpeza controlada por prefixo `TESTE_`;
- registros com motivo/observação indicando ambiente e caso de teste;
- usuários de teste separados por perfil;
- datas e horários compatíveis com o cenário, sem simular produção real;
- nunca copiar dados reais para local ou homologação.

Exemplo de convenção:

| Tipo | Padrão |
|---|---|
| Nome | `TESTE_PACIENTE_<FLUXO>_<NNN>` |
| CPF | Sequência fictícia reservada para teste e validada como não real |
| CNS | Sequência fictícia única por caso |
| Atendimento | Queixa com prefixo `TESTE_` |
| Transferência | Destino fictício com prefixo `TESTE_` |
| Limpeza | Filtrar por prefixo `TESTE_` e janela de execução |

## 14. Itens que não devem ser alterados

- Não alterar `script.js`.
- Não alterar HTML.
- Não alterar CSS.
- Não alterar migrations.
- Não alterar banco.
- Não alterar RLS.
- Não alterar policies.
- Não instalar dependências.
- Não criar testes automatizados ainda.
- Não fazer `git add`.
- Não fazer commit.
- Não fazer push.

## 15. Riscos críticos encontrados

- O fluxo Recepção -> Atendimento -> Triagem deve ser protegido antes de qualquer extração porque mistura permissões, criação real em Supabase, estado local e transição assistencial.
- A transferência 5B.6.4 é crítica porque depende de sequência entre checklist completo, atualização de `transferencias`, atualização de `atendimentos`, desfecho e timestamps finais.
- Há risco de divergência entre estado local (`GsiApi`/localStorage) e Supabase se uma modularização mudar a ordem das escritas ou introduzir fallback silencioso.
- Segurança real depende de RLS e banco; testes de frontend não substituem validação SQL direta.
- Qualquer teste ou seed deve evitar dados reais e deixar rastreabilidade clara por prefixo `TESTE_`.
