# GSI ONE - Testes de autenticacao e sessao - 6B.4

## Objetivo

Criar testes automatizados de autenticacao e sessao sem conectar ao Supabase Cloud, sem alterar o comportamento real de login e sem refatoracao ampla do legado.

## Diagnostico do `auth.js`

O arquivo `auth.js` inicializa automaticamente `window.GsiAuth`, cria o client por `window.supabase.createClient`, captura elementos do DOM de login, registra `client.auth.onAuthStateChange`, usa `signInWithPassword`, `signOut`, carrega `public.usuarios`, `usuario_perfil`, `perfis_acesso`, `perfil_permissao` e `permissoes`, deduplica permissoes por chave, dispara `gsiauth:ready` e expoe consultas ao estado por copia.

Partes puras/testaveis: validacao de credenciais vazias, deducao de sessao usavel e deduplicacao.

Partes testaveis com mocks: login, logout, restauracao de sessao, eventos de auth, carregamento de usuario, perfis e permissoes.

Partes fortemente acopladas ao DOM/eventos globais: `applyUserToUI`, listeners do formulario, `window.GsiAuth` e `window.dispatchEvent`.

Observacao: o `auth.js` atual carrega o campo `ativo`, mas nao bloqueia explicitamente usuario inativo. Os testes preservam esse comportamento atual e registram a necessidade de decisao futura.

## Extracao minima realizada

Nao foi importado `auth.js`, porque ele inicializa DOM, client Supabase, estado global e listeners automaticamente.

Camada testavel criada:

- `src/auth/session-rules.js`;
- `src/auth/auth-service.js`;
- `tests/helpers/mock-supabase-auth.js`;
- `tests/fixtures/auth.js`.

O `auth.js` real permaneceu intacto.

## Estrategia de mock

O mock cobre `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange` e consultas a `usuarios`, `usuario_perfil` e `perfil_permissao`. Ele permite configurar sucesso, erro, usuario ausente, perfis duplicados, permissoes duplicadas, falhas parciais e eventos de auth.

Nao ha credenciais reais, `service_role`, endpoint Cloud, rede ou dados clinicos.

## Arquivos criados

```text
src/auth/session-rules.js
src/auth/auth-service.js
tests/fixtures/auth.js
tests/helpers/mock-supabase-auth.js
tests/unit/auth-session.test.js
tests/unit/auth-service.test.js
docs/GSI_ONE_TESTES_AUTENTICACAO_SESSAO_6B4.md
```

## Arquivos ajustados

```text
package.json
```

O ajuste inclui a documentacao 6B.4 nos comandos de formatacao/checagem.

## Cenarios cobertos

- login valido;
- login invalido;
- erro do Supabase;
- logout valido;
- erro no logout;
- chamada correta de `signInWithPassword`;
- credenciais vazias;
- retorno sem usuario;
- retorno com sessao valida;
- `getSession` com sessao valida;
- `getSession` sem sessao;
- erro de sessao/expirada;
- evento `SIGNED_IN`;
- evento `SIGNED_OUT`;
- evento `TOKEN_REFRESHED`;
- evento `USER_UPDATED`;
- evitar processamento duplicado da mesma sessao;
- limpar estado ao trocar usuario;
- usuario ativo;
- usuario inativo conforme comportamento atual;
- usuario inexistente em `public.usuarios`;
- usuario sem perfil;
- usuario com um perfil;
- usuario com multiplos perfis;
- permissoes duplicadas deduplicadas;
- perfis duplicados deduplicados;
- falha no carregamento de permissoes;
- falha parcial no carregamento de perfis;
- evento `gsiauth:ready` equivalente por `dispatchReady`;
- estado loading encerrado.

## Quantidade de testes

Antes da etapa: 31 testes.

Novos testes: 30.

Total esperado apos a etapa: 61 testes.

## Limitacoes

- `auth.js` nao e importado diretamente.
- O DOM real de login nao e testado nesta etapa.
- Nao ha conexao com Supabase local ou Cloud.
- RLS, policies e tabelas reais serao validadas em etapa posterior.
- O comportamento de usuario inativo foi preservado como no legado, nao corrigido.
- O mock cobre apenas a interface necessaria para os testes atuais.

## Riscos de divergencia

- O modulo testavel pode divergir do `auth.js` se o legado mudar e os testes nao forem atualizados.
- O bloqueio de usuario inativo precisa de decisao explicita antes de qualquer mudanca funcional.
- Testes com mock nao substituem validacao futura com Supabase local e RLS.

## Proximos passos - 6B.5

- Criar testes de pacientes e atendimento ativo.
- Validar duplicidade de paciente/atendimento com mocks controlados.
- Continuar sem dados reais, sem Supabase Cloud e sem alteracao de fluxos assistenciais.
