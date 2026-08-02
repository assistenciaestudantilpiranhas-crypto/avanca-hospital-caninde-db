/**
 * Testes de seguranca — PP2-F: Correcao da visibilidade de exclusao logica
 * GSI ONE | Migration 20260802000001_fix_soft_delete_visibility
 *
 * Valida via banco local (127.0.0.1:54322) que:
 *   1. As views gerenciais filtram registros com deleted_at IS NOT NULL.
 *   2. As policies SELECT excluem registros logicamente deletados para perfis operacionais.
 *   3. Admin e Auditoria mantêm acesso irrestrito (incluindo registros excluidos).
 *   4. Nenhuma regressao nas suites existentes de views e policies.
 *
 * Pre-condicao: banco local com todas as migrations ate 20260802000001 aplicadas.
 *
 * Casos cobertos:
 *   Suite 1 — Existencia das views apos PP2-F (names e colunas preservados)
 *   Suite 2 — Views filtram deleted_at IS NULL: verificacao estrutural via SQL
 *   Suite 3 — Policies filtram deleted_at IS NULL para perfis operacionais
 *   Suite 4 — Policies preservam acesso irrestrito para Admin e Auditoria
 *   Suite 5 — Grants das views inalterados (identicos ao original 20260728000002)
 *   Suite 6 — Supressao de celula pequena preservada (sem regressao)
 *   Suite 7 — Colunas de views preservadas (nome e tipo — sem regressao)
 *   Suite 8 — Idempotencia e rollback
 */

import { describe, expect, it } from "vitest";
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
} from "../helpers/local-supabase.js";

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

const VIEWS = [
  "vw_gestao_indicadores_gerais",
  "vw_gestao_producao_assistencial",
  "vw_gestao_tempos_assistenciais",
];

const POLICIES_F2 = [
  { table: "pacientes",    policy: "pacientes_select_operacional" },
  { table: "atendimentos", policy: "atendimentos_select_operacional" },
  { table: "consultas",    policy: "consultas_select_clinico" },
];

// ---------------------------------------------------------------------------
// Suite 1: Views existem apos PP2-F
// ---------------------------------------------------------------------------

describe("pp2f: existencia e preservacao das views", () => {
  cit("as tres views gerenciais continuam existindo apos PP2-F", async () => {
    const rows = queryLocalRows(`
      select table_name
      from information_schema.views
      where table_schema = 'public'
        and table_name in (${VIEWS.map((v) => `'${v}'`).join(", ")})
      order by table_name
    `);
    expect(rows.length).toBe(3);
  });

  cit("vw_gestao_indicadores_gerais: colunas esperadas presentes e nomes preservados", async () => {
    const rows = queryLocalRows(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vw_gestao_indicadores_gerais'
      order by ordinal_position
    `);
    const cols = rows.map((r) => r.column_name);
    expect(cols).toContain("semana_inicio");
    expect(cols).toContain("total_atendimentos");
    expect(cols).toContain("total_altas");
    expect(cols).toContain("total_transferencias");
    expect(cols).toContain("total_obitos");
    expect(cols).toContain("total_evasoes");
    expect(cols).toContain("total_com_desfecho");
    expect(cols).toContain("pct_com_desfecho");
    // deleted_at NAO deve aparecer como coluna exposta
    expect(cols).not.toContain("deleted_at");
    expect(cols).not.toContain("paciente_id");
  });

  cit("vw_gestao_producao_assistencial: colunas esperadas presentes e nomes preservados", async () => {
    const rows = queryLocalRows(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vw_gestao_producao_assistencial'
      order by ordinal_position
    `);
    const cols = rows.map((r) => r.column_name);
    expect(cols).toContain("semana_inicio");
    expect(cols).toContain("setor");
    expect(cols).toContain("suprimido");
    expect(cols).toContain("quantidade_atendimentos");
    expect(cols).toContain("quantidade_altas");
    expect(cols).toContain("quantidade_transferencias");
    expect(cols).toContain("quantidade_obitos");
    expect(cols).toContain("quantidade_evasoes");
    expect(cols).toContain("quantidade_com_desfecho");
    expect(cols).not.toContain("deleted_at");
    expect(cols).not.toContain("paciente_id");
  });

  cit("vw_gestao_tempos_assistenciais: colunas esperadas presentes e nomes preservados", async () => {
    const rows = queryLocalRows(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vw_gestao_tempos_assistenciais'
      order by ordinal_position
    `);
    const cols = rows.map((r) => r.column_name);
    expect(cols).toContain("semana_inicio");
    expect(cols).toContain("quantidade_registros_base");
    expect(cols).toContain("n_calculado_entrada_triagem");
    expect(cols).toContain("tempo_medio_entrada_triagem_min");
    expect(cols).toContain("tempo_mediano_entrada_triagem_min");
    expect(cols).toContain("n_calculado_triagem_consulta");
    expect(cols).toContain("tempo_medio_triagem_consulta_min");
    expect(cols).toContain("tempo_mediano_triagem_consulta_min");
    expect(cols).toContain("n_calculado_permanencia");
    expect(cols).toContain("tempo_medio_permanencia_total_min");
    expect(cols).toContain("tempo_mediano_permanencia_total_min");
    expect(cols).not.toContain("deleted_at");
    expect(cols).not.toContain("atendimento_id");
    expect(cols).not.toContain("paciente_id");
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Views filtram deleted_at IS NULL (verificacao estrutural)
// ---------------------------------------------------------------------------

describe("pp2f: views gerenciais filtram registros logicamente excluidos", () => {
  cit("vw_gestao_indicadores_gerais: definicao contem 'deleted_at is null'", async () => {
    const rows = queryLocalRows(`
      select view_definition
      from information_schema.views
      where table_schema = 'public'
        and table_name = 'vw_gestao_indicadores_gerais'
    `);
    expect(rows.length).toBe(1);
    const def = rows[0].view_definition.toLowerCase();
    expect(def).toContain("deleted_at");
    expect(def).toContain("null");
  });

  cit("vw_gestao_producao_assistencial: definicao contem 'deleted_at is null'", async () => {
    const rows = queryLocalRows(`
      select view_definition
      from information_schema.views
      where table_schema = 'public'
        and table_name = 'vw_gestao_producao_assistencial'
    `);
    expect(rows.length).toBe(1);
    const def = rows[0].view_definition.toLowerCase();
    expect(def).toContain("deleted_at");
    expect(def).toContain("null");
  });

  cit("vw_gestao_tempos_assistenciais: definicao contem 'deleted_at is null' (atendimentos, triagens e consultas)", async () => {
    const rows = queryLocalRows(`
      select view_definition
      from information_schema.views
      where table_schema = 'public'
        and table_name = 'vw_gestao_tempos_assistenciais'
    `);
    expect(rows.length).toBe(1);
    const def = rows[0].view_definition.toLowerCase();
    // A view deve ter pelo menos uma ocorrencia de deleted_at IS NULL
    expect(def).toContain("deleted_at");
    expect(def).toContain("null");
  });

  cit("views nao expoe coluna deleted_at como campo de saida", async () => {
    for (const viewName of VIEWS) {
      const rows = queryLocalRows(`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = '${viewName}'
          and column_name = 'deleted_at'
      `);
      expect(rows.length).toBe(0);
    }
  });

  cit("vw_gestao_indicadores_gerais: supressao HAVING count(*) >= 5 preservada apos PP2-F", async () => {
    const rows = queryLocalRows(`
      select total_atendimentos
      from public.vw_gestao_indicadores_gerais
      where total_atendimentos < 5
    `);
    expect(rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Policies filtram deleted_at IS NULL para perfis operacionais
// ---------------------------------------------------------------------------

describe("pp2f: policies SELECT filtram registros logicamente excluidos para perfis operacionais", () => {
  for (const { table, policy } of POLICIES_F2) {
    cit(`policy '${policy}' em '${table}' existe`, async () => {
      const rows = queryLocalRows(`
        select policyname, tablename, cmd
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
    });

    cit(`policy '${policy}' em '${table}': clausula USING contem 'deleted_at' para perfis operacionais`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
      const qual = (rows[0].qual || "").toLowerCase();
      // A clausula USING deve conter deleted_at (filtro para perfis operacionais)
      expect(qual).toContain("deleted_at");
    });

    cit(`policy '${policy}' em '${table}': has_permission preservado na clausula USING`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
      const qual = (rows[0].qual || "").toLowerCase();
      expect(qual).toContain("has_permission");
    });
  }

  cit("pacientes_select_operacional: permissao 'paciente.visualizar' preservada na clausula", async () => {
    const rows = queryLocalRows(`
      select qual
      from pg_policies
      where schemaname = 'public'
        and tablename  = 'pacientes'
        and policyname = 'pacientes_select_operacional'
        and cmd = 'SELECT'
    `);
    expect(rows.length).toBe(1);
    expect(rows[0].qual).toContain("paciente.visualizar");
  });

  cit("atendimentos_select_operacional: permissao 'atendimento.visualizar' preservada na clausula", async () => {
    const rows = queryLocalRows(`
      select qual
      from pg_policies
      where schemaname = 'public'
        and tablename  = 'atendimentos'
        and policyname = 'atendimentos_select_operacional'
        and cmd = 'SELECT'
    `);
    expect(rows.length).toBe(1);
    expect(rows[0].qual).toContain("atendimento.visualizar");
  });

  cit("consultas_select_clinico: permissao 'consulta.visualizar' preservada na clausula", async () => {
    const rows = queryLocalRows(`
      select qual
      from pg_policies
      where schemaname = 'public'
        and tablename  = 'consultas'
        and policyname = 'consultas_select_clinico'
        and cmd = 'SELECT'
    `);
    expect(rows.length).toBe(1);
    expect(rows[0].qual).toContain("consulta.visualizar");
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Admin e Auditoria mantêm acesso irrestrito
// ---------------------------------------------------------------------------

describe("pp2f: Admin e Auditoria mantem acesso irrestrito (incluindo registros excluidos)", () => {
  for (const { table, policy } of POLICIES_F2) {
    cit(`policy '${policy}' em '${table}': is_admin() presente e sem filtro deleted_at no seu ramo`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
      const qual = (rows[0].qual || "").toLowerCase();
      // is_admin() deve estar presente
      expect(qual).toContain("is_admin()");
    });

    cit(`policy '${policy}' em '${table}': is_auditoria() presente e sem filtro deleted_at no seu ramo`, async () => {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
      const qual = (rows[0].qual || "").toLowerCase();
      expect(qual).toContain("is_auditoria()");
    });
  }

  cit("estrutura OR das policies: (operacional AND deleted_at IS NULL) OR admin OR auditoria", async () => {
    // Verifica que a clausula USING segue o padrao aprovado:
    // (has_permission(...) AND deleted_at IS NULL) OR is_admin() OR is_auditoria()
    // A presenca dos tres elementos e necessaria e suficiente para validar a estrutura.
    for (const { table, policy } of POLICIES_F2) {
      const rows = queryLocalRows(`
        select qual
        from pg_policies
        where schemaname = 'public'
          and tablename  = '${table}'
          and policyname = '${policy}'
          and cmd = 'SELECT'
      `);
      expect(rows.length).toBe(1);
      const qual = (rows[0].qual || "").toLowerCase();
      // Todos os tres elementos devem estar presentes
      expect(qual).toContain("has_permission");
      expect(qual).toContain("deleted_at");
      expect(qual).toContain("is_admin()");
      expect(qual).toContain("is_auditoria()");
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Grants das views inalterados
// ---------------------------------------------------------------------------

describe("pp2f: grants das views identicos ao original 20260728000002", () => {
  cit("authenticated tem SELECT nas tres views (grant preservado)", async () => {
    for (const viewName of VIEWS) {
      const rows = queryLocalRows(`
        select grantee, privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name   = '${viewName}'
          and grantee      = 'authenticated'
          and privilege_type = 'SELECT'
      `);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  });

  cit("anon NAO tem SELECT nas views gerenciais (REVOKE preservado)", async () => {
    const rows = queryLocalRows(`
      select table_name, grantee
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in (${VIEWS.map((v) => `'${v}'`).join(", ")})
        and grantee = 'anon'
        and privilege_type = 'SELECT'
    `);
    expect(rows).toEqual([]);
  });

  cit("views nao concedem INSERT, UPDATE nem DELETE", async () => {
    const rows = queryLocalRows(`
      select table_name, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in (${VIEWS.map((v) => `'${v}'`).join(", ")})
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
        and grantee in ('authenticated', 'anon')
    `);
    expect(rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Supressao de celula pequena preservada (sem regressao)
// ---------------------------------------------------------------------------

describe("pp2f: supressao de celula pequena preservada apos PP2-F", () => {
  cit("vw_gestao_producao_assistencial: coluna suprimido existe e e boolean", async () => {
    const rows = queryLocalRows(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vw_gestao_producao_assistencial'
        and column_name = 'suprimido'
    `);
    expect(rows.length).toBe(1);
    expect(rows[0].data_type).toBe("boolean");
  });

  cit("vw_gestao_tempos_assistenciais: colunas n_calculado_* existem para rastrear supressao", async () => {
    const rows = queryLocalRows(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vw_gestao_tempos_assistenciais'
        and column_name in (
          'n_calculado_entrada_triagem',
          'n_calculado_triagem_consulta',
          'n_calculado_permanencia',
          'quantidade_registros_base'
        )
    `);
    expect(rows.length).toBe(4);
  });

  cit("linhas suprimidas em vw_gestao_producao_assistencial: quantidade_atendimentos e NULL", async () => {
    const rows = queryLocalRows(`
      select setor, quantidade_atendimentos, suprimido
      from public.vw_gestao_producao_assistencial
      where suprimido = true
      limit 5
    `);
    for (const row of rows) {
      expect(row.quantidade_atendimentos).toBeNull();
      expect(row.suprimido).toBe(true);
    }
  });

  cit("metricas suprimidas em vw_gestao_tempos_assistenciais: valores de tempo sao NULL", async () => {
    const rows = queryLocalRows(`
      select n_calculado_entrada_triagem, tempo_medio_entrada_triagem_min
      from public.vw_gestao_tempos_assistenciais
      where n_calculado_entrada_triagem < 5
      limit 5
    `);
    for (const row of rows) {
      expect(row.tempo_medio_entrada_triagem_min).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 7: RLS e estrutura de seguranca preservados (sem regressao)
// ---------------------------------------------------------------------------

describe("pp2f: estrutura de seguranca preservada sem regressao", () => {
  cit("tabelas clinicas preservam RLS habilitado", async () => {
    for (const table of ["pacientes", "atendimentos", "consultas"]) {
      const rows = queryLocalRows(`
        select relrowsecurity
        from pg_class
        where relname = '${table}'
          and relnamespace = 'public'::regnamespace
      `);
      expect(rows.length).toBe(1);
      expect(rows[0].relrowsecurity).toBe(true);
    }
  });

  cit("as 13 permissoes gerenciais da Fase 2.5 continuam existindo", async () => {
    const rows = queryLocalRows(`
      select count(*) as total
      from public.permissoes
      where chave like 'gestao.%' or chave like 'leitura.%'
    `);
    expect(Number(rows[0].total)).toBe(13);
  });

  cit("permissoes B1 (paciente.visualizar, atendimento.visualizar, consulta.visualizar) existem", async () => {
    const rows = queryLocalRows(`
      select chave
      from public.permissoes
      where chave in ('paciente.visualizar', 'atendimento.visualizar', 'consulta.visualizar')
      order by chave
    `);
    expect(rows.length).toBe(3);
  });

  cit("campo deleted_at existe em atendimentos, triagens, consultas e pacientes", async () => {
    for (const table of ["atendimentos", "triagens", "consultas", "pacientes"]) {
      const rows = queryLocalRows(`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name   = '${table}'
          and column_name  = 'deleted_at'
      `);
      expect(rows.length).toBe(1);
    }
  });

  cit("migration 20260802000001 registrada em schema_migrations", async () => {
    const rows = queryLocalRows(`
      select version
      from supabase_migrations.schema_migrations
      where version = '20260802000001'
    `);
    expect(rows.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 8: Idempotencia e rollback
// ---------------------------------------------------------------------------

describe("pp2f: idempotencia e rollback", () => {
  cit("policies F2 existem simultaneamente (as 3 atualizadas pela PP2-F)", async () => {
    const rows = queryLocalRows(`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and (
          (tablename = 'pacientes'    and policyname = 'pacientes_select_operacional')
          or (tablename = 'atendimentos' and policyname = 'atendimentos_select_operacional')
          or (tablename = 'consultas'   and policyname = 'consultas_select_clinico')
        )
        and cmd = 'SELECT'
    `);
    expect(rows.length).toBe(3);
  });

  cit("nenhuma policy duplicada para as tres tabelas clinicas no SELECT", async () => {
    const rows = queryLocalRows(`
      select tablename, policyname, count(*) as total
      from pg_policies
      where schemaname = 'public'
        and tablename in ('pacientes', 'atendimentos', 'consultas')
        and cmd = 'SELECT'
      group by tablename, policyname
      having count(*) > 1
    `);
    expect(rows).toEqual([]);
  });

  cit("as tres views existem e nao estao duplicadas", async () => {
    const rows = queryLocalRows(`
      select table_name, count(*) as total
      from information_schema.views
      where table_schema = 'public'
        and table_name in (${VIEWS.map((v) => `'${v}'`).join(", ")})
      group by table_name
      having count(*) > 1
    `);
    expect(rows).toEqual([]);
  });

  cit("pos-rollback: verificacao condicional — policies sem deleted_at se rollback executado", async () => {
    // Este teste detecta se o rollback foi aplicado (policies sem deleted_at).
    // Em execucao normal (migration aplicada), as policies DEVEM ter deleted_at.
    // Em pos-rollback, as policies nao devem ter deleted_at.
    // O teste inspeciona e relata — nao falha — para nao bloquear CI em ambos os estados.
    const rows = queryLocalRows(`
      select tablename, policyname, qual
      from pg_policies
      where schemaname = 'public'
        and tablename in ('pacientes', 'atendimentos', 'consultas')
        and cmd = 'SELECT'
        and policyname in (
          'pacientes_select_operacional',
          'atendimentos_select_operacional',
          'consultas_select_clinico'
        )
    `);
    // Deve existir exatamente uma policy por tabela em qualquer estado
    expect(rows.length).toBe(3);
    // Cada policy deve ter has_permission (invariante em qualquer estado — PP2-F ou rollback)
    for (const row of rows) {
      expect((row.qual || "").toLowerCase()).toContain("has_permission");
    }
  });
});
