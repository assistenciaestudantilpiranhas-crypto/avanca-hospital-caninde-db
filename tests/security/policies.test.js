import { describe, expect, it } from "vitest";
import { expectedRolePolicies, securityUsers } from "../fixtures/security-users.js";
import { queryLocalRows, querySqlFile } from "../helpers/local-supabase.js";

const clinicalTables = [
  "pacientes",
  "atendimentos",
  "triagens",
  "consultas",
  "observacoes",
  "transferencias",
];

function policies() {
  return querySqlFile("assert-policies.sql");
}

describe("security policies inventory", () => {
  it("inventaria policies public", () => {
    expect(policies().length).toBeGreaterThan(40);
  });

  it("tabelas clinicas possuem policy SELECT", () => {
    const rows = policies();
    for (const table of clinicalTables) {
      expect(rows.some((row) => row.tablename === table && row.cmd === "SELECT")).toBe(true);
    }
  });

  it("nao ha tabela clinica sem policy aplicavel", () => {
    const rows = policies();
    for (const table of clinicalTables) {
      expect(rows.filter((row) => row.tablename === table).length).toBeGreaterThan(0);
    }
  });

  it("policies administrativas usam is_admin", () => {
    const adminRows = policies().filter((row) => /admin/i.test(row.policyname));
    expect(adminRows.length).toBeGreaterThan(0);
    expect(
      adminRows.every((row) => `${row.qual || ""} ${row.with_check || ""}`.includes("is_admin()"))
    ).toBe(true);
  });

  it("policies de escrita nao sao concedidas a anon", () => {
    const writeRows = policies().filter((row) =>
      ["INSERT", "UPDATE", "DELETE", "ALL"].includes(row.cmd)
    );
    expect(writeRows.filter((row) => String(row.roles).includes("anon"))).toEqual([]);
  });

  it("comandos ALL sao inventariados", () => {
    const allRows = policies().filter((row) => row.cmd === "ALL");
    expect(allRows.length).toBeGreaterThan(0);
  });

  it("policies com is_linked_user sao inventariadas", () => {
    const linked = policies().filter((row) =>
      `${row.qual || ""} ${row.with_check || ""}`.includes("is_linked_user()")
    );
    expect(linked.length).toBeGreaterThan(10);
  });

  it("audit_log possui leitura restrita", () => {
    const auditSelect = policies().filter(
      (row) => row.tablename === "audit_log" && row.cmd === "SELECT"
    );
    expect(auditSelect.length).toBeGreaterThan(0);
    expect(
      auditSelect.some(
        (row) =>
          `${row.qual || ""}`.includes("is_admin()") ||
          `${row.qual || ""}`.includes("is_auditoria()")
      )
    ).toBe(true);
  });

  it("usuario autenticado sem perfil permanece sem policies especificas de escrita", () => {
    expect(securityUsers.authenticatedWithoutProfile.permissoes).toEqual([]);
    const rows = policies().filter((row) => ["INSERT", "UPDATE", "ALL"].includes(row.cmd));
    expect(
      rows.some((row) => `${row.qual || ""} ${row.with_check || ""}`.includes("is_linked_user()"))
    ).toBe(false);
  });

  it("perfil recepcao tem policies esperadas para paciente e atendimento", () => {
    const names = new Set(policies().map((row) => row.policyname));
    for (const name of expectedRolePolicies.reception) expect(names.has(name)).toBe(true);
  });

  it("perfil enfermeiro tem policies esperadas", () => {
    const names = new Set(policies().map((row) => row.policyname));
    for (const name of expectedRolePolicies.nurse) expect(names.has(name)).toBe(true);
  });

  it("perfil medico tem policies esperadas", () => {
    const names = new Set(policies().map((row) => row.policyname));
    for (const name of expectedRolePolicies.doctor) expect(names.has(name)).toBe(true);
  });

  it("is_linked_user nao recebe parametros de linha", () => {
    const rows = queryLocalRows(
      "select proname, pg_get_function_identity_arguments(p.oid) as arguments from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='is_linked_user'"
    );
    expect(rows[0].arguments).toBe("");
  });

  it("is_linked_user e usado como predicado amplo de leitura", () => {
    const linkedSelects = policies().filter(
      (row) => row.cmd === "SELECT" && `${row.qual || ""}`.includes("is_linked_user()")
    );
    expect(linkedSelects.length).toBeGreaterThan(10);
  });
});
