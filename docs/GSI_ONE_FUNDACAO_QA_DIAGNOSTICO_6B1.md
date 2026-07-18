# GSI ONE - Fundacao QA: diagnostico tecnico - 6B.1

## 1. Estado atual do projeto

### Arquivos principais

- `index.html`: pagina principal e ponto de carregamento dos scripts.
- `style.css`: estilos globais da aplicacao.
- `script.js`: frontend principal, com aproximadamente 6.314 linhas no estado atual.
- `api.js`: API local demonstrativa `GsiApi`, baseada em `localStorage`.
- `auth.js`: inicializacao do Supabase client e exposicao de `window.GsiAuth`.
- `supabase/migrations/`: migrations SQL do banco, RLS, grants, auditoria e fluxos assistenciais.
- `docs/`: documentacao funcional, seguranca e bloco 6A.
- `netlify.toml` e `.netlifyignore`: configuracao de hospedagem estatica.

### `package.json`

Nao existe `package.json` no estado atual. Portanto:

- nao ha scripts npm configurados;
- nao ha dependencias Node declaradas;
- nao ha runner de testes instalado;
- nao ha lint/formatter configurado via Node;
- nao ha configuracao local de Vitest, Jest, Playwright, ESLint ou Prettier.

### Modo atual de carregamento do JavaScript

`index.html` carrega scripts diretamente, sem bundler e sem ES Modules:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="auth.js"></script>
<script src="api.js"></script>
<script src="script.js"></script>
```

O carregamento depende da ordem:

1. Supabase UMD cria `window.supabase`;
2. `auth.js` cria `window.GsiAuth`;
3. `api.js` cria `GsiApi`;
4. `script.js` usa `window.GsiAuth`, `GsiApi`, DOM e eventos globais.

### Estrutura HTML/CSS/JS

O projeto e uma aplicacao web estatica tradicional:

- HTML fixo com pontos de montagem;
- CSS global unico;
- JavaScript global;
- sem build step;
- sem import/export;
- sem componentes compilados;
- sem framework frontend.

### Uso de modulos ES

Nao ha evidencia de `type="module"`, `import` ou `export` nos arquivos principais. O padrao atual e script global em navegador.

### Inicializacao do `script.js`

`script.js` executa na carga da pagina e:

- captura referencias globais de DOM;
- define menus, rotas, permissoes, componentes e caches;
- registra listeners globais de clique, menu, hash, auth-ready e impressao;
- chama `renderPage(currentPage)` no final do arquivo;
- reage ao evento `gsiauth:ready` emitido por `auth.js`.

### Integracao com `api.js`

`api.js` define `GsiApi` como IIFE global, com seed e persistencia em `localStorage`. `script.js` usa `GsiApi.list`, `GsiApi.create`, `GsiApi.update` e `GsiApi.resetDemoData` para dados locais/demonstrativos e compatibilidade temporaria.

### Integracao com Supabase

`auth.js` inicializa o client por `window.supabase.createClient(...)` e expoe `window.GsiAuth`.

`script.js` acessa Supabase por `window.GsiAuth.client.from(...)`, incluindo tabelas como:

- `usuarios`;
- `usuario_perfil`;
- `perfil_permissao`;
- `pacientes`;
- `atendimentos`;
- `triagens`;
- `consultas`;
- `observacoes`;
- `estabilizacoes`;
- `transferencias`;
- `checklist_transferencia_itens`;
- `dom_status_atendimento`;
- `dom_classificacao_risco`;
- `dom_desfechos`;
- `dom_tipos_observacao`;
- `dom_status_transferencia`;
- `configuracoes_sistema`;
- `audit_log`.

### Uso de `localStorage`/`GsiApi`

`localStorage` e usado para:

- colecoes demonstrativas via `GsiApi`;
- perfil operacional local;
- preferencias do painel de chamada/audio;
- dados locais ainda nao totalmente persistidos no Supabase.

Ha convivencia entre estado demonstrativo/local e registros reais Supabase.

### Ferramentas ja instaladas

No repositório nao ha configuracao detectada de ferramentas de QA. A pasta `supabase/` existe e indica uso de Supabase CLI em algum momento, mas nao ha script reproduzivel documentado em `package.json`.

## 2. Restricoes tecnicas atuais

- `script.js` monolitico, com milhares de linhas e multiplos dominios.
- Funcoes globais e variaveis globais compartilhadas.
- Acesso direto ao DOM em renderizadores e handlers.
- Dependencia forte de `window`, `document`, `localStorage`, `speechSynthesis` e eventos globais.
- Handlers centralizados em `handleAction`.
- Roteamento centralizado em `renderPage` e `window.location.hash`.
- Estado demonstrativo e real coexistindo.
- Dependencia direta do Supabase em funcoes de dominio.
- Dificuldade para testes unitarios por falta de exports e alto acoplamento ao navegador.
- Dificuldade para testes de integracao por mistura de UI, regra de negocio, `GsiApi`, Supabase e permissao.
- Risco de inicializacao automatica durante testes, porque `script.js` executa imediatamente.
- Ausencia de runner de testes, fixture HTML e mocks padronizados.

## 3. Comparacao de ferramentas

| Ferramenta | Finalidade | Compatibilidade | Vantagens | Riscos | Dependencias | Mudanca estrutural | Recomendacao |
|---|---|---|---|---|---|---|---|
| Vitest | Testes unitarios e alguns testes com jsdom | Boa para futura base JS modular | Rapido, moderno, bom suporte a mocks e jsdom | Exige `package.json`; legado sem exports dificulta testes diretos | Node, Vitest, jsdom | Baixa no inicio; maior quando modularizar | Recomendada para unitarios |
| Jest | Testes unitarios com jsdom | Compatível, mas mais pesado | Ecossistema maduro | Config mais pesada; menor alinhamento com projetos modernos leves | Node, Jest, jsdom | Baixa/media | Alternativa, nao preferencial |
| Playwright | Testes funcionais/E2E | Boa para app estatico | Testa fluxo real no navegador, rotas, DOM, permissao visual | Pode ser lento; exige browsers; cuidado com dados | Node, Playwright, servidor local | Media | Recomendada para E2E/smoke |
| Testing Library | Testes de UI por comportamento | Parcial no estado atual | Incentiva testes por interacao do usuario | Sem componentes isolados, pode ficar artificial | Vitest/Jest + jsdom | Media, melhor apos extrair UI | Usar pontualmente no futuro |
| ESLint | Analise estatica | Boa, mesmo sem bundler | Ajuda detectar globais, erros e complexidade | Pode gerar muitos avisos no legado | Node, ESLint | Baixa se inicial permissivo | Recomendada incrementalmente |
| Prettier | Formatacao | Boa | Padroniza docs/configs/codigo novo | Reformatar `script.js` inteiro geraria diff enorme | Node, Prettier | Baixa se aplicado a arquivos novos | Recomendada com escopo controlado |
| GitHub Actions | CI | Boa apos scripts existirem | Reproduz validacao em PR | Pode falhar por ambiente Windows/Linux ou secrets | GitHub, Node, possivel Supabase CLI | Media | Recomendada em 6B.10 |
| Supabase CLI/local | Banco local, migrations, RLS | Muito relevante | Testa RLS, grants, triggers e seeds com isolamento | Requer Docker; risco se apontar para Cloud por engano | Supabase CLI, Docker | Media/Alta | Recomendada com guardrails fortes |

## 4. Stack recomendada

Stack minima recomendada:

- Vitest para testes unitarios;
- Playwright para testes funcionais/E2E e smoke tests;
- Supabase local para integracao, banco, RLS e grants;
- ESLint para analise estatica incremental;
- Prettier para formatacao controlada de arquivos novos e modulos futuros;
- GitHub Actions para CI quando os comandos estiverem estaveis.

Justificativa:

- Vitest e leve e adequado para a modularizacao futura.
- Playwright cobre o comportamento real do app estatico sem exigir refatoracao imediata.
- Supabase local e essencial porque seguranca real depende de RLS, grants, triggers e policies.
- ESLint/Prettier devem entrar com escopo conservador para nao gerar reformatacao massiva.
- CI deve vir depois que os comandos locais forem reprodutiveis.

## 5. Estrategia de adocao incremental

| Etapa | Objetivo | Entrega esperada |
|---|---|---|
| 6B.2 | Configuracao minima do ambiente de testes | `package.json`, scripts basicos e configs minimas, sem testes clinicos complexos |
| 6B.3 | Testes de utilitarios e permissoes | Unitarios de baixo risco para formatadores, normalizadores, `isRouteAllowed` e `isActionAllowed` |
| 6B.4 | Testes de autenticacao e sessao | Mocks de `GsiAuth`, sessao expirada, usuario inativo e usuario sem perfil |
| 6B.5 | Testes de pacientes e atendimento ativo | Cadastro, duplicidade, abertura de atendimento e bloqueio de atendimento ativo duplicado |
| 6B.6 | Testes do fluxo Recepcao -> Atendimento -> Triagem | Jornada integrada com estado local/Supabase mockado ou local |
| 6B.7 | Testes da transferencia 5B.6.4 | Checklist, saida, desfecho, timestamps e bloqueios |
| 6B.8 | Testes de RLS e grants | SQL/Supabase local para policies, grants perigosos e auditabilidade |
| 6B.9 | Smoke tests funcionais | Playwright cobrindo fluxos minimos por perfil |
| 6B.10 | Pipeline de CI | GitHub Actions rodando unitarios, lint e smoke selecionado |

## 6. Estrategia para testar codigo legado

Como testar `script.js` sem modulariza-lo prematuramente:

- usar ambiente `jsdom` para testes unitarios iniciais que precisem de DOM;
- criar fixture HTML minima com IDs usados por `script.js`;
- em etapa futura, expor funcoes selecionadas de forma controlada, sem mudar comportamento em producao;
- criar adaptadores temporarios para `window.GsiAuth`, `GsiApi`, `localStorage`, `speechSynthesis` e `window.location.hash`;
- usar spies/mocks para verificar chamadas sem gravar em Supabase real;
- introduzir injecao de dependencias progressiva em funcoes novas, sem reescrever o legado;
- mockar Supabase com objeto que reproduza `client.from().select/update/insert/eq/single`;
- mockar `localStorage` por ambiente de teste isolado;
- prevenir inicializacao automatica durante testes antes de importar/carregar o script, possivelmente por guard futuro como modo teste;
- preferir testar funcoes puras extraidas antes de tentar testar renderizadores grandes.

## 7. Piramide de testes

Proporcao recomendada:

- 50% unitarios: utilitarios, permissao, normalizacao, calculos e regras puras.
- 20% integracao: services, Supabase local, `GsiAuth`, `GsiApi` e transicoes.
- 15% banco/RLS: policies, grants, triggers, constraints e auditabilidade.
- 10% E2E: fluxos essenciais por perfil no navegador.
- 5% manuais assistenciais: validacao clinica/operacional guiada.

Essa proporcao deve evitar uma suite lenta e fragil, mas ainda cobrir seguranca real.

## 8. Primeiro conjunto automatizavel

Primeiros testes sugeridos, por baixo risco:

- `isRouteAllowed`;
- `isActionAllowed`;
- normalizacao de texto;
- escape/sanitizacao HTML;
- formatadores de data;
- calculo de idade;
- calculo de tempo de espera;
- validacoes puras de campos obrigatorios;
- regras de checklist sem escrita clinica;
- mapeamento de status/badges;
- funcoes que nao acessam Supabase diretamente;
- funcoes que nao alteram paciente, atendimento, triagem ou transferencia.

## 9. Dados de teste

Regras:

- usar prefixo `TESTE_`;
- usar CPF/CNS ficticios e reservados para teste;
- usar UUIDs de teste quando necessario;
- manter seed controlada por ambiente;
- isolar testes unitarios, integracao e E2E;
- limpar dados de teste por prefixo e janela de execucao;
- nunca usar dados reais;
- nunca copiar dados reais para local/homologacao.

Diferenciacao:

| Tipo | Dados | Persistencia |
|---|---|---|
| Unitario | Objetos em memoria, fixtures pequenas | Nao persistente |
| Integracao | Seeds `TESTE_`, Supabase local ou mocks controlados | Banco local ou memoria |
| E2E | Jornada com usuarios e pacientes `TESTE_` | Homologacao/local controlado |
| RLS/Banco | Usuarios/perfis/roles de teste | Supabase local |

## 10. Estrategia para Supabase local

- Usar `supabase db reset` somente em ambiente local.
- Aplicar migrations e seeds controladas.
- Criar usuarios de teste por perfil.
- Criar perfis de teste alinhados aos perfis oficiais.
- Executar SQL de validacao para RLS, grants, functions e triggers.
- Testar usuarios sem perfil, inativos e sem permissao.
- Validar grants perigosos ausentes.
- Testar functions `SECURITY DEFINER` com escopo minimo.
- Garantir isolamento do ambiente Cloud por variaveis e URLs locais.
- Nunca executar reset, truncate ou limpeza destrutiva contra Supabase Cloud.

## 11. Criterios de aceite da futura fundacao

A fundacao de QA futura deve atender:

- instalacao reproduzivel;
- testes executaveis por comando unico;
- nenhuma alteracao funcional;
- nenhuma dependencia de dados reais;
- execucao local;
- execucao futura em CI;
- falha clara, rastreavel e com logs uteis;
- comandos documentados;
- separacao entre unitarios, integracao, RLS e E2E;
- protecao contra uso acidental de Supabase Cloud em testes destrutivos.

## 12. Riscos

- Testes frageis dependentes de DOM gerado por strings grandes.
- Mocks que escondem erros reais de Supabase/RLS.
- Duplicidade entre estado local e Supabase.
- E2E lento e sujeito a flakiness.
- Dependencia de Docker para Supabase local.
- Diferencas entre Windows local e Linux no CI.
- Exposicao de credenciais em `.env`, logs ou actions.
- Testes alterando banco Cloud por configuracao incorreta.
- Reformatacao massiva dificultando revisao.
- Testes acoplados ao monolito impedindo refatoracao futura.

## 13. Regras obrigatorias

- Nunca executar testes destrutivos no Supabase Cloud.
- Nunca armazenar `service_role` no repositorio.
- Nao usar dados reais.
- Nao alterar migrations antigas.
- Nao reduzir RLS para facilitar testes.
- Nao contornar permissoes.
- Nao refatorar fluxo assistencial junto com configuracao de QA.
- Nao misturar setup de ferramentas com mudanca funcional.
- Nao criar fallback inseguro no frontend para fazer teste passar.

## 14. Plano de arquivos futuros

Proposta para etapas futuras, sem criar nesta etapa:

```text
tests/
  unit/
  integration/
  e2e/
  fixtures/
  helpers/

playwright.config.*
vitest.config.*
eslint.config.*
package.json
```

Possiveis scripts futuros:

```text
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run lint
npm run format:check
```

## 15. Itens proibidos nesta etapa

- Nao alterar `script.js`.
- Nao alterar `api.js`.
- Nao alterar HTML.
- Nao alterar CSS.
- Nao criar `package.json`.
- Nao instalar dependencias.
- Nao criar arquivos de configuracao.
- Nao criar testes.
- Nao alterar banco.
- Nao alterar migrations.
- Nao alterar RLS.
- Nao fazer `git add`.
- Nao fazer commit.
- Nao fazer push.

## 16. Riscos criticos identificados

- O maior risco tecnico para QA e a inicializacao automatica de `script.js`, que dificulta importar/testar funcoes sem preparar DOM e globais.
- `handleAction` e `renderPage` concentram muitos efeitos colaterais, entao nao devem ser os primeiros alvos unitarios.
- A coexistencia `GsiApi`/localStorage/Supabase exige testes que detectem divergencia, nao apenas mocks felizes.
- Supabase local deve ser isolado do Cloud antes de qualquer teste destrutivo ou reset.
- A ausencia de `package.json` torna a primeira etapa de QA uma mudanca de infraestrutura sensivel, que deve ser pequena e sem alteracao funcional.
