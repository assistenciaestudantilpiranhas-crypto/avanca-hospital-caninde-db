export const ALWAYS_VISIBLE_ROUTES = ["dashboard", "sair"];

export const routePermissions = {
  pacientes: {
    permissoes: ["paciente.criar"],
    perfis: ["Recepção", "Técnico em Enfermagem", "Enfermeiro", "Médico"],
  },
  atendimentos: {
    permissoes: ["atendimento.abrir"],
    perfis: [
      "Recepção",
      "Técnico em Enfermagem",
      "Enfermeiro",
      "Médico",
      "Regulação de Transferência",
    ],
  },
  "painel-chamada": {
    permissoes: ["atendimento.abrir"],
    perfis: ["Recepção", "Técnico em Enfermagem", "Médico"],
  },
  risco: {
    permissoes: ["triagem.classificar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro"],
  },
  triagem: {
    permissoes: ["triagem.classificar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro"],
  },
  consulta: { permissoes: ["consulta.iniciar", "consulta.registrar_conduta"], perfis: [] },
  enfermagem: {
    permissoes: ["enfermagem.evolucao.registrar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro"],
  },
  farmacia: {
    permissoes: ["prescricao.dispensar", "estoque.movimentar"],
    perfis: ["Farmácia"],
  },
  exames: { permissoes: ["exame.visualizar", "exame.solicitar"], perfis: ["Técnico em RX"] },
  estabilizacao: { permissoes: [], perfis: ["Técnico em Enfermagem", "Enfermeiro", "Médico"] },
  "observacao-clinica": {
    permissoes: ["observacao.reavaliar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
  },
  "observacao-pediatrica": {
    permissoes: ["observacao.reavaliar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
  },
  "observacao-obstetrica": {
    permissoes: ["observacao.reavaliar"],
    perfis: ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
  },
  transferencias: {
    permissoes: [
      "transferencia.solicitar",
      "transferencia.aprovar_vaga",
      "transferencia.confirmar_checklist",
      "transferencia.confirmar_saida",
    ],
    perfis: ["Regulação de Transferência", "Enfermeiro"],
  },
  indicadores: { permissoes: [], perfis: [] },
  relatorios: { permissoes: [], perfis: [] },
  configuracoes: { permissoes: ["configuracoes.gerenciar"], perfis: [] },
  auditoria: { permissoes: [], perfis: ["Auditoria"] },
};

export function createPermissionChecker(auth) {
  const isReady = () => !!auth && typeof auth.isReady === "function" && auth.isReady();

  const isAdmin = () =>
    isReady() && typeof auth.hasPerfil === "function" && auth.hasPerfil("Administração");

  const hasPermission = (permission) =>
    isReady() && typeof auth.hasPermission === "function" && auth.hasPermission(permission);

  const hasProfile = (profile) =>
    isReady() && typeof auth.hasPerfil === "function" && auth.hasPerfil(profile);

  function isRouteAllowed(routeId) {
    if (!isReady()) return true;
    if (ALWAYS_VISIBLE_ROUTES.includes(routeId)) return true;
    if (isAdmin()) return true;
    const rule = routePermissions[routeId];
    if (!rule) return false;
    const permissionOk = (rule.permissoes || []).some((key) => hasPermission(key));
    const profileOk = (rule.perfis || []).some((name) => hasProfile(name));
    return permissionOk || profileOk;
  }

  function isActionAllowed(rule) {
    if (!isReady()) return false;
    if (isAdmin()) return true;
    if (!rule) return false;
    const permissionOk = (rule.permissoes || []).some((key) => hasPermission(key));
    const profileOk = (rule.perfis || []).some((name) => hasProfile(name));
    return permissionOk || profileOk;
  }

  return { isRouteAllowed, isActionAllowed };
}
