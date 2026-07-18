import { describe, expect, it } from "vitest";
import { createPermissionChecker } from "../../src/permissions/permission-rules.js";
import { makeAuth } from "../fixtures/permissions.js";

describe("permission rules", () => {
  it("allows route with explicit permission", () => {
    const checker = createPermissionChecker(makeAuth({ permissoes: ["paciente.criar"] }));

    expect(checker.isRouteAllowed("pacientes")).toBe(true);
  });

  it("denies route without matching permission or profile", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Farmácia"] }));

    expect(checker.isRouteAllowed("triagem")).toBe(false);
  });

  it("allows route with permitted profile", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Enfermeiro"] }));

    expect(checker.isRouteAllowed("triagem")).toBe(true);
  });

  it("denies profile with similar but not identical name", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Enfermeira"] }));

    expect(checker.isRouteAllowed("triagem")).toBe(false);
  });

  it("allows Administração to access restricted routes", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Administração"] }));

    expect(checker.isRouteAllowed("relatorios")).toBe(true);
  });

  it("allows when one of multiple profiles matches", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Farmácia", "Médico"] }));

    expect(checker.isRouteAllowed("observacao-clinica")).toBe(true);
  });

  it("denies route whose permission and profile lists are empty for non-admin", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Auditoria"] }));

    expect(checker.isRouteAllowed("indicadores")).toBe(false);
  });

  it("allows always visible route when session is ready", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: [] }));

    expect(checker.isRouteAllowed("dashboard")).toBe(true);
  });

  it("keeps routes visible while auth is not ready", () => {
    const checker = createPermissionChecker(makeAuth({ ready: false }));

    expect(checker.isRouteAllowed("triagem")).toBe(true);
  });

  it("denies unknown route when auth is ready", () => {
    const checker = createPermissionChecker(makeAuth());

    expect(checker.isRouteAllowed("rota-inexistente")).toBe(false);
  });

  it("allows action with explicit permission", () => {
    const checker = createPermissionChecker(
      makeAuth({ permissoes: ["transferencia.confirmar_checklist"] })
    );

    expect(
      checker.isActionAllowed({
        permissoes: ["transferencia.confirmar_checklist"],
        perfis: ["Enfermeiro"],
      })
    ).toBe(true);
  });

  it("allows action with permitted profile", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Regulação de Transferência"] }));

    expect(
      checker.isActionAllowed({
        permissoes: ["transferencia.aprovar_vaga"],
        perfis: ["Regulação de Transferência"],
      })
    ).toBe(true);
  });

  it("denies action with empty lists for non-admin", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Médico"] }));

    expect(checker.isActionAllowed({ permissoes: [], perfis: [] })).toBe(false);
  });

  it("denies missing action rule", () => {
    const checker = createPermissionChecker(makeAuth({ perfis: ["Médico"] }));

    expect(checker.isActionAllowed(null)).toBe(false);
  });

  it("denies action when auth is not ready", () => {
    const checker = createPermissionChecker(makeAuth({ ready: false, perfis: ["Administração"] }));

    expect(checker.isActionAllowed({ permissoes: ["paciente.criar"], perfis: ["Recepção"] })).toBe(
      false
    );
  });
});
