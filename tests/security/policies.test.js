import { describe, expect, it } from "vitest";
import { expectedRolePolicies, securityUsers } from "../fixtures/security-users.js";
import { queryLocalRows, querySqlFile } from "../helpers/local-supabase.js";

// Tabelas clinicas que devem ter policy SELECT apos a Fase A
const clinicalTables = [
  "pacientes",
  "atendimentos",
  "triagens",
  "consultas",
  "observacoes",
  "transferencias",
];

// Policies SELECT da Fase A: nomes esperados apos 20260722100029
const phaseASelectPolicies = [
  { table: "pacientes",                    policy: "pacientes_select_operacional" },
  { table: "atendimentos",                 policy: "atendimentos_select_operacional" },
  { table: "chamadas",                     policy: "chamadas_select_operacional" },
  { table: "triagens",                     policy: "triagens_select_clinico" },
  { table: "consultas",                    policy: "consultas_select_clinico" },
  { table: "evolucoes_enfermagem",         policy: "evolucoes_enfermagem_select_clinico" },
  { table: "observacoes",                  policy: "observacoes_select_clinico" },
  { table: "reavaliacoes_observacao",      policy: "reavaliacoes_observacao_select_clinico" },
  { table: "estabilizacoes",               policy: "estabilizacoes_select_clinico" },
  { table: "checklist_estabilizacao_itens", policy: "checklist_estabilizacao_itens_select_clinico" },
  { table: "prescricoes",                  policy: "prescricoes_select_farmacia_clinico" },
  { table: "prescricao_itens",             policy: "prescricao_itens_select_farmacia_clinico" },
  { table: "exames",                       policy: "exames_select_diagnostico" },
  { table: "transferencias",               policy: "transferencias_select_operacional" },
  { table: "checklist_transferencia_itens", policy: "checklist_transferencia_itens_select_operacional" },
  { table: "estoque_itens",               policy: "estoque_itens_select_farmacia" },
  { table: "estoque_movimentacoes",        policy: "estoque_movimentacoes_select_farmacia" },
];

// Tabelas clinicas que NAO devem ter is_linked_user() em SELECT apos a Fase A
const phaseATargetTables = phaseASelectPolicies.map((p) => p.table);

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

  // Apos Fase A: is_linked_user() permanece nas tabelas de dominio (7),
  // acesso (perfis_acesso, permissoes, perfil_permissao = 3) e sub-tabelas
  // clinicas de paciente (alergias, comorbidades, medicamentos, alertas = 4)
  // e audit_log (insert = 1). Total esperado: >= 10.
  it("is_linked_user permanece em tabelas de dominio e catalogo de acesso", () => {
    const linked = policies().filter((row) =>
      `${row.qual || ""} ${row.with_check || ""}`.includes("is_linked_user()")
    );
    expect(linked.length).toBeGreaterThanOrEqual(10);
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
});

// =========================================================================
// Fase A — policies SELECT com listas positivas de permissoes
// =========================================================================

describe("fase A select policies — nomes e predicados", () => {
  it("todas as 17 policies SELECT da Fase A existem com os nomes corretos", () => {
    const names = new Set(policies().map((row) => row.policyname));
    for (const { policy } of phaseASelectPolicies) {
      expect(names.has(policy), `policy ausente: ${policy}`).toBe(true);
    }
  });

  it("policies SELECT da Fase A nao usam is_linked_user()", () => {
    const rows = policies();
    for (const { table, policy } of phaseASelectPolicies) {
      const row = rows.find((r) => r.tablename === table && r.policyname === policy);
      expect(row, `policy nao encontrada: ${policy}`).toBeTruthy();
      expect(
        `${row.qual || ""}`.includes("is_linked_user()"),
        `${policy} ainda usa is_linked_user() — Fase A nao foi aplicada`
      ).toBe(false);
    }
  });

  it("policies SELECT da Fase A usam has_permission, is_admin ou is_auditoria", () => {
    const rows = policies();
    for (const { table, policy } of phaseASelectPolicies) {
      const row = rows.find((r) => r.tablename === table && r.policyname === policy);
      expect(row, `policy nao encontrada: ${policy}`).toBeTruthy();
      const qual = row.qual || "";
      const hasSafeGate =
        qual.includes("has_permission(") ||
        qual.includes("is_admin()") ||
        qual.includes("is_auditoria()");
      expect(hasSafeGate, `${policy} nao tem gate de permissao valido`).toBe(true);
    }
  });

  it("nomes _select_linked foram removidos das tabelas-alvo da Fase A", () => {
    const rows = policies();
    for (const table of phaseATargetTables) {
      const linkedPolicy = rows.find(
        (row) => row.tablename === table && row.policyname === `${table}_select_linked`
      );
      expect(
        linkedPolicy,
        `policy _select_linked encontrada em ${table} — Fase A nao removeu a policy antiga`
      ).toBeFalsy();
    }
  });

  it("policies clinicas nao concede leitura via is_linked_user() em SELECT", () => {
    const rows = policies();
    const clinicalLinkedSelects = rows.filter(
      (row) =>
        phaseATargetTables.includes(row.tablename) &&
        row.cmd === "SELECT" &&
        `${row.qual || ""}`.includes("is_linked_user()")
    );
    expect(
      clinicalLinkedSelects,
      `Tabelas com _select_linked remanescente: ${clinicalLinkedSelects.map((r) => r.tablename).join(", ")}`
    ).toEqual([]);
  });

  it("triagens, consultas e evolucoes_enfermagem nao sao acessiveis por atendimento.abrir", () => {
    const rows = policies();
    for (const table of ["triagens", "consultas", "evolucoes_enfermagem"]) {
      const selectPolicies = rows.filter((r) => r.tablename === table && r.cmd === "SELECT");
      for (const pol of selectPolicies) {
        expect(
          `${pol.qual || ""}`.includes("atendimento.abrir"),
          `${pol.policyname} concede acesso clinico via atendimento.abrir (permissao de Recepcao)`
        ).toBe(false);
      }
    }
  });

  it("estoque nao e acessivel por permissoes clinicas (triagem, consulta, observacao)", () => {
    const rows = policies();
    const clinicalPerms = ["triagem.classificar", "consulta.iniciar", "observacao.reavaliar"];
    for (const table of ["estoque_itens", "estoque_movimentacoes"]) {
      const selectPolicies = rows.filter((r) => r.tablename === table && r.cmd === "SELECT");
      for (const pol of selectPolicies) {
        for (const perm of clinicalPerms) {
          expect(
            `${pol.qual || ""}`.includes(perm),
            `${pol.policyname} expoe estoque para permissao clinica ${perm}`
          ).toBe(false);
        }
      }
    }
  });

  it("prescricoes nao sao acessiveis por Recepcao (atendimento.abrir, paciente.criar)", () => {
    const rows = policies();
    const selectPolicies = rows.filter((r) => r.tablename === "prescricoes" && r.cmd === "SELECT");
    for (const pol of selectPolicies) {
      expect(`${pol.qual || ""}`.includes("atendimento.abrir"), `${pol.policyname} expoe prescricoes a Recepcao via atendimento.abrir`).toBe(false);
      expect(`${pol.qual || ""}`.includes("paciente.criar"), `${pol.policyname} expoe prescricoes a Recepcao via paciente.criar`).toBe(false);
    }
  });

  it("transferencias nao sao acessiveis por Farmacia (prescricao.dispensar, estoque.movimentar)", () => {
    const rows = policies();
    const selectPolicies = rows.filter((r) => r.tablename === "transferencias" && r.cmd === "SELECT");
    for (const pol of selectPolicies) {
      expect(`${pol.qual || ""}`.includes("prescricao.dispensar"), `${pol.policyname} expoe transferencias a Farmacia`).toBe(false);
      expect(`${pol.qual || ""}`.includes("estoque.movimentar"), `${pol.policyname} expoe transferencias a Farmacia via estoque.movimentar`).toBe(false);
    }
  });
});

// =========================================================================
// Invariantes de escrita — nao alterados pela Fase A
// =========================================================================

describe("invariantes de escrita — nao alterados pela Fase A", () => {
  it("policies INSERT de pacientes e atendimentos preservadas", () => {
    const names = new Set(policies().map((row) => row.policyname));
    expect(names.has("pacientes_insert_recepcao_admin")).toBe(true);
    expect(names.has("atendimentos_insert_recepcao_admin")).toBe(true);
  });

  it("policy de escrita em triagens preservada", () => {
    const names = new Set(policies().map((row) => row.policyname));
    expect(names.has("triagens_write_enfermagem_admin")).toBe(true);
  });

  it("policy de escrita em consultas preservada", () => {
    const names = new Set(policies().map((row) => row.policyname));
    expect(names.has("consultas_write_medico_admin")).toBe(true);
  });

  it("policies de transferencia de escrita preservadas", () => {
    const names = new Set(policies().map((row) => row.policyname));
    expect(names.has("transferencias_insert_medico_regulacao_admin")).toBe(true);
    expect(names.has("transferencias_update_regulacao_admin")).toBe(true);
    expect(names.has("checklist_transferencia_itens_write_regulacao_admin")).toBe(true);
  });

  it("policy de escrita em estoque preservada", () => {
    const names = new Set(policies().map((row) => row.policyname));
    expect(names.has("estoque_itens_write_farmacia_admin")).toBe(true);
    expect(names.has("estoque_movimentacoes_insert_farmacia_admin")).toBe(true);
  });
});
