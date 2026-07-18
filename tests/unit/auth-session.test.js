import { describe, expect, it, vi } from "vitest";
import { createAuthService } from "../../src/auth/auth-service.js";
import { isSessionUsable, validateCredentials } from "../../src/auth/session-rules.js";
import { authUser, perfis, permissoes, usuarios, validSession } from "../fixtures/auth.js";
import { createMockSupabaseAuth } from "../helpers/mock-supabase-auth.js";

function profileTables({
  usuario = usuarios.ativo,
  usuarioError = null,
  perfilRows = [{ usuario_id: authUser.id, perfis_acesso: perfis.medico }],
  perfilError = null,
  permissaoRows = [{ perfil_id: perfis.medico.id, permissoes: permissoes.consultaIniciar }],
  permissaoError = null,
} = {}) {
  return {
    usuarios: { rows: usuario ? [usuario] : [], error: usuarioError },
    usuario_perfil: { rows: perfilRows, error: perfilError },
    perfil_permissao: { rows: permissaoRows, error: permissaoError },
  };
}

describe("auth session rules", () => {
  it("validates non-empty credentials", () => {
    expect(validateCredentials("teste@gsi.local", "senha")).toBe(true);
  });

  it("rejects empty credentials", () => {
    expect(validateCredentials("", "senha")).toBe(false);
    expect(validateCredentials("teste@gsi.local", "")).toBe(false);
  });

  it("recognizes usable sessions", () => {
    expect(isSessionUsable(validSession)).toBe(true);
    expect(isSessionUsable(null)).toBe(false);
    expect(isSessionUsable({ user: null })).toBe(false);
  });
});

describe("auth service login/logout", () => {
  it("calls signInWithPassword with trimmed email", async () => {
    const { client } = createMockSupabaseAuth();
    const service = createAuthService({ client });

    const result = await service.signIn("  teste.auth@gsi.local  ", "senha");

    expect(result.ok).toBe(true);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "teste.auth@gsi.local",
      password: "senha",
    });
  });

  it("stores invalid login error from Supabase", async () => {
    const { client } = createMockSupabaseAuth({
      signInResult: { data: null, error: new Error("Invalid login credentials") },
    });
    const service = createAuthService({ client });

    const result = await service.signIn("teste.auth@gsi.local", "errada");

    expect(result.ok).toBe(false);
    expect(service.getState().error).toBe("E-mail ou senha inválidos.");
  });

  it("does not call Supabase when credentials are empty", async () => {
    const { client } = createMockSupabaseAuth();
    const service = createAuthService({ client });

    const result = await service.signIn("", "");

    expect(result.ok).toBe(false);
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(service.getState().error).toBe("Informe e-mail e senha.");
  });

  it("handles signIn response without user", async () => {
    const { client } = createMockSupabaseAuth({
      signInResult: { data: { session: null, user: null }, error: null },
    });
    const service = createAuthService({ client });

    const result = await service.signIn("teste.auth@gsi.local", "senha");

    expect(result.ok).toBe(false);
    expect(service.getState().error).toBe("Sessão não retornou usuário autenticado.");
  });

  it("clears state on valid logout", async () => {
    const { client } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });
    await service.handleSession(validSession);

    const result = await service.signOut();

    expect(result.ok).toBe(true);
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(service.getState().usuario).toBeNull();
    expect(service.getState().perfis).toEqual([]);
  });

  it("keeps error when logout fails", async () => {
    const { client } = createMockSupabaseAuth({
      signOutResult: { error: new Error("logout failed") },
    });
    const service = createAuthService({ client });

    const result = await service.signOut();

    expect(result.ok).toBe(false);
    expect(service.getState().error).toBe("Não foi possível encerrar a sessão.");
  });
});

describe("auth service session lifecycle", () => {
  it("restores valid getSession result", async () => {
    const { client } = createMockSupabaseAuth({
      sessionResult: { data: { session: validSession }, error: null },
      tables: profileTables(),
    });
    const service = createAuthService({ client });

    const state = await service.restoreSession();

    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
    expect(state.usuario?.id).toBe(authUser.id);
    expect(state.ready).toBe(true);
  });

  it("restores empty getSession result as unauthenticated ready state", async () => {
    const { client } = createMockSupabaseAuth({
      sessionResult: { data: { session: null }, error: null },
    });
    const service = createAuthService({ client });

    const state = await service.restoreSession();

    expect(state.usuario).toBeNull();
    expect(state.ready).toBe(true);
  });

  it("handles getSession error without throwing", async () => {
    const { client } = createMockSupabaseAuth({
      sessionResult: { data: null, error: new Error("expired") },
    });
    const service = createAuthService({ client });

    const state = await service.restoreSession();

    expect(state.usuario).toBeNull();
    expect(state.error).toBe("Não foi possível restaurar a sessão.");
  });

  it("loads active user profile", async () => {
    const { client } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.usuario?.ativo).toBe(true);
    expect(state.perfis).toHaveLength(1);
    expect(state.permissoes).toHaveLength(1);
  });

  it("preserves current auth.js behavior for inactive users by loading the profile", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({ usuario: usuarios.inativo }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.usuario?.ativo).toBe(false);
    expect(state.ready).toBe(true);
  });

  it("signs out when public.usuarios has no matching user", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({ usuario: null }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(state.usuario).toBeNull();
    expect(state.error).toContain("sem cadastro em public.usuarios");
  });

  it("loads user without profile as empty profile list", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({ perfilRows: [], permissaoRows: [] }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.usuario?.id).toBe(authUser.id);
    expect(state.perfis).toEqual([]);
    expect(state.permissoes).toEqual([]);
  });

  it("loads multiple profiles", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({
        perfilRows: [
          { usuario_id: authUser.id, perfis_acesso: perfis.medico },
          { usuario_id: authUser.id, perfis_acesso: perfis.enfermeiro },
        ],
      }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.perfis.map((perfil) => perfil.nome)).toEqual(["Médico", "Enfermeiro"]);
  });

  it("deduplicates duplicated profiles and permissions", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({
        perfilRows: [
          { usuario_id: authUser.id, perfis_acesso: perfis.medico },
          { usuario_id: authUser.id, perfis_acesso: perfis.medico },
        ],
        permissaoRows: [
          { perfil_id: perfis.medico.id, permissoes: permissoes.consultaIniciar },
          { perfil_id: perfis.medico.id, permissoes: permissoes.consultaIniciar },
        ],
      }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.perfis).toHaveLength(1);
    expect(state.permissoes).toHaveLength(1);
  });

  it("keeps user and profile when permission loading fails", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({ permissaoError: new Error("permission query failed") }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.usuario?.id).toBe(authUser.id);
    expect(state.perfis).toHaveLength(1);
    expect(state.permissoes).toEqual([]);
  });

  it("keeps user with empty profiles when profile loading fails", async () => {
    const { client } = createMockSupabaseAuth({
      tables: profileTables({ perfilError: new Error("profile query failed") }),
    });
    const service = createAuthService({ client });

    const state = await service.handleSession(validSession);

    expect(state.usuario?.id).toBe(authUser.id);
    expect(state.perfis).toEqual([]);
    expect(state.permissoes).toEqual([]);
  });

  it("avoids loading the same session twice", async () => {
    const { client, calls } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });

    await service.handleSession(validSession);
    await service.handleSession(validSession);

    expect(calls.from.filter((table) => table === "usuarios")).toHaveLength(1);
  });

  it("clears old data when session changes user", async () => {
    const secondUser = { id: "00000000-0000-4000-8000-000000000002", email: "outro@gsi.local" };
    const { client } = createMockSupabaseAuth({
      tables: {
        usuarios: {
          rows: [usuarios.ativo, { ...usuarios.ativo, id: secondUser.id, nome: "TESTE Outro" }],
        },
        usuario_perfil: {
          rows: [
            { usuario_id: authUser.id, perfis_acesso: perfis.medico },
            { usuario_id: secondUser.id, perfis_acesso: perfis.recepcao },
          ],
        },
        perfil_permissao: {
          rows: [
            { perfil_id: perfis.medico.id, permissoes: permissoes.consultaIniciar },
            { perfil_id: perfis.recepcao.id, permissoes: permissoes.pacienteCriar },
          ],
        },
      },
    });
    const service = createAuthService({ client });

    await service.handleSession(validSession);
    const state = await service.handleSession({ access_token: "TOKEN_2", user: secondUser });

    expect(state.usuario?.id).toBe(secondUser.id);
    expect(state.perfis.map((perfil) => perfil.nome)).toEqual(["Recepção"]);
    expect(state.permissoes.map((permissao) => permissao.chave)).toEqual(["paciente.criar"]);
  });

  it("dispatches ready event payload after session handling", async () => {
    const dispatchReady = vi.fn();
    const { client } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client, dispatchReady });

    await service.handleSession(validSession);

    expect(dispatchReady).toHaveBeenCalledWith({ authenticated: true });
  });

  it("handles SIGNED_IN event", async () => {
    const { client, emitAuthEvent } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });
    service.subscribeToAuthChanges();

    await emitAuthEvent("SIGNED_IN", validSession);

    expect(service.getState().usuario?.id).toBe(authUser.id);
  });

  it("handles SIGNED_OUT event by clearing state", async () => {
    const { client, emitAuthEvent } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });
    await service.handleSession(validSession);
    service.subscribeToAuthChanges();

    await emitAuthEvent("SIGNED_OUT", null);

    expect(service.getState().usuario).toBeNull();
  });

  it("handles TOKEN_REFRESHED event", async () => {
    const { client, emitAuthEvent } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });
    service.subscribeToAuthChanges();

    await emitAuthEvent("TOKEN_REFRESHED", { ...validSession, access_token: "TOKEN_REFRESHED" });

    expect(service.getState().usuario?.id).toBe(authUser.id);
  });

  it("handles USER_UPDATED event", async () => {
    const { client, emitAuthEvent } = createMockSupabaseAuth({ tables: profileTables() });
    const service = createAuthService({ client });
    service.subscribeToAuthChanges();

    await emitAuthEvent("USER_UPDATED", validSession);

    expect(service.getState().ready).toBe(true);
    expect(service.getState().usuario?.email).toBe(authUser.email);
  });
});
