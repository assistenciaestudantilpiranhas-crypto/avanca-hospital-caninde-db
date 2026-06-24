// auth.js — autenticacao real (Supabase Auth) para o GSI Saude.
// Etapa 1 do plano de integracao: sessao, login, logout e identidade do
// usuario. NAO migra dados clinicos (continuam em localStorage via GsiApi).
// NAO cria CRUD de usuarios/perfis. NAO usa service_role - apenas anon key.

window.GsiAuth = (() => {
  // Configuracao local (supabase start / supabase status). Para apontar
  // para um projeto remoto no futuro, trocar estes dois valores em uma
  // alteracao explicita e revisada - nunca usar a chave service_role aqui,
  // pois este arquivo e servido ao navegador (publico por definicao).
  const SUPABASE_URL = "http://127.0.0.1:54321";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const loginScreen = document.getElementById("loginScreen");
  const appShell = document.querySelector(".app-shell");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginEmailInput = document.getElementById("loginEmail");
  const loginPasswordInput = document.getElementById("loginPassword");
  const loginSubmitButton = document.getElementById("loginSubmit");

  function showLogin() {
    if (loginScreen) loginScreen.hidden = false;
    if (appShell) appShell.hidden = true;
  }

  function showApp() {
    if (loginScreen) loginScreen.hidden = true;
    if (appShell) appShell.hidden = false;
  }

  function setLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message || "";
    loginError.hidden = !message;
  }

  function setLoginLoading(isLoading) {
    if (!loginSubmitButton) return;
    loginSubmitButton.disabled = isLoading;
    loginSubmitButton.textContent = isLoading ? "Entrando..." : "Entrar";
  }

  function initials(nome) {
    if (!nome) return "US";
    const parts = nome.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "US";
  }

  // Busca o registro institucional (public.usuarios) e os perfis vinculados
  // (usuario_perfil + perfis_acesso) do usuario autenticado. Sujeito a RLS -
  // o proprio usuario sempre pode ler o seu registro (policy
  // usuarios_select_self_or_admin / usuario_perfil_select_self_or_admin).
  async function loadUserProfile(authUser) {
    const { data: usuario, error: usuarioError } = await client
      .from("usuarios")
      .select("id, nome, email, categoria_profissional, ativo")
      .eq("id", authUser.id)
      .maybeSingle();

    if (usuarioError || !usuario) {
      console.error("GsiAuth: erro ao carregar public.usuarios", usuarioError);
      return null;
    }

    const { data: vinculos, error: perfilError } = await client
      .from("usuario_perfil")
      .select("perfis_acesso(nome)")
      .eq("usuario_id", authUser.id);

    if (perfilError) {
      console.error("GsiAuth: erro ao carregar usuario_perfil/perfis_acesso", perfilError);
    }

    const perfis = (vinculos || [])
      .map((vinculo) => vinculo.perfis_acesso && vinculo.perfis_acesso.nome)
      .filter(Boolean);

    return { usuario, perfis };
  }

  // Substitui o nome/perfil estaticos da sidebar e do menu do usuario pelos
  // dados reais vindos do banco. Nao remove o seletor de "perfil
  // operacional" simulado (script.js) - apenas o badge de perfil real passa
  // a refletir usuario_perfil/perfis_acesso, mais confiavel que a simulacao.
  function applyUserToUI(usuario, perfis) {
    const nome = usuario?.nome || "Usuário sem nome cadastrado";
    const perfilLabel = perfis && perfis.length ? perfis.join(" | ") : "Sem perfil vinculado";
    const perfilPrincipal = perfis && perfis.length ? perfis[0] : "Sem perfil vinculado";
    const sigla = initials(nome);

    document.querySelectorAll(".user-card strong").forEach((el) => { el.textContent = nome; });
    document.querySelectorAll(".user-card small").forEach((el) => { el.textContent = perfilLabel; });
    document.querySelectorAll(".user-card .avatar").forEach((el) => { el.textContent = sigla; });

    const topAvatar = document.getElementById("userMenuButton");
    if (topAvatar) topAvatar.textContent = sigla;

    const userMenuHeadName = document.querySelector(".user-menu-head strong");
    if (userMenuHeadName) userMenuHeadName.textContent = nome;

    const userMenuHeadDesc = document.querySelector(".user-menu-head small");
    if (userMenuHeadDesc) userMenuHeadDesc.textContent = perfilLabel;

    const profileBadge = document.getElementById("userMenuProfileBadge");
    if (profileBadge) profileBadge.textContent = perfilPrincipal;
  }

  async function handleSession(session) {
    if (!session || !session.user) {
      showLogin();
      return;
    }

    const profile = await loadUserProfile(session.user);
    if (!profile) {
      setLoginError("Usuário autenticado, mas sem cadastro em public.usuarios. Contate o administrador.");
      await client.auth.signOut();
      showLogin();
      return;
    }

    applyUserToUI(profile.usuario, profile.perfis);
    showApp();
  }

  async function signIn(email, password) {
    setLoginError("");
    setLoginLoading(true);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setLoginLoading(false);

    if (error) {
      setLoginError("E-mail ou senha inválidos.");
      return;
    }

    await handleSession(data.session);
  }

  async function signOut() {
    await client.auth.signOut();
    if (loginPasswordInput) loginPasswordInput.value = "";
    setLoginError("");
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = (loginEmailInput?.value || "").trim();
      const password = loginPasswordInput?.value || "";

      if (!email || !password) {
        setLoginError("Informe e-mail e senha.");
        return;
      }

      signIn(email, password);
    });
  }

  client.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });

  client.auth.getSession().then(({ data }) => handleSession(data.session));

  return { client, signOut };
})();
