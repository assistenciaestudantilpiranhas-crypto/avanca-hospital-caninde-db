import {
  cloneAuthState,
  createInitialAuthState,
  dedupeByKey,
  isSessionUsable,
  validateCredentials,
} from "./session-rules.js";

export function createAuthService({ client, dispatchReady = () => {} } = {}) {
  if (!client?.auth) {
    throw new Error("Auth client inválido.");
  }

  let state = createInitialAuthState();
  let currentSessionKey = null;

  function setState(patch) {
    state = { ...state, ...patch };
  }

  function resetUserState() {
    setState({
      usuario: null,
      perfis: [],
      permissoes: [],
      lastSessionUserId: null,
    });
  }

  function markReady(authenticated = false) {
    setState({ ready: true, loading: false });
    dispatchReady({ authenticated });
  }

  function getState() {
    return cloneAuthState(state);
  }

  async function loadUserProfile(authUser) {
    const { data: usuario, error: usuarioError } = await client
      .from("usuarios")
      .select("id, nome, email, categoria_profissional, ativo")
      .eq("id", authUser.id)
      .maybeSingle();

    if (usuarioError || !usuario) return null;

    const { data: vinculos, error: perfilError } = await client
      .from("usuario_perfil")
      .select("perfis_acesso(id, nome, descricao)")
      .eq("usuario_id", authUser.id);

    const perfis = perfilError
      ? []
      : dedupeByKey((vinculos || []).map((vinculo) => vinculo.perfis_acesso).filter(Boolean), "id");

    const perfilIds = perfis.map((perfil) => perfil.id);
    let permissoes = [];

    if (perfilIds.length) {
      const { data: permVinculos, error: permissaoError } = await client
        .from("perfil_permissao")
        .select("permissoes(chave, modulo, descricao)")
        .in("perfil_id", perfilIds);

      permissoes = permissaoError
        ? []
        : dedupeByKey(
            (permVinculos || []).map((vinculo) => vinculo.permissoes).filter(Boolean),
            "chave"
          );
    }

    return { usuario, perfis, permissoes };
  }

  async function handleSession(session) {
    if (!isSessionUsable(session)) {
      currentSessionKey = null;
      resetUserState();
      markReady(false);
      return getState();
    }

    const sessionKey = `${session.user.id}:${session.access_token || ""}`;
    if (currentSessionKey === sessionKey && state.usuario?.id === session.user.id) {
      markReady(true);
      return getState();
    }

    currentSessionKey = sessionKey;
    setState({ loading: true, error: "" });

    const profile = await loadUserProfile(session.user);
    if (!profile) {
      currentSessionKey = null;
      resetUserState();
      setState({
        error: "Usuário autenticado, mas sem cadastro em public.usuarios. Contate o administrador.",
      });
      await client.auth.signOut();
      markReady(false);
      return getState();
    }

    setState({
      usuario: profile.usuario,
      perfis: profile.perfis,
      permissoes: profile.permissoes,
      lastSessionUserId: session.user.id,
      error: "",
    });
    markReady(true);
    return getState();
  }

  async function signIn(email, password) {
    if (!validateCredentials(email, password)) {
      setState({ error: "Informe e-mail e senha." });
      return { ok: false, error: state.error };
    }

    setState({ loading: true, error: "" });
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email).trim(),
      password,
    });
    setState({ loading: false });

    if (error) {
      setState({ error: "E-mail ou senha inválidos." });
      return { ok: false, error: state.error };
    }

    if (!data?.user && !data?.session?.user) {
      setState({ error: "Sessão não retornou usuário autenticado." });
      return { ok: false, error: state.error };
    }

    return { ok: true, data };
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) {
      setState({ error: "Não foi possível encerrar a sessão." });
      return { ok: false, error };
    }
    currentSessionKey = null;
    resetUserState();
    setState({ error: "" });
    return { ok: true };
  }

  async function restoreSession() {
    const { data, error } = await client.auth.getSession();
    if (error) {
      resetUserState();
      setState({ error: "Não foi possível restaurar a sessão." });
      markReady(false);
      return getState();
    }
    return handleSession(data?.session || null);
  }

  function subscribeToAuthChanges() {
    return client.auth.onAuthStateChange((event, session) => {
      if (
        ["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"].includes(
          event
        )
      ) {
        return handleSession(session);
      }
      return undefined;
    });
  }

  return {
    getState,
    loadUserProfile,
    handleSession,
    signIn,
    signOut,
    restoreSession,
    subscribeToAuthChanges,
  };
}
