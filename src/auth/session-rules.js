export function createInitialAuthState() {
  return {
    usuario: null,
    perfis: [],
    permissoes: [],
    ready: false,
    loading: false,
    error: "",
    lastSessionUserId: null,
  };
}

export function cloneAuthState(state) {
  return {
    usuario: state.usuario ? { ...state.usuario } : null,
    perfis: state.perfis.map((perfil) => ({ ...perfil })),
    permissoes: state.permissoes.map((permissao) => ({ ...permissao })),
    ready: state.ready,
    loading: state.loading,
    error: state.error,
    lastSessionUserId: state.lastSessionUserId,
  };
}

export function dedupeByKey(items = [], key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item?.[key];
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function validateCredentials(email = "", password = "") {
  return Boolean(String(email).trim() && password);
}

export function isSessionUsable(session) {
  return Boolean(session?.user?.id);
}
