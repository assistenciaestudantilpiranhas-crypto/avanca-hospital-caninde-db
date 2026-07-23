import { describe, expect, it } from "vitest";
import { securityUsers } from "../fixtures/security-users.js";
import { queryLocalRows, querySqlFile } from "../helpers/local-supabase.js";

function triggers() {
  return querySqlFile("assert-audit-log.sql");
}

describe("security audit log and triggers", () => {
  it("audit_log possui RLS", () => {
    const rows = querySqlFile("assert-rls-enabled.sql");
    expect(rows.find((row) => row.tablename === "audit_log")?.relrowsecurity).toBe(true);
  });

  it("audit_log nao concede UPDATE ou DELETE direto", () => {
    const rows = queryLocalRows(
      "select privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='audit_log' and grantee in ('anon','authenticated') and privilege_type in ('UPDATE','DELETE')"
    );
    expect(rows).toEqual([]);
  });

  it("audit_log possui trigger de bloqueio de update/delete", () => {
    const names = triggers()
      .filter((row) => row.relname === "audit_log")
      .map((row) => row.tgname);
    expect(names).toContain("trg_block_update_audit_log");
    expect(names).toContain("trg_block_delete_audit_log");
  });

  it("triggers de auditoria existem nas tabelas criticas", () => {
    const rows = triggers();
    for (const table of [
      "pacientes",
      "atendimentos",
      "triagens",
      "transferencias",
      "prescricoes",
    ]) {
      expect(rows.some((row) => row.relname === table && row.tgname.startsWith("trg_audit_"))).toBe(
        true
      );
    }
  });

  it("triggers updated_at existem nas tabelas criticas", () => {
    const rows = triggers();
    for (const table of [
      "usuarios",
      "pacientes",
      "atendimentos",
      "transferencias",
      "configuracoes_sistema",
    ]) {
      expect(
        rows.some((row) => row.relname === table && row.tgname.startsWith("trg_updated_at_"))
      ).toBe(true);
    }
  });

  it("triggers de estoque permanecem presentes", () => {
    const names = new Set(triggers().map((row) => row.tgname));
    expect(names.has("trg_aplicar_movimentacao")).toBe(true);
    expect(names.has("trg_protect_quantidade_atual")).toBe(true);
  });

  it("trigger de transicao de atendimento permanece presente", () => {
    expect(
      triggers().some(
        (row) =>
          row.relname === "atendimentos" && row.tgname === "trg_validate_atendimento_transicao"
      )
    ).toBe(true);
  });

  it("bloqueio de exclusao fisica existe nas tabelas assistenciais", () => {
    const rows = triggers();
    for (const table of ["pacientes", "atendimentos", "triagens", "transferencias", "exames"]) {
      expect(
        rows.some((row) => row.relname === table && row.tgname.startsWith("trg_block_delete_"))
      ).toBe(true);
    }
  });
});

describe("security fictional user profiles diagnostics", () => {
  it("fixture de usuario sem perfil nao possui permissoes", () => {
    expect(securityUsers.authenticatedWithoutProfile.permissoes).toEqual([]);
  });

  it("fixture de usuario inativo registra risco sem alterar policy", () => {
    expect(securityUsers.inactiveReception.ativo).toBe(false);
  });

  it("recepcao possui chaves esperadas para cadastro e atendimento", () => {
    expect(securityUsers.reception.permissoes).toEqual(
      expect.arrayContaining(["paciente.criar", "atendimento.abrir"])
    );
  });

  it("enfermeiro possui chaves esperadas de triagem e transferencia", () => {
    expect(securityUsers.nurse.permissoes).toEqual(
      expect.arrayContaining(["triagem.classificar", "transferencia.confirmar_checklist"])
    );
  });

  it("medico possui chaves esperadas de consulta e transferencia", () => {
    expect(securityUsers.doctor.permissoes).toEqual(
      expect.arrayContaining(["consulta.iniciar", "transferencia.solicitar"])
    );
  });

  it("administracao e tratada como perfil administrativo", () => {
    expect(securityUsers.admin.perfil).toBe("Administracao");
  });

  it("anon nao possui grants diretos em tabelas clinicas", () => {
    const rows = queryLocalRows(
      "select table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee='anon' and table_name in ('pacientes','atendimentos','triagens','transferencias')"
    );
    expect(rows).toEqual([]);
  });

  it("authenticated depende de RLS para grants operacionais", () => {
    const rows = queryLocalRows(
      "select table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and table_name in ('pacientes','atendimentos','triagens','transferencias') and privilege_type in ('SELECT','INSERT','UPDATE') order by table_name, privilege_type"
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(
      querySqlFile("assert-rls-enabled.sql")
        .filter((row) =>
          ["pacientes", "atendimentos", "triagens", "transferencias"].includes(row.tablename)
        )
        .every((row) => row.relrowsecurity)
    ).toBe(true);
  });
});
