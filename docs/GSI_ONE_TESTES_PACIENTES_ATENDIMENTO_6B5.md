# GSI ONE - Testes de pacientes e atendimento ativo - 6B.5

## Objetivo

Criar cobertura automatizada para cadastro, localizacao e atualizacao de pacientes, alem da criacao e normalizacao de atendimento ativo, sem alterar `script.js` e sem modificar o fluxo Recepcao -> Atendimento -> Triagem.

## Diagnostico do legado

Funcoes analisadas em `script.js`:

- `findPacienteRealDuplicado`;
- `createPacienteRealFromLocal`;
- `updatePacienteRealFromLocal`;
- `createAtendimentoRealFromLocal`;
- `obterAtendimentoAtivoReal`;
- `obterOuCriarAtendimentoAtivoReal`;
- `atendimentoRealById`;
- `listAtendimentosCompat`;
- `listPacientesCompat`;
- `parseDateBRParaISO`;
- `hasPacienteIdentity`.

Achados:

- A criacao real de paciente usa apenas campos cadastrais e depende de `window.GsiAuth.client`.
- Duplicidade e consultada por CPF e CNS antes do insert.
- Paciente existente e reaproveitado com `_alreadyExisted`.
- A criacao de atendimento exige paciente real com `id`, status `aguardando_triagem`, queixa, etapa inicial e timestamp.
- Atendimento ativo e buscado por paciente e status de dominio, ordenado por `hora_chegada_ts` descendente.
- O legado mistura Supabase, caches em memoria, `GsiApi`, toasts e handlers; por isso os testes usam modulos isolados.

## Modulos testaveis criados

```text
src/patients/patient-rules.js
src/patients/patient-service.js
src/attendances/attendance-rules.js
src/attendances/attendance-service.js
```

Esses modulos recebem dependencias injetadas, nao criam client real e nao acessam `window.supabase`.

## Mocks e fixtures

```text
tests/fixtures/patients.js
tests/fixtures/attendances.js
tests/helpers/mock-supabase-query.js
```

O mock suporta `from`, `select`, `eq`, `in`, `order`, `limit`, `maybeSingle`, `single`, `insert`, `update`, retorno configuravel, erro configuravel e registro de chamadas.

## Testes criados

```text
tests/unit/patient-rules.test.js
tests/unit/patient-service.test.js
tests/unit/attendance-rules.test.js
tests/unit/attendance-service.test.js
```

Cobertura:

- normalizacao de CPF/CNS;
- identidade vazia;
- comparacao de identificadores;
- paciente existente por CPF;
- paciente existente por CNS;
- conflito CPF/CNS;
- preservacao da identidade real;
- payload cadastral controlado;
- update cadastral;
- erro de query/insert/update;
- status ativo;
- atendimento encerrado;
- selecao do ativo mais recente;
- payload inicial `aguardando_triagem`;
- timestamp inicial;
- reuso de atendimento ativo;
- criacao apos atendimento encerrado;
- falha apos paciente antes do atendimento;
- retorno inesperado.

## Quantidade de testes

Antes da etapa: 61 testes.

Novos testes esperados: 60.

Total esperado apos a etapa: 121 testes.

## Limitacoes

- `script.js` nao foi importado.
- Nao ha conexao com Supabase Cloud ou local.
- Nao ha teste E2E do formulario visual.
- RLS e policies permanecem para etapa especifica.
- A equivalencia e baseada nos trechos lidos do legado e deve ser mantida se `script.js` mudar.

## Seguranca e privacidade

- Dados usados sao ficticios e prefixados com `TESTE_`.
- Nao ha dados reais.
- Nao ha credenciais.
- Nao ha `service_role`.
- Nao ha rede.
- Nao ha `DELETE`.
- Nao houve alteracao de RLS, banco, migrations ou policies.

## Riscos

- Risco de divergencia entre modulos testaveis e legado caso a regra real evolua sem atualizar testes.
- Mock de Supabase nao substitui validacao futura com Supabase local/RLS.
- Regras de conflito CPF/CNS permanecem como protecao de QA; qualquer mudanca funcional precisa de etapa propria.

## Proximos passos - 6B.6

Testar o fluxo Recepcao -> Atendimento -> Triagem com orquestracao simulada, preservando a ordem real: cadastro/vinculo de paciente, atendimento ativo, triagem e transicao para consulta.
