# GSI ONE - QA setup minimo - 6B.2

## Objetivo

Esta etapa cria a fundacao minima e reproduzivel de QA para o GSI ONE, sem alterar comportamento funcional, sem refatorar o codigo legado e sem conectar testes ao Supabase Cloud.

## Ferramentas instaladas

| Ferramenta | Uso                           | Versao instalada |
| ---------- | ----------------------------- | ---------------- |
| Vitest     | Testes unitarios              | 4.1.10           |
| jsdom      | Ambiente DOM para Vitest      | 29.1.1           |
| ESLint     | Analise estatica conservadora | 10.7.0           |
| Prettier   | Formatacao controlada         | 3.9.5            |
| globals    | Globais para ESLint           | 17.7.0           |

## Estrutura criada

```text
package.json
package-lock.json
vitest.config.mjs
eslint.config.mjs
.prettierrc
.prettierignore
tests/
  setup.js
  unit/
    smoke.test.js
docs/
  GSI_ONE_QA_SETUP_6B2.md
```

## Scripts

| Script                 | Comando                                 | Objetivo                                    |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| `npm test`             | `vitest`                                | Rodar testes em modo interativo/watch       |
| `npm run test:run`     | `vitest run`                            | Rodar testes uma vez                        |
| `npm run test:watch`   | `vitest --watch`                        | Rodar testes em watch explicitamente        |
| `npm run lint`         | `eslint "tests/**/*.js" "*.config.mjs"` | Validar somente arquivos novos de QA/config |
| `npm run lint:check`   | `npm run lint`                          | Alias de checagem de lint                   |
| `npm run format`       | `prettier --write ...`                  | Formatar apenas arquivos novos/controlados  |
| `npm run format:check` | `prettier --check ...`                  | Verificar formatacao sem alterar            |
| `npm run qa`           | `lint && format:check && test:run`      | Executar a validacao minima local           |

## Como rodar no Windows / PowerShell

Na raiz do repositorio:

```powershell
npm install
npm run test:run
npm run lint
npm run format:check
npm run qa
```

## Configuracao do Vitest

- Ambiente: `jsdom`.
- Setup global: `tests/setup.js`.
- Padrao de busca: `tests/**/*.test.js`.
- Isolamento entre testes habilitado.
- Limpeza de `document.body`, `localStorage` e `sessionStorage` apos cada teste.
- Nenhum teste importa `script.js` nesta etapa.
- Nenhum teste conecta ao Supabase.

## Configuracao do ESLint

O ESLint foi configurado de forma conservadora para:

- `tests/**/*.js`;
- arquivos `*.config.mjs`;
- futuros arquivos controlados de QA.

O lint nao e aplicado ao legado nesta etapa. A analise integral de `script.js`, `api.js`, `auth.js`, HTML e CSS deve ser tratada em etapa especifica para evitar ruido e refatoracao acidental.

## Configuracao do Prettier

O Prettier foi configurado para arquivos novos/controlados. A `.prettierignore` protege:

- `script.js`;
- `api.js`;
- `auth.js`;
- `index.html`;
- `style.css`;
- `supabase/migrations/`;
- `node_modules/`;
- artefatos gerados.

## Arquivos legados protegidos

Nesta etapa nao foram alterados:

- `script.js`;
- `api.js`;
- `auth.js`;
- `index.html`;
- `style.css`;
- migrations;
- banco;
- RLS;
- policies.

## Limitacoes atuais

- O smoke test valida apenas a infraestrutura minima.
- Nenhum fluxo clinico e testado ainda.
- `script.js` nao e importado nem executado nos testes.
- Nao ha Playwright nesta etapa.
- Nao ha Supabase local automatizado nesta etapa.
- Nao ha coverage configurado nesta etapa.
- A suite ainda nao valida RLS, grants ou integracao real.

## Proibicao de Supabase Cloud

Os testes desta etapa nao usam credenciais, `.env`, `service_role`, endpoint Cloud ou dados reais. Etapas futuras devem manter a regra: nunca executar testes destrutivos contra Supabase Cloud.

## Proximos passos - 6B.3

Na 6B.3, iniciar os primeiros testes automatizados de baixo risco:

- `isRouteAllowed`;
- `isActionAllowed`;
- validacoes puras;
- formatadores;
- normalizacao de campos;
- regras de checklist sem escrita clinica.

Antes disso, qualquer exposicao controlada de funcoes legadas deve ser planejada para nao alterar comportamento funcional.
