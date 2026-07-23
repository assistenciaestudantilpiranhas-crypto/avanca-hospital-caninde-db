import { describe, expect, it } from "vitest";
import { queryLocalRows, querySqlFile } from "../helpers/local-supabase.js";

function functions() {
  return querySqlFile("assert-security-definer.sql");
}

describe("security definer functions", () => {
  it("inventaria funcoes public", () => {
    expect(functions().length).toBeGreaterThanOrEqual(10);
  });

  it("funcoes SECURITY DEFINER conhecidas permanecem presentes", () => {
    const names = new Set(
      functions()
        .filter((fn) => fn.prosecdef)
        .map((fn) => fn.proname)
    );
    for (const name of [
      "is_admin",
      "has_perfil",
      "has_permission",
      "is_linked_user",
      "bootstrap_primeiro_admin",
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it("bootstrap_primeiro_admin permanece SECURITY DEFINER", () => {
    const fn = functions().find((item) => item.proname === "bootstrap_primeiro_admin");
    expect(fn.prosecdef).toBe(true);
  });

  it("funcoes SECURITY DEFINER possuem search_path configurado", () => {
    const definer = functions().filter((fn) => fn.prosecdef);
    expect(definer.every((fn) => String(fn.proconfig || "").includes("search_path"))).toBe(true);
  });

  it("bootstrap_primeiro_admin nao concede EXECUTE a anon", () => {
    const rows = queryLocalRows(
      "select grantee, routine_name, privilege_type from information_schema.routine_privileges where specific_schema='public' and routine_name='bootstrap_primeiro_admin' and grantee='anon' and privilege_type='EXECUTE'"
    );
    expect(rows).toEqual([]);
  });

  it("funcoes auxiliares de seguranca permanecem presentes", () => {
    const names = new Set(functions().map((fn) => fn.proname));
    for (const name of [
      "current_user_id",
      "is_admin",
      "is_auditoria",
      "has_perfil",
      "has_permission",
      "is_linked_user",
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it("funcoes de dominio conhecidas permanecem presentes", () => {
    const names = new Set(functions().map((fn) => fn.proname));
    expect(names.has("dom_codigo")).toBe(true);
    expect(names.has("dom_ordem")).toBe(true);
  });

  it("funcoes de bloqueio e validacao permanecem presentes", () => {
    const names = new Set(functions().map((fn) => fn.proname));
    expect(names.has("fn_validate_atendimento_transicao")).toBe(true);
    expect(names.has("fn_block_assistential_physical_delete")).toBe(true);
    expect(names.has("fn_block_audit_log_update_delete")).toBe(true);
  });
});
