# GSI ONE - Testes unitarios de utilitarios e permissoes - 6B.3

## Objetivo

Criar os primeiros testes unitarios reais do GSI ONE, priorizando funcoes puras, regras de permissao e comportamentos de baixo risco, sem carregar `script.js` inteiro e sem alterar fluxos clinicos.

## Diagnostico das funcoes testaveis

Levantamento em `script.js`:

- `isRouteAllowed`: depende de `window.GsiAuth`, `routePermissions` e `ALWAYS_VISIBLE_ROUTES`.
- `isActionAllowed`: depende de `window.GsiAuth` e regras de acao.
- `escapeHtml`: pura, testavel por extracao fiel.
- `normalizeText`: pura, testavel por extracao fiel.
- `numericFromText`: pura, testavel por extracao fiel.
- `formatDateBR`: pura, testavel por extracao fiel.
- `minutesFromClock`: pura, testavel por extracao fiel.
- `calculateAge`: pura, mas depende da data atual; testavel com `vi.setSystemTime`.
- `formatElapsed`: pura, testavel por extracao fiel.
- `formatWaitTime`: depende de `Date.now`; testavel parcialmente com fallback/tempo controlado.

Funcoes ainda nao testadas nesta etapa:

- renderizadores HTML grandes;
- `handleAction`;
- `renderPage`;
- funcoes com Supabase;
- funcoes com `GsiApi`;
- fluxos clinicos de paciente, atendimento, triagem, consulta e transferencia.

## Decisoes de extracao

Nao foi importado `script.js`, porque ele inicializa DOM, listeners, rotas e estado global automaticamente.

Foi feita extracao minima e fiel para:

- `src/shared/utils.js`: utilitarios puros existentes no legado;
- `src/permissions/permission-rules.js`: regras equivalentes a `isRouteAllowed` e `isActionAllowed`, com injecao explicita de auth;
- `tests/fixtures/permissions.js`: fixture simples para simular `GsiAuth`.

As funcoes originais em `script.js` nao foram removidas nem alteradas. Esta extracao e uma base de teste controlada para comportamento equivalente.

## Arquivos criados

```text
src/shared/utils.js
src/permissions/permission-rules.js
tests/fixtures/permissions.js
tests/unit/permissions.test.js
tests/unit/utils.test.js
docs/GSI_ONE_TESTES_UNITARIOS_PERMISSOES_6B3.md
```

## Arquivos ajustados

```text
package.json
eslint.config.mjs
```

Os ajustes sao apenas para incluir `src/**/*.js` e o documento 6B.3 nos comandos de QA/formato.

## Cenarios cobertos

Permissoes:

- rota com permissao explicita;
- rota sem permissao;
- rota com perfil permitido;
- perfil semelhante, mas nao identico;
- Administracao;
- multiplos perfis;
- regra vazia;
- rota sempre visivel;
- auth ainda nao carregado;
- rota inexistente;
- acao com permissao;
- acao com perfil;
- acao com listas vazias;
- regra inexistente;
- acao com auth nao carregado.

Utilitarios:

- normalizacao de acentos, espacos e caixa;
- tratamento de `null` e `undefined` conforme conversao legada;
- escape de HTML;
- formatacao de data ISO;
- data invalida preservada;
- numero decimal com virgula;
- texto numerico invalido;
- hora em minutos;
- hora invalida;
- idade antes e depois do aniversario;
- tempo decorrido;
- fallback de espera.

## Quantidade de testes

- Smoke existente: 3 testes.
- Permissoes: 15 testes.
- Utilitarios: 13 testes.
- Total esperado: 31 testes.

## Limitacoes

- Os testes validam logica extraida de baixo risco, nao o `script.js` em execucao.
- Nao ha teste de Supabase, RLS, banco ou Cloud.
- Nao ha teste de fluxos clinicos.
- `isRouteAllowed` e `isActionAllowed` foram testadas por modulo equivalente com auth injetado, nao por `window.GsiAuth` real.
- A matriz completa de permissoes por rota ainda deve crescer em etapas futuras.

## Riscos

- Divergencia futura entre o modulo extraido e o legado se `script.js` for alterado sem atualizar testes.
- Regras de permissao no frontend continuam sendo UX; seguranca real depende de RLS.
- Testes unitarios nao cobrem combinacoes reais de banco, perfis e policies.

## Proximos passos - 6B.4

- Testar autenticacao e sessao com mocks controlados de `GsiAuth`.
- Cobrir sessao expirada, usuario inativo, usuario sem perfil e multiplos perfis.
- Manter ausencia de Supabase Cloud, credenciais reais e `service_role`.
