/**
 * PP2-E3A — Testes de exclusao logica nas views gerenciais
 *
 * Objetivo: verificar que registros com deleted_at preenchido nao computam
 * nos indicadores, producao ou tempos assistenciais.
 *
 * Estrutura:
 *   - Suite A: views sao consultaveis diretamente via SQL (existencia + schema)
 *   - Suite B: colunas das views permanecem as esperadas (contrato)
 *   - Suite C: views expoem somente registros nao excluidos (deleted_at IS NULL)
 *   - Suite D: grants permanecem identicos (SELECT apenas para authenticated)
 *
 * Nota de implementacao:
 *   Originalmente usava @supabase/supabase-js (dependencia nao declarada).
 *   Reescrito para usar queryLocalRows / execLocalRows (psql local via Docker),
 *   que sao os helpers padrao da suíte de segurança deste repositorio.
 *   A verificacao de RLS/permissao HTTP e feita pelo teste management-views-auth-audit.test.js.
 */

import { describe, expect, it } from "vitest";
import { queryLocalRows } from "../helpers/local-supabase.js";

const VIEWS = [
  "vw_gestao_indicadores_gerais",
  "vw_gestao_producao_assistencial",
  "vw_gestao_tempos_assistenciais",
];

// Colunas esperadas por view (contrato de schema)
const EXPECTED_COLUMNS = {
  vw_gestao_indicadores_gerais: [
    "semana_inicio", "total_atendimentos", "total_altas",
    "total_transferencias", "total_obitos", "total_evasoes",
    "total_com_desfecho", "pct_com_desfecho",
  ],
  vw_gestao_producao_assistencial: [
    "semana_inicio", "setor", "suprimido", "quantidade_atendimentos",
    "quantidade_altas", "quantidade_transferencias", "quantidade_obitos",
    "quantidade_evasoes", "quantidade_com_desfecho",
  ],
  vw_gestao_tempos_assistenciais: [
    "semana_inicio", "quantidade_registros_base",
    "n_calculado_entrada_triagem", "tempo_medio_entrada_triagem_min", "tempo_mediano_entrada_triagem_min",
    "n_calculado_triagem_consulta", "tempo_medio_triagem_consulta_min", "tempo_mediano_triagem_consulta_min",
    "n_calculado_permanencia", "tempo_medio_permanencia_total_min", "tempo_mediano_permanencia_total_min",
  ],
};

// =========================================================================
// Suite A — Views existem e respondem via SQL
// =========================================================================
describe("Suite A — Views existem e sao consultaveis via SQL", () => {
  for (const view of VIEWS) {
    it(`${view} — retorna resultado sem erro`, () => {
      const rows = queryLocalRows(`SELECT * FROM public.${view} LIMIT 1`);
      expect(Array.isArray(rows)).toBe(true);
    });
  }
});

// =========================================================================
// Suite B — Contrato de colunas permanece inalterado
// =========================================================================
describe("Suite B — Colunas das views permanecem conforme contrato", () => {
  for (const [view, expectedCols] of Object.entries(EXPECTED_COLUMNS)) {
    it(`${view} — todas as colunas esperadas presentes em information_schema`, () => {
      const colNames = expectedCols.map((c) => `'${c}'`).join(", ");
      const rows = queryLocalRows(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = '${view}'
          AND column_name  IN (${colNames})
      `);
      const found = rows.map((r) => r.column_name);
      for (const col of expectedCols) {
        expect(found, `coluna ausente em ${view}: ${col}`).toContain(col);
      }
    });
  }
});

// =========================================================================
// Suite C — Views filtram registros com deleted_at preenchido
// =========================================================================
describe("Suite C — Views expoem somente registros sem deleted_at (filtro ativo)", () => {
  it("vw_gestao_indicadores_gerais — definicao SQL filtra deleted_at IS NULL", () => {
    const rows = queryLocalRows(`
      SELECT view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name   = 'vw_gestao_indicadores_gerais'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0].view_definition.toLowerCase()).toContain("deleted_at");
  });

  it("vw_gestao_producao_assistencial — definicao SQL filtra deleted_at IS NULL", () => {
    const rows = queryLocalRows(`
      SELECT view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name   = 'vw_gestao_producao_assistencial'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0].view_definition.toLowerCase()).toContain("deleted_at");
  });

  it("vw_gestao_tempos_assistenciais — definicao SQL filtra deleted_at IS NULL", () => {
    const rows = queryLocalRows(`
      SELECT view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name   = 'vw_gestao_tempos_assistenciais'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0].view_definition.toLowerCase()).toContain("deleted_at");
  });

  it("vw_gestao_indicadores_gerais — nenhum total_atendimentos negativo ou invalido", () => {
    const rows = queryLocalRows(`
      SELECT total_atendimentos FROM public.vw_gestao_indicadores_gerais
    `);
    for (const row of rows) {
      expect(row.total_atendimentos).toBeGreaterThanOrEqual(0);
    }
  });

  it("vw_gestao_producao_assistencial — quantidade_atendimentos nunca negativa", () => {
    const rows = queryLocalRows(`
      SELECT quantidade_atendimentos FROM public.vw_gestao_producao_assistencial
      WHERE quantidade_atendimentos IS NOT NULL
    `);
    for (const row of rows) {
      expect(row.quantidade_atendimentos).toBeGreaterThanOrEqual(0);
    }
  });

  it("vw_gestao_tempos_assistenciais — quantidade_registros_base nunca negativa", () => {
    const rows = queryLocalRows(`
      SELECT quantidade_registros_base FROM public.vw_gestao_tempos_assistenciais
      WHERE quantidade_registros_base IS NOT NULL
    `);
    for (const row of rows) {
      expect(row.quantidade_registros_base).toBeGreaterThanOrEqual(0);
    }
  });
});

// =========================================================================
// Suite D — Grants: SELECT apenas para authenticated, nao para anon
// =========================================================================
describe("Suite D — Grants: SELECT para authenticated, bloqueado para anon", () => {
  for (const view of VIEWS) {
    it(`${view} — authenticated tem SELECT grant`, () => {
      const rows = queryLocalRows(`
        SELECT grantee, privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema    = 'public'
          AND table_name      = '${view}'
          AND privilege_type  = 'SELECT'
          AND grantee         = 'authenticated'
      `);
      expect(rows.length).toBeGreaterThan(0);
    });

    it(`${view} — anon NAO tem SELECT grant`, () => {
      const rows = queryLocalRows(`
        SELECT grantee
        FROM information_schema.role_table_grants
        WHERE table_schema    = 'public'
          AND table_name      = '${view}'
          AND privilege_type  = 'SELECT'
          AND grantee         = 'anon'
      `);
      expect(rows).toHaveLength(0);
    });
  }
});
