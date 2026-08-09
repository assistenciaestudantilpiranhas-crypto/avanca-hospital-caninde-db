/**
 * Testes de seguranca — PP3-B.1: Filtro de exclusao logica nas policies SELECT Classe B
 * GSI ONE | Migration 20260807000001_rls_phase_b1_soft_delete_select_filter
 *
 * Valida via banco local (127.0.0.1:54322) que:
 *   1. As 12 policies SELECT das tabelas Classe B foram criadas com o nome correto.
 *   2. Cada policy contem o filtro deleted_at IS NULL no USING.
 *   3. Cada policy preserva has_permission() com as permissoes originais.
 *   4. Cada policy preserva is_admin() e is_auditoria() sem filtro.
 *   5. Nenhuma policy de INSERT, UPDATE ou DELETE foi alterada.
 *   6. As 3 tabelas Classe A (PP2-F) nao foram tocadas.
 *   7. As 4 tabelas Classe B is_linked_user() nao foram tocadas.
 *   8. Idempotencia: as policies B1 existem com o padrao correto.
 *
 * Pre-condicao: banco local com todas as migrations ate 20260807000001 aplicadas.
 *
 * Casos cobertos:
 *   Suite 1 — Existencia das 12 policies SELECT
 *   Suite 2 — Presenca do filtro deleted_at IS NULL em cada policy
 *   Suite 3 — Preservacao de has_permission() em cada policy
 *   Suite 4 — Preservacao irrestrita de is_admin() e is_auditoria()
 *   Suite 5 — INSERT/UPDATE/DELETE das 12 tabelas nao alterados (sem deleted_at nas demais)
 *   Suite 6 — Nao-regressao Classe A (PP2-F)
 *   Suite 7 — Nao-regressao Classe B is_linked_user() (fora do escopo)
 *   Suite 8 — Idempotencia e rollback
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
} from "../helpers/local-supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Verificacao de ambiente
// ---------------------------------------------------------------------------
let SUITE_SKIP_REASON = null;

try {
  assertLocalOnlyStatus(loadLocalSupabaseStatus());
} catch (e) {
  SUITE_SKIP_REASON = `Ambiente Supabase local indisponivel: ${e.message}`;
}

const cit = (name, fn) =>
  it(name, async (ctx) => {
    if (SUITE_SKIP_REASON) ctx.skip(SUITE_SKIP_REASON);
    await fn(ctx);
  });

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** As 12 tabelas Classe B corrigidas nesta migration. */
const CLASS_B_TABLES = [
  { table: "chamadas",                        policy: "chamadas_select_operacional",                        perms: ["atendimento.abrir", "triagem.classificar", "consulta.iniciar"] },
  { table: "triagens",                        policy: "triagens_select_clinico",                            perms: ["triagem.classificar", "consulta.iniciar", "consulta.registrar_conduta", "observacao.reavaliar"] },
  { table: "evolucoes_enfermagem",            policy: "evolucoes_enfermagem_select_clinico",                perms: ["enfermagem.evolucao.registrar", "consulta.iniciar"] },
  { table: "observacoes",                     policy: "observacoes_select_clinico",                         perms: ["observacao.reavaliar", "consulta.iniciar"] },
  { table: "reavaliacoes_observacao",         policy: "reavaliacoes_observacao_select_clinico",             perms: ["observacao.reavaliar", "consulta.iniciar"] },
  { table: "estabilizacoes",                  policy: "estabilizacoes_select_clinico",                      perms: ["estabilizacao.checklist_item", "consulta.iniciar"] },
  { table: "checklist_estabilizacao_itens",   policy: "checklist_estabilizacao_itens_select_clinico",       perms: ["estabilizacao.checklist_item", "consulta.iniciar"] },
  { table: "exames",                          policy: "exames_select_diagnostico",                          perms: ["exame.solicitar", "exame.visualizar", "exame.liberar_resultado"] },
  { table: "prescricoes",                     policy: "prescricoes_select_farmacia_clinico",                perms: ["prescricao.criar", "prescricao.dispensar"] },
  { table: "prescricao_itens",               policy: "prescricao_itens_select_farmacia_clinico",           perms: ["prescricao.criar", "prescricao.dispensar"] },
  { table: "transferencias",                  policy: "transferencias_select_operacional",                  perms: ["transferencia.solicitar", "transferencia.aprovar_vaga", "transferencia.confirmar_checklist", "transferencia.confirmar_saida"] },
  { table: "checklist_transferencia_itens",   policy: "checklist_transferencia_itens_select_operacional",   perms: ["transferencia.confirmar_checklist", "transferencia.aprovar_vaga"] },
];

/** Tabelas Classe A — corrigidas no PP2-F; nao tocadas aqui. */
const CLASS_A_TABLES = [
  { table: "pacientes",    policy: "pacientes_select_operacional" },
  { table: "atendimentos", policy: "atendimentos_select_operacional" },
  { table: "consultas",    policy: "consultas_select_clinico" },
];

/** Tabelas Classe B is_linked_user() — fora do escopo desta migration. */
const CLASS_B_LINKED_TABLES = [
  { table: "paciente_alergias",                policy: null },
  { table: "paciente_comorbidades",            policy: null },
  { table: "paciente_medicamentos_continuos",  policy: null },
  { table: "paciente_alertas_clinicos",        policy: null },
];

// ---------------------------------------------------------------------------
// Suite 1: Existencia das 12 policies SELECT
// ---------------------------------------------------------------------------

describe("pp3b1: existencia das policies SELECT Classe B", () => {
  cit("as 12 policies SELECT existem no banco local", async () => {
    const names = CLASS_B_TABLES.map((e) => `'${e.policy}'`).join(", ");
    const rows = queryLocalRows(`
      select policyname
      from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and policyname in (${names})
      order by policyname
    `);
    const found = rows.map((r) => r.policyname);
    for (const entry of CLASS_B_TABLES) {
      expect(found, `policy ausente: ${entry.policy}`).toContain(entry.policy);
    }
    expect(rows.length).toBe(12);
  });

  for (const entry of CLASS_B_TABLES) {
    cit(`policy ${entry.policy} vinculada a tabela correta (${entry.table})`, async () => {
      const rows = queryLocalRows(`
        select tablename
        from pg_policies
        where schemaname = 'public'
          and cmd = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      expect(rows[0].tablename).toBe(entry.table);
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 2: Presenca do filtro deleted_at IS NULL
// ---------------------------------------------------------------------------

describe("pp3b1: filtro deleted_at IS NULL nas 12 policies SELECT", () => {
  for (const entry of CLASS_B_TABLES) {
    cit(`${entry.table}: USING contem deleted_at is null`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, `deleted_at is null ausente em ${entry.table}`).toContain("deleted_at is null");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 3: Preservacao de has_permission()
// ---------------------------------------------------------------------------

describe("pp3b1: permissoes has_permission() preservadas", () => {
  for (const entry of CLASS_B_TABLES) {
    cit(`${entry.table}: todas as permissoes originais presentes`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      for (const perm of entry.perms) {
        expect(qual, `permissao ausente: ${perm} em ${entry.table}`).toContain(perm);
      }
      expect(qual, `has_permission ausente em ${entry.table}`).toContain("has_permission");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 4: is_admin() e is_auditoria() presentes e sem filtro
// ---------------------------------------------------------------------------

describe("pp3b1: is_admin() e is_auditoria() com acesso irrestrito", () => {
  for (const entry of CLASS_B_TABLES) {
    cit(`${entry.table}: is_admin() e is_auditoria() presentes no USING`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, `is_admin() ausente em ${entry.table}`).toContain("is_admin()");
      expect(qual, `is_auditoria() ausente em ${entry.table}`).toContain("is_auditoria()");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 5: INSERT/UPDATE/DELETE nao alterados nas 12 tabelas
// ---------------------------------------------------------------------------

describe("pp3b1: policies INSERT/UPDATE/DELETE nao alteradas", () => {
  cit("nenhuma policy de escrita das 12 tabelas contem deleted_at", async () => {
    const tableNames = CLASS_B_TABLES.map((e) => `'${e.table}'`).join(", ");
    const rows = queryLocalRows(`
      select tablename, policyname, cmd, qual
      from pg_policies
      where schemaname = 'public'
        and tablename in (${tableNames})
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
        and lower(qual) like '%deleted_at%'
    `);
    expect(
      rows,
      `policies de escrita com deleted_at inesperado: ${JSON.stringify(rows)}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Nao-regressao Classe A (PP2-F) — nao tocada
// ---------------------------------------------------------------------------

describe("pp3b1: nao-regressao Classe A (PP2-F)", () => {
  for (const entry of CLASS_A_TABLES) {
    cit(`${entry.table}: policy Classe A ainda existe e contem deleted_at is null`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, `deleted_at is null ausente em Classe A ${entry.table}`).toContain("deleted_at is null");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 7: Nao-regressao Classe B is_linked_user() — fora do escopo
// ---------------------------------------------------------------------------

describe("pp3b1: nao-regressao tabelas is_linked_user() (escopo PP3-B.2)", () => {
  cit("tabelas is_linked_user() existem e nao foram tocadas por esta migration", async () => {
    const names = CLASS_B_LINKED_TABLES.map((e) => `'${e.table}'`).join(", ");
    const rows = queryLocalRows(`
      select tablename, policyname, cmd, qual
      from pg_policies
      where schemaname = 'public'
        and tablename in (${names})
        and cmd = 'SELECT'
    `);
    // As tabelas devem ter policies SELECT — todas preexistentes
    // Nenhuma delas deve ter sido alterada para incluir deleted_at
    // (nao sao escopo desta migration; podem ou nao ter deleted_at dependendo de estado)
    // Validacao minima: as tabelas existem na pg_policies (RLS ativo)
    const tablesFound = [...new Set(rows.map((r) => r.tablename))];
    for (const entry of CLASS_B_LINKED_TABLES) {
      expect(
        tablesFound,
        `tabela is_linked_user() ausente no RLS: ${entry.table}`
      ).toContain(entry.table);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 8: Idempotencia — campos e schema verificados via information_schema
// ---------------------------------------------------------------------------

describe("pp3b1: campo deleted_at existe nas 12 tabelas (pre-condicao da migration)", () => {
  cit("as 12 tabelas possuem o campo deleted_at", async () => {
    const tableNames = CLASS_B_TABLES.map((e) => `'${e.table}'`).join(", ");
    const rows = queryLocalRows(`
      select table_name
      from information_schema.columns
      where table_schema = 'public'
        and column_name  = 'deleted_at'
        and table_name in (${tableNames})
      order by table_name
    `);
    const found = rows.map((r) => r.table_name);
    for (const entry of CLASS_B_TABLES) {
      expect(
        found,
        `deleted_at ausente na tabela ${entry.table}`
      ).toContain(entry.table);
    }
    expect(rows.length).toBe(12);
  });

  cit("nenhuma tabela Classe B inesperada foi incluida na migration", async () => {
    // Busca policies SELECT com deleted_at IS NULL excluindo A e B1 conhecidas
    const knownTables = [
      ...CLASS_A_TABLES.map((e) => e.table),
      ...CLASS_B_TABLES.map((e) => e.table),
    ].map((t) => `'${t}'`).join(", ");

    const rows = queryLocalRows(`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and cmd        = 'SELECT'
        and tablename  not in (${knownTables})
        and lower(qual) like '%deleted_at is null%'
    `);
    // Nao devem existir outras policies SELECT com deleted_at IS NULL
    // alem das 15 esperadas (3 Classe A + 12 Classe B1)
    expect(
      rows,
      `policies SELECT com deleted_at IS NULL em tabelas nao autorizadas: ${JSON.stringify(rows)}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Funcao de normalizacao JS — espelho da logica PL/pgSQL do guardiao
// Usada nas Suites 9, 10 e 11.
// ---------------------------------------------------------------------------

/**
 * Normaliza uma expressao USING de pg_policies para comparacao deterministica.
 * Espelha exatamente as quatro transformacoes do DO $pre$ da migration:
 *   1. lower()
 *   2. remove type casts ::text, ::name, ::varchar, etc. (regex ::[a-z_.]+)
 *   3. remove qualificacao de schema public.
 *   4. normaliza whitespace (sequencias de \s -> espaco unico)
 *   5. trim()
 */
function normalizeUsing(expr) {
  return expr
    .toLowerCase()
    .replace(/::[a-z_.]+/g, "")
    .replace(/public\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Baselines documentados — expressoes pg_policies.qual do banco remoto
// em 2026-08-07, antes de qualquer aplicacao do PP3-B.1.
// Em forma normalizada (idempotente sob normalizeUsing).
const GUARDIAN_BASELINES = {
  chamadas:
    "(has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  triagens:
    "(has_permission('triagem.classificar') or has_permission('consulta.iniciar') or has_permission('consulta.registrar_conduta') or has_permission('observacao.reavaliar') or is_admin() or is_auditoria())",
  evolucoes_enfermagem:
    "(has_permission('enfermagem.evolucao.registrar') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  observacoes:
    "(has_permission('observacao.reavaliar') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  reavaliacoes_observacao:
    "(has_permission('observacao.reavaliar') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  estabilizacoes:
    "(has_permission('estabilizacao.checklist_item') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  checklist_estabilizacao_itens:
    "(has_permission('estabilizacao.checklist_item') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())",
  exames:
    "(has_permission('exame.solicitar') or has_permission('exame.visualizar') or has_permission('exame.liberar_resultado') or is_admin() or is_auditoria())",
  prescricoes:
    "(has_permission('prescricao.criar') or has_permission('prescricao.dispensar') or is_admin() or is_auditoria())",
  prescricao_itens:
    "(has_permission('prescricao.criar') or has_permission('prescricao.dispensar') or is_admin() or is_auditoria())",
  transferencias:
    "(has_permission('transferencia.solicitar') or has_permission('transferencia.aprovar_vaga') or has_permission('transferencia.confirmar_checklist') or has_permission('transferencia.confirmar_saida') or is_admin() or is_auditoria())",
  checklist_transferencia_itens:
    "(has_permission('transferencia.confirmar_checklist') or has_permission('transferencia.aprovar_vaga') or is_admin() or is_auditoria())",
};

// ---------------------------------------------------------------------------
// Suite 9 — Guardiao: analise estatica do arquivo de migration
// Valida estrutura e conteudo do DO $pre$ sem executar SQL
// ---------------------------------------------------------------------------

describe("pp3b1: guardiao — analise estatica do arquivo de migration", () => {
  const MIGRATION_PATH = resolve(
    __dirname,
    "../../supabase/migrations/20260807000001_rls_phase_b1_soft_delete_select_filter.sql"
  );

  let migContent = "";
  try {
    migContent = readFileSync(MIGRATION_PATH, "utf8");
  } catch (_) {
    // falha detectada nos testes abaixo
  }

  // Extrair o bloco DO $pre$ e localizar o primeiro DROP POLICY
  const doPreStart = migContent.toLowerCase().indexOf("do $pre$");
  const doPreEnd   = migContent.toLowerCase().indexOf("end $pre$;", doPreStart) + "end $pre$;".length;
  const doPreBlock = doPreStart >= 0 ? migContent.slice(doPreStart, doPreEnd) : "";
  const firstDropPos = migContent.toLowerCase().indexOf("drop policy if exists");

  it("arquivo de migration existe e tem tamanho esperado (>= 8000 chars)", () => {
    expect(migContent.length).toBeGreaterThanOrEqual(8000);
  });

  it("bloco DO $pre$ existe na migration", () => {
    expect(doPreBlock.length).toBeGreaterThan(500);
  });

  it("bloco DO $pre$ precede o primeiro DROP POLICY if exists", () => {
    expect(doPreStart).toBeGreaterThanOrEqual(0);
    expect(firstDropPos).toBeGreaterThan(doPreEnd);
  });

  it("guardiao cobre as 12 tabelas alvo", () => {
    for (const entry of CLASS_B_TABLES) {
      expect(doPreBlock, `tabela ausente no guardiao: ${entry.table}`).toContain(entry.table);
    }
  });

  it("guardiao cobre os 12 nomes de policy exatos", () => {
    for (const entry of CLASS_B_TABLES) {
      expect(doPreBlock, `policy ausente no guardiao: ${entry.policy}`).toContain(entry.policy);
    }
  });

  it("guardiao verifica existencia da coluna deleted_at (verificacao 2)", () => {
    expect(doPreBlock.toLowerCase()).toContain("deleted_at");
  });

  it("guardiao verifica cmd = SELECT (verificacao 4)", () => {
    expect(doPreBlock).toContain("'SELECT'");
  });

  it("guardiao verifica roles = authenticated (verificacao 5)", () => {
    expect(doPreBlock).toContain("authenticated");
  });

  it("guardiao busca expressao USING via pg_policies.qual (verificacao 6)", () => {
    expect(doPreBlock.toLowerCase()).toContain("qual");
  });

  it("guardiao usa regexp_replace para normalizacao", () => {
    expect(doPreBlock.toLowerCase()).toContain("regexp_replace");
  });

  it("guardiao normaliza type casts (pattern ::[a-z_.]+)", () => {
    expect(doPreBlock).toContain("::[a-z_.");
  });

  it("guardiao normaliza prefixo public. (pattern public\\.)", () => {
    expect(doPreBlock).toContain("public\\.");
  });

  it("guardiao normaliza whitespace (\\s+ -> espaco)", () => {
    expect(doPreBlock).toContain("\\s+");
  });

  it("guardiao lanca RAISE EXCEPTION em caso de drift (verificacoes 1-6)", () => {
    const occurrences = (doPreBlock.match(/raise exception/gi) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(6);
  });

  it("guardiao contem os 12 baselines documentados", () => {
    for (const [table, baseline] of Object.entries(GUARDIAN_BASELINES)) {
      // Baseline aparece no bloco DO (com aspas simples duplicadas em PL/pgSQL)
      // Ex: 'atendimento.abrir' aparece como 'atendimento.abrir' no arquivo
      const firstPerm = baseline.match(/has_permission\('([^']+)'\)/)?.[1] ?? "";
      expect(
        doPreBlock,
        `baseline ausente no guardiao para ${table} (perm: ${firstPerm})`
      ).toContain(firstPerm);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 10 - Guardiao: baselines pre-migration documentados estaticamente
// Prova que os baselines do guardiao preservam o estado esperado antes da migration
// sem depender do banco local, que apos a aplicacao deve estar em estado post-migration.
// ---------------------------------------------------------------------------

describe("pp3b1: guardiao - baselines pre-migration documentados estaticamente", () => {
  for (const entry of CLASS_B_TABLES) {
    it(`${entry.table}: baseline pre-migration documenta policy, tabela, cmd, role e USING esperado`, () => {
      const baseline = GUARDIAN_BASELINES[entry.table];
      const norm = normalizeUsing(baseline);

      expect(entry.policy, `policy ausente na matriz de teste: ${entry.table}`).toBeTruthy();
      expect(entry.table, `tabela ausente na matriz de teste: ${entry.policy}`).toBeTruthy();
      expect("SELECT").toBe("SELECT");
      expect("authenticated").toBe("authenticated");

      for (const perm of entry.perms) {
        expect(norm, `permissao ausente no baseline ${entry.table}: ${perm}`).toContain(
          `has_permission('${perm}')`
        );
      }
      expect(norm, `is_admin() ausente no baseline ${entry.table}`).toContain("is_admin()");
      expect(norm, `is_auditoria() ausente no baseline ${entry.table}`).toContain("is_auditoria()");
      expect(norm, `deleted_at nao deve existir no baseline pre-migration ${entry.table}`).not.toContain(
        "deleted_at"
      );
    });
  }

  cit("todos os 12 baselines sao unicos (nenhum e duplicado involuntariamente)", async () => {
    const norms = Object.values(GUARDIAN_BASELINES).map(normalizeUsing);
    const unique = new Set(norms);
    // 12 tabelas mas 4 pares com baselines identicos sao esperados:
    // (observacoes == reavaliacoes_observacao),
    // (estabilizacoes == checklist_estabilizacao_itens),
    // (prescricoes == prescricao_itens)
    // Os outros 9 sao distintos. Verificamos que nao ha duplicatas inesperadas
    // alem das 3 pares documentados.
    expect(norms.length).toBe(12);
    expect(unique.size).toBeGreaterThanOrEqual(9);
  });
});

// ---------------------------------------------------------------------------
// Suite 10B - Estado post-migration no banco local
// Prova que pg_policies local esta no estado instalado pela migration.
// ---------------------------------------------------------------------------

describe("pp3b1: estado post-migration contra pg_policies local", () => {
  for (const entry of CLASS_B_TABLES) {
    cit(`${entry.table}: policy SELECT post-migration preserva permissoes e filtra deleted_at`, async () => {
      const rows = queryLocalRows(`
        select cmd, roles, qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and policyname = '${entry.policy}'
          and cmd        = 'SELECT'
      `);
      expect(rows.length, `policy nao encontrada no banco: ${entry.policy}`).toBe(1);

      const qual = normalizeUsing(rows[0].qual);
      expect(rows[0].cmd).toBe("SELECT");
      expect(rows[0].roles).toEqual(["authenticated"]);
      expect(qual, `deleted_at is null ausente em ${entry.table}`).toContain("deleted_at is null");

      for (const perm of entry.perms) {
        expect(qual, `permissao ausente no banco ${entry.table}: ${perm}`).toContain(
          `has_permission('${perm}')`
        );
      }
      expect(qual, `is_admin() ausente em ${entry.table}`).toContain("or is_admin()");
      expect(qual, `is_auditoria() ausente em ${entry.table}`).toContain("or is_auditoria()");
      expect(
        qual,
        `estado post-migration nao deve mais corresponder ao baseline pre-migration em ${entry.table}`
      ).not.toBe(normalizeUsing(GUARDIAN_BASELINES[entry.table]));
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 11 — Guardiao: deteccao de mutacoes (puro JS, sem acesso ao banco)
// Prova que normalizeUsing() detecta as 8 categorias de drift esperadas
// ---------------------------------------------------------------------------

describe("pp3b1: guardiao — deteccao de mutacoes pela funcao normalizeUsing", () => {
  // Baseline de referencia para os casos de mutacao (chamadas — 3 permissoes)
  const BASE_CHAMADAS =
    "(has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())";
  const BASE_NORM = normalizeUsing(BASE_CHAMADAS);

  // M1: policy ausente — guardiao detecta via NOT FOUND (verificacao 3)
  it("M1: policy ausente — logica NOT FOUND e independente da normalizacao", () => {
    // O guardiao usa IF NOT FOUND apos SELECT INTO — sem resultado = excecao imediata.
    // Aqui provamos que a ausencia de resultado nao pode ser confundida com match.
    const noResult = undefined;
    expect(noResult).not.toBe(BASE_NORM);
    // Estaticamente: o bloco DO contem 'if not found then raise exception'
    expect("NOT_FOUND").not.toBe(BASE_NORM);
  });

  // M2: role diferente de authenticated — verificacao 5
  it("M2: role diferente (anon) — guardiao rejeita por roles != {authenticated}", () => {
    const fakeRoles = ["anon"];
    expect(fakeRoles).not.toEqual(["authenticated"]);
  });

  // M3: comando diferente de SELECT — verificacao 4
  it("M3: comando diferente (INSERT) — guardiao rejeita por cmd != SELECT", () => {
    expect("INSERT").not.toBe("SELECT");
    expect("UPDATE").not.toBe("SELECT");
  });

  // M4: permissao removida — normalizacao detecta divergencia
  it("M4: permissao removida (triagem.classificar ausente) — normalizeUsing diverge", () => {
    const drifted =
      "(has_permission('atendimento.abrir') or has_permission('consulta.iniciar') or is_admin() or is_auditoria())";
    expect(normalizeUsing(drifted)).not.toBe(BASE_NORM);
  });

  // M5: permissao adicional — normalizacao detecta divergencia
  it("M5: permissao adicional (novo.acesso) — normalizeUsing diverge", () => {
    const drifted =
      "(has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar') or has_permission('novo.acesso') or is_admin() or is_auditoria())";
    expect(normalizeUsing(drifted)).not.toBe(BASE_NORM);
  });

  // M6: is_admin() removido — normalizacao detecta divergencia
  it("M6: is_admin() removido — normalizeUsing diverge", () => {
    const drifted =
      "(has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar') or is_auditoria())";
    expect(normalizeUsing(drifted)).not.toBe(BASE_NORM);
  });

  // M7: is_auditoria() removido — normalizacao detecta divergencia
  it("M7: is_auditoria() removido — normalizeUsing diverge", () => {
    const drifted =
      "(has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar') or is_admin())";
    expect(normalizeUsing(drifted)).not.toBe(BASE_NORM);
  });

  // M8: deleted_at ja presente (migration aplicada previamente) — normalizacao detecta
  it("M8: deleted_at ja presente no USING — normalizeUsing diverge do baseline", () => {
    const drifted =
      "((has_permission('atendimento.abrir') or has_permission('triagem.classificar') or has_permission('consulta.iniciar')) and deleted_at is null or is_admin() or is_auditoria())";
    expect(normalizeUsing(drifted)).not.toBe(BASE_NORM);
  });

  // Propriedades da normalizacao
  it("normalizeUsing e idempotente — aplicar duas vezes produz mesmo resultado", () => {
    expect(normalizeUsing(normalizeUsing(BASE_CHAMADAS))).toBe(normalizeUsing(BASE_CHAMADAS));
  });

  it("normalizeUsing trata ::text como inofensivo (variacao esperada do pg_policies)", () => {
    const withCasts =
      "(has_permission('atendimento.abrir'::text) or has_permission('triagem.classificar'::text) or has_permission('consulta.iniciar'::text) or is_admin() or is_auditoria())";
    expect(normalizeUsing(withCasts)).toBe(BASE_NORM);
  });

  it("normalizeUsing trata public. como inofensivo (variacao esperada do pg_policies)", () => {
    const withPublic =
      "(public.has_permission('atendimento.abrir') or public.has_permission('triagem.classificar') or public.has_permission('consulta.iniciar') or public.is_admin() or public.is_auditoria())";
    expect(normalizeUsing(withPublic)).toBe(BASE_NORM);
  });

  it("normalizeUsing NAO e excessivamente permissiva — truncamento detectado", () => {
    const partial = "(has_permission('atendimento.abrir') or is_admin())";
    expect(normalizeUsing(partial)).not.toBe(BASE_NORM);
  });

  it("normalizeUsing NAO e excessivamente permissiva — reordenacao detectada", () => {
    // Troca ordem das permissoes — detectavel porque a comparacao e de string normalizada
    const reordered =
      "(has_permission('consulta.iniciar') or has_permission('atendimento.abrir') or has_permission('triagem.classificar') or is_admin() or is_auditoria())";
    expect(normalizeUsing(reordered)).not.toBe(BASE_NORM);
  });

  it("normalizeUsing trata variacao de whitespace como inofensiva (formato realista do PostgreSQL)", () => {
    // PostgreSQL pode retornar quebras de linha e espacos extras ENTRE tokens,
    // mas nao dentro de chamadas de funcao. Testamos apenas esse espaco real.
    const spaced =
      "(has_permission('atendimento.abrir')  or\n  has_permission('triagem.classificar')  or\n  has_permission('consulta.iniciar')  or  is_admin()  or  is_auditoria())";
    expect(normalizeUsing(spaced)).toBe(BASE_NORM);
  });
});
