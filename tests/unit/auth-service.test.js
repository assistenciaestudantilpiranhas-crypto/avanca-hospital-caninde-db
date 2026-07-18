import { describe, expect, it } from "vitest";
import { createAuthService } from "../../src/auth/auth-service.js";
import { authUser, perfis, permissoes, usuarios } from "../fixtures/auth.js";
import { createMockSupabaseAuth } from "../helpers/mock-supabase-auth.js";

describe("auth service profile queries", () => {
  it("queries expected auth profile tables", async () => {
    const { client, calls } = createMockSupabaseAuth({
      tables: {
        usuarios: { rows: [usuarios.ativo] },
        usuario_perfil: {
          rows: [{ usuario_id: authUser.id, perfis_acesso: perfis.medico }],
        },
        perfil_permissao: {
          rows: [{ perfil_id: perfis.medico.id, permissoes: permissoes.consultaIniciar }],
        },
      },
    });
    const service = createAuthService({ client });

    await service.loadUserProfile(authUser);

    expect(calls.from).toEqual(["usuarios", "usuario_perfil", "perfil_permissao"]);
  });

  it("does not query permissions when there is no profile", async () => {
    const { client, calls } = createMockSupabaseAuth({
      tables: {
        usuarios: { rows: [usuarios.ativo] },
        usuario_perfil: { rows: [] },
      },
    });
    const service = createAuthService({ client });

    const profile = await service.loadUserProfile(authUser);

    expect(profile.perfis).toEqual([]);
    expect(calls.from).toEqual(["usuarios", "usuario_perfil"]);
  });

  it("throws clear error when auth client is invalid", () => {
    expect(() => createAuthService({ client: {} })).toThrow("Auth client inválido.");
  });
});
