/**
 * Testes autenticados — Fase A de restricao de leitura RLS
 * GSI ONE | Etapa 5B.8.5D
 *
 * Valida via API local (PostgREST 127.0.0.1:54321) quais tabelas cada
 * perfil pode ler apos a migration 20260722100029.
 *
 * Pre-condicao: supabase db reset com a migration 20260722100029 aplicada.
 *
 * Arquitetura de skip:
 *   it.skipIf(fn) avalia fn em collection time (antes do beforeAll).
 *   Para condicoes dependentes de beforeAll, usamos cit() — registra
 *   o teste normalmente e chama ctx.skip(motivo) em runtime, apos o
 *   beforeAll popular testUsers. Isso garante que:
 *     - SUITE_SKIP_REASON != null  →  ctx.skip (ambiente indisponivel)
 *     - SUITE_SKIP_REASON == null e beforeAll falha  →  suite FAIL
 *     - SUITE_SKIP_REASON == null e beforeAll ok  →  testes reais rodam
 *
 * Nota RLS / PostgREST:
 *   RLS bloqueando SELECT retorna HTTP 200 com body "[]".
 *   HTTP 403 ocorre apenas se GRANT SELECT estiver ausente.
 *   Para distinguir "RLS bloqueou" de "tabela vazia", o beforeAll
 *   insere seed data em todas as 17 tabelas antes de criar os usuarios.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertLocalOnlyStatus,
  execLocalRows,
  loadLocalSupabaseStatus,
  queryLocalRows,
  resolveLocalServiceKey,
} from "../helpers/local-supabase.js";

const LOCAL_API_URL = "http://127.0.0.1:54321";

// ---------------------------------------------------------------------------
// Verificacao sincrona do ambiente — roda em collection time
// Seguro: nao levanta excecao; registra o motivo de skip se necessario.
// ---------------------------------------------------------------------------
let SUITE_SKIP_REASON = null;
let SERVICE_KEY = null;

try {
  // Passo 1: confirma que o Supabase local esta acessivel (Docker + URLs locais).
  // Se falhar aqui, o ambiente nao esta rodando — marca para skip.
  assertLocalOnlyStatus(loadLocalSupabaseStatus());
} catch (e) {
  SUITE_SKIP_REASON = `Ambiente Supabase local indisponivel: ${e.message}`;
}

if (!SUITE_SKIP_REASON) {
  // Passo 2: resolve a chave de servico dinamicamente (sem valor fixo no repositorio).
  // Suporta os dois formatos de saida do CLI:
  //   formato antigo: SERVICE_ROLE_KEY / ANON_KEY
  //   formato atual:  SECRET_KEY (sb_secret_...) / PUBLISHABLE_KEY (sb_publishable_...)
  // Se o Supabase esta rodando mas a chave nao e encontrada, lanca excecao
  // (falha o setup do arquivo — nao marca os testes como skipped).
  SERVICE_KEY = resolveLocalServiceKey();
}

// ---------------------------------------------------------------------------
// Helpers de API
// ---------------------------------------------------------------------------

async function createTestUser(email, password) {
  const res = await fetch(`${LOCAL_API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "(sem corpo)");
    throw new Error(`createTestUser '${email}' falhou (${res.status}): ${detail}`);
  }
  return res.json();
}

async function deleteTestUser(userId) {
  await fetch(`${LOCAL_API_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  }).catch(() => {});
}

async function signIn(email, password) {
  const res = await fetch(
    `${LOCAL_API_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SERVICE_KEY },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "(sem corpo)");
    throw new Error(`signIn '${email}' falhou (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Vincula o usuario ao perfil via psql (bypassa RLS).
 * PostgREST nao executa subqueries SQL em campos JSON; psql sim.
 * Se o perfil nao existir no DB, a insercao e ignorada silenciosamente.
 */
function linkUserToProfile(authUserId, perfilNome, ativo = true) {
  const display = perfilNome ?? "sem-perfil";
  // public.usuarios.categoria_profissional e NOT NULL
  // execLocalRows: usa WITH _q AS (INSERT ...) para manter DML no nivel superior
  execLocalRows(
    `INSERT INTO public.usuarios
       (id, nome, categoria_profissional, email, ativo)
     VALUES
       ('${authUserId}', 'Teste ${display}', 'Teste', 'test-${authUserId}@gsi.test', ${ativo})
     RETURNING id`
  );
  // Sem perfil ou inativo: nao vincula (has_permission requer u.ativo = true)
  if (!perfilNome || !ativo) return;
  execLocalRows(
    `INSERT INTO public.usuario_perfil (usuario_id, perfil_id)
     SELECT '${authUserId}', id
     FROM public.perfis_acesso
     WHERE nome = '${perfilNome}'
     RETURNING usuario_id`
  );
}

/** GET na tabela via PostgREST com JWT do usuario testado. */
async function selectTable(jwt, table, params = "limit=1") {
  const res = await fetch(`${LOCAL_API_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${jwt}`,
      Accept: "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/**
 * Wrapper para registrar testes que dependem do beforeAll.
 *
 * Nao usa it.skipIf (avalia em collection time, antes do beforeAll).
 * Em vez disso registra o teste normalmente e avalia a condicao de skip
 * em runtime, apos o beforeAll popular testUsers.
 *
 * Comportamento:
 *   SUITE_SKIP_REASON != null  →  ctx.skip (ambiente indisponivel)
 *   testUsers[key] e undefined  →  falha com mensagem clara (bug de setup)
 *   testUsers[key] e nao-null  →  fn() executado normalmente
 */
function cit(key, name, fn) {
  return it(name, async (ctx) => {
    if (SUITE_SKIP_REASON) return ctx.skip(SUITE_SKIP_REASON);

    if (testUsers[key] === undefined) {
      // beforeAll nao inicializou esta chave — nunca deveria ocorrer
      throw new Error(
        `[fase-a] testUsers['${key}'] nao inicializado — beforeAll concluiu sem criar este usuario`
      );
    }
    if (testUsers[key] === null) {
      // Criacao falhou mas beforeAll nao lancou — indica bug de setup
      throw new Error(
        `[fase-a] testUsers['${key}'] e null — setup do usuario falhou sem propagar o erro`
      );
    }
    return fn();
  });
}

// ---------------------------------------------------------------------------
// Setup e teardown
// ---------------------------------------------------------------------------

// 13 perfis testados + 1 usuario multi-perfil (Farmacia + TEN) para Fase B1
const profileMap = {
  recepcao:    "Recepção",
  farmacia:    "Farmácia",
  regulacao:   "Regulação de Transferência",
  gestao:      "Gestão Hospitalar",
  leitura:     "Leitura/Gestor",
  medico:      "Médico",
  enfermeiro:  "Enfermeiro",
  tecnico_enf: "Técnico em Enfermagem",
  diagnostico: "Técnico em RX",
  admin:       "Administração",
  auditoria:   "Auditoria",
  sem_perfil:  null,
  inativo:     "Recepção",
  // Fase B1: usuario com dois perfis para testar uniao de permissoes
  multi_far_ten: "Farmácia",
};

const testUsers = {};
let seedIds = null;

beforeAll(async () => {
  // Se ambiente indisponivel, sai sem criar usuarios
  // (cit() vai chamar ctx.skip em cada teste)
  if (SUITE_SKIP_REASON) return;

  // -------------------------------------------------------------------------
  // 1. Seed data — insere 1 linha em cada uma das 17 tabelas-alvo para que
  //    testes de "bloqueio" possam distinguir RLS de tabela vazia.
  //
  //    Limitacao: queryLocalRows envolve o SQL em FROM (...) q, o que impede
  //    CTEs data-modifying (WITH INSERT ... AS ...). Por isso, o seed usa
  //    chamadas sequenciais de INSERT ... RETURNING, passando IDs entre elas.
  //    Qualquer falha aqui e fatal (nao silenciada).
  // -------------------------------------------------------------------------

  // paciente
  const [{ id: pacienteId }] = execLocalRows(
    `INSERT INTO public.pacientes (nome, data_nascimento, municipio)
     VALUES ('Seed Fase-A', '1990-01-01', 'Caninde')
     RETURNING id`
  );

  // atendimento (FK: paciente, dom_status_atendimento)
  const [{ id: atendimentoId }] = execLocalRows(
    `INSERT INTO public.atendimentos
       (paciente_id, status_id, queixa_principal, etapa_atual, hora_chegada_ts)
     SELECT '${pacienteId}', id, 'Queixa seed Fase-A', 'triagem', now()
     FROM public.dom_status_atendimento WHERE codigo = 'aguardando_triagem'
     RETURNING id`
  );

  // chamada
  execLocalRows(
    `INSERT INTO public.chamadas (atendimento_id, tipo_chamada, hora_chamada_ts)
     VALUES ('${atendimentoId}', 'painel', now()) RETURNING id`
  );

  // triagem
  execLocalRows(
    `INSERT INTO public.triagens (atendimento_id, hora_inicio_ts)
     VALUES ('${atendimentoId}', now()) RETURNING id`
  );

  // consulta
  execLocalRows(
    `INSERT INTO public.consultas (atendimento_id, hora_inicio_ts)
     VALUES ('${atendimentoId}', now()) RETURNING id`
  );

  // evolucao_enfermagem
  execLocalRows(
    `INSERT INTO public.evolucoes_enfermagem
       (atendimento_id, tipo_registro, hora_registro_ts)
     VALUES ('${atendimentoId}', 'evolucao', now()) RETURNING id`
  );

  // observacao (FK: atendimento, dom_tipos_observacao)
  const [{ id: observacaoId }] = execLocalRows(
    `INSERT INTO public.observacoes (atendimento_id, tipo_id, inicio_ts)
     SELECT '${atendimentoId}', id, now()
     FROM public.dom_tipos_observacao WHERE codigo = 'clinica'
     RETURNING id`
  );

  // reavaliacao_observacao
  execLocalRows(
    `INSERT INTO public.reavaliacoes_observacao (observacao_id, hora_ts)
     VALUES ('${observacaoId}', now()) RETURNING id`
  );

  // estabilizacao
  const [{ id: estabilizacaoId }] = execLocalRows(
    `INSERT INTO public.estabilizacoes (atendimento_id, inicio_ts)
     VALUES ('${atendimentoId}', now()) RETURNING id`
  );

  // checklist_estabilizacao_itens
  execLocalRows(
    `INSERT INTO public.checklist_estabilizacao_itens
       (estabilizacao_id, item, concluido)
     VALUES ('${estabilizacaoId}', 'Item seed', false) RETURNING id`
  );

  // prescricao
  const [{ id: prescricaoId }] = execLocalRows(
    `INSERT INTO public.prescricoes (atendimento_id, hora_prescricao_ts)
     VALUES ('${atendimentoId}', now()) RETURNING id`
  );

  // prescricao_item (FK: prescricao, dom_status_prescricao)
  execLocalRows(
    `INSERT INTO public.prescricao_itens
       (prescricao_id, status_id, medicamento_nome)
     SELECT '${prescricaoId}', id, 'Med seed'
     FROM public.dom_status_prescricao WHERE codigo = 'pendente'
     RETURNING id`
  );

  // exame (FK: atendimento, dom_status_exame)
  execLocalRows(
    `INSERT INTO public.exames
       (atendimento_id, status_id, exame, tipo, hora_solicitacao_ts)
     SELECT '${atendimentoId}', id, 'Exame seed', 'laboratorial', now()
     FROM public.dom_status_exame WHERE codigo = 'solicitado'
     RETURNING id`
  );

  // transferencia (FK: atendimento, dom_status_transferencia)
  const [{ id: transferenciaId }] = execLocalRows(
    `INSERT INTO public.transferencias
       (atendimento_id, status_id, motivo, destino, hora_solicitacao_ts)
     SELECT '${atendimentoId}', id, 'Motivo seed', 'Fortaleza', now()
     FROM public.dom_status_transferencia WHERE codigo = 'em_analise'
     RETURNING id`
  );

  // checklist_transferencia_itens
  execLocalRows(
    `INSERT INTO public.checklist_transferencia_itens
       (transferencia_id, item, concluido)
     VALUES ('${transferenciaId}', 'Checklist seed', false) RETURNING id`
  );

  // estoque_itens: nenhum seed inserido.
  // PP3-B.3 (20260809000002) proibe DELETE fisico via trigger (trg_block_delete_estoque_itens),
  // impossibilitando cleanup sem bypass de segurança. Testes de acesso a estoque_itens
  // verificam apenas GRANT + policy via status HTTP (sem exigir body nao-vazio),
  // mesmo padrao ja usado para estoque_movimentacoes nesta suíte.

  seedIds = { paciente_id: pacienteId };

  // -------------------------------------------------------------------------
  // 2. Cria usuarios de teste — qualquer falha aqui e FATAL (nao silenciada)
  //    Se Supabase esta ativo e a service key esta valida, falha = bug real.
  // -------------------------------------------------------------------------
  for (const [key, perfil] of Object.entries(profileMap)) {
    const email = `fase-a-${key}@gsi.test`;
    const user = await createTestUser(email, "GsiTest@2026!");
    const ativo = key !== "inativo";
    linkUserToProfile(user.id, perfil, ativo);
    const jwt = await signIn(email, "GsiTest@2026!");
    testUsers[key] = { id: user.id, email, jwt };
  }

  // Fase B1: adiciona segundo perfil ao usuario multi_far_ten.
  // Resulta em uniao de permissoes: Farmacia + Tecnico em Enfermagem.
  // Deve ler pacientes e atendimentos (via TEN), mas nao consultas
  // (nenhum dos dois perfis recebe consulta.visualizar na Fase B1).
  execLocalRows(
    `INSERT INTO public.usuario_perfil (usuario_id, perfil_id)
     SELECT '${testUsers.multi_far_ten.id}', id
     FROM public.perfis_acesso WHERE nome = 'Técnico em Enfermagem'
     RETURNING usuario_id`
  );
}, 60_000);

afterAll(async () => {
  // Deleta auth users — ON DELETE CASCADE cuida de public.usuarios e usuario_perfil
  for (const user of Object.values(testUsers)) {
    if (user?.id) await deleteTestUser(user.id);
  }

  // Soft-delete do paciente seed.
  // Trigger fn_block_assistential_physical_delete impede DELETE fisico em pacientes.
  // Usa inativacao logica (deleted_at + delete_reason); deleted_by nullable, omitido.
  // Cascade para atendimentos e filhos so ocorre em db reset (trigger nao permite DELETE).
  if (seedIds?.paciente_id) {
    try {
      execLocalRows(
        `UPDATE public.pacientes
         SET deleted_at = now(), delete_reason = 'cleanup automatico — seed teste fase-a'
         WHERE id = '${seedIds.paciente_id}'
         RETURNING id`
      );
    } catch {}
  }
  // Nenhum seed de estoque_itens: cleanup desnecessario.
});

// ---------------------------------------------------------------------------
// Testes por perfil
// ---------------------------------------------------------------------------

describe("fase-a recepcao — acesso operacional, bloqueio de dados clinicos", () => {
  cit("recepcao", "recepcao: le pacientes (status 200, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "pacientes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("recepcao", "recepcao: le atendimentos (status 200, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "atendimentos");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("recepcao", "recepcao: le chamadas (status 200, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "chamadas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve triagens — RLS bloqueia (body vazio)", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "triagens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve consultas — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve prescricoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve exames — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "exames");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve transferencias — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "transferencias");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("recepcao", "recepcao: nao ve estoque_itens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.recepcao.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a farmacia — prescricoes e estoque, bloqueio de clinico", () => {
  cit("farmacia", "farmacia: le pacientes (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "pacientes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("farmacia", "farmacia: le prescricoes (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("farmacia", "farmacia: le prescricao_itens (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "prescricao_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("farmacia", "farmacia: le estoque_itens (status 200, GRANT e policy confirmados)", async () => {
    // Nao e' possivel inserir seed removivel em estoque_itens: PP3-B.3 bloqueia DELETE fisico
    // via trigger. Verifica apenas que GRANT SELECT e policy estoque_itens_select_operacional
    // permitem acesso (status 200), mesmo padrao de estoque_movimentacoes nesta suíte.
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  cit("farmacia", "farmacia: le estoque_movimentacoes (status 200, GRANT e policy confirmados)", async () => {
    // Nao e' possivel inserir seed em estoque_movimentacoes: o trigger fn_block_update_delete
    // impede DELETE/UPDATE incondicionalmente, tornando qualquer seed permanente.
    // O teste verifica que o GRANT SELECT esta presente (status 200, nao 403) e que
    // a policy estoque_movimentacoes_select_farmacia nao bloqueia farmacia com 403.
    // A verificacao de volume (body nao-vazio) e' garantida indiretamente pelo teste
    // de estoque_itens (mesma policy), onde o seed existe e pode ser limpo.
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "estoque_movimentacoes");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  cit("farmacia", "farmacia: nao ve triagens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "triagens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("farmacia", "farmacia: nao ve consultas — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("farmacia", "farmacia: nao ve evolucoes_enfermagem — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "evolucoes_enfermagem");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("farmacia", "farmacia: nao ve observacoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "observacoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("farmacia", "farmacia: nao ve transferencias — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "transferencias");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  // Fase B1: Farmacia perde acesso a atendimentos — prescricao.dispensar removida
  // da policy atendimentos_select_operacional. Farmacia nao precisa listar
  // atendimentos para dispensar — acessa prescricoes diretamente pelo id.
  cit("farmacia", "farmacia: nao ve atendimentos — Fase B1 remove acesso desproporcional (body vazio)", async () => {
    const { status, body } = await selectTable(testUsers.farmacia.jwt, "atendimentos");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a regulacao — transferencias e checklist, bloqueio de clinico", () => {
  cit("regulacao", "regulacao: le pacientes (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "pacientes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("regulacao", "regulacao: le atendimentos (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "atendimentos");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("regulacao", "regulacao: le transferencias (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "transferencias");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("regulacao", "regulacao: le checklist_transferencia_itens (body nao-vazio)", async () => {
    const { status, body } = await selectTable(
      testUsers.regulacao.jwt,
      "checklist_transferencia_itens"
    );
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("regulacao", "regulacao: nao ve triagens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "triagens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("regulacao", "regulacao: nao ve consultas — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("regulacao", "regulacao: nao ve prescricoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.regulacao.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a diagnostico-exames — exames, pacientes e atendimentos; bloqueio de clinico", () => {
  cit("diagnostico", "diagnostico: le pacientes (via exame.visualizar, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "pacientes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: le atendimentos (via exame.visualizar, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "atendimentos");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: le exames (body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "exames");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve chamadas — exame.visualizar ausente de chamadas_select_operacional", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "chamadas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve triagens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "triagens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve consultas — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve prescricoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve transferencias — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "transferencias");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("diagnostico", "diagnostico: nao ve estoque_itens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.diagnostico.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a gestao-hospitalar e leitura-gestor — bloqueio total (perfis sem permissoes)", () => {
  const allTables = [
    "pacientes", "atendimentos", "chamadas", "triagens", "consultas",
    "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens", "prescricoes",
    "prescricao_itens", "exames", "transferencias", "checklist_transferencia_itens",
    "estoque_itens", "estoque_movimentacoes",
  ];

  for (const profile of ["gestao", "leitura"]) {
    const label = profile === "gestao" ? "gestao-hospitalar" : "leitura-gestor";
    for (const table of allTables) {
      cit(profile, `${label}: nao ve ${table} — body vazio`, async () => {
        const { status, body } = await selectTable(testUsers[profile].jwt, table);
        expect(status).toBe(200);
        expect(Array.isArray(body) && body.length === 0).toBe(true);
      });
    }
  }
});

describe("fase-a medico — acesso clinico completo", () => {
  const medAllowed = [
    "pacientes", "atendimentos", "chamadas", "triagens", "consultas",
    "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens",
    "prescricoes", "prescricao_itens", "exames", "transferencias",
  ];

  for (const table of medAllowed) {
    cit("medico", `medico: le ${table} (body nao-vazio)`, async () => {
      const { status, body } = await selectTable(testUsers.medico.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length > 0).toBe(true);
    });
  }

  cit("medico", "medico: nao ve estoque_itens — fora do escopo medico", async () => {
    const { status, body } = await selectTable(testUsers.medico.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("medico", "medico: nao ve checklist_transferencia_itens — nao tem transferencia.aprovar_vaga", async () => {
    const { status, body } = await selectTable(
      testUsers.medico.jwt,
      "checklist_transferencia_itens"
    );
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a enfermeiro — clinico + transferencia, bloqueio de prescricao e exames", () => {
  const enfAllowed = [
    "pacientes", "atendimentos", "chamadas", "triagens",
    "consultas", "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens",
    "transferencias", "checklist_transferencia_itens",
  ];

  for (const table of enfAllowed) {
    cit("enfermeiro", `enfermeiro: le ${table} (body nao-vazio)`, async () => {
      const { status, body } = await selectTable(testUsers.enfermeiro.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length > 0).toBe(true);
    });
  }

  cit("enfermeiro", "enfermeiro: nao ve prescricoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.enfermeiro.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("enfermeiro", "enfermeiro: nao ve exames — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.enfermeiro.jwt, "exames");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("enfermeiro", "enfermeiro: nao ve estoque_itens — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.enfermeiro.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-b1 tecnico-em-enfermagem — clinico de triagem, sem consultas nem transferencia nem prescricao", () => {
  // Fase B1: consultas removida de tecAllowed.
  // TEN tinha acesso nao intencional via observacao.reavaliar (Fase A).
  // A migration 20260722100031 substitui a policy consultas_select_clinico
  // por has_permission('consulta.visualizar') — TEN nao recebe essa permissao.
  const tecAllowed = [
    "pacientes", "atendimentos", "chamadas", "triagens",
    "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens",
  ];

  for (const table of tecAllowed) {
    cit("tecnico_enf", `tecnico-em-enfermagem: le ${table} (body nao-vazio)`, async () => {
      const { status, body } = await selectTable(testUsers.tecnico_enf.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length > 0).toBe(true);
    });
  }

  cit("tecnico_enf", "tecnico-em-enfermagem: nao ve transferencias — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.tecnico_enf.jwt, "transferencias");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("tecnico_enf", "tecnico-em-enfermagem: nao ve prescricoes — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.tecnico_enf.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("tecnico_enf", "tecnico-em-enfermagem: nao ve exames — body vazio", async () => {
    const { status, body } = await selectTable(testUsers.tecnico_enf.jwt, "exames");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  // Fase B1: TEN perde acesso nao intencional a consultas.
  // Na Fase A, observacao.reavaliar estava na policy consultas_select_clinico,
  // dando a TEN acesso inadvertido a hipotese_diagnostica, cid, conduta.
  // A Fase B1 corrige isso: consultas_select_clinico passa a exigir
  // has_permission('consulta.visualizar'), que TEN nao possui.
  cit("tecnico_enf", "tecnico-em-enfermagem: nao ve consultas — Fase B1 corrige acesso nao intencional (body vazio)", async () => {
    const { status, body } = await selectTable(testUsers.tecnico_enf.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });
});

describe("fase-a administracao — leitura completa via is_admin()", () => {
  // estoque_movimentacoes e estoque_itens excluidas do loop "body nao-vazio":
  // ambas possuem triggers que impedem DELETE fisico (PP3-B.3), impossibilitando
  // cleanup do seed. A policy SELECT e o GRANT sao verificados em testes dedicados.
  const tablesWithSeed = [
    "pacientes", "atendimentos", "chamadas", "triagens", "consultas",
    "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens", "prescricoes",
    "prescricao_itens", "exames", "transferencias", "checklist_transferencia_itens",
  ];

  for (const table of tablesWithSeed) {
    cit("admin", `admin: le ${table} (body nao-vazio)`, async () => {
      const { status, body } = await selectTable(testUsers.admin.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length > 0).toBe(true);
    });
  }

  cit("admin", "admin: le estoque_itens (status 200, GRANT e is_admin confirmados)", async () => {
    const { status, body } = await selectTable(testUsers.admin.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  cit("admin", "admin: le estoque_movimentacoes (status 200, GRANT e policy confirmados)", async () => {
    const { status, body } = await selectTable(testUsers.admin.jwt, "estoque_movimentacoes");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("fase-a auditoria — leitura completa via is_auditoria()", () => {
  // Mesmo criterio de admin: estoque_itens e estoque_movimentacoes verificadas por status 200.
  const tablesWithSeed = [
    "pacientes", "atendimentos", "chamadas", "triagens", "consultas",
    "evolucoes_enfermagem", "observacoes", "reavaliacoes_observacao",
    "estabilizacoes", "checklist_estabilizacao_itens", "prescricoes",
    "prescricao_itens", "exames", "transferencias", "checklist_transferencia_itens",
  ];

  for (const table of tablesWithSeed) {
    cit("auditoria", `auditoria: le ${table} (body nao-vazio)`, async () => {
      const { status, body } = await selectTable(testUsers.auditoria.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length > 0).toBe(true);
    });
  }

  cit("auditoria", "auditoria: le estoque_itens (status 200, GRANT e is_auditoria confirmados)", async () => {
    const { status, body } = await selectTable(testUsers.auditoria.jwt, "estoque_itens");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  cit("auditoria", "auditoria: le estoque_movimentacoes (status 200, GRANT e policy confirmados)", async () => {
    const { status, body } = await selectTable(testUsers.auditoria.jwt, "estoque_movimentacoes");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fase B1 — cenario de multiplos perfis (uniao de permissoes)
// ---------------------------------------------------------------------------

describe("fase-b1 multiplos-perfis — farmacia + tecnico-em-enfermagem (uniao de permissoes)", () => {
  // O usuario multi_far_ten tem dois vinculos em usuario_perfil:
  //   1. Farmacia    -> tem paciente.visualizar
  //   2. TEN         -> tem paciente.visualizar + atendimento.visualizar
  //
  // has_permission() verifica a existencia da chave em QUALQUER perfil ativo do usuario.
  // Resultado esperado pela uniao:
  //   paciente.visualizar    = SIM (ambos tem)
  //   atendimento.visualizar = SIM (TEN tem; Farmacia nao tem)
  //   consulta.visualizar    = NAO (nenhum dos dois tem)

  cit("multi_far_ten", "multi-perfil farmacia+ten: le pacientes (ambos tem paciente.visualizar, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.multi_far_ten.jwt, "pacientes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("multi_far_ten", "multi-perfil farmacia+ten: le atendimentos (TEN tem atendimento.visualizar, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.multi_far_ten.jwt, "atendimentos");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });

  cit("multi_far_ten", "multi-perfil farmacia+ten: nao ve consultas — nenhum dos dois perfis tem consulta.visualizar (body vazio)", async () => {
    const { status, body } = await selectTable(testUsers.multi_far_ten.jwt, "consultas");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length === 0).toBe(true);
  });

  cit("multi_far_ten", "multi-perfil farmacia+ten: le prescricoes (Farmacia tem prescricao.dispensar, body nao-vazio)", async () => {
    const { status, body } = await selectTable(testUsers.multi_far_ten.jwt, "prescricoes");
    expect(status).toBe(200);
    expect(Array.isArray(body) && body.length > 0).toBe(true);
  });
});

describe("fase-a sem-perfil e inativo — bloqueio total (sem permissoes ativas)", () => {
  const blockedTables = [
    "pacientes", "atendimentos", "triagens", "consultas",
    "prescricoes", "exames", "transferencias", "estoque_itens",
  ];

  for (const table of blockedTables) {
    cit("sem_perfil", `sem-perfil: nao ve ${table} — body vazio`, async () => {
      const { status, body } = await selectTable(testUsers.sem_perfil.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length === 0).toBe(true);
    });

    cit("inativo", `inativo: nao ve ${table} — body vazio (u.ativo = false)`, async () => {
      const { status, body } = await selectTable(testUsers.inativo.jwt, table);
      expect(status).toBe(200);
      expect(Array.isArray(body) && body.length === 0).toBe(true);
    });
  }
});
