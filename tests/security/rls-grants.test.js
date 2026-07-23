import { describe, expect, it } from "vitest";
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
  querySqlFile,
} from "../helpers/local-supabase.js";

const operationalTables = [
  "pacientes",
  "atendimentos",
  "triagens",
  "consultas",
  "transferencias",
  "audit_log",
  "estoque_movimentacoes",
  "prescricoes",
];
const domainTables = [
  "dom_status_atendimento",
  "dom_desfechos",
  "dom_classificacao_risco",
  "dom_status_transferencia",
  "dom_status_prescricao",
  "dom_status_exame",
];

describe("security rls inventory", () => {
  it("recusa status Supabase nao-local", () => {
    expect(() =>
      assertLocalOnlyStatus({
        API_URL: "https://example.supabase.co",
        DB_URL: "postgresql://postgres:x@example.supabase.co/postgres",
      })
    ).toThrow("Recusado");
  });

  it("confirma Supabase local em localhost ou 127.0.0.1", () => {
    expect(assertLocalOnlyStatus(loadLocalSupabaseStatus())).toBe(true);
  });

  it("inventaria tabelas public", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    expect(rows.length).toBeGreaterThanOrEqual(30);
  });

  it("todas as tabelas public mantem RLS habilitado", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    expect(rows.filter((row) => row.relrowsecurity !== true)).toEqual([]);
  });

  it("lista relforcerowsecurity sem exigir FORCE RLS", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    expect(rows.every((row) => Object.hasOwn(row, "relforcerowsecurity"))).toBe(true);
  });

  it("nenhuma tabela operacional critica perdeu RLS", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    for (const table of operationalTables) {
      expect(rows.find((row) => row.tablename === table)?.relrowsecurity).toBe(true);
    }
  });

  it("tabelas de dominio sao inventariadas com RLS", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    for (const table of domainTables) {
      expect(rows.find((row) => row.tablename === table)?.relrowsecurity).toBe(true);
    }
  });

  it("audit_log mantem RLS habilitado", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    expect(rows.find((row) => row.tablename === "audit_log")?.relrowsecurity).toBe(true);
  });
});

describe("security dangerous grants", () => {
  it("nao ha grants perigosos para anon/authenticated", () => {
    expect(querySqlFile("assert-dangerous-grants-absent.sql")).toEqual([]);
  });

  it("anon nao possui TRUNCATE", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type='TRUNCATE'"
    );
    expect(rows).toEqual([]);
  });

  it("anon nao possui TRIGGER", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type='TRIGGER'"
    );
    expect(rows).toEqual([]);
  });

  it("anon nao possui REFERENCES", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type='REFERENCES'"
    );
    expect(rows).toEqual([]);
  });

  it("anon nao possui DELETE", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type='DELETE'"
    );
    expect(rows).toEqual([]);
  });

  it("authenticated nao possui TRUNCATE", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type='TRUNCATE'"
    );
    expect(rows).toEqual([]);
  });

  it("authenticated nao possui TRIGGER ou REFERENCES", () => {
    const rows = queryLocalRows(
      "select table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type in ('TRIGGER','REFERENCES')"
    );
    expect(rows).toEqual([]);
  });

  it("authenticated nao possui DELETE direto", () => {
    const rows = queryLocalRows(
      "select table_name from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type='DELETE'"
    );
    expect(rows).toEqual([]);
  });

  it("SELECT authenticated permanece nas tabelas dom_*", () => {
    const rows = querySqlFile("assert-domain-select-preserved.sql");
    for (const table of domainTables) {
      expect(rows.find((row) => row.table_name === table)?.privilege_type).toBe("SELECT");
    }
  });
});
