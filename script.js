const menuItems = [
  ["dashboard", "Dashboard", "DB"],
  ["pacientes", "Pacientes", "PA"],
  ["atendimentos", "Atendimentos", "AT"],
  ["painel-chamada", "Painel de Chamada", "CH"],
  ["risco", "Classificação de Risco", "CR"],
  ["triagem", "Triagem", "TR"],
  ["consulta", "Consulta", "CO"],
  ["enfermagem", "Enfermagem", "EN"],
  ["farmacia", "Farmácia", "FA"],
  ["exames", "Exames", "EX"],
  ["estabilizacao", "Sala de Estabilização", "SE"],
  ["observacao-clinica", "Observação Clínica", "OC"],
  ["observacao-pediatrica", "Observação Pediátrica", "OP"],
  ["observacao-obstetrica", "Observação Obstétrica", "OO"],
  ["transferencias", "Transferências", "TF"],
  ["indicadores", "Indicadores", "IN"],
  ["relatorios", "Relatórios", "RL"],
  ["configuracoes", "Configurações", "CF"],
  ["auditoria", "Auditoria", "AU"],
  ["sair", "Sair", "SA"]
];

const sectorOptions = [
  ["Porta de Entrada", "atendimentos"],
  ...menuItems.filter(([id]) => id !== "configuracoes" && id !== "sair").map(([id, label]) => [label, id])
];

// Etapa 2.1: mapa rota -> permissao/perfil necessario para o item aparecer
// no menu. "Administração" sempre ve tudo (curto-circuito em
// isRouteAllowed) e nao precisa ser listado aqui. "dashboard"/"sair" sao
// sempre visiveis para qualquer usuario autenticado, tambem fora deste mapa.
// Atencao: isto e controle de UX/visibilidade, NAO e controle de seguranca -
// a protecao real continua sendo RLS no banco (ver migrations de RLS).
const routePermissions = {
  pacientes: { permissoes: ["paciente.criar"], perfis: ["Recepção", "Técnico em Enfermagem", "Médico"] },
  atendimentos: { permissoes: ["atendimento.abrir"], perfis: ["Recepção", "Técnico em Enfermagem", "Médico", "Regulação de Transferência"] },
  "painel-chamada": { permissoes: ["atendimento.abrir"], perfis: ["Recepção", "Técnico em Enfermagem", "Médico"] },
  risco: { permissoes: ["triagem.classificar"], perfis: ["Técnico em Enfermagem"] },
  triagem: { permissoes: ["triagem.classificar"], perfis: ["Técnico em Enfermagem"] },
  consulta: { permissoes: ["consulta.iniciar", "consulta.registrar_conduta"], perfis: [] },
  enfermagem: { permissoes: ["enfermagem.evolucao.registrar"], perfis: ["Técnico em Enfermagem"] },
  farmacia: { permissoes: ["prescricao.dispensar", "estoque.movimentar"], perfis: ["Farmácia"] },
  exames: { permissoes: ["exame.visualizar", "exame.solicitar"], perfis: ["Técnico em RX"] },
  estabilizacao: { permissoes: [], perfis: ["Técnico em Enfermagem", "Médico"] },
  "observacao-clinica": { permissoes: ["observacao.reavaliar"], perfis: ["Técnico em Enfermagem", "Médico"] },
  "observacao-pediatrica": { permissoes: ["observacao.reavaliar"], perfis: ["Técnico em Enfermagem", "Médico"] },
  "observacao-obstetrica": { permissoes: ["observacao.reavaliar"], perfis: ["Técnico em Enfermagem", "Médico"] },
  transferencias: { permissoes: ["transferencia.solicitar", "transferencia.aprovar_vaga", "transferencia.confirmar_saida"], perfis: ["Regulação de Transferência"] },
  // Indicadores e Relatorios restritos somente a Administracao - perfis: []
  // e permissoes: [] fazem isRouteAllowed/isActionAllowed negarem para todo
  // mundo, exceto o curto-circuito de Administracao (hasPerfil("Administração")
  // em isRouteAllowed). Antes listavam perfis "Auditoria", "Gestão Hospitalar"
  // e "Leitura/Gestor" - os dois ultimos nunca existiram no seed real
  // (perfis_acesso), e Auditoria deixou de ter acesso por decisao de produto.
  indicadores: { permissoes: [], perfis: [] },
  relatorios: { permissoes: [], perfis: [] },
  configuracoes: { permissoes: ["configuracoes.gerenciar"], perfis: [] },
  // Auditoria: somente leitura de public.audit_log. Espelha a RLS real
  // (is_admin() or is_auditoria()) - perfil "Auditoria" listado aqui,
  // Administracao continua pelo curto-circuito de isRouteAllowed. Nenhum
  // outro perfil (Recepção, Técnico em Enfermagem, Médico, Farmácia,
  // Técnico em RX, Regulação de Transferência) deve acessar.
  auditoria: { permissoes: [], perfis: ["Auditoria"] }
};

const ALWAYS_VISIBLE_ROUTES = ["dashboard", "sair"];

// Decide se a rota deve aparecer no menu/ser navegavel, com base no
// perfil/permissoes REAIS carregados por window.GsiAuth (nunca no seletor
// simulado de "Modo de simulação operacional"). Enquanto a sessao ainda nao
// terminou de carregar (GsiAuth.isReady() === false), nao esconde nada, para
// evitar menu vazio/flicker - a filtragem real so entra em vigor apos o
// evento "gsiauth:ready".
function isRouteAllowed(routeId) {
  if (ALWAYS_VISIBLE_ROUTES.includes(routeId)) return true;

  if (!window.GsiAuth || typeof window.GsiAuth.isReady !== "function" || !window.GsiAuth.isReady()) {
    return true;
  }

  if (window.GsiAuth.hasPerfil("Administração")) return true;

  const rule = routePermissions[routeId];
  if (!rule) return true;

  const permissaoOk = (rule.permissoes || []).some((chave) => window.GsiAuth.hasPermission(chave));
  const perfilOk = (rule.perfis || []).some((nome) => window.GsiAuth.hasPerfil(nome));
  return permissaoOk || perfilOk;
}

// Etapa 2.2 (piloto): mesma logica de isRouteAllowed, mas para um botao/
// acao individual em vez de uma rota inteira. Recebe a regra diretamente
// (em vez de buscar num mapa por id) para permitir reuso em botoes que
// pertencem a mais de um modulo. Mesmo padrao: Administração sempre pode,
// fail-open enquanto a sessao nao carregou, nunca usa o seletor simulado de
// "Modo de simulação operacional".
function isActionAllowed(rule) {
  if (!rule) return true;

  if (!window.GsiAuth || typeof window.GsiAuth.isReady !== "function" || !window.GsiAuth.isReady()) {
    return true;
  }

  if (window.GsiAuth.hasPerfil("Administração")) return true;

  const permissaoOk = (rule.permissoes || []).some((chave) => window.GsiAuth.hasPermission(chave));
  const perfilOk = (rule.perfis || []).some((nome) => window.GsiAuth.hasPerfil(nome));
  return permissaoOk || perfilOk;
}

// Piloto da Etapa 2.2: regra de permissao para as actions do modulo
// Triagem/Classificacao (classify-risk, save-risk, open-triage-modal,
// save-triage, call-to-triage). Demais modulos permanecem sem gate nesta
// etapa.
const TRIAGEM_ACTION_RULE = { permissoes: ["triagem.classificar"], perfis: ["Técnico em Enfermagem"] };

// Expansao da Etapa 2.2: regras de permissao para as actions de
// Pacientes/Atendimentos (open-register-patient, save-patient, call-patient,
// start-care). view-patient e go-to-stage NAO recebem gate de proposito -
// sao leitura pura e navegacao para uma rota que ja tem seu proprio gate
// (Etapa 2.1).
const PACIENTE_CREATE_ACTION_RULE = { permissoes: ["paciente.criar"], perfis: ["Recepção"] };
const ATENDIMENTO_OPEN_ACTION_RULE = { permissoes: ["atendimento.abrir"], perfis: ["Recepção"] };

// Expansao da Etapa 2.2: regra para as actions exclusivas do modulo
// Enfermagem (open-nursing-modal, save-nursing-evolution). open-exam-request
// e open-prescription NAO recebem gate aqui de proposito - sao botoes
// reusados tambem em Consulta e Observacao, sem diferenciacao de contexto
// suficiente ainda (ver analise da expansao para Enfermagem).
const ENFERMAGEM_ACTION_RULE = { permissoes: ["enfermagem.evolucao.registrar"], perfis: ["Técnico em Enfermagem"] };

// Expansao da Etapa 2.2: regras para as actions exclusivas do modulo
// Consulta Medica. open-exam-request, open-prescription e
// open-transfer-request NAO recebem gate aqui de proposito - sao botoes
// reusados tambem em Enfermagem, Observacao, Estabilizacao e/ou no proprio
// modulo Transferencias, sem diferenciacao de contexto suficiente ainda.
const CONSULTA_INICIAR_ACTION_RULE = { permissoes: ["consulta.iniciar"], perfis: ["Médico"] };
const CONSULTA_CONDUTA_ACTION_RULE = { permissoes: ["consulta.registrar_conduta"], perfis: ["Médico"] };

// Expansao da Etapa 2.2: regra para as actions operacionais exclusivas do
// modulo Exames (start-collection, mark-in-progress, open-release-modal,
// save-exam-release, cancel-exam). view-exam-result e print-exam ficam de
// fora: leitura pura e utilitario sem escrita, respectivamente.
const EXAMES_GERENCIAR_ACTION_RULE = { permissoes: ["exame.liberar_resultado", "exame.marcar_critico"], perfis: ["Técnico em RX"] };

// Decisao de regra de negocio: Tecnico em Enfermagem NAO deve solicitar exame. O gate
// e por permissao/perfil real do usuario logado, nao por origem/contexto de
// onde o botao foi renderizado - por isso a mesma regra se aplica de forma
// uniforme em Consulta, Enfermagem e nas 3 paginas de Observacao (via
// observationQueueActions()), alem do proprio save-exam.
const EXAME_SOLICITAR_ACTION_RULE = { permissoes: ["exame.solicitar"], perfis: ["Médico"] };

// Expansao da Etapa 2.2: regras para as actions exclusivas de Farmacia/
// Estoque (rx-status, open-stock-item, save-stock). open-prescription e
// save-prescription NAO recebem gate aqui de proposito - sao compartilhados
// com Consulta/Enfermagem/Observacao e dependem de decisao de negocio
// pendente (mesmo padrao do caso de exame.solicitar). request-restock
// tambem fica de fora: e so um toast de simulacao, sem escrita real.
const PRESCRICAO_DISPENSAR_ACTION_RULE = { permissoes: ["prescricao.dispensar"], perfis: ["Farmácia"] };
const ESTOQUE_MOVIMENTAR_ACTION_RULE = { permissoes: ["estoque.movimentar"], perfis: ["Farmácia"] };

// Regra de negocio: Tecnico em Enfermagem nao deve encaminhar paciente da Observacao
// para a Sala de Estabilizacao pelo sistema - apenas Medico (e Administracao,
// pelo curto-circuito de isActionAllowed). Nao ha permissao granular no
// banco para esta acao (so existe estabilizacao.checklist_item, que e outra
// responsabilidade), por isso a regra usa somente perfil.
const OBSERVACAO_ENCAMINHAR_ESTABILIZACAO_ACTION_RULE = { perfis: ["Médico"] };

// Decisao de regra de negocio: Tecnico em Enfermagem (e Farmacia/Recepcao) nao deve
// prescrever medicacao - apenas Medico. O gate e por permissao/perfil real
// do usuario logado, nao por origem/contexto de onde o botao foi
// renderizado - por isso a mesma regra se aplica de forma uniforme em
// Consulta, Enfermagem e nas 3 paginas de Observacao (via
// observationQueueActions()), alem do proprio save-prescription. Mesmo
// padrao ja aplicado para exame.solicitar.
const PRESCRICAO_CRIAR_ACTION_RULE = { permissoes: ["prescricao.criar"], perfis: ["Médico"] };

// Regras de negocio: apenas Medico (e Administracao, pelo curto-circuito de
// isActionAllowed) deve solicitar transferencia e dar alta da observacao.
// transferencia.solicitar e o open-transfer-request/save-transfer mais
// compartilhado mapeado ate aqui - aparece em Consulta, nas 3 paginas de
// Observacao, em Estabilizacao e no proprio modulo Transferencias; a mesma
// regra se aplica de forma uniforme em todos esses pontos, por usuario, nao
// por origem. observacao.alta nao existe no banco - mesma abordagem ja usada
// em route-to-stabilization, regra so por perfil.
const TRANSFERENCIA_SOLICITAR_ACTION_RULE = { permissoes: ["transferencia.solicitar"], perfis: ["Médico"] };
const OBSERVACAO_ALTA_ACTION_RULE = { perfis: ["Médico"] };

// Etapa 2.2 — Regulação de Transferência: gates para actions pós-solicitação.
// TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE protege transfer-status (Aprovar vaga
// e Cancelar), transfer-checklist e confirm-transfer-checklist.
// TRANSFERENCIA_CONFIRMAR_SAIDA_ACTION_RULE protege transfer-departure, a
// action de maior impacto assistencial (encerra desfecho do paciente).
// Ambas as permissoes existem no seed (20260623100004_acesso.sql) e estao
// vinculadas ao perfil 'Regulação de Transferência'. Administração passa pelo
// curto-circuito de isActionAllowed, sem necessidade de ser listada aqui.
const TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE = {
  permissoes: ["transferencia.aprovar_vaga"],
  perfis: ["Regulação de Transferência"]
};
const TRANSFERENCIA_CONFIRMAR_SAIDA_ACTION_RULE = {
  permissoes: ["transferencia.confirmar_saida"],
  perfis: ["Regulação de Transferência"]
};

// Etapa 2.2 — Reavaliação de Observação e Estabilização.
// observacao.reavaliar existe no seed (20260623100004_acesso.sql) e está
// vinculada a Técnico em Enfermagem e Médico. A mesma chave cobre os módulos
// observacaoClinica, observacaoPediatrica, observacaoObstetrica e
// estabilizacao — todos usam open-observation-reassess-modal e
// save-observation-reassess com o campo 'modulo' determinando o destino.
const OBSERVACAO_REAVALIAR_ACTION_RULE = {
  permissoes: ["observacao.reavaliar"],
  perfis: ["Técnico em Enfermagem", "Médico"]
};

// Varredura final: reset-demo apaga e restaura TODOS os dados do prototipo -
// somente Administracao deve acionar. Sem permissoes (nao ha chave
// correspondente), apenas perfil.
const RESET_DEMO_ACTION_RULE = { perfis: ["Administração"] };

// Fase 2B (Configuracoes reais): configuracoes.gerenciar existe no seed e
// na RLS de public.configuracoes_sistema (migration
// 20260623100019_configuracoes_sistema.sql), vinculada apenas a
// Administracao - nenhum outro perfil (incluindo Auditoria) deve ler ou
// alterar.
const CONFIGURACOES_ACTION_RULE = {
  permissoes: ["configuracoes.gerenciar"],
  perfis: ["Administração"]
};

// Etapa 2.2 - Sala de Estabilizacao: estabilizacao.checklist_item existe no
// seed (20260623100004_acesso.sql) e na RLS (20260623100012_rls_policies.sql)
// vinculada apenas a Tecnico em Enfermagem - Medico pode consultar a Sala de
// Estabilizacao, mas nao recebe esta chave, entao nao deve marcar item do
// checklist (apenas visualizar).
const ESTABILIZACAO_CHECKLIST_ACTION_RULE = {
  permissoes: ["estabilizacao.checklist_item"],
  perfis: ["Técnico em Enfermagem"]
};

// Modulo Auditoria (Fase 1, somente leitura): nao existe policy de RLS
// usando has_permission('auditoria.visualizar') hoje - o acesso real a
// audit_log e' decidido por is_admin() or is_auditoria() (has_perfil
// ('Auditoria')). Por isso a regra aqui usa somente perfil, sem chave de
// permissao, espelhando exatamente a RLS vigente.
const AUDITORIA_ACTION_RULE = { perfis: ["Auditoria"] };

const operationalProfiles = [
  "Gestor/Administrador",
  "Médico",
  "Enfermeiro",
  "Técnico de Enfermagem",
  "Farmácia",
  "Laboratório/Exames",
  "Regulação/Transferências",
  "Recepção/Porta de Entrada"
];
const OPERATIONAL_PROFILE_KEY = "gsi_saude_perfil_operacional";

const riskClass = { Vermelho: "red", Laranja: "orange", Amarelo: "yellow", Verde: "green", Azul: "blue" };
let currentPage = window.location.hash.replace("#", "") || "dashboard";

const content = document.getElementById("appContent");
const sideNav = document.getElementById("sideNav");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const mobileMenu = document.getElementById("mobileMenu");
const sectorSelect = document.getElementById("sectorSelect");
const userMenuButton = document.getElementById("userMenuButton");
const userMenuPanel = document.getElementById("userMenuPanel");
const userMenuProfileBadge = document.getElementById("userMenuProfileBadge");
const userMenuProfileSelect = document.getElementById("userMenuProfileSelect");

const appModal = document.createElement("div");
appModal.className = "modal-root";
document.body.appendChild(appModal);

const toastRoot = document.createElement("div");
toastRoot.className = "toast-root";
document.body.appendChild(toastRoot);

const byId = (id) => document.getElementById(id);
const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
const normalizeText = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const isCanindeMunicipio = (value = "") => normalizeText(value) === "caninde de sao francisco";
const municipioUfLabel = (patient = {}) => [patient.municipio, patient.uf].filter(Boolean).join(" / ") || "-";

function data() {
  return {
    pacientes: GsiApi.list("pacientes"),
    atendimentos: GsiApi.list("atendimentos"),
    chamadas: GsiApi.list("chamadas"),
    exames: GsiApi.list("exames"),
    prescricoes: GsiApi.list("prescricoes"),
    transferencias: GsiApi.list("transferencias"),
    estoque: GsiApi.list("estoque")
  };
}

const accentedLabels = {
  "Critico": "Crítico",
  "Em execucao": "Em execução",
  "Em analise": "Em análise",
  "Resultado critico comunicado": "Resultado crítico comunicado",
  "Disponivel": "Disponível",
  "Aguardando imagem": "Aguardando imagem",
  "Em elaboracao": "Em elaboração",
  "Obstetricia": "Obstetrícia",
  "Sala de Estabilizacao": "Sala de Estabilização",
  "Ambulancia basica": "Ambulância básica",
  "Ambulancia avancada/SAMU": "Ambulância avançada/SAMU",
  "Substituicao": "Substituição",
  "Atencao": "Atenção",
  "Concluida": "Concluída"
};

function displayText(value) {
  if (value === undefined || value === null) return value;
  return accentedLabels[value] || value;
}

function tag(risk) {
  if (!risk) return '<span class="status warn">Pendente</span>';
  return `<span class="tag ${riskClass[risk] || "blue"}">${escapeHtml(risk)}</span>`;
}

function status(value) {
  const text = value || "Pendente";
  const cls = text.includes("Alta") || text.includes("Concluida") || text.includes("Autorizada") || text.includes("Dispensado") || text.includes("Resultado liberado") || text.includes("Adequado") || text.includes("concluida")
    ? "good"
    : text.includes("Critico") || text.includes("Em falta") || text.includes("Cancelado") || text.includes("Emergencia")
      ? "danger"
      : text.includes("Aguardando") || text.includes("pendente") || text.includes("Pendente") || text.includes("analise") || text.includes("Solicitado") || text.includes("Coletado") || text.includes("Separado") || text.includes("Substituicao") || text.includes("Atencao")
        ? "warn"
        : "";
  return `<span class="status ${cls}">${escapeHtml(displayText(text))}</span>`;
}

function actionButton(label, action, id = "", extra = "", cls = "") {
  return `<button class="table-action ${cls}" type="button" data-action="${action}" ${id ? `data-id="${id}"` : ""} ${extra}>${label}</button>`;
}

function pageHead(title, description, actionLabel = "", actionName = "") {
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">GSI ONE</span>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${actionLabel ? `<button class="action-button" type="button" data-action="${actionName}">${actionLabel}</button>` : ""}
    </div>
  `;
}

function metric(label, value, detail, tone = "") {
  const initials = label.split(" ").slice(0, 2).map((word) => word[0]).join("");
  return `
    <article class="metric-card ${tone}">
      <div class="metric-top"><small>${label}</small><i>${initials}</i></div>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>
  `;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function field(label, name, value = "", extra = "", textarea = false, required = true) {
  return `
    <label class="field ${extra}">
      <span>${label}${required ? " *" : ""}</span>
      ${textarea
        ? `<textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>`
        : `<input name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""}>`}
    </label>
  `;
}

function selectField(label, name, options, value = "", extra = "") {
  return `
    <label class="field ${extra}">
      <span>${label} *</span>
      <select name="${name}" required>
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </label>
  `;
}

function yesNoField(label, name, value = "Não") {
  return selectField(label, name, ["Não", "Sim"], value);
}

function numericFromText(value = "") {
  const match = String(value).replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function suggestRisk(values = {}) {
  const queixa = normalizeText(values.queixa || "");
  const dor = numericFromText(values.dor);
  const fc = numericFromText(values.fc);
  const fr = numericFromText(values.fr);
  const sat = numericFromText(values.sat);
  const temp = numericFromText(values.temp);
  const paSistolica = numericFromText(values.pa);
  const sim = (name) => values[name] === "Sim";

  if (
    sim("sinaisGravidade") ||
    sim("alteracaoConsciencia") ||
    (sim("faltaAr") && sat !== null && sat < 90) ||
    (sim("sangramentoAtivo") && (paSistolica !== null && paSistolica < 90)) ||
    (fr !== null && fr >= 32) ||
    (sat !== null && sat < 88)
  ) {
    return "Vermelho";
  }

  if (
    sim("dorToracica") ||
    sim("faltaAr") ||
    sim("dorIntensa") ||
    (dor !== null && dor >= 8) ||
    sim("traumaAcidente") ||
    (sim("gestante") && (sim("sangramentoAtivo") || sim("dorIntensa") || sim("febre"))) ||
    (fc !== null && fc >= 130) ||
    (fr !== null && fr >= 24) ||
    (sat !== null && sat < 94)
  ) {
    return "Laranja";
  }

  if (
    sim("febre") ||
    sim("vomitosDiarreia") ||
    (dor !== null && dor >= 4) ||
    (temp !== null && temp >= 38) ||
    (paSistolica !== null && paSistolica >= 180) ||
    (fc !== null && fc >= 110) ||
    sim("crianca")
  ) {
    return "Amarelo";
  }

  if (
    queixa.includes("receita") ||
    queixa.includes("renovacao") ||
    queixa.includes("renovação") ||
    queixa.includes("administrativa") ||
    queixa.includes("atestado")
  ) {
    return "Azul";
  }

  return "Verde";
}

function showToast(message, kind = "success") {
  const item = document.createElement("div");
  item.className = `toast ${kind}`;
  item.textContent = message;
  toastRoot.appendChild(item);
  setTimeout(() => item.remove(), 3400);
}

function openModal(title, body, footer = "") {
  appModal.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal"></div>
    <section class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="modal-head">
        <h2>${title}</h2>
        <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </header>
      <div class="modal-body">${body}</div>
      ${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}
    </section>
  `;
  appModal.classList.add("is-open");
  document.body.classList.add("modal-open");
}

function closeModal() {
  appModal.classList.remove("is-open");
  appModal.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function requireForm(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }
  return true;
}

// Fase 1 (Passo 1) - Pacientes reais no Supabase: infraestrutura de LEITURA
// apenas. Nao cria, nao atualiza, nao grava pacienteSupabaseId ainda - so
// permite que pacientes locais que JA tenham pacienteSupabaseId (definido
// manualmente ou em fase futura) sejam enriquecidos com o cadastro real,
// sem perder nenhum campo clinico local. Cadastro estavel apenas - status,
// classificacao, queixa, triagem, consulta, observacao, estabilizacao,
// transferencia, exames, prescricao e desfecho continuam 100% no GsiApi/
// localStorage, conforme escopo aprovado da Fase 1.
let pacientesReaisState = { loaded: false, loading: false, error: null, porId: {} };

// public.pacientes.data_nascimento vem como "YYYY-MM-DD" (tipo date do
// Postgres) - os objetos locais usam "DD/MM/AAAA" (ver initialData em
// api.js). Converte sem depender de fuso horario (evita off-by-one de
// new Date() em alguns navegadores para datas puras).
function formatDateBR(isoDate) {
  if (!isoDate) return "";
  const [ano, mes, dia] = String(isoDate).split("-");
  if (!ano || !mes || !dia) return String(isoDate);
  return `${dia}/${mes}/${ano}`;
}

async function loadPacientesReais() {
  if (pacientesReaisState.loading) return;
  if (!window.GsiAuth || !window.GsiAuth.client) {
    pacientesReaisState.error = "Sessão não carregada. Não foi possível buscar pacientes reais.";
    return;
  }
  pacientesReaisState.loading = true;
  pacientesReaisState.error = null;
  try {
    const { data, error } = await window.GsiAuth.client
      .from("pacientes")
      .select("id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia");
    if (error) throw error;
    const porId = {};
    (data || []).forEach((paciente) => { porId[paciente.id] = paciente; });
    pacientesReaisState.porId = porId;
    pacientesReaisState.loaded = true;
  } catch (err) {
    // Falha de rede/RLS/sessao nao deve impedir o uso do sistema local - o
    // protótipo continua 100% funcional com os dados de GsiApi/localStorage,
    // que nunca dependem deste carregamento.
    console.error("GSI Pacientes reais: erro ao carregar public.pacientes", err);
    pacientesReaisState.error = "Não foi possível sincronizar pacientes reais com o servidor.";
  } finally {
    pacientesReaisState.loading = false;
  }
}

// Mesma lista local de sempre, com os 7 campos de cadastro sobrescritos
// pelo registro real quando paciente.pacienteSupabaseId existir e estiver
// presente no cache ja carregado. Nenhum campo clinico e tocado - todo o
// resto do objeto local (status, classificacao, queixa, triagem, consulta,
// observacao*, estabilizacao, checklistEstabilizacao, evolucoesEnfermagem,
// desfecho etc.) permanece exatamente como esta no localStorage.
function listPacientesCompat() {
  const locais = GsiApi.list("pacientes");
  return locais.map((paciente) => {
    if (!paciente.pacienteSupabaseId) return paciente;
    const real = pacientesReaisState.porId[paciente.pacienteSupabaseId];
    if (!real) return paciente;
    return {
      ...paciente,
      nome: real.nome,
      nascimento: formatDateBR(real.data_nascimento),
      cpf: real.cpf,
      sus: real.cartao_sus,
      telefone: real.telefone,
      municipio: real.municipio,
      perfil: real.perfil_residencia
    };
  });
}

function patientById(id) {
  return listPacientesCompat().find((p) => p.id === id);
}

// Inverso de formatDateBR: formulario local usa "DD/MM/AAAA" (texto livre,
// sem input type=date), public.pacientes.data_nascimento exige "YYYY-MM-DD"
// (date, not null). Retorna null se o valor nao puder ser interpretado -
// quem chama decide o que fazer (aqui, createPacienteRealFromLocal lanca
// erro antes de tentar o insert, em vez de mandar uma data invalida pro banco).
function parseDateBRParaISO(dataBR) {
  const partes = String(dataBR || "").trim().split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  if (!/^\d{1,2}$/.test(dia) || !/^\d{1,2}$/.test(mes) || !/^\d{4}$/.test(ano)) return null;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

// Passo 2 (Fase 1) - cria APENAS o cadastro estavel em public.pacientes via
// window.GsiAuth.client (Supabase real) - nunca GsiApi, nunca service_role,
// nunca bypassa RLS (a policy pacientes_insert_recepcao_admin decide quem
// pode, este codigo so' tenta). Nao envia nenhum campo clinico/fluxo - so'
// os 7 campos de cadastro que realmente existem na tabela real. Lanca erro
// (nao retorna null/undefined) para o handler de save-patient decidir o
// que fazer em caso de falha - nunca cria fallback local silencioso aqui.
async function createPacienteRealFromLocal(payload) {
  if (!window.GsiAuth || !window.GsiAuth.client) {
    throw new Error("Sessão não carregada. Não foi possível cadastrar o paciente no servidor.");
  }
  const dataNascimentoIso = parseDateBRParaISO(payload.nascimento);
  if (!dataNascimentoIso) {
    throw new Error("Data de nascimento inválida. Use o formato DD/MM/AAAA.");
  }
  const { data, error } = await window.GsiAuth.client
    .from("pacientes")
    .insert({
      nome: payload.nome,
      data_nascimento: dataNascimentoIso,
      cpf: payload.cpf || null,
      cartao_sus: payload.sus || null,
      telefone: payload.telefone || null,
      municipio: payload.municipio,
      perfil_residencia: payload.perfil || null
    })
    .select("id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia")
    .single();
  if (error) throw error;
  return data;
}

// Passo 3 (Fase 1) - atualiza APENAS o cadastro estavel em public.pacientes
// (mesmos 7 campos de createPacienteRealFromLocal), nunca status/fluxo.
// pacienteLocal e' o objeto local completo (precisa de pacienteSupabaseId,
// quando existir) - payload e' o formulario de edicao (mesmos nomes de
// campo de save-patient: nome, nascimento, cpf, sus, telefone, municipio,
// perfil).
//
// Estrategia adotada para pacientes antigos sem pacienteSupabaseId:
// (B) cria o vinculo real agora, com os dados atuais do formulario de
// edicao, em vez de bloquear a edicao (A) ou ignorar pacientes antigos (C).
// E' seguro porque reaproveita createPacienteRealFromLocal sem nenhuma
// logica nova de insercao - o paciente local so' "ganha" pacienteSupabaseId
// uma unica vez (no primeiro update apos esta mudanca); a partir dai,
// toda edicao futura cai no ramo de UPDATE abaixo, sem risco de duplicar.
async function updatePacienteRealFromLocal(pacienteLocal, payload) {
  if (!pacienteLocal.pacienteSupabaseId) {
    return createPacienteRealFromLocal(payload);
  }
  if (!window.GsiAuth || !window.GsiAuth.client) {
    throw new Error("Sessão não carregada. Não foi possível atualizar o paciente no servidor.");
  }
  const dataNascimentoIso = parseDateBRParaISO(payload.nascimento);
  if (!dataNascimentoIso) {
    throw new Error("Data de nascimento inválida. Use o formato DD/MM/AAAA.");
  }
  const { data, error } = await window.GsiAuth.client
    .from("pacientes")
    .update({
      nome: payload.nome,
      data_nascimento: dataNascimentoIso,
      cpf: payload.cpf || null,
      cartao_sus: payload.sus || null,
      telefone: payload.telefone || null,
      municipio: payload.municipio,
      perfil_residencia: payload.perfil || null
    })
    .eq("id", pacienteLocal.pacienteSupabaseId)
    .select("id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia")
    .single();
  if (error) throw error;
  return data;
}

function setPatientTimeIfMissing(id, field) {
  const patient = patientById(id);
  if (!patient || patient[field]) return patient;
  return GsiApi.update("pacientes", id, {
    [field]: nowTime(),
    [`${field}Ts`]: Date.now()
  });
}

function resolveProfissional(setor, profissional) {
  if (profissional && profissional !== "A validar") return profissional;
  const texto = normalizeText(setor || "");
  if (texto.includes("triagem")) return "Enfermagem";
  if (texto.includes("consulta")) return "Equipe médica";
  return "Equipe assistencial";
}

function resolveSala(setor, sala) {
  if (sala && sala !== "A validar") return sala;
  const texto = normalizeText(setor || "");
  if (texto.includes("consulta")) return "Consultório Médico 1";
  return "A definir";
}

function createCallRecord({ pacienteId = "", paciente = "", setor = "Atendimento", destino = "", sala = "", profissional = "", status: callStatus = "Chamado" } = {}) {
  const p = pacienteId ? patientById(pacienteId) : null;
  const setorFinal = setor || destino || "Atendimento";
  return GsiApi.create("chamadas", {
    pacienteId,
    paciente: paciente || p?.nome || "Paciente fictício",
    setor: setorFinal,
    destino: destino || setorFinal,
    sala: resolveSala(setorFinal, sala),
    profissional: resolveProfissional(setorFinal, profissional),
    horario: nowTime(),
    status: callStatus || "Chamado"
  });
}

function normalizeCallRecord(call = {}) {
  const setor = call.setor || call.destino || "Atendimento";
  const sala = resolveSala(setor, call.sala);
  return {
    id: call.id || `${call.paciente || "Paciente"}-${setor}-${sala}-${call.horario || ""}`,
    paciente: call.paciente || "Paciente fictício",
    setor,
    sala,
    profissional: resolveProfissional(setor, call.profissional),
    horario: call.horario || "--:--",
    status: call.status || "Chamado"
  };
}

const callAudioStorageKey = "gsi_saude_audio_chamada";
const lastSpokenCallStorageKey = "gsi_saude_last_spoken_call_id";

function supportsCallAudio() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
}

function isCallAudioActive() {
  return localStorage.getItem(callAudioStorageKey) === "ativo";
}

function latestCallId() {
  const latest = GsiApi.list("chamadas")[0];
  return latest ? normalizeCallRecord(latest).id : "";
}

function markLatestCallAsSeen() {
  const id = latestCallId();
  if (id) localStorage.setItem(lastSpokenCallStorageKey, id);
}

function callAudioStatus() {
  if (!supportsCallAudio()) {
    return {
      label: "Áudio: indisponível",
      message: "Este navegador não oferece suporte ao áudio automático do painel.",
      active: false,
      supported: false
    };
  }
  return {
    label: `Áudio: ${isCallAudioActive() ? "ativado" : "desativado"}`,
    message: "",
    active: isCallAudioActive(),
    supported: true
  };
}

function speakText(text) {
  if (!supportsCallAudio()) return false;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

function speakCall(chamada) {
  if (!supportsCallAudio() || !chamada) return false;
  const call = normalizeCallRecord(chamada);
  const setor = normalizeText(call.setor);
  const sala = call.sala && call.sala !== "A definir" ? call.sala : call.setor;
  let text = `Paciente ${call.paciente}, dirigir-se a ${sala}.`;
  if (setor.includes("triagem")) {
    text = `Paciente ${call.paciente}, dirigir-se à Sala de Triagem.`;
  } else if (setor.includes("consulta")) {
    text = `Paciente ${call.paciente}, dirigir-se ao ${sala || "Consultório"}.`;
  }
  return speakText(text);
}

function announceLatestCallIfNeeded() {
  if (!isCallAudioActive() || !supportsCallAudio()) return;
  const latest = GsiApi.list("chamadas")[0];
  if (!latest) return;
  const call = normalizeCallRecord(latest);
  const lastSpoken = localStorage.getItem(lastSpokenCallStorageKey);
  if (call.id === lastSpoken) return;
  if (speakCall(latest)) localStorage.setItem(lastSpokenCallStorageKey, call.id);
}

function patientName(id) {
  return patientById(id)?.nome || "Paciente fictício";
}

function dashboard() {
  const d = data();
  const waiting = d.pacientes.filter((p) => p.status.includes("Aguardando")).length;
  const red = d.pacientes.filter((p) => p.classificacao === "Vermelho").length;
  const pendingRx = d.prescricoes.filter((p) => p.status === "Pendente").length;
  const waitingExams = d.exames.filter((e) => e.status === "Aguardando coleta").length;
  const criticalResults = d.exames.filter((e) => e.prioridade === "Emergência").length;
  const estoqueCritico = d.estoque.filter((s) => s.situacao === "Critico").length;
  const riskCounts = ["Vermelho", "Laranja", "Amarelo", "Verde", "Azul"].map((r) => [r, d.pacientes.filter((p) => p.classificacao === r).length, `bar-${riskClass[r]}`]);

  const prescricoesTotal = d.prescricoes.length;
  const prescricoesDispensadas = d.prescricoes.filter((p) => p.status === "Dispensado").length;
  const percentualDispensado = prescricoesTotal ? Math.round((prescricoesDispensadas / prescricoesTotal) * 100) : null;

  const examesTotal = d.exames.length;
  const examesLiberados = d.exames.filter((e) => e.status === "Resultado liberado").length;
  const percentualLiberado = examesTotal ? Math.round((examesLiberados / examesTotal) * 100) : null;

  const pacientesTotal = d.pacientes.length;
  const pacientesTriados = d.pacientes.filter((p) => p.horaFimTriagem).length;
  const percentualTriados = pacientesTotal ? Math.round((pacientesTriados / pacientesTotal) * 100) : null;

  return `
    ${pageHead("Dashboard", "Visão operacional da porta de entrada, classificação de risco, farmácia, exames, observação e transferências.")}
    <section class="executive-hero">
      <div>
        <span class="eyebrow">Painel executivo</span>
        <h2>Fluxo assistencial monitorado em tempo real</h2>
        <p>Ambiente demonstrativo com armazenamento local temporário, preparado para evoluir para API, banco de dados e integrações oficiais.</p>
      </div>
      <div class="hero-kpis">
        <article><small>Pacientes triados</small><strong>${percentualTriados === null ? "--" : `${percentualTriados}%`}</strong></article>
        <article><small>Prescrições dispensadas</small><strong>${percentualDispensado === null ? "--" : `${percentualDispensado}%`}</strong></article>
        <article><small>Resultados liberados</small><strong>${percentualLiberado === null ? "--" : `${percentualLiberado}%`}</strong></article>
      </div>
    </section>
    <p class="dashboard-row-label">Atenção imediata</p>
    <section class="grid stats-grid">
      ${metric("Casos vermelhos", String(red).padStart(2, "0"), "Atenção imediata", "danger")}
      ${metric("Resultados críticos", criticalResults, "Comunicação pendente", "danger")}
      ${metric("Estoque crítico", String(estoqueCritico).padStart(2, "0"), "Medicamentos", "danger")}
      ${metric("Pacientes em espera", waiting, "Fila ativa")}
    </section>
    <p class="dashboard-row-label">Operação do dia</p>
    <section class="grid stats-grid">
      ${metric("Atendimentos hoje", d.atendimentos.length, "Total registrado", "primary")}
      ${metric("Transferências em andamento", d.transferencias.length, "Regulação")}
      ${metric("Prescrições pendentes", pendingRx, "Farmácia", "warning")}
      ${metric("Exames aguardando coleta", waitingExams, "Laboratório")}
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Fila por classificação de risco</h2>
        ${barChart(riskCounts)}
      </div>
      <div class="panel">
        <h2>Alertas de gestão</h2>
        <ul class="list alert-list">
          <li>${pendingRx} prescrição(ões) pendente(s) aguardando dispensação.</li>
          <li>${waitingExams} exame(s) aguardando coleta ou imagem.</li>
          <li>${d.transferencias.length} transferência(s) em andamento exigindo checklist completo.</li>
        </ul>
      </div>
    </section>
  `;
}

function riskBar(label, value, cls) {
  return `<div class="risk-row"><strong>${label}</strong><div class="bar-track"><span class="bar-fill ${cls}" style="width:${value}%"></span></div><span>${value}</span></div>`;
}

function barChart(items, wide = false) {
  const max = Math.max(1, ...items.map(([, count]) => count));
  const wrapClass = wide ? "obs-bars" : "risk-bars";
  const rowClass = wide ? "obs-bar-row" : "risk-row";
  return `<div class="${wrapClass}">${items.map(([label, count, cls]) => `<div class="${rowClass}"><strong>${escapeHtml(label)}</strong><div class="bar-track"><span class="bar-fill ${cls}" style="width:${Math.round((count / max) * 100)}%"></span></div><span>${count}</span></div>`).join("")}</div>`;
}

function countBy(list, field) {
  const counts = {};
  list.forEach((item) => {
    const label = displayText(item[field]) || "Não informado";
    counts[label] = (counts[label] || 0) + 1;
  });
  const palette = ["bar-blue", "bar-green", "bar-yellow", "bar-orange", "bar-red"];
  return Object.entries(counts).map(([label, count], i) => [label, count, palette[i % palette.length]]);
}

function patientTimesCell(patient) {
  const clockToMinutes = (value = "") => {
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const atendimentos = GsiApi.list("atendimentos");
  const atendimento = atendimentos.find((item) => item.pacienteId === patient.id) || {};
  const transferencia = GsiApi.list("transferencias").find((item) => item.pacienteId === patient.id) || {};
  const semRegistro = "sem registro";
  const chegada = patient.horaChegada || atendimento.chegada || semRegistro;
  const triagem = patient.horaFimTriagem || patient.horaInicioTriagem || semRegistro;
  const consulta = patient.horaInicioConsulta || atendimento.inicioConsulta || semRegistro;
  const transferenciaSaida = transferencia.saida && transferencia.saida !== "--" ? transferencia.saida : "";
  const desfecho = patient.horaDesfecho || transferenciaSaida || semRegistro;
  const chegadaMin = clockToMinutes(chegada);
  const desfechoMin = clockToMinutes(desfecho);
  const permanenciaCalculada = chegadaMin !== null && desfechoMin !== null ? formatElapsed((desfechoMin - chegadaMin) * 60000) : "";
  const permanencia = patient.tempoPermanencia || patient.permanenciaTotal || patient.tempoTotal || permanenciaCalculada || (chegada !== semRegistro && desfecho === semRegistro ? "em andamento" : semRegistro);
  return `
    <div class="time-stack">
      <div><strong>Chegada:</strong> ${escapeHtml(chegada)}</div>
      <div><strong>Triagem:</strong> ${escapeHtml(triagem)}</div>
      <div><strong>Consulta:</strong> ${escapeHtml(consulta)}</div>
      <div><strong>Desfecho:</strong> ${escapeHtml(desfecho)}</div>
      <div><strong>Permanência:</strong> ${escapeHtml(permanencia)}</div>
    </div>
  `;
}

function patientActionsCell(p) {
  return `<div class="actions queue-actions queue-actions-grid">
    ${actionButton("Ver prontuário", "view-patient", p.id, "", "queue-action queue-action-primary")}
  </div>`;
}

function isPatientOperationalVisible(patient = {}) {
  if (!patient.horaDesfechoFinalTs) return true;
  return Date.now() - Number(patient.horaDesfechoFinalTs) < 24 * 60 * 60 * 1000;
}

function isPatientActiveCare(patient = {}) {
  if (!patient?.id) return true;
  const finalTerms = ["alta", "alta apos consulta", "transferencia regulada", "transferido", "obito", "evasao", "desistencia", "evasao/desistencia"];
  const text = normalizeText(`${patient.status || ""} ${patient.desfecho || ""} ${patient.desfechoFinal || ""}`);
  if (patient.horaDesfechoFinal || patient.horaDesfechoFinalTs) return false;
  return !finalTerms.some((term) => text.includes(term));
}

function pacientes() {
  const list = GsiApi.list("pacientes").filter(isPatientOperationalVisible);
  const rows = list.map((p) => [
    escapeHtml(p.nome),
    escapeHtml(p.nascimento),
    escapeHtml(municipioUfLabel(p)),
    escapeHtml(p.cpf),
    escapeHtml(p.sus),
    tag(p.classificacao),
    status(p.status),
    patientTimesCell(p),
    patientActionsCell(p)
  ]);
  const podeCadastrarPaciente = isActionAllowed(PACIENTE_CREATE_ACTION_RULE);
  return `
    ${pageHead(
      "Pacientes",
      "Cadastro demonstrativo com busca, chamada, atendimento e classificação de risco.",
      podeCadastrarPaciente ? "Registrar paciente" : "",
      podeCadastrarPaciente ? "open-register-patient" : ""
    )}
    <div class="toolbar">
      <input class="search-box" id="patientSearch" type="search" placeholder="Buscar paciente, CPF ou Cartão SUS">
      ${isActionAllowed(RESET_DEMO_ACTION_RULE) ? '<button class="secondary-action" type="button" data-action="reset-demo">Restaurar dados demo</button>' : ""}
    </div>
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Pacientes cadastrados <span class="queue-count">${list.length}</span></h2>
      <div id="patientsTable" class="queue-table patients-table">${table(["Nome", "Nascimento", "Município/UF", "CPF", "Cartão SUS", "Classificação", "Status", "Tempos", "Ação"], rows)}</div>
    </section>
  `;
}

function atendimentos() {
  const list = GsiApi.list("atendimentos");
  const rows = list.map((a) => {
    const patient = patientById(a.pacienteId);
    return [
      `${escapeHtml(patient?.nome || a.paciente || "Paciente fictício")}${a.motivo ? `<br><span class="muted">${escapeHtml(a.motivo)}</span>` : ""}`,
      escapeHtml(a.chegada || nowTime()),
      tag(patient?.classificacao),
      escapeHtml(a.profissional || "Profissional de plantão"),
      status(a.status),
      escapeHtml(a.espera || "00:00"),
      `<div class="actions queue-actions queue-actions-grid">
        ${actionButton("Ver prontuário", "view-patient", a.pacienteId || "", "", "queue-action queue-action-primary")}
        ${actionButton("Ir para etapa", "go-to-stage", a.pacienteId || "", "", "queue-action")}
      </div>`
    ];
  });
  return `
    ${pageHead("Atendimentos", "Fila assistencial para acompanhamento e direcionamento do fluxo.")}
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Fila de atendimentos <span class="queue-count">${list.length}</span></h2>
      ${list.length
        ? `<div class="queue-table care-table">${table(["Paciente", "Chegada", "Risco", "Profissional responsável", "Status", "Tempo de espera", "Ação"], rows)}</div>`
        : '<p class="muted">Nenhum atendimento registrado no momento.</p>'}
    </section>
  `;
}

function atendimentosOperational() {
  const list = GsiApi.list("atendimentos").filter((a) => isPatientActiveCare(patientById(a.pacienteId)));
  const rows = list.map((a) => {
    const patient = patientById(a.pacienteId);
    const stage = atendimentoStageInfo(a, patient);
    return [
      `${escapeHtml(patient?.nome || a.paciente || "Paciente fictício")}${a.motivo ? `<br><span class="muted">${escapeHtml(a.motivo)}</span>` : ""}`,
      escapeHtml(a.chegada || patient?.horaChegada || "Sem registro"),
      tag(patient?.classificacao),
      escapeHtml(stage.label),
      status(patient?.status || a.status),
      escapeHtml(stage.timeInStage),
      escapeHtml(stage.totalStay),
      escapeHtml(stage.responsible),
      `<div class="actions queue-actions queue-actions-grid">
        ${actionButton("Ver prontuário", "view-patient", a.pacienteId || "", "", "queue-action queue-action-primary")}
        ${actionButton("Ir para etapa", "go-to-stage", a.pacienteId || "", `data-page="${stage.page}"`, "queue-action")}
      </div>`
    ];
  });
  return `
    ${pageHead("Atendimentos", "Central operacional para acompanhamento dos atendimentos ativos e direcionamento aos módulos assistenciais.")}
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Atendimentos ativos <span class="queue-count">${list.length}</span></h2>
      ${list.length
        ? `<div class="queue-table care-table">${table(["Paciente", "Chegada", "Risco", "Etapa atual", "Status atual", "Tempo na etapa", "Permanência total", "Responsável/setor", "Ação"], rows)}</div>`
        : '<p class="muted">Nenhum atendimento registrado no momento.</p>'}
    </section>
  `;
}

function atendimentoStageInfo(atendimento = {}, patient = {}) {
  const safePatient = patient || {};
  const statusText = `${safePatient.status || ""} ${safePatient.desfecho || ""} ${atendimento.status || ""}`;
  const normalized = normalizeText(statusText);
  const transfer = GsiApi.list("transferencias").find((item) => item.pacienteId === safePatient.id && isTransferInProgress(item));
  let label = safePatient.status || atendimento.status || "Em acompanhamento";
  let page = "pacientes";
  let startTs = safePatient.horaChegadaTs;
  let startClock = safePatient.horaChegada || atendimento.chegada || "";

  if (transfer) {
    label = "Transferência em andamento";
    page = "transferencias";
    startTs = transfer.horaSolicitacaoTransferenciaTs || startTs;
    startClock = transfer.horaSolicitacaoTransferencia || transfer.horario || startClock;
  } else if (safePatient.estabilizacao || normalized.includes("estabilizacao")) {
    label = "Sala de Estabilização";
    page = "estabilizacao";
    startTs = safePatient.estabilizacao?.inicioTimestamp || startTs;
    startClock = safePatient.estabilizacao?.inicio || startClock;
  } else if (safePatient.observacaoObstetrica || normalized.includes("obstetr")) {
    label = "Observação obstétrica";
    page = "observacao-obstetrica";
    startTs = safePatient.observacaoObstetrica?.inicioTimestamp || startTs;
    startClock = safePatient.observacaoObstetrica?.inicio || startClock;
  } else if (safePatient.observacaoPediatrica || normalized.includes("pediatr")) {
    label = "Observação pediátrica";
    page = "observacao-pediatrica";
    startTs = safePatient.observacaoPediatrica?.inicioTimestamp || startTs;
    startClock = safePatient.observacaoPediatrica?.inicio || startClock;
  } else if (safePatient.observacaoClinica || normalized.includes("observacao")) {
    label = "Observação clínica";
    page = "observacao-clinica";
    startTs = safePatient.observacaoClinica?.inicioTimestamp || startTs;
    startClock = safePatient.observacaoClinica?.inicio || startClock;
  } else if (normalized.includes("enferm") || normalized.includes("medicacao")) {
    label = "Enfermagem/medicação";
    page = "enfermagem";
  } else if (normalized.includes("consulta")) {
    label = normalized.includes("aguardando") ? "Aguardando consulta" : "Em consulta";
    page = "consulta";
    startTs = safePatient.horaInicioConsultaTs || safePatient.horaFimTriagemTs || startTs;
    startClock = safePatient.horaInicioConsulta || safePatient.horaFimTriagem || startClock;
  } else if (normalized.includes("triagem")) {
    label = normalized.includes("aguardando") ? "Aguardando triagem" : "Em triagem";
    page = "triagem";
    startTs = safePatient.horaInicioTriagemTs || startTs;
    startClock = safePatient.horaInicioTriagem || startClock;
  }

  const chegada = safePatient.horaChegada || atendimento.chegada || "";
  return {
    label,
    page,
    timeInStage: formatWaitTime(startTs, startClock),
    totalStay: safePatient.horaChegadaTs || chegada ? totalStayValue(safePatient, chegada, safePatient.horaDesfechoFinal || safePatient.horaDesfecho || "") : "Sem registro",
    responsible: atendimento.profissional || safePatient.profissionalResponsavel || stageResponsible(page)
  };
}

function stageResponsible(page = "") {
  const labels = {
    triagem: "Triagem",
    consulta: "Consulta",
    enfermagem: "Enfermagem",
    "observacao-clinica": "Observação Clínica",
    "observacao-pediatrica": "Observação Pediátrica",
    "observacao-obstetrica": "Observação Obstétrica",
    estabilizacao: "Sala de Estabilização",
    transferencias: "Regulação/Transferências",
    pacientes: "Equipe de plantão"
  };
  return labels[page] || "Equipe de plantão";
}

function painelChamada() {
  const calls = GsiApi.list("chamadas");
  const latest = normalizeCallRecord(calls[0]);
  const rows = calls.slice(0, 10).map((call) => {
    const c = normalizeCallRecord(call);
    return [escapeHtml(c.horario), escapeHtml(c.paciente), escapeHtml(c.setor), escapeHtml(c.sala), escapeHtml(c.profissional), status(c.status)];
  });
  return `
    ${pageHead("Painel de Chamada", "Tela pública simulada para exibição de paciente, sala, profissional e últimos chamados.")}
    <section class="toolbar">
      <button class="secondary-action" type="button" data-action="open-tv-panel">Abrir modo TV</button>
    </section>
    ${calls.length ? `
      <section class="call-panel">
        <div>
          <span>Última chamada</span>
          <strong>${escapeHtml(latest.paciente)}</strong>
          <p>Setor: ${escapeHtml(latest.setor)} | Sala/local: ${escapeHtml(latest.sala)} | Profissional: ${escapeHtml(latest.profissional)}</p>
          <p>${status(latest.status)}</p>
        </div>
        <time>${escapeHtml(latest.horario)}</time>
      </section>
      <section class="panel section-gap">
        <h2>Chamadas recentes</h2>
        ${table(["Horário", "Paciente", "Setor", "Sala/local", "Profissional", "Status"], rows)}
      </section>
    ` : '<section class="panel"><p class="muted">Nenhuma chamada registrada até o momento.</p></section>'}
  `;
}

function painelTv() {
  const calls = GsiApi.list("chamadas");
  const latest = normalizeCallRecord(calls[0]);
  const recent = calls.slice(0, 5).map(normalizeCallRecord);
  const audio = callAudioStatus();
  return `
    <main class="tv-panel">
      <header class="tv-header">
        <span>Hospital Municipal Haydée Carvalho Leite Santos</span>
        <strong>GSI ONE</strong>
        <h1>Painel de Chamada</h1>
        <div class="tv-audio-control">
          <span class="${audio.active ? "is-active" : ""}">${audio.label}</span>
          ${audio.supported ? `
            <button type="button" data-action="enable-call-audio">Ativar áudio</button>
            <button type="button" data-action="disable-call-audio">Desativar áudio</button>
          ` : ""}
        </div>
        ${audio.message ? `<p class="tv-audio-message">${audio.message}</p>` : ""}
      </header>
      ${calls.length ? `
        <section class="tv-call-card">
          <span>Última chamada</span>
          <strong>${escapeHtml(latest.paciente)}</strong>
          <div class="tv-call-grid">
            <p><small>Setor</small>${escapeHtml(latest.setor)}</p>
            <p><small>Sala/local</small>${escapeHtml(latest.sala)}</p>
            <p><small>Profissional</small>${escapeHtml(latest.profissional)}</p>
            <p><small>Horário</small>${escapeHtml(latest.horario)}</p>
          </div>
          <div class="tv-status">${status(latest.status)}</div>
        </section>
        <section class="tv-recent">
          <h2>Últimas chamadas</h2>
          <div class="tv-recent-list">
            ${recent.map((call) => `
              <article>
                <time>${escapeHtml(call.horario)}</time>
                <strong>${escapeHtml(call.paciente)}</strong>
                <span>${escapeHtml(call.setor)} • ${escapeHtml(call.sala)} • ${escapeHtml(call.profissional)}</span>
              </article>
            `).join("")}
          </div>
        </section>
      ` : '<section class="tv-empty">Nenhuma chamada registrada até o momento.</section>'}
    </main>
  `;
}

function classificacao() {
  const pacientes = GsiApi.list("pacientes");
  const waiting = pacientes.filter((p) => !p.classificacao);
  const riskLevels = ["Vermelho", "Laranja", "Amarelo", "Verde", "Azul"];
  const summaryRows = riskLevels.map((risk) => [
    tag(risk),
    escapeHtml(riskDescription(risk)),
    escapeHtml(riskTargetTime(risk)),
    pacientes.filter((p) => p.classificacao === risk).length
  ]);
  return `
    ${pageHead("Classificação de Risco", "Painel de apoio, orientação e monitoramento da priorização assistencial em modelo institucional de 5 níveis.")}
    <section class="panel">
      <p class="muted">A classificação final deve ser registrada na Triagem por profissional habilitado, conforme protocolo institucional validado.</p>
    </section>
    <section class="grid risk-scale">
      ${riskLevels.map((r) => `<article class="risk-card ${riskClass[r]}"><h3>${r}</h3><p>${riskDescription(r)}</p><strong>${riskTargetTime(r)}</strong></article>`).join("")}
    </section>
    <section class="panel section-gap">
      <h2>Resumo por classificação final</h2>
      ${table(["Classificação", "Descrição", "Tempo-alvo", "Pacientes"], summaryRows)}
    </section>
    <section class="panel section-gap">
      <h2>Pacientes pendentes de classificação</h2>
      ${waiting.length
        ? table(["Paciente", "Queixa principal", "Status", "Ação"], waiting.map((p) => [escapeHtml(p.nome), escapeHtml(p.queixa), status(p.status), isActionAllowed(TRIAGEM_ACTION_RULE) ? actionButton("Abrir triagem", "open-triage-modal", p.id) : '<span class="muted">Sem permissão</span>']))
        : '<p class="muted">Nenhum paciente pendente de classificação de risco.</p>'}
    </section>
  `;
}

function riskDescription(risk) {
  return ({ Vermelho: "Emergência, risco imediato.", Laranja: "Muito urgente, sinais de alerta importantes.", Amarelo: "Urgente, avaliação prioritária.", Verde: "Pouco urgente, sinais estáveis.", Azul: "Não urgente, demanda sem sinais de gravidade." })[risk];
}

function riskTargetTime(risk) {
  return ({ Vermelho: "Imediato", Laranja: "Até 10 min", Amarelo: "Até 60 min", Verde: "Até 120 min", Azul: "Até 240 min" })[risk];
}

function triagem() {
  const waiting = GsiApi.list("pacientes").filter((p) => p.status === "Aguardando triagem");
  const rows = waiting.map((p) => [
    escapeHtml(p.nome), escapeHtml(p.queixa), tag(p.classificacao), status(p.status),
    `<div class="actions">
      ${isActionAllowed(TRIAGEM_ACTION_RULE) ? `
        ${actionButton("Chamar para triagem", "call-to-triage", p.id)}
        ${actionButton("Iniciar triagem", "open-triage-modal", p.id)}
      ` : '<span class="muted">Sem permissão para triagem</span>'}
    </div>`
  ]);
  return `
    ${pageHead("Triagem", "Pacientes aguardando triagem, com registro de sinais vitais e classificação de risco.")}
    ${waiting.length
      ? table(["Paciente", "Queixa principal", "Classificação", "Status", "Ação"], rows)
      : '<div class="panel"><p class="muted">Nenhum paciente aguardando triagem no momento.</p></div>'}
  `;
}

function openTriageModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  const savedRiskSupport = p.triagemRisco || {};
  const savedVitals = p.sinaisVitais || {};
  const savedAlerts = savedRiskSupport.alertasClinicos || {};
  const initialValues = {
    queixa: p.queixa || "",
    profissionalTriagem: savedRiskSupport.profissional || "",
    categoriaProfissionalTriagem: savedRiskSupport.categoriaProfissional || "",
    registroProfissionalTriagem: savedRiskSupport.registroProfissional || "",
    possuiAlergia: savedAlerts.possuiAlergia || "Não informado",
    alergiasDescricao: savedAlerts.alergiasDescricao || "",
    usaMedicacaoContinua: savedAlerts.usaMedicacaoContinua || "Não informado",
    medicamentosUsoContinuo: savedAlerts.medicamentosUsoContinuo || "",
    possuiComorbidades: savedAlerts.possuiComorbidades || "Não informado",
    comorbidadesDescricao: savedAlerts.comorbidadesDescricao || "",
    tratamentoEmAndamento: savedAlerts.tratamentoEmAndamento || "Não informado",
    tratamentoDescricao: savedAlerts.tratamentoDescricao || "",
    usouMedicacaoAntes: savedAlerts.usouMedicacaoAntes || "Não informado",
    medicacaoAntesDescricao: savedAlerts.medicacaoAntesDescricao || "",
    gestacaoSuspeita: savedAlerts.gestacaoSuspeita || savedRiskSupport.gestante || "Não informado",
    pa: savedVitals.pa || "120/80 mmHg",
    fc: savedVitals.fc || "88 bpm",
    fr: savedVitals.fr || "18 irpm",
    sat: savedVitals.sat || "97%",
    temp: savedVitals.temp || "36,8 C",
    glicemia: savedVitals.glicemia || "98 mg/dL",
    dor: savedVitals.dor || "0",
    sinaisGravidade: savedRiskSupport.sinaisGravidade || "Não",
    dorToracica: savedRiskSupport.dorToracica || "Não",
    faltaAr: savedRiskSupport.faltaAr || "Não",
    alteracaoConsciencia: savedRiskSupport.alteracaoConsciencia || "Não",
    sangramentoAtivo: savedRiskSupport.sangramentoAtivo || "Não",
    traumaAcidente: savedRiskSupport.traumaAcidente || "Não",
    febre: savedRiskSupport.febre || "Não",
    vomitosDiarreia: savedRiskSupport.vomitosDiarreia || "Não",
    gestante: savedRiskSupport.gestante || "Não",
    crianca: savedRiskSupport.crianca || "Não",
    dorIntensa: savedRiskSupport.dorIntensa || "Não"
  };
  const suggestedRisk = savedRiskSupport.classificacaoSugerida || suggestRisk(initialValues);
  openModal("Triagem - " + p.nome, `
    <section class="panel triage-guidance">
      <span class="eyebrow">Classificação de Risco em 5 níveis — Protocolo institucional a validar</span>
      <p class="muted">Ferramenta demonstrativa de apoio à classificação de risco. A decisão final deve ser realizada por profissional habilitado, conforme protocolo institucional validado.</p>
    </section>
    <form id="triageForm" class="form-grid">
      <p class="field full"><span>Profissional responsável pela triagem</span>Identificação do profissional que confirma a classificação final.</p>
      ${field("Nome do profissional da triagem", "profissionalTriagem", initialValues.profissionalTriagem)}
      ${field("Categoria profissional", "categoriaProfissionalTriagem", initialValues.categoriaProfissionalTriagem, "", false, false)}
      ${field("Registro profissional", "registroProfissionalTriagem", initialValues.registroProfissionalTriagem, "", false, false)}
      ${field("Queixa principal", "queixa", initialValues.queixa, "full")}
      <p class="field full"><span>Alertas clínicos</span>Dados mínimos para segurança da prescrição e continuidade do cuidado.</p>
      ${selectField("Possui alergia?", "possuiAlergia", ["Não informado", "Não", "Sim"], initialValues.possuiAlergia)}
      ${field("Descrição da alergia", "alergiasDescricao", initialValues.alergiasDescricao, "", false, false)}
      ${selectField("Faz uso de medicação contínua?", "usaMedicacaoContinua", ["Não informado", "Não", "Sim"], initialValues.usaMedicacaoContinua)}
      ${field("Medicamentos de uso contínuo", "medicamentosUsoContinuo", initialValues.medicamentosUsoContinuo, "full", true, false)}
      ${selectField("Possui comorbidades?", "possuiComorbidades", ["Não informado", "Não", "Sim"], initialValues.possuiComorbidades)}
      ${field("Quais comorbidades?", "comorbidadesDescricao", initialValues.comorbidadesDescricao, "full", true, false)}
      ${selectField("Está em tratamento atualmente?", "tratamentoEmAndamento", ["Não informado", "Não", "Sim"], initialValues.tratamentoEmAndamento)}
      ${field("Qual tratamento?", "tratamentoDescricao", initialValues.tratamentoDescricao, "full", true, false)}
      ${selectField("Usou medicação antes de chegar?", "usouMedicacaoAntes", ["Não informado", "Não", "Sim"], initialValues.usouMedicacaoAntes)}
      ${field("Medicação usada e horário", "medicacaoAntesDescricao", initialValues.medicacaoAntesDescricao, "full", true, false)}
      ${selectField("Gestação ou suspeita de gestação", "gestacaoSuspeita", ["Não informado", "Não se aplica", "Não", "Sim"], initialValues.gestacaoSuspeita)}
      <p class="field full"><span>Sinais, sintomas e classificação</span>O sistema sugere; o enfermeiro classifica.</p>
      ${yesNoField("Sinais de gravidade", "sinaisGravidade", initialValues.sinaisGravidade)}
      ${yesNoField("Dor torácica", "dorToracica", initialValues.dorToracica)}
      ${yesNoField("Falta de ar", "faltaAr", initialValues.faltaAr)}
      ${yesNoField("Alteração do nível de consciência", "alteracaoConsciencia", initialValues.alteracaoConsciencia)}
      ${yesNoField("Sangramento ativo", "sangramentoAtivo", initialValues.sangramentoAtivo)}
      ${yesNoField("Trauma/acidente", "traumaAcidente", initialValues.traumaAcidente)}
      ${yesNoField("Febre", "febre", initialValues.febre)}
      ${yesNoField("Vômitos/diarreia", "vomitosDiarreia", initialValues.vomitosDiarreia)}
      ${yesNoField("Gestante", "gestante", initialValues.gestante)}
      ${yesNoField("Criança", "crianca", initialValues.crianca)}
      ${yesNoField("Dor intensa", "dorIntensa", initialValues.dorIntensa)}
      ${field("Pressão arterial", "pa", initialValues.pa)}
      ${field("Frequência cardíaca", "fc", initialValues.fc)}
      ${field("Frequência respiratória", "fr", initialValues.fr)}
      ${field("Saturação", "sat", initialValues.sat)}
      ${field("Temperatura", "temp", initialValues.temp)}
      ${field("Glicemia, se aplicável", "glicemia", initialValues.glicemia, "", false, false)}
      ${field("Dor de 0 a 10", "dor", initialValues.dor)}
      <label class="field">
        <span>Classificação sugerida pelo sistema *</span>
        <input name="classificacaoSugerida" value="${escapeHtml(suggestedRisk)}" readonly required>
      </label>
      ${selectField("Classificação final definida pelo profissional", "classificacao", ["Vermelho", "Laranja", "Amarelo", "Verde", "Azul"], p.classificacao || suggestedRisk)}
      ${field("Justificativa da classificação", "justificativaClassificacao", savedRiskSupport.justificativaClassificacao || "", "full", true)}
      ${selectField("Motivo principal do atendimento", "motivo", ["Dor abdominal", "Trauma/acidente", "Febre", "Vômito/diarreia", "Crise hipertensiva", "Dor torácica", "Falta de ar", "Ferimento", "Queda", "Afogamento", "Acidente de trânsito", "Intercorrência obstétrica", "Atendimento pediátrico", "Outro"])}
      ${selectField("Local provável da ocorrência", "local", ["Centro", "Prainha", "Cânions/Xingó", "Rodovia", "Hotel/pousada", "Evento público", "Zona rural", "Restaurante/bar", "Obra/serviço", "Residência de familiar", "Não informado"], "Não informado")}
      ${selectField("Período/condição especial", "periodo", ["Dia normal", "Fim de semana", "Feriado", "Evento municipal", "Alta temporada", "Festa local", "Período de grande fluxo turístico", "Operação especial"], "Dia normal")}
      ${field("Observações da triagem", "obs", savedVitals.obs || "", "full", true, false)}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(TRIAGEM_ACTION_RULE)
    ? `<button class="action-button" data-action="save-triage" data-id="${p.id}">Salvar triagem</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Técnico em Enfermagem (ou permissão triagem.classificar) pode salvar a triagem">Salvar triagem (sem permissão)</button>`}`);

  const form = byId("triageForm");
  const suggestedInput = form.querySelector('input[name="classificacaoSugerida"]');
  const finalSelect = form.querySelector('select[name="classificacao"]');
  let professionalChangedRisk = Boolean(p.classificacao);
  finalSelect.addEventListener("change", () => {
    professionalChangedRisk = true;
  });
  const refreshSuggestion = () => {
    const suggestion = suggestRisk(formValues(form));
    suggestedInput.value = suggestion;
    if (!professionalChangedRisk) finalSelect.value = suggestion;
  };
  form.querySelectorAll("input, select, textarea").forEach((element) => {
    if (element.name !== "classificacao" && element.name !== "classificacaoSugerida") {
      element.addEventListener("input", refreshSuggestion);
      element.addEventListener("change", refreshSuggestion);
    }
  });
}

function consulta() {
  const riskOrder = { Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4 };
  const atendimentos = GsiApi.list("atendimentos");
  const findAtendimento = (id) => atendimentos.find((a) => a.pacienteId === id);

  const waiting = GsiApi.list("pacientes")
    .filter((p) => p.classificacao && (p.status === "Aguardando consulta" || p.status === "Triagem concluída"))
    .sort((a, b) => (riskOrder[a.classificacao] ?? 9) - (riskOrder[b.classificacao] ?? 9) || patientWaitStartTs(a) - patientWaitStartTs(b));

  const inConsult = GsiApi.list("pacientes").filter((p) => p.status === "Em consulta");

  const waitingRows = waiting.map((p) => {
    const a = findAtendimento(p.id);
    return [
      escapeHtml(p.nome),
      escapeHtml(calculateAge(p.nascimento)),
      tag(p.classificacao),
      escapeHtml(p.queixa || "Não informado"),
      escapeHtml(getPatientTriageTime(p, a)),
      escapeHtml(getPatientConsultWait(p, a)),
      consultCallCell(p),
      `<div class="actions queue-actions queue-actions-waiting">
        ${isActionAllowed(CONSULTA_INICIAR_ACTION_RULE) ? `
          ${actionButton("Chamar para consulta", "call-to-consult", p.id, "", "queue-action")}
          ${actionButton("Iniciar consulta", "open-start-consult-modal", p.id, "", "queue-action queue-action-primary")}
        ` : '<span class="muted">Sem permissão</span>'}
      </div>`
    ];
  });

  const consultRows = inConsult.map((p) => {
    const a = findAtendimento(p.id);
    return [
      escapeHtml(p.nome),
      tag(p.classificacao),
      escapeHtml(getPatientConsultRoom(p, a)),
      escapeHtml(p.profissionalResponsavel || a?.profissional || "Equipe médica"),
      escapeHtml(p.horaInicioConsulta || a?.inicioConsulta || "--:--"),
      `<div class="actions queue-actions queue-actions-grid">
        ${isActionAllowed(CONSULTA_CONDUTA_ACTION_RULE) ? actionButton("Registrar conduta", "open-conduct-modal", p.id, "", "queue-action queue-action-primary") : '<span class="muted">Sem permissão</span>'}
        ${isActionAllowed(EXAME_SOLICITAR_ACTION_RULE) ? actionButton("Solicitar exame", "open-exam-request", p.id, 'data-origem="Consulta Médica"', "queue-action") : ""}
        ${isActionAllowed(PRESCRICAO_CRIAR_ACTION_RULE) ? actionButton("Prescrever medicação", "open-prescription", p.id, "", "queue-action") : ""}
        ${isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE) ? actionButton("Solicitar transferência", "open-transfer-request", p.id, "", "queue-action") : ""}
        ${isActionAllowed(CONSULTA_CONDUTA_ACTION_RULE) ? actionButton("Dar alta", "discharge-patient", p.id, "", "danger queue-action queue-action-highlight") : ""}
      </div>`
    ];
  });

  return `
    ${pageHead("Consulta", "Fila de pacientes já classificados aguardando avaliação médica e pacientes em consulta.")}
    <section class="panel queue-panel queue-panel-waiting">
      <h2>Pacientes aguardando consulta <span class="queue-count">${waiting.length}</span></h2>
      ${waiting.length
        ? `<div class="queue-table">${table(["Nome", "Idade", "Classificação de risco", "Queixa principal", "Horário da triagem", "Tempo de espera", "Chamada", "Ações"], waitingRows)}</div>`
        : '<p class="muted">Nenhum paciente classificado aguardando consulta no momento.</p>'}
    </section>
    <section class="panel section-gap queue-panel queue-panel-active">
      <h2>Pacientes em consulta <span class="queue-count">${inConsult.length}</span></h2>
      ${inConsult.length
        ? `<div class="queue-table">${table(["Nome", "Classificação", "Consultório/local", "Profissional responsável", "Horário de início", "Ações"], consultRows)}</div>`
        : '<p class="muted">Nenhum paciente em consulta no momento.</p>'}
    </section>
  `;
}

function openConductModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  openModal("Registrar conduta - " + p.nome, `
    ${conductClinicalSummary(p)}
    <form id="conductForm" class="form-grid">
      <p class="field full"><span>Paciente</span>${escapeHtml(p.nome)} ${tag(p.classificacao)}</p>
      ${field("Avaliação clínica", "avaliacao", p.conduta?.avaliacao || "", "full", true)}
      ${field("Hipótese diagnóstica", "hipotese", p.conduta?.hipotese || "", "full", true)}
      ${field("Conduta", "conduta", p.conduta?.conduta || "", "full", true)}
      ${field("Prescrição/medicação", "prescricao", p.conduta?.prescricao || "", "full", true, false)}
      ${field("Solicitação de exames", "exames", p.conduta?.exames || "", "full", true, false)}
      ${selectField("Encaminhamento/desfecho", "destino", ["Alta após consulta", "Medicação e alta", "Observação Clínica", "Observação Pediátrica", "Observação Obstétrica", "Sala de Estabilização", "Solicitar exame", "Prescrever medicação", "Transferência regulada", "Evasão/desistência", "Óbito"])}
      ${field("Observações", "obs", p.conduta?.obs || "", "full", true, false)}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(CONSULTA_CONDUTA_ACTION_RULE)
    ? `<button class="action-button" data-action="save-conduct" data-id="${p.id}">Salvar conduta</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Médico (ou permissão consulta.registrar_conduta) pode salvar a conduta">Salvar conduta (sem permissão)</button>`}`);
}

const fictionalDoctors = ["Dr. Carlos Menezes", "Dra. Ana Beatriz Lima", "Dr. Rafael Santos", "Outro profissional médico"];

const consultorios = ["Consultório Médico 1", "Consultório Médico 2", "Consultório Médico 3", "Outro"];

function conductClinicalSummary(patient = {}) {
  const atendimento = firstRelation("atendimentos", patient);
  const exames = relationByPatient("exames", patient);
  const prescricoes = relationByPatient("prescricoes", patient);
  const transferencia = firstRelation("transferencias", patient);
  const observacoes = observationRecords(patient);
  const evolucoes = patient.evolucoesEnfermagem || [];
  const sinais = patient.sinaisVitais || {};
  const alertasClinicos = clinicalAlertsFromPatient(patient);
  const inicioConsulta = patient.horaInicioConsulta || atendimento.inicioConsulta || "";
  const timeline = [];

  addTimelineEvent(timeline, patient.horaChegada || atendimento.chegada, "Ficha aberta", patient.horaChegadaTs);
  addTimelineEvent(timeline, patient.horaInicioTriagem, "Triagem iniciada", patient.horaInicioTriagemTs);
  addTimelineEvent(timeline, patient.horaFimTriagem, "Triagem concluída", patient.horaFimTriagemTs);
  addTimelineEvent(timeline, patient.horaChamadaConsulta, "Paciente chamado", patient.horaChamadaConsultaTs);
  addTimelineEvent(timeline, inicioConsulta, "Consulta iniciada", patient.horaInicioConsultaTs);
  exames.forEach((item) => {
    addTimelineEvent(timeline, item.horario, `Exame solicitado: ${item.exame || item.tipo || "exame"}`);
    addTimelineEvent(timeline, item.horarioLiberacao, `Resultado liberado: ${item.exame || item.tipo || "exame"}`);
  });
  prescricoes.forEach((item) => addTimelineEvent(timeline, item.horario, `Medicação prescrita: ${item.medicamento || "medicação"}`));
  evolucoes.forEach((item) => addTimelineEvent(timeline, item.horario, "Evolução de enfermagem registrada"));
  observacoes.forEach(([tipo, obs]) => addTimelineEvent(timeline, obs.inicio, `Entrada em ${tipo}`, obs.inicioTimestamp));
  if (patient.estabilizacao) addTimelineEvent(timeline, patient.estabilizacao.inicio, "Entrada na Sala de Estabilização", patient.estabilizacao.inicioTimestamp);
  addTimelineEvent(timeline, transferencia.horario || transferencia.horaSolicitacaoTransferencia, "Transferência solicitada", transferencia.horaSolicitacaoTransferenciaTs);

  const assistenciais = [
    ...exames.map((item) => `<strong>Exame:</strong> ${escapeHtml(recordValue(item.exame || item.tipo))} <span class="muted">(${escapeHtml(recordValue(item.status))})</span>`),
    ...prescricoes.map((item) => `<strong>Prescrição:</strong> ${escapeHtml(recordValue(item.medicamento))} <span class="muted">${escapeHtml(recordValue(item.status))}</span>`),
    ...evolucoes.map((item) => `<strong>Enfermagem:</strong> ${escapeHtml(recordValue(item.evolucao || item.procedimentos || item.medicacoes))}`),
    ...observacoes.map(([tipo, obs]) => `<strong>${escapeHtml(tipo)}:</strong> entrada ${escapeHtml(recordValue(obs.inicio))}`),
    patient.estabilizacao ? `<strong>Estabilização:</strong> entrada ${escapeHtml(recordValue(patient.estabilizacao.inicio))}` : "",
    transferencia.id ? `<strong>Transferência:</strong> ${escapeHtml(recordValue(transferencia.status))} para ${escapeHtml(recordValue(transferencia.destino))}` : ""
  ].filter(Boolean);

  const timelineBody = timeline.length
    ? `<ul class="list">${timeline.sort((a, b) => eventSortValue(a) - eventSortValue(b)).map((event) => `<li><strong>${escapeHtml(event.time)}</strong> - ${escapeHtml(event.label)}</li>`).join("")}</ul>`
    : `<p class="muted">${noRecord}</p>`;

  return `
    <section class="record-block">
      <h3>Resumo clínico do atendimento atual</h3>
      <div class="form-grid">
        ${recordField("Nome", patient.nome)}
        ${recordField("Idade", calculateAge(patient.nascimento))}
        ${recordField("Município", municipioUfLabel(patient))}
        ${recordField("CPF / Cartão SUS", [patient.cpf, patient.sus].filter(Boolean).join(" / "), "full")}
        ${recordStatusField("Status atual", patient.status)}
      </div>
    </section>
    <section class="record-block">
      <h3>Alertas clínicos</h3>
      <div class="form-grid">
        ${recordField("Alergias", alertasClinicos.alergias)}
        ${recordField("Comorbidades", alertasClinicos.comorbidades)}
        ${recordField("Medicamentos de uso contínuo", alertasClinicos.medicamentosUsoContinuo, "full")}
        ${recordField("Tratamento em andamento", alertasClinicos.tratamentoEmAndamento, "full")}
        ${recordField("Medicação antes da chegada", alertasClinicos.medicacaoAntesChegada, "full")}
        ${recordField("Gestação/suspeita", alertasClinicos.gestacao)}
      </div>
    </section>
    <section class="record-block">
      <h3>Classificação e triagem</h3>
      <div class="form-grid">
        ${recordTagField("Classificação de risco", patient.classificacao)}
        ${recordField("Queixa principal", patient.queixa || atendimento.motivo, "full")}
        ${recordField("Pressão arterial", sinais.pa)}
        ${recordField("Frequência cardíaca", sinais.fc)}
        ${recordField("Frequência respiratória", sinais.fr)}
        ${recordField("Saturação", sinais.sat)}
        ${recordField("Temperatura", sinais.temp)}
        ${recordField("Dor", sinais.dor)}
        ${recordField("Glicemia", sinais.glicemia)}
        ${recordField("Observações da triagem", sinais.obs, "full")}
        ${recordField("Profissional da triagem", patient.triagemRisco?.profissional)}
      </div>
    </section>
    <section class="record-block">
      <h3>Linha do tempo resumida</h3>
      ${timelineBody}
    </section>
    <section class="record-block">
      <h3>Dados assistenciais já registrados</h3>
      ${listItems(assistenciais)}
    </section>
  `;
}

function openCallConsultModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  openModal("Chamar para consulta - " + (p.nome || "Paciente fictício"), `
    <form id="callConsultForm" class="form-grid">
      ${selectField("Consultório", "consultorio", consultorios)}
      <label class="field full" id="otherConsultorioField" style="display:none">
        <span>Especifique o consultório/local</span>
        <input name="consultorioOutro" placeholder="Digite o consultório ou local">
      </label>
      ${field("Profissional (opcional)", "profissional", "", "", false, false)}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(CONSULTA_INICIAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-call-consult" data-id="${p.id}">Chamar paciente</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Médico (ou permissão consulta.iniciar) pode chamar para consulta">Chamar paciente (sem permissão)</button>`}`);

  const form = byId("callConsultForm");
  const select = form.querySelector('select[name="consultorio"]');
  const otherField = byId("otherConsultorioField");
  const otherInput = otherField.querySelector("input");
  select.addEventListener("change", () => {
    const isOther = select.value === "Outro";
    otherField.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
  });
}

function openStartConsultModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  const atendimento = GsiApi.list("atendimentos").find((a) => a.pacienteId === patientId) || {};
  const salaInicial = getPatientConsultRoom(p, atendimento);
  openModal("Iniciar consulta - " + p.nome, `
    <form id="startConsultForm" class="form-grid">
      ${selectField("Profissional responsável", "medico", fictionalDoctors)}
      <label class="field full" id="otherDoctorField" style="display:none">
        <span>Nome do profissional</span>
        <input name="medicoOutro" placeholder="Digite o nome do médico">
      </label>
      ${field("CRM ou registro profissional", "crm", "", "", false, false)}
      ${field("Consultório/local", "sala", salaInicial, "", false, false)}
      ${field("Observação inicial", "obsInicial", "", "full", true, false)}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(CONSULTA_INICIAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-start-consult" data-id="${p.id}">Iniciar consulta</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Médico (ou permissão consulta.iniciar) pode iniciar a consulta">Iniciar consulta (sem permissão)</button>`}`);

  const form = byId("startConsultForm");
  const select = form.querySelector('select[name="medico"]');
  const otherField = byId("otherDoctorField");
  const otherInput = otherField.querySelector("input");
  select.addEventListener("change", () => {
    const isOther = select.value === "Outro profissional médico";
    otherField.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
  });
}

function enfermagem() {
  const riskOrder = { Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4 };
  const inactiveStatus = ["Alta", "Alta da observação", "Cancelado", "Evasão/desistência", "Óbito", "Transferência regulada"];
  const ativos = GsiApi.list("pacientes")
    .filter((p) => !inactiveStatus.includes(p.status))
    .sort((a, b) => (riskOrder[a.classificacao] ?? 9) - (riskOrder[b.classificacao] ?? 9));

  const rows = ativos.map((p) => {
    const evolucoes = p.evolucoesEnfermagem || [];
    const ultima = evolucoes.length ? evolucoes[evolucoes.length - 1] : null;
    return [
      escapeHtml(p.nome), tag(p.classificacao), status(p.status),
      ultima ? `${escapeHtml(ultima.horario)} - ${escapeHtml(ultima.profissional)}` : "Nenhuma ainda",
      `<div class="actions queue-actions queue-actions-grid">
        ${isActionAllowed(ENFERMAGEM_ACTION_RULE) ? actionButton("Registrar evolução", "open-nursing-modal", p.id, "", "queue-action queue-action-primary") : '<span class="muted">Sem permissão</span>'}
        ${isActionAllowed(EXAME_SOLICITAR_ACTION_RULE) ? actionButton("Solicitar exame", "open-exam-request", p.id, 'data-origem="Enfermagem"', "queue-action") : ""}
        ${isActionAllowed(PRESCRICAO_CRIAR_ACTION_RULE) ? actionButton("Prescrever medicação", "open-prescription", p.id, "", "queue-action") : ""}
      </div>`
    ];
  });

  return `
    ${pageHead("Enfermagem", "Registro de procedimentos, medicações, curativos e evolução da equipe para pacientes ativos no fluxo.")}
    <section class="grid module-stats">
      ${metric("Pacientes ativos", ativos.length, "Em algum estágio do fluxo", "primary")}
      ${metric("Evoluções registradas", ativos.reduce((total, p) => total + (p.evolucoesEnfermagem?.length || 0), 0), "Total acumulado")}
      ${metric("Sem evolução ainda", ativos.filter((p) => !p.evolucoesEnfermagem?.length).length, "Pendentes de registro", "warning")}
    </section>
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Pacientes ativos <span class="queue-count">${ativos.length}</span></h2>
      ${rows.length
        ? `<div class="queue-table">${table(["Paciente", "Classificação", "Status", "Última evolução", "Ação"], rows)}</div>`
        : '<p class="muted">Nenhum paciente ativo no momento.</p>'}
    </section>
  `;
}

function openNursingModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  openModal("Registrar evolução - " + p.nome, `
    <form id="nursingForm" class="form-grid">
      ${field("Procedimentos realizados", "procedimentos", "", "full", true)}
      ${field("Medicações administradas", "medicacoes", "", "full", true)}
      ${field("Curativos", "curativos", "", "full", false, false)}
      ${field("Evolução de enfermagem", "evolucao", "", "full", true)}
      ${field("Sinais vitais", "sinais", "", "full", true)}
      ${selectField("Profissional responsável", "profissional", ["Enf. Joana Matos", "Enf. Paula Santos", "Tec. Erick Gomes", "Outro profissional"])}
      <label class="field full" id="otherNursingProfField" style="display:none">
        <span>Nome do profissional</span>
        <input name="profissionalOutro" placeholder="Digite o nome">
      </label>
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(ENFERMAGEM_ACTION_RULE)
    ? `<button class="action-button" data-action="save-nursing-evolution" data-id="${p.id}">Salvar evolucao</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Técnico em Enfermagem (ou permissão enfermagem.evolucao.registrar) pode salvar a evolução">Salvar evolução (sem permissão)</button>`}`);

  const form = byId("nursingForm");
  const select = form.querySelector('select[name="profissional"]');
  const otherField = byId("otherNursingProfField");
  const otherInput = otherField.querySelector("input");
  select.addEventListener("change", () => {
    const isOther = select.value === "Outro profissional";
    otherField.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
  });
}

function farmacia() {
  const prescricoesPendentesStatus = ["Pendente", "Separado", "Em falta"];
  const prescricoesPendentes = GsiApi.list("prescricoes").filter((p) => prescricoesPendentesStatus.includes(p.status));
  const rows = prescricoesPendentes.map((p) => [
    escapeHtml(p.paciente), escapeHtml(p.medicamento), escapeHtml(p.dose), escapeHtml(p.via), escapeHtml(p.horario), escapeHtml(p.prescritor), status(p.status),
    `<div class="actions queue-actions queue-actions-grid">
      ${isActionAllowed(PRESCRICAO_DISPENSAR_ACTION_RULE) ? `
        ${actionButton("Dispensar", "rx-status", p.id, 'data-status="Dispensado"', "queue-action queue-action-primary")}
        ${actionButton("Separar", "rx-status", p.id, 'data-status="Separado"', "queue-action")}
        ${actionButton("Informar falta", "rx-status", p.id, 'data-status="Em falta"', "queue-action")}
      ` : '<span class="muted">Sem permissão</span>'}
      ${actionButton("Solicitar reposição", "request-restock", p.id, `data-nome="${escapeHtml(p.medicamento)}"`, "queue-action")}
    </div>`
  ]);
  const stock = GsiApi.list("estoque");
  const stockRows = stock.map((s) => [escapeHtml(s.nome), escapeHtml(s.quantidade), escapeHtml(s.minimo), status(s.situacao), escapeHtml(s.validade), escapeHtml(s.local)]);
  return `
    ${pageHead("Farmácia", "Controle demonstrativo de prescrições, dispensação, estoque crítico e solicitações urgentes.")}
    <section class="grid module-stats">
      ${metric("Prescrições pendentes", GsiApi.list("prescricoes").filter((p) => p.status === "Pendente").length, "Aguardando análise", "warning")}
      ${metric("Medicamentos dispensados hoje", GsiApi.list("prescricoes").filter((p) => p.status === "Dispensado").length + 96, "Até o momento", "primary")}
      ${metric("Itens com estoque crítico", String(stock.filter((s) => s.situacao === "Critico").length).padStart(2, "0"), "Reposição necessária", "danger")}
      ${metric("Solicitações urgentes", "04", "Sala de Estabilização")}
    </section>
    <section class="grid two-column section-gap">
      <div class="panel wide-panel queue-panel queue-panel-waiting">
        <h2>Prescrições não dispensadas <span class="queue-count">${rows.length}</span></h2>
        <div class="queue-table">${table(["Paciente", "Medicamento", "Dose", "Via", "Horário", "Prescritor", "Status", "Ação"], rows)}</div>
      </div>
      <div class="panel"><h2>Alertas de farmácia</h2><ul class="list alert-list"><li>Medicamentos com estoque crítico.</li><li>Medicamentos próximos do vencimento.</li>${prescricoesPendentes.length ? "<li>Prescrições sem dispensação.</li>" : ""}<li>Itens de emergência para sala de estabilização.</li></ul></div>
    </section>
    <section class="panel section-gap">
      <div class="page-head" style="margin-bottom:14px">
        <h2 style="margin:0">Estoque simplificado</h2>
        ${isActionAllowed(ESTOQUE_MOVIMENTAR_ACTION_RULE) ? '<button class="secondary-action" type="button" data-action="open-stock-item">Adicionar item ao estoque</button>' : ""}
      </div>
      <div class="queue-table">${table(["Medicamento", "Quantidade atual", "Estoque mínimo", "Situação", "Validade", "Localização"], stockRows)}</div>
    </section>
  `;
}

function examActions(e) {
  const buttons = [];
  const podeGerenciarExame = isActionAllowed(EXAMES_GERENCIAR_ACTION_RULE);
  const emAndamento = ["Solicitado", "Em coleta", "Em execucao"].includes(e.status);
  if (podeGerenciarExame) {
    if (e.status === "Solicitado") buttons.push(actionButton("Iniciar coleta", "start-collection", e.id, "", "queue-action queue-action-primary"));
    if (e.status === "Em coleta") buttons.push(actionButton("Marcar em execução", "mark-in-progress", e.id, "", "queue-action queue-action-primary"));
    if (emAndamento) buttons.push(actionButton("Liberar resultado", "open-release-modal", e.id, "", "queue-action queue-action-primary"));
    if (emAndamento) buttons.push(actionButton("Cancelar exame", "cancel-exam", e.id, "", "danger queue-action"));
  } else if (emAndamento) {
    buttons.push('<span class="muted">Sem permissão</span>');
  }
  buttons.push(actionButton("Ver resultado", "view-exam-result", e.id, "", "queue-action"));
  buttons.push(actionButton("Reimprimir solicitação", "print-exam", e.id, "", "queue-action"));
  return `<div class="actions queue-actions queue-actions-grid">${buttons.join("")}</div>`;
}

const validExamOrigins = ["Consulta Médica", "Observação Clínica", "Observação Pediátrica", "Observação Obstétrica", "Sala de Estabilização", "Transferência"];

function inferExamOrigin(patient = {}) {
  const text = [patient.status, patient.desfecho].filter(Boolean).join(" ");
  if (patient.estabilizacao || text.includes("estabiliza")) return "Sala de Estabilização";
  if (patient.observacaoPediatrica || text.includes("observação pedi")) return "Observação Pediátrica";
  if (patient.observacaoObstetrica || text.includes("observação obst")) return "Observação Obstétrica";
  if (patient.observacaoClinica || text.includes("observação cl")) return "Observação Clínica";
  if (text.includes("Transfer")) return "Transferência";
  return "Consulta Médica";
}

function examCareOrigin(exam = {}, patient = null) {
  const origem = displayText(exam.origem || "").trim();
  if (validExamOrigins.includes(origem)) return origem;
  return inferExamOrigin(patient || patientById(exam.pacienteId) || {});
}

function exames() {
  const riskOrder = { Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4 };
  const statusOrder = { Solicitado: 0, "Em coleta": 1, "Em execucao": 2, "Resultado critico comunicado": 3, "Resultado liberado": 4, Cancelado: 5 };

  const list = GsiApi.list("exames").map((e) => {
    const p = e.pacienteId ? patientById(e.pacienteId) : null;
    return { ...e, origem: examCareOrigin(e, p), _nome: p?.nome || e.paciente || "Paciente não vinculado", _classificacao: p?.classificacao || null };
  });

  const pending = list
    .filter((e) => e.status !== "Resultado liberado" && e.status !== "Cancelado")
    .sort((a, b) => (riskOrder[a._classificacao] ?? 9) - (riskOrder[b._classificacao] ?? 9) || (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
  const finished = list.filter((e) => e.status === "Resultado liberado" || e.status === "Cancelado");

  const examRow = (e) => [
    escapeHtml(e._nome), escapeHtml(e.exame), escapeHtml(e.origem || "Não informado"),
    e._classificacao ? tag(e._classificacao) : '<span class="status">Não vinculado</span>',
    e.critico ? `<span class="status danger">${escapeHtml(displayText(e.status))}</span>` : status(e.status),
    escapeHtml(e.horario), escapeHtml(e.solicitante || "-"), examActions(e)
  ];

  const headers = ["Paciente", "Exame", "Origem", "Classificação", "Status", "Horário", "Solicitante", "Ação"];

  return `
    ${pageHead("Exames", "Fila funcional de solicitações de exames, conectada à Consulta e ao fluxo assistencial do paciente.")}
    <section class="grid module-stats exam-stats">
      ${metric("Solicitados", list.filter((e) => e.status === "Solicitado").length, "Aguardando coleta", "warning")}
      ${metric("Em coleta", list.filter((e) => e.status === "Em coleta").length, "Laboratório/Imagem")}
      ${metric("Em execução", list.filter((e) => e.status === "Em execucao").length, "Em análise", "primary")}
      ${metric("Resultados liberados", list.filter((e) => e.status === "Resultado liberado").length, "Disponíveis")}
      ${metric("Resultados críticos", list.filter((e) => e.status === "Resultado critico comunicado").length, "Comunicação obrigatória", "danger")}
    </section>
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Fila de exames pendentes <span class="queue-count">${pending.length}</span></h2>
      ${pending.length ? `<div class="queue-table">${table(headers, pending.map(examRow))}</div>` : '<p class="muted">Nenhum exame pendente no momento.</p>'}
    </section>
    <section class="panel section-gap queue-panel queue-panel-active">
      <h2>Resultados finalizados <span class="queue-count">${finished.length}</span></h2>
      ${finished.length ? `<div class="queue-table">${table(headers, finished.map(examRow))}</div>` : '<p class="muted">Nenhum resultado finalizado ainda.</p>'}
    </section>
  `;
}

function openExamReleaseModal(examId) {
  const e = GsiApi.list("exames").find((x) => x.id === examId);
  if (!e) return;
  openModal("Liberar resultado - " + (e.exame || ""), `
    <form id="examReleaseForm" class="form-grid">
      ${field("Resultado resumido", "resultado", "", "full", true)}
      ${field("Observações", "observacoes", "", "full", true, false)}
      ${selectField("Resultado crítico?", "critico", ["Não", "Sim"])}
      ${selectField("Profissional responsável pela liberação", "profissional", ["Dr. Marcos Vieira", "Dra. Camila Araujo", "Dra. Livia Ramos", "Tec. Felipe Andrade", "Outro profissional"])}
      <label class="field full" id="otherExamProfField" style="display:none">
        <span>Nome do profissional</span>
        <input name="profissionalOutro" placeholder="Digite o nome">
      </label>
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(EXAMES_GERENCIAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-exam-release" data-id="${e.id}">Confirmar liberação</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Técnico em RX (ou permissão exame.liberar_resultado/exame.marcar_critico) pode liberar resultados">Confirmar liberação (sem permissão)</button>`}`);

  const form = byId("examReleaseForm");
  const select = form.querySelector('select[name="profissional"]');
  const otherField = byId("otherExamProfField");
  const otherInput = otherField.querySelector("input");
  select.addEventListener("change", () => {
    const isOther = select.value === "Outro profissional";
    otherField.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
  });
}

const stabilizationSafetyChecklist = [
  ["identificacao", "Identificação do paciente confirmada"],
  ["monitorizacao", "Monitorização instalada"],
  ["acesso-venoso", "Acesso venoso avaliado/pérvio"],
  ["suporte-ventilatorio", "Oxigenoterapia ou suporte ventilatório avaliado"],
  ["medicacoes-emergencia", "Medicações/equipamentos de emergência conferidos"],
  ["exames-iniciais", "ECG/exames iniciais realizados ou justificados"],
  ["reavaliacao-clinica", "Reavaliação clínica registrada"],
  ["regulacao-transferencia", "Regulação/transferência avaliada, quando indicada"]
];

function getPatientChecklistStatus(patient = {}) {
  const saved = patient.checklistEstabilizacao || {};
  const total = stabilizationSafetyChecklist.length;
  const done = stabilizationSafetyChecklist.filter(([id]) => !!saved[id]).length;
  const label = done === 0 ? "Pendente" : done === total ? "Completo" : `${done}/${total} concluídos`;
  return { saved, total, done, label };
}

function checklistBadge(patient = {}) {
  const { done, total, label } = getPatientChecklistStatus(patient);
  const cls = done === 0 ? "" : done === total ? "good" : "warn";
  return `<span class="status ${cls}">${escapeHtml(label)}</span>`;
}

function formatElapsed(ms) {
  if (ms === undefined || ms === null || ms < 0) return "--";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function averageElapsedFrom(list, startField, endField) {
  const durations = list
    .map((item) => Number(item[endField]) - Number(item[startField]))
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  if (!durations.length) return null;
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function minutesFromClock(value = "") {
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateAge(nascimento = "") {
  const raw = String(nascimento).trim();
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const parts = br ? [br[3], br[2], br[1]] : iso ? [iso[1], iso[2], iso[3]] : null;
  if (!parts) return "--";
  const birth = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(birth.getTime())) return "--";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age} anos` : "--";
}

function getLastConsultCall(patientId) {
  const rawCall = GsiApi.list("chamadas").find((call) => {
    const text = normalizeText(`${call.setor || ""} ${call.destino || ""}`);
    return call.pacienteId === patientId && text.includes("consulta");
  });
  return rawCall ? normalizeCallRecord(rawCall) : null;
}

function getPatientTriageTime(patient = {}, atendimento = {}) {
  return patient.horaFimTriagem || patient.horaInicioTriagem || atendimento.triagem || "--:--";
}

function formatWaitTime(startTs, fallbackClock = "") {
  if (startTs) return formatElapsed(Date.now() - Number(startTs));
  const startMin = minutesFromClock(fallbackClock);
  const nowMin = minutesFromClock(nowTime());
  if (startMin === null || nowMin === null) return "--";
  const delta = nowMin >= startMin ? nowMin - startMin : (24 * 60 - startMin) + nowMin;
  return formatElapsed(delta * 60000);
}

function getPatientConsultWait(patient = {}, atendimento = {}) {
  const triageTs = patient.horaFimTriagemTs || patient.horaInicioTriagemTs;
  return formatWaitTime(triageTs, getPatientTriageTime(patient, atendimento));
}

function getPatientConsultRoom(patient = {}, atendimento = {}) {
  const lastCall = getLastConsultCall(patient.id);
  const candidates = [patient.consultorioAtual, patient.salaAtendimento, atendimento.salaAtendimento, lastCall?.sala, "Consultório Médico 1"];
  return candidates.find((value) => value && value !== "A validar" && value !== "A definir") || "Consultório Médico 1";
}

function getConsultCallInfo(patient = {}) {
  if (!patient.horaChamadaConsulta) return null;
  const lastCall = getLastConsultCall(patient.id);
  const sala = lastCall?.sala && lastCall.sala !== "A validar" && lastCall.sala !== "A definir" ? lastCall.sala : "Consultório Médico 1";
  return { horario: patient.horaChamadaConsulta, sala };
}

function consultCallCell(patient = {}) {
  const info = getConsultCallInfo(patient);
  if (!info) return '<span class="status compact">Aguardando chamada</span>';
  return `<span class="status compact">✓ Chamado às ${escapeHtml(info.horario)}</span><br><span class="muted">${escapeHtml(info.sala)}</span>`;
}

function patientWaitStartTs(patient = {}) {
  return patient.horaFimTriagemTs || patient.horaInicioTriagemTs || Infinity;
}

function averageExamReleaseTime(exames) {
  const durations = exames
    .map((exam) => {
      const start = minutesFromClock(exam.horario);
      const end = minutesFromClock(exam.horarioLiberacao);
      if (start === null || end === null) return null;
      return end >= start ? (end - start) * 60000 : null;
    })
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  if (!durations.length) return null;
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function strategicIndicatorRow(indicador, resultado, situacao, base, observacao) {
  return [escapeHtml(indicador), escapeHtml(resultado), status(situacao), escapeHtml(base), escapeHtml(observacao)];
}

function observationQueueActions(p, modulo, origemLabel, options = {}) {
  const buttons = [];
  if (isActionAllowed(OBSERVACAO_REAVALIAR_ACTION_RULE)) buttons.push(actionButton("Registrar reavaliação", "open-observation-reassess-modal", p.id, `data-modulo="${modulo}"`, "queue-action queue-action-primary"));
  if (isActionAllowed(EXAME_SOLICITAR_ACTION_RULE)) buttons.push(actionButton("Solicitar exame", "open-exam-request", p.id, `data-origem="${origemLabel}"`, "queue-action"));
  if (isActionAllowed(PRESCRICAO_CRIAR_ACTION_RULE)) buttons.push(actionButton("Prescrever medicação", "open-prescription", p.id, "", "queue-action"));
  if (options.includeStabilization && isActionAllowed(OBSERVACAO_ENCAMINHAR_ESTABILIZACAO_ACTION_RULE)) buttons.push(actionButton("Encaminhar para estabilização", "route-to-stabilization", p.id, "", "queue-action"));
  if (isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE)) buttons.push(actionButton("Solicitar transferência", "open-transfer-request", p.id, "", "queue-action"));
  if (isActionAllowed(OBSERVACAO_ALTA_ACTION_RULE)) buttons.push(actionButton("Dar alta da observação", "discharge-observation", p.id, "", "danger queue-action"));
  return `<div class="actions queue-actions queue-actions-grid">${buttons.join("")}</div>`;
}

function observationStatusBadge(patient, modulo) {
  const obs = patient[modulo] || {};
  const examePendente = GsiApi.list("exames").some((e) => e.pacienteId === patient.id && ["Solicitado", "Em coleta", "Em execucao"].includes(e.status));
  if (examePendente) return '<span class="status warn">Aguardando exame</span>';
  if (!obs.reavaliacoes?.length) return '<span class="status warn">Reavaliação pendente</span>';
  return '<span class="status good">Em acompanhamento</span>';
}

function observationQueuePage(config) {
  const riskOrder = { Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4 };
  const inQueue = GsiApi.list("pacientes")
    .filter((p) => p.status === config.statusValue)
    .sort((a, b) => (riskOrder[a.classificacao] ?? 9) - (riskOrder[b.classificacao] ?? 9));

  const reavaliacoesCount = inQueue.reduce((total, p) => total + (p[config.modulo]?.reavaliacoes?.length || 0), 0);
  const aguardandoConduta = inQueue.filter((p) => !p[config.modulo]?.reavaliacoes?.length).length;
  const altasObservacao = GsiApi.list("pacientes").filter((p) => p.status === "Alta da observação").length;

  const rows = inQueue.map((p) => {
    const obs = p[config.modulo] || {};
    const tempo = obs.inicioTimestamp ? formatElapsed(Date.now() - obs.inicioTimestamp) : "--";
    const ultima = obs.reavaliacoes?.length ? obs.reavaliacoes[obs.reavaliacoes.length - 1] : null;
    return [
      escapeHtml(p.nome), escapeHtml(p.nascimento), escapeHtml(p.queixa), tag(p.classificacao),
      escapeHtml(obs.origem || "Não informado"), escapeHtml(tempo), observationStatusBadge(p, config.modulo),
      ultima ? `${escapeHtml(ultima.horario)} - ${escapeHtml(ultima.profissional)}` : "Nenhuma ainda",
      observationQueueActions(p, config.modulo, config.origemLabel, config.actionOptions)
    ];
  });

  return `
    ${pageHead(config.title, config.description)}
    <section class="grid module-stats">
      ${metric("Na fila", inQueue.length, config.title, "primary")}
      ${metric("Reavaliações registradas", reavaliacoesCount, "Total acumulado")}
      ${metric("Aguardando conduta", aguardandoConduta, "Sem reavaliação ainda", "warning")}
      ${metric("Altas da observação", altasObservacao, "Histórico")}
    </section>
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>${config.sectionTitle} <span class="queue-count">${inQueue.length}</span></h2>
      ${rows.length ? `<div class="queue-table observation-table">${table(config.columns, rows)}</div>` : `<p class="muted">${config.emptyMessage}</p>`}
    </section>
  `;
}

function estabilizacao() {
  const riskOrder = { Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4 };
  const inQueue = GsiApi.list("pacientes")
    .filter((p) => p.status === "Sala de estabilização")
    .sort((a, b) => (riskOrder[a.classificacao] ?? 9) - (riskOrder[b.classificacao] ?? 9));

  const completos = inQueue.filter((p) => getPatientChecklistStatus(p).done === stabilizationSafetyChecklist.length).length;
  const pendentes = inQueue.filter((p) => getPatientChecklistStatus(p).done === 0).length;
  const emAndamento = inQueue.length - completos - pendentes;

  const rows = inQueue.map((p) => [
    escapeHtml(p.nome), tag(p.classificacao), "Cardioscópio, oximetria, PA seriada", status(p.status),
    `<div class="checklist-cell">${checklistBadge(p)}${isActionAllowed(ESTABILIZACAO_CHECKLIST_ACTION_RULE) ? actionButton("Ver checklist", "open-stabilization-checklist-modal", p.id, "", "queue-action") : '<span class="muted">Sem permissão</span>'}</div>`,
    `<div class="actions queue-actions queue-actions-grid">
      ${isActionAllowed(OBSERVACAO_REAVALIAR_ACTION_RULE) ? actionButton("Registrar reavaliação", "open-observation-reassess-modal", p.id, 'data-modulo="estabilizacao"', "queue-action queue-action-primary") : ""}
      ${isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE) ? actionButton("Solicitar transferência", "open-transfer-request", p.id, "", "queue-action") : ""}
      ${isActionAllowed(OBSERVACAO_ALTA_ACTION_RULE) ? actionButton("Dar alta da observação", "discharge-observation", p.id, "", "danger queue-action") : ""}
    </div>`
  ]);

  return `
    ${pageHead("Sala de Estabilização", "Fila de pacientes graves, condutas imediatas, checklist e regulação.")}
    <section class="grid two-column">
      <div class="panel queue-panel queue-panel-critical">
        <h2>Pacientes na Sala de Estabilização <span class="queue-count">${inQueue.length}</span></h2>
        ${rows.length
          ? `<div class="queue-table">${table(["Paciente", "Classificação", "Monitorização", "Status", "Checklist", "Ação"], rows)}</div>`
          : '<p class="muted">Nenhum paciente na Sala de Estabilização no momento.</p>'}
      </div>
      <div class="panel">
        <h2>Checklist de Segurança da Estabilização</h2>
        <div class="checklist-summary">
          <div class="checklist-summary-item completo"><strong>${completos}</strong><span>paciente(s) com checklist completo</span></div>
          <div class="checklist-summary-item andamento"><strong>${emAndamento}</strong><span>paciente(s) com checklist em andamento</span></div>
          <div class="checklist-summary-item pendente"><strong>${pendentes}</strong><span>paciente(s) com checklist pendente</span></div>
        </div>
        <p class="muted" style="margin-top:10px">Registre os itens de segurança individualmente para cada paciente em estabilização.</p>
      </div>
    </section>
  `;
}

function stabilizationChecklistModalBody(patient) {
  const { saved, total, done, label } = getPatientChecklistStatus(patient);
  const complete = done === total;
  const podeMarcarChecklist = isActionAllowed(ESTABILIZACAO_CHECKLIST_ACTION_RULE);
  return `
    <p class="field full"><span>Paciente</span>${escapeHtml(patient.nome)} ${tag(patient.classificacao)}</p>
    <div class="checklist">
      ${stabilizationSafetyChecklist.map(([id, itemLabel]) => `<label><input type="checkbox" data-action="toggle-stabilization-checklist-item" data-id="${patient.id}" data-item="${id}" ${saved[id] ? "checked" : ""} ${podeMarcarChecklist ? "" : 'disabled title="Sem permissão para marcar o checklist de estabilização."'}> ${escapeHtml(itemLabel)}</label>`).join("")}
    </div>
    <p class="muted" style="margin-top:12px">Status do checklist: <strong>${escapeHtml(label)}</strong></p>
    ${complete ? '<p class="muted" style="margin-top:6px">Checklist completo. Paciente permanece em Sala de Estabilização até reavaliação e conduta profissional.</p>' : ""}
  `;
}

function openStabilizationChecklistModal(patientId) {
  const p = patientById(patientId);
  if (!p) return;
  openModal("Checklist de Segurança da Estabilização - " + p.nome, stabilizationChecklistModalBody(p), `<button class="secondary-action" data-action="close-modal">Fechar</button>`);
}

const transferSafetyChecklist = [
  "Paciente identificado e dados conferidos",
  "Unidade de destino e vaga regulada verificadas",
  "Documentos e resumo assistencial separados",
  "Sinais vitais reavaliados antes da saída",
  "Transporte e profissional acompanhante confirmados"
];

function openTransferChecklistModal(transferId) {
  const transfer = GsiApi.list("transferencias").find((t) => t.id === transferId);
  if (!transfer) return;
  const complete = transfer.checklist === "Completo";
  openModal("Checklist de Transferência - " + (transfer.paciente || "Paciente"), `
    <p class="field full"><span>Paciente</span>${escapeHtml(transfer.paciente || "a validar")}</p>
    <p class="field full"><span>Destino</span>${escapeHtml(displayText(transfer.destino || "a validar"))}</p>
    <form id="transferChecklistForm" class="checklist">
      ${transferSafetyChecklist.map((item, index) => `<label><input type="checkbox" name="item${index}" required ${complete ? "checked" : ""}> ${escapeHtml(item)}</label>`).join("")}
    </form>
    <p class="muted" style="margin-top:12px">Status atual do checklist: <strong>${escapeHtml(displayText(transfer.checklist || "Pendente"))}</strong></p>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE) ? `<button class="action-button" data-action="confirm-transfer-checklist" data-id="${transfer.id}">Confirmar checklist</button>` : `<button class="action-button" disabled title="Sem permissão para confirmar checklist de transferência">Confirmar checklist (sem permissão)</button>`}`);
}

function openObservationReassessModal(patientId, modulo = "observacaoClinica") {
  const p = patientById(patientId);
  if (!p) return;
  openModal("Registrar reavaliação - " + p.nome, `
    <form id="observationReassessForm" class="form-grid">
      <input type="hidden" name="modulo" value="${escapeHtml(modulo)}">
      ${field("Pressão arterial", "pa", "120/80 mmHg")}
      ${field("Frequência cardíaca", "fc", "84 bpm")}
      ${field("Saturação", "sat", "97%")}
      ${field("Temperatura", "temp", "36,7 C")}
      ${field("Evolução clínica", "evolucao", "", "full", true)}
      ${field("Conduta de enfermagem/médica", "conduta", "", "full", true)}
      ${selectField("Profissional responsável", "profissional", ["Enf. Joana Matos", "Enf. Paula Santos", "Dr. Marcos Vieira", "Dra. Camila Araujo", "Outro profissional"])}
      <label class="field full" id="otherReassessProfField" style="display:none">
        <span>Nome do profissional</span>
        <input name="profissionalOutro" placeholder="Digite o nome">
      </label>
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button><button class="action-button" data-action="save-observation-reassess" data-id="${p.id}">Salvar reavaliação</button>`);

  const form = byId("observationReassessForm");
  const select = form.querySelector('select[name="profissional"]');
  const otherField = byId("otherReassessProfField");
  const otherInput = otherField.querySelector("input");
  select.addEventListener("change", () => {
    const isOther = select.value === "Outro profissional";
    otherField.style.display = isOther ? "" : "none";
    otherInput.required = isOther;
  });
}

function observacaoClinica() {
  return observationQueuePage({
    title: "Observação Clínica",
    description: "Fila de pacientes adultos encaminhados pela Consulta para permanência em observação.",
    statusValue: "Em observação clínica",
    modulo: "observacaoClinica",
    origemLabel: "Observação Clínica",
    sectionTitle: "Pacientes em observação clínica",
    columns: ["Paciente", "Nascimento", "Queixa principal", "Classificação", "Origem", "Tempo em observação", "Status", "Última reavaliação", "Ação"],
    emptyMessage: "Nenhum paciente em observação clínica no momento.",
    actionOptions: { includeStabilization: true }
  });
}

function observacaoPediatrica() {
  return observationQueuePage({
    title: "Observação Pediátrica",
    description: "Fila de crianças e adolescentes encaminhados pela Consulta para observação.",
    statusValue: "Em observação pediátrica",
    modulo: "observacaoPediatrica",
    origemLabel: "Observação Pediátrica",
    sectionTitle: "Pacientes em observação pediátrica",
    columns: ["Criança/adolescente", "Nascimento", "Queixa principal", "Classificação", "Origem", "Tempo em observação", "Status", "Última reavaliação", "Ação"],
    emptyMessage: "Nenhuma criança ou adolescente em observação pediátrica no momento.",
    actionOptions: { includeStabilization: true }
  });
}

function observacaoObstetrica() {
  return observationQueuePage({
    title: "Observação Obstétrica",
    description: "Fila de gestantes encaminhadas pela Consulta para observação com sinais de alerta.",
    statusValue: "Em observação obstétrica",
    modulo: "observacaoObstetrica",
    origemLabel: "Observação Obstétrica",
    sectionTitle: "Gestantes em observação obstétrica",
    columns: ["Gestante", "Nascimento", "Queixa principal", "Classificação", "Origem", "Tempo em observação", "Status", "Última reavaliação", "Ação"],
    emptyMessage: "Nenhuma gestante em observação obstétrica no momento.",
    actionOptions: { includeStabilization: true }
  });
}

function transferencias() {
  const allTransfers = GsiApi.list("transferencias");
  const list = allTransfers.filter(isTransferInProgress);
  const checklistCompleto = allTransfers.filter((t) => t.checklist === "Completo").length;
  const saidasConfirmadas = allTransfers.filter((t) => isTransferDepartureConfirmed(t)).length;
  const ambulancias = allTransfers.filter((t) => t.usouAmbulancia === "Sim").length;
  const destinos = countBy(allTransfers, "destino").slice(0, 3);
  const regulacoesConcluidas = allTransfers.filter((t) => ["Vaga confirmada", "Concluida", "Transferido", "Transferência regulada"].includes(t.status)).length;
  const rows = list.map((t) => {
    const paciente = t.pacienteId ? patientById(t.pacienteId) : null;
    const saida = t.horaSaidaTransferencia || (t.saida && t.saida !== "--" ? t.saida : "Não confirmada");
    const saidaPendente = t.checklist !== "Completo" || t.status !== "Vaga confirmada";
    return [
      `${escapeHtml(t.paciente)}${paciente?.classificacao ? `<br>${tag(paciente.classificacao)}` : ""}`,
      escapeHtml(displayText(t.motivo)), escapeHtml(displayText(t.destino)), status(t.status), escapeHtml(t.acompanhante), status(t.checklist), escapeHtml(saida),
      `<div class="actions queue-actions queue-actions-grid">
        ${isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE) ? actionButton("Completar checklist", "transfer-checklist", t.id, "", "queue-action") : ""}
        ${isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE) ? actionButton("Aprovar vaga", "transfer-status", t.id, 'data-status="Vaga confirmada"', "queue-action queue-action-primary") : ""}
        ${isActionAllowed(TRANSFERENCIA_CONFIRMAR_SAIDA_ACTION_RULE) ? actionButton("Confirmar saída", "transfer-departure", t.id, "", `queue-action${saidaPendente ? " queue-action-muted" : ""}`) : ""}
        ${isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE) ? actionButton("Cancelar", "transfer-status", t.id, 'data-status="Cancelado"', "danger queue-action") : ""}
      </div>`
    ];
  });
  return `
    ${pageHead(
      "Transferências",
      "Controle demonstrativo de regulação, destino, checklist e saída.",
      isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE) ? "Solicitar transferência" : "",
      isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE) ? "open-transfer-request" : ""
    )}
    <section class="grid module-stats transfer-stats">
      ${metric("Em análise", list.filter((t) => t.status === "Em analise").length, "Regulação", "warning")}
      ${metric("Aguardando vaga", list.filter((t) => t.status === "Aguardando vaga").length, "Pendente")}
      ${metric("Vaga confirmada", list.filter((t) => t.status === "Vaga confirmada").length, "Prontas para saída", "primary")}
      ${metric("Checklist pendente", list.filter((t) => t.checklist === "Pendente").length, "Conferência obrigatória", "danger")}
    </section>
    <section class="grid two-column section-gap transfer-overview">
      <div class="panel">
        <h2>Regulação e saída segura</h2>
        <div class="transfer-flow">
          <span><strong>${list.length}</strong><small>em acompanhamento</small></span>
          <span><strong>${regulacoesConcluidas}</strong><small>regulações concluídas</small></span>
          <span><strong>${checklistCompleto}</strong><small>checklists completos</small></span>
          <span><strong>${saidasConfirmadas}</strong><small>saídas confirmadas</small></span>
        </div>
        <div class="checklist-summary">
          <div class="checklist-summary-item andamento"><strong>${list.length}</strong><span>transferência(s) em acompanhamento</span></div>
          <div class="checklist-summary-item completo"><strong>${checklistCompleto}</strong><span>checklist(s) completo(s)</span></div>
          <div class="checklist-summary-item pendente"><strong>${saidasConfirmadas}</strong><span>saída(s) confirmada(s)</span></div>
        </div>
      </div>
      <div class="panel">
        <h2>Destino e transporte</h2>
        <div class="transfer-summary">
          <p><span>Ambulância registrada</span><strong>${ambulancias}</strong></p>
          <p><span>Destinos monitorados</span><strong>${destinos.length || "--"}</strong></p>
        </div>
        ${destinos.length
          ? `<ul class="list transfer-destinations">${destinos.map(([destino, qtd]) => `<li><strong>${escapeHtml(destino)}</strong><span>${qtd} solicitação(ões)</span></li>`).join("")}</ul>`
          : '<p class="muted">Nenhum destino registrado ainda.</p>'}
      </div>
    </section>
    <section class="panel section-gap queue-panel queue-panel-waiting">
      <h2>Transferências em andamento <span class="queue-count">${list.length}</span></h2>
      ${list.length
        ? `<div class="queue-table transfer-table">${table(["Paciente", "Motivo", "Unidade de destino", "Status da regulação", "Profissional acompanhante", "Checklist", "Saída", "Ação"], rows)}</div>`
        : '<p class="muted">Nenhuma transferência registrada no momento.</p>'}
    </section>
  `;
}

function isTransferDepartureConfirmed(transfer = {}) {
  const patient = transfer.pacienteId ? patientById(transfer.pacienteId) : null;
  const finalStatuses = ["Concluida", "Concluída", "Transferido", "Transferência regulada"];
  return Boolean(
    transfer.horaSaidaTransferencia ||
    (transfer.saida && transfer.saida !== "--") ||
    transfer.desfechoFinal === "Transferência regulada" ||
    patient?.desfechoFinal === "Transferência regulada" ||
    (patient?.horaDesfechoFinal && patient?.desfechoFinal === "Transferência regulada") ||
    finalStatuses.includes(transfer.status) ||
    finalStatuses.includes(patient?.status)
  );
}

function isTransferInProgress(transfer = {}) {
  return !isTransferDepartureConfirmed(transfer);
}

function indicadores() {
  const pacientes = GsiApi.list("pacientes");
  const atendimentos = GsiApi.list("atendimentos");
  const exames = GsiApi.list("exames");
  const prescricoes = GsiApi.list("prescricoes");
  const estoque = GsiApi.list("estoque");
  const transferencias = GsiApi.list("transferencias");

  const riskCounts = ["Vermelho", "Laranja", "Amarelo", "Verde", "Azul"].map((r) => [r, pacientes.filter((p) => p.classificacao === r).length, `bar-${riskClass[r]}`]);
  const atendimentoStatus = countBy(atendimentos, "status");
  const examesTipo = countBy(exames, "tipo");
  const transferStatus = countBy(transferencias, "status");
  const examesPorTipoTexto = examesTipo.length ? examesTipo.map(([tipo, qtd]) => `${tipo}: ${qtd}`).join(" | ") : "Sem dados suficientes";

  const emObservacaoClinica = pacientes.filter((p) => p.status === "Em observação clínica").length;
  const emObservacaoPediatrica = pacientes.filter((p) => p.status === "Em observação pediátrica").length;
  const emObservacaoObstetrica = pacientes.filter((p) => p.status === "Em observação obstétrica").length;
  const emEstabilizacao = pacientes.filter((p) => p.status === "Sala de estabilização").length;

  const avgAteTriagem = averageElapsedFrom(pacientes, "horaChegadaTs", "horaFimTriagemTs") ?? averageElapsedFrom(pacientes, "horaChegadaTs", "horaInicioTriagemTs");
  const avgTriagemConsulta = averageElapsedFrom(pacientes, "horaFimTriagemTs", "horaInicioConsultaTs");
  const avgConsultaDesfecho = averageElapsedFrom(pacientes, "horaInicioConsultaTs", "horaDesfechoTs");
  const avgPermanencia = averageElapsedFrom(pacientes, "horaChegadaTs", "horaDesfechoTs");
  const avgLiberacaoExames = averageExamReleaseTime(exames);
  const prescricoesTotal = prescricoes.length;
  const prescricoesDispensadas = prescricoes.filter((p) => p.status === "Dispensado").length;
  const percentualDispensado = prescricoesTotal ? Math.round((prescricoesDispensadas / prescricoesTotal) * 100) : null;
  const medicamentosFalta = estoque.filter((item) => item.situacao === "Critico").length + prescricoes.filter((p) => p.status === "Em falta").length;
  const criticosComunicados = exames.filter((e) => e.critico || e.status === "Resultado critico comunicado").length;
  const strategicRows = [
    strategicIndicatorRow("Tempo médio de espera até triagem", avgAteTriagem === null ? "Sem dados suficientes" : formatElapsed(avgAteTriagem), avgAteTriagem === null ? "Aguardando registro" : "Calculado", `${pacientes.filter((p) => (p.horaFimTriagemTs || p.horaInicioTriagemTs) && p.horaChegadaTs).length} paciente(s)`, "Usa chegada e fim/início da triagem."),
    strategicIndicatorRow("Tempo médio entre triagem e consulta", avgTriagemConsulta === null ? "Sem dados suficientes" : formatElapsed(avgTriagemConsulta), avgTriagemConsulta === null ? "Aguardando registro" : "Calculado", `${pacientes.filter((p) => p.horaFimTriagemTs && p.horaInicioConsultaTs).length} paciente(s)`, "Usa fim da triagem e início da consulta."),
    strategicIndicatorRow("Tempo médio entre consulta e desfecho", avgConsultaDesfecho === null ? "Sem dados suficientes" : formatElapsed(avgConsultaDesfecho), avgConsultaDesfecho === null ? "Aguardando registro" : "Calculado", `${pacientes.filter((p) => p.horaInicioConsultaTs && p.horaDesfechoTs).length} paciente(s)`, "Usa início da consulta e desfecho."),
    strategicIndicatorRow("Tempo médio de permanência na unidade", avgPermanencia === null ? "Sem dados suficientes" : formatElapsed(avgPermanencia), avgPermanencia === null ? "Aguardando registro" : "Calculado", `${pacientes.filter((p) => p.horaChegadaTs && p.horaDesfechoTs).length} paciente(s)`, "Usa chegada e desfecho."),
    strategicIndicatorRow("Percentual de medicamentos dispensados", percentualDispensado === null ? "Sem dados suficientes" : `${percentualDispensado}%`, percentualDispensado === null ? "Aguardando registro" : "Calculado", `${prescricoesDispensadas}/${prescricoesTotal} prescrição(ões)`, "Base demonstrativa da Farmácia."),
    strategicIndicatorRow("Medicamentos em falta", String(medicamentosFalta).padStart(2, "0"), medicamentosFalta ? "Atenção" : "Adequado", `${estoque.length} item(ns) em estoque e ${prescricoes.length} prescrição(ões)`, "Conta estoque crítico e prescrições em falta."),
    strategicIndicatorRow("Exames solicitados por tipo", examesPorTipoTexto, examesTipo.length ? "Calculado" : "Aguardando registro", `${exames.length} exame(s)`, "Agrupamento por tipo de exame."),
    strategicIndicatorRow("Tempo médio de liberação de exames", avgLiberacaoExames === null ? "Sem dados suficientes" : formatElapsed(avgLiberacaoExames), avgLiberacaoExames === null ? "Aguardando registro" : "Calculado", `${exames.filter((e) => e.horario && e.horarioLiberacao).length} exame(s)`, "Cálculo demonstrativo por HH:MM."),
    strategicIndicatorRow("Resultados críticos comunicados", `${criticosComunicados}`, criticosComunicados ? "Atenção" : "Aguardando registro", `${exames.length} exame(s)`, "Usa campo crítico ou status de resultado crítico comunicado.")
  ];

  return `
    ${pageHead("Indicadores", "Painel gerencial para acompanhamento assistencial, farmácia, exames e faturamento.")}
    <section class="grid stats-grid">
      ${metric("Total de atendimentos", atendimentos.length + 123, "Mês atual", "primary")}
      ${metric("Prescrições atendidas", "92%", "Farmácia", "primary")}
      ${metric("Medicamentos em falta", "05", "Itens monitorados", "danger")}
      ${metric("Exames solicitados", exames.length + 70, "Por tipo")}
      ${metric("Liberação de exames", "1h18", "Tempo médio")}
      ${metric("Resultados críticos comunicados", "86%", "Registro obrigatório", "warning")}
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Classificação de risco da base atual</h2>
        ${barChart(riskCounts)}
      </div>
      <div class="panel">
        <h2>Atendimentos por status</h2>
        ${atendimentoStatus.length ? barChart(atendimentoStatus) : '<p class="muted">Nenhum atendimento registrado.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Exames por tipo</h2>
        ${examesTipo.length ? barChart(examesTipo) : '<p class="muted">Nenhum exame registrado.</p>'}
      </div>
      <div class="panel">
        <h2>Transferências por status</h2>
        ${transferStatus.length ? barChart(transferStatus) : '<p class="muted">Nenhuma transferência registrada.</p>'}
      </div>
    </section>
    <section class="grid module-stats section-gap">
      ${metric("Observação clínica", String(emObservacaoClinica).padStart(2, "0"), "Pacientes na fila", emObservacaoClinica ? "primary" : "")}
      ${metric("Observação pediátrica", String(emObservacaoPediatrica).padStart(2, "0"), "Pacientes na fila", emObservacaoPediatrica ? "primary" : "")}
      ${metric("Observação obstétrica", String(emObservacaoObstetrica).padStart(2, "0"), "Pacientes na fila", emObservacaoObstetrica ? "primary" : "")}
      ${metric("Sala de estabilização", String(emEstabilizacao).padStart(2, "0"), "Pacientes na fila", emEstabilizacao ? "danger" : "")}
    </section>
    <section class="panel section-gap">
      <h2>Indicadores estratégicos</h2>
      ${table(["Indicador", "Resultado", "Situação", "Base de cálculo", "Observação"], strategicRows)}
    </section>
    ${mobilidadeAssistencialSection()}
  `;
}

const municipioUf = {
  "Canindé de São Francisco": "SE",
  "Piranhas": "AL",
  "Poço Redondo": "SE",
  "Delmiro Gouveia": "AL",
  "Paulo Afonso": "BA",
  "Olho d'Água do Casado": "AL"
};

const localMunicipio = "Canindé de São Francisco";
const localMunicipioAliases = new Set(["caninde de sao francisco", "caninde"]);
const isLocalMunicipio = (nome = "") => localMunicipioAliases.has(normalizeText(nome));

const valoresEstimados = {
  consulta: 120,
  medicacao: 60,
  exame: 90,
  observacao: 250,
  transferencia: 400,
  ambulancia: 180
};

function getMobilidadeStats() {
  const pacientes = GsiApi.list("pacientes");
  const atendimentos = GsiApi.list("atendimentos");
  const transferencias = GsiApi.list("transferencias");
  const total = pacientes.length;

  const counts = {};
  pacientes.forEach((p) => {
    const nome = p.municipio || "Não informado";
    counts[nome] = (counts[nome] || 0) + 1;
  });

  const locais = Object.entries(counts).filter(([nome]) => isLocalMunicipio(nome)).reduce((sum, [, qtd]) => sum + qtd, 0);
  const externos = total - locais;
  const percentualExterno = total ? Math.round((externos / total) * 1000) / 10 : 0;

  const externosOrdenados = Object.entries(counts)
    .filter(([nome]) => !isLocalMunicipio(nome))
    .sort((a, b) => b[1] - a[1]);
  const principalExterno = externosOrdenados[0]?.[0] || "Nenhum";
  const linhasOrdenadas = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const topValidLabel = (items) => {
    const validos = items.filter(([label]) => label && label !== "Não informado");
    const fonte = validos.length ? validos : items;
    return [...fonte].sort((a, b) => b[1] - a[1])[0]?.[0] || "Nenhum";
  };

  const motivoItems = countBy(atendimentos, "motivo");
  const principalMotivo = topValidLabel(motivoItems);

  const desfechoItems = countBy(pacientes, "desfecho");
  const principalDesfecho = topValidLabel(desfechoItems);

  const transferenciasVinculadas = transferencias.filter((t) => t.pacienteId);
  const pacientesExternosIds = new Set(pacientes.filter((p) => !isLocalMunicipio(p.municipio || "Não informado")).map((p) => p.id));
  const externosTransferidosIds = new Set(transferenciasVinculadas.filter((t) => pacientesExternosIds.has(t.pacienteId)).map((t) => t.pacienteId));
  const percentualExternosTransferidos = pacientesExternosIds.size ? Math.round((externosTransferidosIds.size / pacientesExternosIds.size) * 1000) / 10 : 0;

  const origemTransferCounts = {};
  transferenciasVinculadas.forEach((t) => {
    const p = patientById(t.pacienteId);
    const nome = p?.municipio || "Não informado";
    origemTransferCounts[nome] = (origemTransferCounts[nome] || 0) + 1;
  });
  const origemTransferItems = Object.entries(origemTransferCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, qtd]) => [nome, qtd, isLocalMunicipio(nome) ? "bar-blue" : "bar-orange"]);

  const destinoTransferItems = countBy(transferencias, "destino");
  const motivoTransferItems = countBy(transferencias, "motivo");
  const ambulanciaItems = countBy(transferencias, "usouAmbulancia");

  const examesCount = GsiApi.list("exames").length;
  const prescricoesCount = GsiApi.list("prescricoes").length;
  const emObservacaoOuEstabilizacao = pacientes.filter((p) => ["Em observação clínica", "Em observação pediátrica", "Em observação obstétrica", "Sala de estabilização"].includes(p.status)).length;
  const ambulanciaCount = transferencias.filter((t) => t.usouAmbulancia === "Sim").length;

  const custoPorTipo = [
    { label: "Consulta", qtd: atendimentos.length, unitario: valoresEstimados.consulta },
    { label: "Medicação", qtd: prescricoesCount, unitario: valoresEstimados.medicacao },
    { label: "Exames", qtd: examesCount, unitario: valoresEstimados.exame },
    { label: "Observação", qtd: emObservacaoOuEstabilizacao, unitario: valoresEstimados.observacao },
    { label: "Transferência", qtd: transferenciasVinculadas.length, unitario: valoresEstimados.transferencia },
    { label: "Ambulância", qtd: ambulanciaCount, unitario: valoresEstimados.ambulancia }
  ].map((item) => ({ ...item, totalEstimado: item.qtd * item.unitario }));

  const custoTotalEstimado = custoPorTipo.reduce((total, item) => total + item.totalEstimado, 0);
  const custoPopulacaoFlutuante = externos * valoresEstimados.consulta;

  const traumaCount = motivoItems.find(([nome]) => nome === "Trauma/acidente")?.[1] || 0;
  const pediatricoCount = motivoItems.find(([nome]) => nome === "Atendimento pediátrico")?.[1] || 0;
  const periodoEspecialCount = atendimentos.filter((a) => a.periodo && a.periodo !== "Dia normal").length;

  const recomendacoes = [];
  if (percentualExterno >= 20 && traumaCount >= 1) {
    recomendacoes.push("Sala de Estabilização e Trauma Leve: volume relevante de externos associado a trauma/acidente.");
  }
  if (percentualExterno >= 20 && examesCount >= 2) {
    recomendacoes.push("Laboratório de Urgência 24h: demanda externa relevante associada a volume de exames.");
  }
  if (pediatricoCount >= 1) {
    recomendacoes.push("Observação Pediátrica: atendimentos pediátricos identificados na base atual.");
  }
  if (transferenciasVinculadas.length >= 2) {
    recomendacoes.push("Ambulância e Transferência Segura: volume de transferências regulado indica necessidade de reforço logístico.");
  }
  if (periodoEspecialCount >= 1) {
    recomendacoes.push("Plano Turismo Seguro: atendimentos concentrados em períodos especiais (feriado, evento, alta temporada).");
  }

  const perfilItems = countBy(pacientes, "perfil");
  const principalPerfil = topValidLabel(perfilItems);
  const localItems = countBy(atendimentos, "local");
  const periodoItems = countBy(atendimentos, "periodo");
  const tipoTransporteItems = countBy(transferencias, "tipoTransporte");

  return {
    total, counts, locais, externos, percentualExterno, principalExterno, linhasOrdenadas,
    motivoItems, principalMotivo, desfechoItems, principalDesfecho,
    perfilItems, principalPerfil, localItems, periodoItems, tipoTransporteItems,
    transferencias, transferenciasVinculadas, percentualExternosTransferidos,
    origemTransferItems, destinoTransferItems, motivoTransferItems, ambulanciaItems,
    custoPorTipo, custoTotalEstimado, custoPopulacaoFlutuante, recomendacoes,
    examesCount, prescricoesCount, ambulanciaCount, atendimentosCount: atendimentos.length
  };
}

function mobilidadeAssistencialSection() {
  const {
    total, locais, externos, percentualExterno, principalExterno, linhasOrdenadas,
    motivoItems, desfechoItems, percentualExternosTransferidos,
    perfilItems, localItems, periodoItems,
    origemTransferItems, destinoTransferItems, motivoTransferItems, ambulanciaItems,
    custoPorTipo, custoTotalEstimado, custoPopulacaoFlutuante, recomendacoes
  } = getMobilidadeStats();

  const rows = linhasOrdenadas.map(([nome, qtd]) => [
    escapeHtml(nome),
    escapeHtml(municipioUf[nome] || "-"),
    qtd,
    `${total ? Math.round((qtd / total) * 1000) / 10 : 0}%`,
    isLocalMunicipio(nome) ? status("Residente local") : status("Externo")
  ]);

  const chartItems = linhasOrdenadas.map(([nome, qtd]) => [nome, qtd, isLocalMunicipio(nome) ? "bar-blue" : "bar-orange"]);

  return `
    <section class="panel section-gap">
      <span class="eyebrow">Indicador estrategico</span>
      <h2>Observatorio da Mobilidade Assistencial</h2>
      <p>O Observatório da Mobilidade Assistencial permite identificar a origem municipal dos pacientes atendidos, demonstrando se a unidade hospitalar recebe demanda de outros municípios e população flutuante. Esse indicador apoia planejamento, pactuação regional, justificativa de custeio e pedidos futuros de investimento.</p>
    </section>
    <section class="grid stats-grid section-gap">
      ${metric("Total de pacientes registrados", total, "Base atual", "primary")}
      ${metric("Pacientes de Canindé", locais, "Residentes locais")}
      ${metric("Pacientes externos", externos, "Outros municípios", "warning")}
      ${metric("População flutuante", `${percentualExterno}%`, "Percentual de demanda externa", externos ? "danger" : "")}
      ${metric("Principal município externo", escapeHtml(principalExterno), "Maior demanda externa")}
    </section>
    <section class="grid two-column section-gap">
      <div class="panel wide-panel municipio-origin-panel">
        <h2>Pacientes por município de origem</h2>
        ${rows.length
          ? table(["Município", "UF", "Quantidade", "Percentual", "Tipo"], rows)
          : '<p class="muted">Nenhum paciente registrado.</p>'}
      </div>
      <div class="panel">
        <h2>Distribuição por município</h2>
        ${chartItems.length ? barChart(chartItems) : '<p class="muted">Sem dados suficientes.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Perfil do paciente atendido</h2>
        ${perfilItems.length ? barChart(perfilItems, true) : '<p class="muted">Nenhum perfil informado ainda.</p>'}
      </div>
      <div class="panel">
        <h2>Motivos mais frequentes de atendimento</h2>
        ${motivoItems.length ? barChart(motivoItems, true) : '<p class="muted">Nenhum motivo registrado ainda.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Local provável da ocorrência</h2>
        ${localItems.length ? barChart(localItems, true) : '<p class="muted">Nenhum local registrado ainda.</p>'}
      </div>
      <div class="panel">
        <h2>Atendimentos por período/condição especial</h2>
        ${periodoItems.length ? barChart(periodoItems, true) : '<p class="muted">Nenhum período registrado ainda.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Desfechos do atendimento</h2>
        ${desfechoItems.length ? barChart(desfechoItems) : '<p class="muted">Nenhum desfecho registrado ainda.</p>'}
      </div>
      <div class="panel">
        <h2>Transferências por origem</h2>
        ${origemTransferItems.length ? barChart(origemTransferItems) : '<p class="muted">Nenhuma transferência registrada ainda.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Destinos mais frequentes das transferências</h2>
        ${destinoTransferItems.length ? barChart(destinoTransferItems) : '<p class="muted">Nenhuma transferência registrada ainda.</p>'}
      </div>
      <div class="panel">
        <h2>Motivos de transferência</h2>
        ${motivoTransferItems.length ? barChart(motivoTransferItems) : '<p class="muted">Nenhuma transferência registrada ainda.</p>'}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h2>Uso de ambulância</h2>
        ${ambulanciaItems.length ? barChart(ambulanciaItems) : '<p class="muted">Nenhuma transferência registrada ainda.</p>'}
      </div>
      <div class="panel">
        ${metric("Externos transferidos", `${percentualExternosTransferidos}%`, "Percentual de pacientes externos com transferência registrada", percentualExternosTransferidos ? "danger" : "")}
      </div>
    </section>
    <section class="panel section-gap">
      <h2>Custo estimado da demanda externa</h2>
      <p class="muted"><strong>Estimativa demonstrativa — não oficial.</strong> Valores fictícios e redondos usados apenas para ilustrar a metodologia de cálculo, sem relação com tabela SUS, CNES, CNPJ ou qualquer código de procedimento real. Valores de investimento permanecem "a validar".</p>
      <section class="grid module-stats section-gap">
        ${metric("Custo estimado - população flutuante", `R$ ${custoPopulacaoFlutuante.toLocaleString("pt-BR")}`, "Estimativa demonstrativa - não oficial", "warning")}
        ${metric("Custo estimado total (todos os tipos)", `R$ ${custoTotalEstimado.toLocaleString("pt-BR")}`, "Estimativa demonstrativa - não oficial", "danger")}
      </section>
      ${table(["Tipo de atendimento", "Quantidade", "Valor unitário estimado", "Total estimado"], custoPorTipo.map((item) => [
        escapeHtml(item.label), item.qtd, `R$ ${item.unitario.toLocaleString("pt-BR")}`, `R$ ${item.totalEstimado.toLocaleString("pt-BR")}`
      ]))}
    </section>
    <section class="panel section-gap">
      <h2>Recomendações automáticas</h2>
      <p class="muted">Geradas a partir de regras simples e demonstrativas aplicadas aos dados atuais — não substituem avaliação técnica ou planejamento formal.</p>
      ${recomendacoes.length
        ? `<ul class="list alert-list">${recomendacoes.map((texto) => `<li>${escapeHtml(texto)}</li>`).join("")}</ul>`
        : '<p class="muted">Nenhuma recomendação acionada com os dados atuais.</p>'}
    </section>
    <section class="section-gap">
      <div class="actions">
        <button class="secondary-action" type="button" data-action="open-mobilidade-report">Gerar relatório de mobilidade assistencial</button>
        <button class="secondary-action" type="button" data-action="open-observatorio-ficha">Ficha Técnica do Observatório</button>
      </div>
    </section>
  `;
}

function pctOf(n, base) {
  return base ? Math.round((n / base) * 1000) / 10 : 0;
}

function itemsTable(items, base, labelHeader) {
  if (!items.length) return '<p class="muted">Nenhum registro disponível.</p>';
  return table([labelHeader, "Quantidade", "Percentual"], items.map(([label, qtd]) => [escapeHtml(label), qtd, `${pctOf(qtd, base)}%`]));
}

function openObservatorioFichaTecnicaModal() {
  const listItems = (items) => `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  openModal("Ficha Técnica do Observatório da Mobilidade Assistencial", `
    <section class="panel">
      <p><strong>Hospital Municipal Haydée Carvalho Leite Santos</strong></p>
      <p class="muted">Canindé de São Francisco/SE</p>
    </section>
    <section class="panel section-gap">
      <h3>1. Finalidade</h3>
      <p>Monitorar a origem, perfil, motivo de atendimento, local provável da ocorrência, período/condição especial, classificação de risco, desfechos, transferências, uso de ambulância, tempos assistenciais e impacto estimado da população residente e flutuante atendida pela unidade hospitalar.</p>
    </section>
    <section class="panel section-gap">
      <h3>2. Justificativa técnica</h3>
      <p>O hospital municipal atende moradores de Canindé de São Francisco e também pode receber pacientes de outros municípios, turistas, visitantes, trabalhadores temporários, população em trânsito e residentes de povoados/zona rural. O monitoramento dessa demanda fortalece o planejamento assistencial, a defesa de custeio, a pactuação regional e a captação de recursos.</p>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h3>3. Dados monitorados</h3>
        ${listItems(["Município de residência", "UF", "Reside em Canindé", "Perfil do paciente", "Povoado/localidade", "Motivo do atendimento", "Local provável da ocorrência", "Período/condição especial", "Classificação de risco", "Tempos assistenciais", "Desfecho", "Transferência", "Destino da transferência", "Uso de ambulância", "Custo assistencial demonstrativo"])}
      </div>
      <div class="panel">
        <h3>4. Indicadores produzidos</h3>
        ${listItems(["Percentual de demanda externa", "Principal município externo", "Perfil dos pacientes atendidos", "Motivos mais frequentes", "Locais prováveis de ocorrência", "Períodos de maior demanda", "Desfechos do atendimento", "Transferências por origem", "Uso de ambulância", "Tempo médio até triagem", "Tempo médio entre triagem e consulta", "Tempo médio até desfecho", "Tempo médio de permanência", "Simulação de custo assistencial da demanda externa"])}
      </div>
    </section>
    <section class="grid two-column section-gap">
      <div class="panel">
        <h3>5. Uso técnico</h3>
        ${listItems(["Gestão da porta de entrada", "Dimensionamento de equipe", "Organização da triagem", "Monitoramento de tempo de espera", "Planejamento de observação clínica, pediátrica e obstétrica", "Sala de estabilização", "Laboratório de urgência", "Transferência segura", "Regulação assistencial", "Auditoria e governança hospitalar"])}
      </div>
      <div class="panel">
        <h3>6. Uso institucional</h3>
        ${listItems(["Relatório de gestão", "Justificativa para emenda parlamentar", "Projeto de lei", "Pactuação regional", "Planejamento com Secretaria Municipal de Saúde", "Planejamento com Turismo", "Defesa Civil", "Segurança Pública", "Controle interno e prestação de contas"])}
      </div>
    </section>
    <section class="panel section-gap">
      <h3>7. Limitações</h3>
      <p>Os dados apresentados neste protótipo são fictícios e demonstrativos. Para uso oficial, recomenda-se coleta sistemática por 12 meses, validação institucional dos campos, capacitação das equipes, auditoria dos registros e padronização do fluxo assistencial.</p>
    </section>
    <section class="panel section-gap">
      <h3>8. Produto esperado após 12 meses</h3>
      <p>Relatório técnico anual da mobilidade assistencial, demonstrando população atendida, demanda externa, sazonalidade, tempos assistenciais, desfechos, transferências, uso de ambulância, pressão sobre a porta de entrada e necessidades de investimento.</p>
    </section>
    <section class="panel section-gap">
      <h3>9. Encaminhamentos recomendados</h3>
      ${listItems(["Validar os campos do Observatório com a gestão municipal", "Capacitar recepção, triagem, enfermagem, médicos, regulação e setor administrativo", "Implantar coleta mensal", "Revisar indicadores trimestralmente", "Elaborar relatório anual", "Utilizar os dados para subsidiar planejamento, emendas, pactuações e projetos de lei"])}
    </section>
  `, `<button class="secondary-action" data-action="close-modal">Fechar</button>`);

  const modalCard = document.querySelector(".modal-card");
  if (modalCard) modalCard.classList.add("wide");
}

function openMobilidadeReportModal() {
  const stats = getMobilidadeStats();
  const {
    total, locais, externos, percentualExterno, principalExterno, linhasOrdenadas,
    motivoItems, principalMotivo, desfechoItems, principalDesfecho,
    perfilItems, principalPerfil, localItems, periodoItems, tipoTransporteItems,
    transferencias, transferenciasVinculadas, percentualExternosTransferidos,
    destinoTransferItems, motivoTransferItems, ambulanciaItems,
    custoPorTipo, custoTotalEstimado, custoPopulacaoFlutuante, recomendacoes,
    examesCount, ambulanciaCount, atendimentosCount
  } = stats;
  const today = new Date().toLocaleDateString("pt-BR");

  const municipioRows = linhasOrdenadas.map(([nome, qtd]) => [
    escapeHtml(nome), escapeHtml(municipioUf[nome] || "-"), qtd, `${pctOf(qtd, total)}%`,
    isLocalMunicipio(nome) ? "Residente local" : "Externo"
  ]);

  const transferenciasLocais = transferenciasVinculadas.filter((t) => isLocalMunicipio(patientById(t.pacienteId)?.municipio || "")).length;
  const transferenciasExternas = transferenciasVinculadas.length - transferenciasLocais;

  const temDemandaExterna = percentualExterno >= 20;
  const temPeriodoEspecial = periodoItems.some(([label]) => label !== "Dia normal" && label !== "Não informado");
  const interpretacao = [
    temDemandaExterna
      ? `Há demanda externa relevante: ${percentualExterno}% dos pacientes registrados não residem em Canindé de São Francisco, com "${escapeHtml(principalExterno)}" como principal município de origem externa.`
      : `A demanda externa atual (${percentualExterno}%) é baixa na base demonstrativa, mas o Observatório já está estruturado para acompanhar variações sazonais.`,
    temPeriodoEspecial
      ? "Há evidência de população flutuante associada a períodos especiais (feriados, eventos, alta temporada), o que sugere variação de demanda ligada ao calendário turístico do município."
      : "Não há, na base atual, concentração relevante de atendimentos em períodos especiais, mas a categoria está disponível para monitoramento contínuo.",
    `Os atendimentos concentram-se principalmente em "${escapeHtml(principalMotivo)}", o que indica pressão assistencial específica sobre a porta de entrada e a triagem.`,
    `Foram registrados ${examesCount} exames, ${ambulanciaCount} uso(s) de ambulância e ${transferenciasVinculadas.length} transferência(s) reguladas na base atual, evidenciando impacto direto sobre laboratório/imagem, logística de transporte e regulação de vagas.`,
    recomendacoes.length
      ? `Com base nas regras demonstrativas aplicadas, as áreas que podem precisar de reforço incluem: ${recomendacoes.map((r) => escapeHtml(r.split(":")[0])).join("; ")}.`
      : "Nenhuma área específica foi sinalizada para reforço pelas regras demonstrativas com os dados atuais."
  ].map((texto) => `<p>${texto}</p>`).join("");

  const avgAteTriagem = averageElapsedFrom(GsiApi.list("pacientes"), "horaChegadaTs", "horaFimTriagemTs") ?? averageElapsedFrom(GsiApi.list("pacientes"), "horaChegadaTs", "horaInicioTriagemTs");
  const avgTriagemConsulta = averageElapsedFrom(GsiApi.list("pacientes"), "horaFimTriagemTs", "horaInicioConsultaTs");
  const avgConsultaDesfecho = averageElapsedFrom(GsiApi.list("pacientes"), "horaInicioConsultaTs", "horaDesfechoTs");
  const avgPermanencia = averageElapsedFrom(GsiApi.list("pacientes"), "horaChegadaTs", "horaDesfechoTs");
  const pacientesBaseTempo = GsiApi.list("pacientes");
  const tempoAssistencialRows = [
    ["Tempo médio até triagem", avgAteTriagem === null ? "Sem dados suficientes" : formatElapsed(avgAteTriagem), `${pacientesBaseTempo.filter((p) => (p.horaFimTriagemTs || p.horaInicioTriagemTs) && p.horaChegadaTs).length} paciente(s)`, "Usa chegada e fim/início da triagem."],
    ["Tempo médio entre triagem e consulta", avgTriagemConsulta === null ? "Sem dados suficientes" : formatElapsed(avgTriagemConsulta), `${pacientesBaseTempo.filter((p) => p.horaFimTriagemTs && p.horaInicioConsultaTs).length} paciente(s)`, "Usa fim da triagem e início da consulta."],
    ["Tempo médio entre consulta e desfecho", avgConsultaDesfecho === null ? "Sem dados suficientes" : formatElapsed(avgConsultaDesfecho), `${pacientesBaseTempo.filter((p) => p.horaInicioConsultaTs && p.horaDesfechoTs).length} paciente(s)`, "Usa início da consulta e desfecho."],
    ["Tempo médio de permanência na unidade", avgPermanencia === null ? "Sem dados suficientes" : formatElapsed(avgPermanencia), `${pacientesBaseTempo.filter((p) => p.horaChegadaTs && p.horaDesfechoTs).length} paciente(s)`, "Usa chegada e desfecho."]
  ].map((row) => row.map((cell) => escapeHtml(cell)));

  openModal("Relatório de Mobilidade Assistencial", `
    <section class="section-gap report-cover">
      <p class="report-org">Hospital Municipal Haydée Carvalho Leite Santos</p>
      <p class="report-system">GSI ONE</p>
      <p class="report-observatory">Observatório da Mobilidade Assistencial de Canindé</p>
      <h2 style="margin:0">Relatório Técnico Demonstrativo</h2>
      <p class="report-place">Canindé de São Francisco/SE</p>
      <p class="report-demo">Ambiente demonstrativo / dados fictícios</p>
      <p class="muted">Emitido em ${today}</p>
    </section>

    <section class="panel section-gap">
      <h3>1. Nota metodológica</h3>
      <p>Os dados apresentados neste relatório são fictícios e demonstrativos, utilizados exclusivamente para ilustrar a metodologia de monitoramento da mobilidade assistencial. Não possuem validade contábil, financeira, orçamentária, epidemiológica ou administrativa. Para uso oficial, recomenda-se coleta sistemática por 12 meses, validação institucional dos registros e padronização dos campos de informação.</p>
    </section>

    <section class="panel section-gap">
      <h3>2. Resumo executivo</h3>
      <div class="form-grid">
        <p class="field"><span>Total de pacientes registrados</span>${total}</p>
        <p class="field"><span>Pacientes de Canindé</span>${locais}</p>
        <p class="field"><span>Pacientes externos</span>${externos}</p>
        <p class="field"><span>Percentual de demanda externa</span>${percentualExterno}%</p>
        <p class="field"><span>Principal município externo</span>${escapeHtml(principalExterno)}</p>
        <p class="field"><span>Principal perfil de paciente</span>${escapeHtml(principalPerfil)}</p>
        <p class="field"><span>Principal motivo de atendimento</span>${escapeHtml(principalMotivo)}</p>
        <p class="field"><span>Principal desfecho válido</span>${escapeHtml(principalDesfecho)}</p>
        <p class="field"><span>Transferências realizadas</span>${transferenciasVinculadas.length}</p>
        <p class="field"><span>Percentual de externos transferidos</span>${percentualExternosTransferidos}%</p>
        <p class="field"><span>Custo estimado demonstrativo da demanda externa</span>R$ ${custoPopulacaoFlutuante.toLocaleString("pt-BR")}</p>
      </div>
    </section>

    <section class="panel section-gap">
      <h3>3. Tempos Assistenciais da Porta de Entrada</h3>
      ${table(["Indicador", "Resultado", "Base", "Observação"], tempoAssistencialRows)}
      <p class="muted">Os tempos assistenciais são calculados com base nos registros do fluxo de atendimento. Pacientes com fluxo incompleto são desconsiderados do cálculo, evitando distorções nos indicadores.</p>
    </section>

    <section class="panel section-gap municipio-origin-panel">
      <h3>4. Origem municipal dos pacientes</h3>
      ${table(["Município", "UF", "Quantidade", "Percentual", "Tipo"], municipioRows)}
      <p class="muted">O levantamento demonstra se a unidade atende apenas residentes do município ou se absorve demanda assistencial de outros municípios e população flutuante.</p>
    </section>

    <section class="panel section-gap">
      <h3>5. Perfil do paciente atendido</h3>
      ${itemsTable(perfilItems, total, "Perfil")}
    </section>

    <section class="panel section-gap">
      <h3>6. Motivos mais frequentes de atendimento</h3>
      ${itemsTable(motivoItems, atendimentosCount, "Motivo")}
    </section>

    <section class="panel section-gap">
      <h3>7. Local provável da ocorrência</h3>
      ${itemsTable(localItems, atendimentosCount, "Local")}
    </section>

    <section class="panel section-gap">
      <h3>8. Período/condição especial</h3>
      ${itemsTable(periodoItems, atendimentosCount, "Período/condição")}
    </section>

    <section class="panel section-gap">
      <h3>9. Desfechos do atendimento</h3>
      ${itemsTable(desfechoItems, total, "Desfecho")}
      <p class="muted">O destaque de "Principal desfecho válido" no resumo executivo ignora a categoria "Não informado" sempre que houver ao menos um desfecho registrado, conforme regra de consistência do Observatório.</p>
    </section>

    <section class="panel section-gap">
      <h3>10. Transferências e regulação</h3>
      <div class="form-grid">
        <p class="field"><span>Total de transferências</span>${transferencias.length}</p>
        <p class="field"><span>Transferências de pacientes de Canindé</span>${transferenciasLocais}</p>
        <p class="field"><span>Transferências de pacientes externos</span>${transferenciasExternas}</p>
        <p class="field"><span>Percentual de externos transferidos</span>${percentualExternosTransferidos}%</p>
      </div>
      <h4>Destinos mais frequentes</h4>
      ${itemsTable(destinoTransferItems, transferencias.length, "Destino")}
      <h4>Motivos de transferência</h4>
      ${itemsTable(motivoTransferItems, transferencias.length, "Motivo")}
      <h4>Uso de ambulância</h4>
      ${itemsTable(ambulanciaItems, transferencias.length, "Usou ambulância?")}
      ${tipoTransporteItems.length ? `<h4>Tipo de transporte</h4>${itemsTable(tipoTransporteItems, transferencias.length, "Tipo de transporte")}` : ""}
    </section>

    <section class="panel section-gap">
      <h3>11. Simulação de custo assistencial da demanda externa</h3>
      <div class="form-grid">
        <p class="field"><span>Custo estimado da população flutuante</span>R$ ${custoPopulacaoFlutuante.toLocaleString("pt-BR")}</p>
        <p class="field"><span>Custo estimado total</span>R$ ${custoTotalEstimado.toLocaleString("pt-BR")}</p>
      </div>
      ${table(["Tipo de atendimento", "Quantidade", "Valor unitário estimado", "Total estimado"], custoPorTipo.map((item) => [
        escapeHtml(item.label), item.qtd, `R$ ${item.unitario.toLocaleString("pt-BR")}`, `R$ ${item.totalEstimado.toLocaleString("pt-BR")}`
      ]))}
      <p class="muted">Valores meramente demonstrativos, sem validade contábil, orçamentária ou financeira. Servem apenas para ilustrar metodologia de análise. Não possuem relação com tabela SUS, CNES, CNPJ, código de procedimento ou qualquer fonte oficial.</p>
    </section>

    <section class="panel section-gap">
      <h3>12. Recomendações automáticas</h3>
      ${recomendacoes.length
        ? `<ul class="list alert-list">${recomendacoes.map((texto) => `<li>${escapeHtml(texto)}</li>`).join("")}</ul>`
        : '<p class="muted">Nenhuma recomendação acionada com os dados atuais.</p>'}
      <p class="muted">As recomendações são geradas por regras demonstrativas simples e não substituem análise técnica formal, validação da gestão municipal ou planejamento institucional.</p>
    </section>

    <section class="panel section-gap">
      <h3>13. Interpretação técnica</h3>
      ${interpretacao}
    </section>

    <section class="panel section-gap">
      <h3>14. Uso institucional dos dados</h3>
      <ul class="list">
        <li>Relatório de gestão</li>
        <li>Emenda parlamentar</li>
        <li>Projeto de lei</li>
        <li>Pactuação regional</li>
        <li>Planejamento com Turismo</li>
        <li>Defesa Civil</li>
        <li>Segurança Pública</li>
        <li>Regulação assistencial</li>
      </ul>
    </section>

    <section class="panel section-gap">
      <h3>15. Projeto financiável</h3>
      <p>Com base na proporção de pacientes externos (${percentualExterno}%), no motivo de atendimento mais frequente ("${escapeHtml(principalMotivo)}") e no desfecho mais comum entre os válidos ("${escapeHtml(principalDesfecho)}"), recomenda-se: reforço de custeio assistencial; ambulância e transporte sanitário; sala de estabilização; laboratório de urgência; observação clínica/pediátrica/obstétrica; qualificação da regulação; e estruturação do Observatório por 12 meses para consolidar série histórica.</p>
      <p><strong>Valor estimado:</strong> a validar (depende de pactuação regional e definição orçamentária futura).</p>
    </section>

    <section class="panel section-gap">
      <h3>16. Encaminhamentos sugeridos</h3>
      <ul class="list">
        <li>Validar campos de coleta</li>
        <li>Implantar registro padronizado por 12 meses</li>
        <li>Capacitar recepção, triagem e equipe assistencial</li>
        <li>Revisar mensalmente os indicadores</li>
        <li>Consolidar relatório trimestral</li>
        <li>Elaborar relatório anual para subsidiar emendas, pactuação e projeto de lei</li>
      </ul>
    </section>

    <section class="section-gap">
      <p class="muted">Documento demonstrativo gerado pelo protótipo GSI ONE. Dados fictícios. Uso exclusivo para validação de metodologia e apresentação institucional.</p>
    </section>
  `, `<button class="secondary-action" data-action="close-modal">Fechar</button><button class="action-button" data-action="print-report">Imprimir / salvar PDF</button>`);

  const modalCard = document.querySelector(".modal-card");
  if (modalCard) modalCard.classList.add("wide");
}

function relatorios() {
  const reports = ["Relatório diário de atendimentos", "Relatório de classificação de risco", "Relatório de transferências", "Relatório de observação clínica", "Relatório de produção SUS", "Relatório de registros incompletos", "Relatório gerencial para Secretaria Municipal de Saúde", "Relatório de farmácia", "Relatório de estoque crítico", "Relatório de dispensação de medicamentos", "Relatório de exames laboratoriais", "Relatório de exames de imagem", "Relatório de resultados críticos"];
  return `${pageHead("Relatórios", "Área demonstrativa para emissão de relatórios operacionais e gerenciais.")}<section class="grid report-grid">${reports.map((r) => `<article class="report-card"><strong>${r}</strong><p class="muted">Modelo pronto para filtros por período, setor e classificação.</p><button class="secondary-action" type="button" data-action="generate-report" data-nome="${escapeHtml(r)}">Gerar</button></article>`).join("")}</section>`;
}

// Etapa 2.2 (Fase 2B): chaves alinhadas com os seeds reais de
// public.configuracoes_sistema (migration 20260623100019_configuracoes_sistema.sql)
// - nao sao mais preferencias ficticias de localStorage, e sim flags de
// ativacao de modulo persistidas no banco/Supabase.
const configToggles = [
  ["modulo_pacientes_ativo", "Módulo Pacientes", "Ativa o módulo Pacientes no sistema."],
  ["modulo_atendimentos_ativo", "Módulo Atendimentos", "Ativa o módulo Atendimentos no sistema."],
  ["modulo_triagem_ativo", "Módulo Triagem / Classificação de Risco", "Ativa o módulo Triagem no sistema."],
  ["modulo_consulta_ativo", "Módulo Consulta", "Ativa o módulo Consulta no sistema."],
  ["modulo_estabilizacao_ativo", "Módulo Sala de Estabilização", "Ativa o módulo Sala de Estabilização no sistema."],
  ["modulo_transferencias_ativo", "Módulo Transferências", "Ativa o módulo Transferências no sistema."],
  ["modulo_relatorios_ativo", "Módulo Relatórios", "Ativa o módulo Relatórios no sistema."]
];

// Estado em memoria das configuracoes reais carregadas de
// public.configuracoes_sistema via window.GsiAuth.client. Nao usa
// localStorage como fonte nem como fallback - se a leitura falhar,
// loaded permanece false e a tela mostra aviso, sem inventar estado.
let configSistemaState = { loaded: false, loading: false, error: null, valores: {} };

function getConfig(id) {
  return configSistemaState.valores[id] !== false;
}

// Busca as configuracoes reais no Supabase. Chamada pela navegacao para a
// rota "configuracoes" (ver renderPage) e reaplicada a cada visita a tela -
// nao ha cache permanente, para refletir alteracoes feitas por outra
// sessao de Administracao. Reentrancia protegida por "loading".
async function loadConfiguracoesSistema() {
  if (configSistemaState.loading) return;
  if (!window.GsiAuth || !window.GsiAuth.client) {
    configSistemaState.error = "Sessão não carregada. Não foi possível buscar as configurações.";
    return;
  }
  configSistemaState.loading = true;
  configSistemaState.error = null;
  try {
    const { data, error } = await window.GsiAuth.client
      .from("configuracoes_sistema")
      .select("chave, valor")
      .in("chave", configToggles.map(([chave]) => chave));
    if (error) throw error;
    const valores = {};
    (data || []).forEach((row) => {
      valores[row.chave] = !!(row.valor && row.valor.ativo);
    });
    configSistemaState.valores = valores;
    configSistemaState.loaded = true;
  } catch (err) {
    console.error("GSI Configurações: erro ao carregar configuracoes_sistema", err);
    configSistemaState.error = "Não foi possível carregar as configurações do servidor. Tente novamente.";
  } finally {
    configSistemaState.loading = false;
    if (currentPage === "configuracoes") content.innerHTML = pages.configuracoes();
  }
}

// Persiste uma unica chave em public.configuracoes_sistema. So' atualiza
// (nunca insere) - os 7 registros ja existem via seed da migration, e esta
// fase nao cria CRUD novo de chaves. RLS/permissao real continuam sendo a
// barreira de seguranca; isto e' so' o cliente HTTP autenticado.
async function saveConfiguracaoSistema(chave, ativo) {
  if (!window.GsiAuth || !window.GsiAuth.client) {
    throw new Error("Sessão não carregada.");
  }
  const usuario = typeof window.GsiAuth.getCurrentUser === "function" ? window.GsiAuth.getCurrentUser() : null;
  const { error } = await window.GsiAuth.client
    .from("configuracoes_sistema")
    .update({ valor: { ativo }, updated_by: usuario ? usuario.id : null })
    .eq("chave", chave);
  if (error) throw error;
}

function configuracoes() {
  const podeGerenciarConfig = isActionAllowed(CONFIGURACOES_ACTION_RULE);
  const carregando = configSistemaState.loading || (!configSistemaState.loaded && !configSistemaState.error);
  return `
    ${pageHead("Configurações", "Parâmetros estruturais do protótipo para usuários, perfis, setores, salas e protocolos.")}
    <section class="grid two-column">
      <div class="panel">
        <h2>Preferências do sistema</h2>
        ${!podeGerenciarConfig ? '<p class="muted">Sem permissão para visualizar/alterar configurações. Acesso restrito à Administração.</p>' : ""}
        ${podeGerenciarConfig && carregando ? '<p class="muted">Carregando configurações...</p>' : ""}
        ${podeGerenciarConfig && configSistemaState.error ? `<p class="muted">${escapeHtml(configSistemaState.error)}</p>` : ""}
        ${podeGerenciarConfig ? configToggles.map(([id, label, desc]) => `
          <div class="switch-row">
            <div><strong style="display:block">${label}</strong><small class="muted">${desc}</small></div>
            <label class="switch"><input type="checkbox" data-action="toggle-config" data-id="${id}" ${getConfig(id) ? "checked" : ""} ${(carregando || configSistemaState.error) ? "disabled" : ""}><span></span></label>
          </div>
        `).join("") : ""}
      </div>
      <div class="panel"><h2>Módulos estruturais</h2><div class="grid" style="grid-template-columns:1fr">${["Usuários", "Perfis de acesso", "Setores", "Salas", "Protocolos", "Parâmetros assistenciais"].map((item) => `<div class="switch-row"><span>${item}</span><button class="secondary-action" type="button" data-action="generic-toast">Configurar</button></div>`).join("")}</div></div>
    </section>
  `;
}

// =========================================================================
// Modulo Auditoria (Fase 1 - somente leitura)
// =========================================================================
// Le diretamente public.audit_log via window.GsiAuth.client (Supabase) -
// nao usa GsiApi nem localStorage. Nenhuma escrita: sem botao de editar,
// excluir ou exportar nesta fase. RLS (is_admin() or is_auditoria()) e' a
// barreira real; este estado e' so' o cache em memoria do que foi lido.
let auditoriaState = { loaded: false, loading: false, error: null, eventos: [], usuariosPorId: {} };
// Filtros aplicados apenas sobre os eventos ja carregados (client-side) -
// nunca persistidos em banco/localStorage, conforme escopo desta fase.
let auditoriaFiltros = { tabela: "", acao: "", texto: "" };

async function loadAuditoria() {
  if (auditoriaState.loading) return;
  if (!window.GsiAuth || !window.GsiAuth.client) {
    auditoriaState.error = "Sessão não carregada. Não foi possível buscar a auditoria.";
    return;
  }
  auditoriaState.loading = true;
  auditoriaState.error = null;
  try {
    const { data, error } = await window.GsiAuth.client
      .from("audit_log")
      .select("id, created_at, usuario_id, tabela_afetada, registro_id, acao, dados_antes, dados_depois")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const eventos = data || [];
    const idsUsuarios = [...new Set(eventos.map((evento) => evento.usuario_id).filter(Boolean))];
    let usuariosPorId = {};
    if (idsUsuarios.length) {
      const { data: usuariosData, error: usuariosError } = await window.GsiAuth.client
        .from("usuarios")
        .select("id, nome, email")
        .in("id", idsUsuarios);
      if (usuariosError) throw usuariosError;
      (usuariosData || []).forEach((usuario) => { usuariosPorId[usuario.id] = usuario; });
    }
    auditoriaState.eventos = eventos;
    auditoriaState.usuariosPorId = usuariosPorId;
    auditoriaState.loaded = true;
  } catch (err) {
    console.error("GSI Auditoria: erro ao carregar audit_log", err);
    auditoriaState.error = "Não foi possível carregar os registros de auditoria. Tente novamente.";
  } finally {
    auditoriaState.loading = false;
    if (currentPage === "auditoria") {
      content.innerHTML = pages.auditoria();
      attachAuditoriaFilterListeners();
    }
  }
}

// Os campos de filtro só existem no DOM depois que os dados terminam de
// carregar (enquanto carregando/erro, a tela nao renderiza os <select>/
// <input> de filtro) - por isso esta funcao precisa ser chamada tanto em
// renderPage() quanto no fim de loadAuditoria(), nunca só uma vez.
function attachAuditoriaFilterListeners() {
  const filtroTabela = byId("auditoriaFiltroTabela");
  if (filtroTabela) filtroTabela.addEventListener("change", () => {
    auditoriaFiltros.tabela = filtroTabela.value;
    renderAuditoriaTabela();
  });
  const filtroAcao = byId("auditoriaFiltroAcao");
  if (filtroAcao) filtroAcao.addEventListener("change", () => {
    auditoriaFiltros.acao = filtroAcao.value;
    renderAuditoriaTabela();
  });
  const filtroTexto = byId("auditoriaFiltroTexto");
  if (filtroTexto) filtroTexto.addEventListener("input", () => {
    auditoriaFiltros.texto = filtroTexto.value;
    renderAuditoriaTabela();
  });
}

function auditoriaUsuarioLabel(usuarioId) {
  if (!usuarioId) return "Sistema/migração";
  const usuario = auditoriaState.usuariosPorId[usuarioId];
  if (usuario) return usuario.nome || usuario.email || usuarioId;
  return `${String(usuarioId).slice(0, 8)}…`;
}

function auditoriaAcaoLabel(acao) {
  const labels = { insert: "Inserção", update: "Atualização", delete: "Exclusão", bootstrap_admin: "Inicialização (bootstrap)" };
  return labels[acao] || acao || "—";
}

function auditoriaResumoAlteracao(evento) {
  if (evento.acao === "insert") return "Registro criado.";
  if (evento.acao === "delete") return "Registro removido.";
  if (evento.acao === "update") {
    const antes = evento.dados_antes || {};
    const depois = evento.dados_depois || {};
    const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])];
    const alteradas = chaves.filter((chave) => JSON.stringify(antes[chave]) !== JSON.stringify(depois[chave]));
    if (!alteradas.length) return "Sem alterações de campo detectadas.";
    return `Campos alterados: ${alteradas.slice(0, 5).join(", ")}${alteradas.length > 5 ? "…" : ""}`;
  }
  return "Evento administrativo registrado.";
}

function auditoriaDataHora(iso) {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function auditoriaCardsResumo(eventos) {
  const total = eventos.length;
  const hojeStr = new Date().toDateString();
  const hoje = eventos.filter((evento) => evento.created_at && new Date(evento.created_at).toDateString() === hojeStr).length;
  const usuarios = new Set(eventos.map((evento) => evento.usuario_id || "sistema")).size;
  const porTabela = {};
  eventos.forEach((evento) => { porTabela[evento.tabela_afetada] = (porTabela[evento.tabela_afetada] || 0) + 1; });
  const tabelaTopEntry = Object.entries(porTabela).sort((a, b) => b[1] - a[1])[0];
  const tabelaTop = tabelaTopEntry ? `${tabelaTopEntry[0]} (${tabelaTopEntry[1]})` : "Sem dados";
  return { total, hoje, usuarios, tabelaTop };
}

function auditoriaEventosFiltrados() {
  const { tabela, acao, texto } = auditoriaFiltros;
  const termo = texto.trim().toLowerCase();
  return auditoriaState.eventos.filter((evento) => {
    if (tabela && evento.tabela_afetada !== tabela) return false;
    if (acao && evento.acao !== acao) return false;
    if (termo) {
      const haystack = `${evento.tabela_afetada} ${evento.acao} ${evento.registro_id} ${auditoriaUsuarioLabel(evento.usuario_id)}`.toLowerCase();
      if (!haystack.includes(termo)) return false;
    }
    return true;
  });
}

function auditoriaTabelaHtml() {
  const filtrados = auditoriaEventosFiltrados();
  if (!filtrados.length) return '<p class="muted">Nenhum evento de auditoria encontrado com os filtros atuais.</p>';
  const rows = filtrados.map((evento) => [
    escapeHtml(auditoriaDataHora(evento.created_at)),
    escapeHtml(auditoriaUsuarioLabel(evento.usuario_id)),
    escapeHtml(auditoriaAcaoLabel(evento.acao)),
    escapeHtml(evento.tabela_afetada || "—"),
    `<code>${escapeHtml(String(evento.registro_id || "").slice(0, 8))}…</code>`,
    escapeHtml(auditoriaResumoAlteracao(evento))
  ]);
  return table(["Data/hora", "Usuário", "Ação", "Tabela", "Registro", "Resumo da alteração"], rows);
}

function renderAuditoriaTabela() {
  const wrap = byId("auditoriaTableWrap");
  if (wrap) wrap.innerHTML = auditoriaTabelaHtml();
}

function auditoria() {
  const podeVerAuditoria = isActionAllowed(AUDITORIA_ACTION_RULE);
  const carregando = auditoriaState.loading || (!auditoriaState.loaded && !auditoriaState.error);
  if (!podeVerAuditoria) {
    return `
      ${pageHead("Auditoria", "Trilha de auditoria do sistema - somente leitura.")}
      <section class="grid"><div class="panel"><p class="muted">Sem permissão para visualizar a auditoria. Acesso restrito à Administração e ao perfil Auditoria.</p></div></section>
    `;
  }
  if (carregando) {
    return `
      ${pageHead("Auditoria", "Trilha de auditoria do sistema - somente leitura.")}
      <section class="grid"><div class="panel"><p class="muted">Carregando registros de auditoria...</p></div></section>
    `;
  }
  if (auditoriaState.error) {
    return `
      ${pageHead("Auditoria", "Trilha de auditoria do sistema - somente leitura.")}
      <section class="grid"><div class="panel"><p class="muted">${escapeHtml(auditoriaState.error)}</p></div></section>
    `;
  }
  const eventos = auditoriaState.eventos;
  const cards = auditoriaCardsResumo(eventos);
  const tabelasDistintas = [...new Set(eventos.map((evento) => evento.tabela_afetada))].sort();
  const acoesDistintas = [...new Set(eventos.map((evento) => evento.acao))].sort();
  return `
    ${pageHead("Auditoria", "Trilha de auditoria do sistema - somente leitura. Últimos 100 eventos registrados em audit_log.")}
    <section class="grid module-stats">
      ${metric("Total de eventos carregados", cards.total, "Últimos 100 eventos de audit_log")}
      ${metric("Eventos hoje", cards.hoje, "Registrados no dia atual")}
      ${metric("Usuários envolvidos", cards.usuarios, "Inclui \"Sistema/migração\"")}
      ${metric("Tabela mais alterada", cards.tabelaTop, "Entre os eventos carregados")}
    </section>
    ${eventos.length === 0 ? '<section class="grid"><div class="panel"><p class="muted">Nenhum evento de auditoria registrado ainda.</p></div></section>' : `
    <section class="panel">
      <h2>Filtros</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <label class="field full"><span>Tabela</span>
          <select id="auditoriaFiltroTabela">
            <option value="">Todas</option>
            ${tabelasDistintas.map((t) => `<option value="${escapeHtml(t)}" ${auditoriaFiltros.tabela === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
          </select>
        </label>
        <label class="field full"><span>Operação</span>
          <select id="auditoriaFiltroAcao">
            <option value="">Todas</option>
            ${acoesDistintas.map((a) => `<option value="${escapeHtml(a)}" ${auditoriaFiltros.acao === a ? "selected" : ""}>${escapeHtml(auditoriaAcaoLabel(a))}</option>`).join("")}
          </select>
        </label>
        <label class="field full"><span>Busca livre</span>
          <input id="auditoriaFiltroTexto" type="search" placeholder="Tabela, ação, usuário ou registro" value="${escapeHtml(auditoriaFiltros.texto)}">
        </label>
      </div>
    </section>
    <section class="panel">
      <h2>Eventos</h2>
      <div id="auditoriaTableWrap">${auditoriaTabelaHtml()}</div>
    </section>
    `}
  `;
}

const pages = {
  dashboard,
  pacientes,
  atendimentos: atendimentosOperational,
  "painel-chamada": painelChamada,
  "painel-tv": painelTv,
  risco: classificacao,
  triagem,
  consulta,
  enfermagem,
  farmacia,
  exames,
  estabilizacao,
  "observacao-clinica": observacaoClinica,
  "observacao-pediatrica": observacaoPediatrica,
  "observacao-obstetrica": observacaoObstetrica,
  transferencias,
  indicadores,
  relatorios,
  configuracoes,
  auditoria,
  sair: () => pageHead("Sair", "A sessão deste sistema é gerenciada pelo Supabase Auth. Para encerrar sua sessão, use o botão \"Encerrar sessão\" no menu do usuário, no topo da tela.")
};

let tvRefreshTimer = null;

function renderNav(active) {
  sideNav.innerHTML = menuItems
    .filter(([id]) => isRouteAllowed(id))
    .map(([id, label, icon]) => `
      <button type="button" class="${id === active ? "is-active" : ""}" data-page="${id}">
        <span class="nav-icon">${icon}</span><span>${label}</span>
      </button>
    `).join("");
}

function renderPage(pageId = currentPage) {
  const targetId = pages[pageId] ? pageId : "dashboard";
  if (targetId !== "dashboard" && !isRouteAllowed(targetId)) {
    showToast("Você não tem permissão para acessar este módulo.", "warn");
    currentPage = "dashboard";
  } else {
    currentPage = targetId;
  }
  document.body.classList.toggle("tv-mode", currentPage === "painel-tv");
  if (currentPage !== "painel-tv") renderNav(currentPage);
  if (sectorSelect) sectorSelect.value = sectorOptions.some(([, id]) => id === currentPage) ? currentPage : "";
  content.innerHTML = pages[currentPage]();
  if (currentPage === "configuracoes" && isActionAllowed(CONFIGURACOES_ACTION_RULE)) loadConfiguracoesSistema();
  if (currentPage === "auditoria" && isActionAllowed(AUDITORIA_ACTION_RULE)) loadAuditoria();
  // Fase 1 (Passo 1) - Pacientes reais: so' busca quando a rota atual ja foi
  // resolvida como "pacientes"/"atendimentos" pelo proprio renderPage acima
  // (se o usuario nao tivesse permissao, currentPage ja teria sido forcado
  // para "dashboard" antes desta linha) - nao bloqueia a renderizacao local
  // se a busca falhar, ja que loadPacientesReais() so atualiza o cache em
  // memoria e nunca lanca exception para fora de si mesma.
  if (currentPage === "pacientes" || currentPage === "atendimentos") loadPacientesReais();
  content.querySelectorAll(".table-wrap").forEach((wrap) => { wrap.scrollLeft = 0; });
  content.focus({ preventScroll: true });
  window.location.hash = currentPage;
  closeMenu();
  const search = byId("patientSearch");
  if (search) search.addEventListener("input", () => filterPatients(search.value));
  attachAuditoriaFilterListeners();
  if (tvRefreshTimer) {
    clearInterval(tvRefreshTimer);
    tvRefreshTimer = null;
  }
  if (currentPage === "painel-tv") {
    markLatestCallAsSeen();
    tvRefreshTimer = setInterval(() => {
      if (currentPage === "painel-tv") {
        content.innerHTML = pages["painel-tv"]();
        announceLatestCallIfNeeded();
      }
    }, 5000);
  }
}

function filterPatients(term) {
  const normalized = term.trim().toLowerCase();
  const filtered = GsiApi.list("pacientes").filter((p) => isPatientOperationalVisible(p) && Object.values(p).join(" ").toLowerCase().includes(normalized));
  const rows = filtered.map((p) => [
    escapeHtml(p.nome), escapeHtml(p.nascimento), escapeHtml(municipioUfLabel(p)), escapeHtml(p.cpf), escapeHtml(p.sus), tag(p.classificacao), status(p.status), patientTimesCell(p),
    patientActionsCell(p)
  ]);
  byId("patientsTable").innerHTML = table(["Nome", "Nascimento", "Município/UF", "CPF", "Cartão SUS", "Classificação", "Status", "Tempos", "Ação"], rows);
}

function closeMenu() {
  sidebar.classList.remove("is-open");
  overlay.classList.remove("is-open");
}

function openRegisterPatient() {
  openModal("Registrar paciente", `
    <form id="patientForm" class="form-grid">
      ${field("Nome", "nome")}
      ${field("Nascimento", "nascimento", "", "", false)}
      ${field("CPF", "cpf")}
      ${field("Cartão SUS", "sus")}
      ${field("Telefone", "telefone")}
      ${field("Município", "municipio")}
      <label class="field">
        <span>UF *</span>
        <select name="uf" required>
          <option value="">Selecione</option>
          <option>AC</option>
          <option>SE</option>
          <option>AL</option>
          <option>AP</option>
          <option>AM</option>
          <option>BA</option>
          <option>CE</option>
          <option>DF</option>
          <option>ES</option>
          <option>GO</option>
          <option>MA</option>
          <option>MT</option>
          <option>MS</option>
          <option>MG</option>
          <option>PA</option>
          <option>PB</option>
          <option>PR</option>
          <option>PE</option>
          <option>PI</option>
          <option>RJ</option>
          <option>RN</option>
          <option>RS</option>
          <option>RO</option>
          <option>RR</option>
          <option>SC</option>
          <option>SP</option>
          <option>TO</option>
        </select>
      </label>
      <label class="field">
        <span>Reside em Canindé? *</span>
        <select name="resideCaninde" required>
          <option value="">Selecione</option>
          <option>Sim</option>
          <option>Não</option>
        </select>
      </label>
      ${field("Povoado/localidade", "povoadoLocalidade", "", "", false, false)}
      ${selectField("Perfil do paciente", "perfil", ["Residente de Canindé de São Francisco", "Residente de povoado/zona rural", "Turista", "Visitante familiar", "Trabalhador temporário", "Pessoa em trânsito", "Residente de outro município"])}
      ${field("Queixa principal", "queixa", "", "full", true)}
      ${field("Observações", "observacoes", "", "full", true, false)}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(PACIENTE_CREATE_ACTION_RULE)
    ? `<button class="action-button" data-action="save-patient">Salvar paciente</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Recepção (ou permissão paciente.criar) pode cadastrar pacientes">Salvar paciente (sem permissão)</button>`}`);

  const form = byId("patientForm");
  const municipioInput = form.querySelector('input[name="municipio"]');
  const resideSelect = form.querySelector('select[name="resideCaninde"]');
  let resideManualChange = false;
  resideSelect.addEventListener("change", () => {
    resideManualChange = true;
  });
  municipioInput.addEventListener("input", () => {
    if (!resideManualChange && isCanindeMunicipio(municipioInput.value)) {
      resideSelect.value = "Sim";
    }
  });
}

function openRiskModal(id) {
  const p = patientById(id);
  openModal("Classificação de risco", `
    <p class="muted">Paciente: <strong>${escapeHtml(p?.nome || "Paciente")}</strong></p>
    <p class="muted">A classificação final deve ser registrada na Triagem por profissional habilitado, conforme protocolo institucional validado.</p>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button><button class="action-button" data-action="open-triage-modal" data-id="${id}">Iniciar triagem</button>`);
}

function openExamModal(patientId = "p1", origem = "Consulta Médica") {
  const p = patientById(patientId);
  const examOrigin = examCareOrigin({ origem, pacienteId: patientId }, p);
  openModal("Solicitar exame", `
    <form id="examForm" class="form-grid">
      <input type="hidden" name="pacienteId" value="${escapeHtml(patientId)}">
      <input type="hidden" name="origem" value="${escapeHtml(examOrigin)}">
      ${field("Paciente", "paciente", p?.nome || "")}
      ${selectField("Tipo de exame", "tipo", ["Laboratorio", "Raio-X", "ECG", "Ultrassonografia", "Outros"])}
      ${field("Exame solicitado", "exame", "", "full")}
      ${field("Solicitante", "solicitante", "Dr. Marcos Vieira")}
      ${selectField("Prioridade", "prioridade", ["Rotina", "Urgente", "Emergência"])}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(EXAME_SOLICITAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-exam">Enviar solicitação</button>`
    : `<button class="action-button" disabled title="Sem permissão para solicitar exame">Enviar solicitação (sem permissão)</button>`}`);
}

function openPrescriptionModal(patientId = "p1") {
  const p = patientById(patientId);
  openModal("Prescrever medicação", `
    <form id="prescriptionForm" class="form-grid">
      ${field("Paciente", "paciente", p?.nome || "")}
      ${field("Medicamento", "medicamento")}
      ${field("Dose", "dose")}
      ${field("Via", "via", "EV")}
      ${field("Prescritor", "prescritor", "Dr. Marcos Vieira")}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(PRESCRICAO_CRIAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-prescription">Enviar para farmácia</button>`
    : `<button class="action-button" disabled title="Sem permissão para prescrever medicação">Enviar para farmácia (sem permissão)</button>`}`);
}

function openTransferModal(patientId = "p1") {
  const p = patientById(patientId);
  openModal("Solicitar transferência", `
    <form id="transferForm" class="form-grid">
      <input type="hidden" name="pacienteId" value="${escapeHtml(patientId)}">
      ${field("Paciente", "paciente", p?.nome || "")}
      ${selectField("Motivo da transferência", "motivo", ["Cirurgia", "UTI", "Obstetrícia", "Pediatria", "Trauma", "Exame especializado", "Avaliação especializada", "Regulação de vaga", "Outro"])}
      <label class="field full" id="otherTransferMotivoField" style="display:none">
        <span>Especifique o motivo</span>
        <input name="motivoOutro" placeholder="Digite o motivo">
      </label>
      ${selectField("Unidade de destino", "destino", ["Nossa Senhora da Glória", "Aracaju", "Paulo Afonso", "Delmiro Gouveia", "Propriá", "Outro"])}
      <label class="field full" id="otherTransferDestinoField" style="display:none">
        <span>Especifique o destino</span>
        <input name="destinoOutro" placeholder="Digite a unidade de destino">
      </label>
      ${selectField("Tipo de transporte", "tipoTransporte", ["Ambulância básica", "Ambulância avançada/SAMU", "Veículo próprio", "Veículo da família", "Outro"])}
      ${selectField("Usou ambulância?", "usouAmbulancia", ["Sim", "Não"])}
      ${field("Profissional acompanhante", "acompanhante", "Enf. Joana Matos")}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-transfer">Enviar para transferências</button>`
    : `<button class="action-button" disabled title="Sem permissão para solicitar transferência">Enviar para transferências (sem permissão)</button>`}`);

  const form = byId("transferForm");
  const setupOther = (selectName, fieldId, otherLabel) => {
    const select = form.querySelector(`select[name="${selectName}"]`);
    const otherField = byId(fieldId);
    const otherInput = otherField.querySelector("input");
    select.addEventListener("change", () => {
      const isOther = select.value === otherLabel;
      otherField.style.display = isOther ? "" : "none";
      otherInput.required = isOther;
    });
  };
  setupOther("motivo", "otherTransferMotivoField", "Outro");
  setupOther("destino", "otherTransferDestinoField", "Outro");
}

function openPatientModalLegacy(id) {
  const p = patientById(id);
  if (!p) return;
  openModal("Prontuário do paciente", `
    <div class="record-block">
      <h3>Identificação</h3>
      <div class="form-grid">
        <p class="field full"><span>Nome</span>${escapeHtml(p.nome)}</p>
        <p class="field"><span>Nascimento</span>${escapeHtml(p.nascimento)}</p>
        <p class="field"><span>Classificação</span>${tag(p.classificacao)}</p>
      </div>
    </div>
    <div class="record-block">
      <h3>Documentos</h3>
      <div class="form-grid">
        <p class="field"><span>CPF</span>${escapeHtml(p.cpf)}</p>
        <p class="field"><span>Cartão SUS</span>${escapeHtml(p.sus)}</p>
      </div>
    </div>
    <div class="record-block">
      <h3>Contato/Origem</h3>
      <div class="form-grid">
        <p class="field"><span>Telefone</span>${escapeHtml(p.telefone || "-")}</p>
        <p class="field"><span>Município</span>${escapeHtml(p.municipio || "-")}</p>
      </div>
    </div>
    <div class="record-block">
      <h3>Assistencial</h3>
      <div class="form-grid">
        <p class="field full"><span>Queixa principal</span>${escapeHtml(p.queixa || "-")}</p>
        <p class="field"><span>Status</span>${status(p.status)}</p>
        ${p.triagemRisco ? `
          <p class="field"><span>Classificação sugerida</span>${tag(p.triagemRisco.classificacaoSugerida)}</p>
          <p class="field full"><span>Justificativa da classificação</span>${escapeHtml(p.triagemRisco.justificativaClassificacao || "-")}</p>
        ` : ""}
      </div>
    </div>
    ${p.sinaisVitais ? `
      <div class="record-block">
        <h3>Sinais vitais</h3>
        <div class="form-grid">
          <p class="field"><span>Pressão arterial</span>${escapeHtml(p.sinaisVitais.pa || "-")}</p>
          <p class="field"><span>Frequência cardíaca</span>${escapeHtml(p.sinaisVitais.fc || "-")}</p>
          <p class="field"><span>Frequência respiratória</span>${escapeHtml(p.sinaisVitais.fr || "-")}</p>
          <p class="field"><span>Saturação</span>${escapeHtml(p.sinaisVitais.sat || "-")}</p>
          <p class="field"><span>Temperatura</span>${escapeHtml(p.sinaisVitais.temp || "-")}</p>
          <p class="field"><span>Glicemia</span>${escapeHtml(p.sinaisVitais.glicemia || "-")}</p>
          <p class="field"><span>Dor (0 a 10)</span>${escapeHtml(p.sinaisVitais.dor || "-")}</p>
          <p class="field full"><span>Observações da triagem</span>${escapeHtml(p.sinaisVitais.obs || "-")}</p>
        </div>
      </div>
    ` : ""}
    ${p.conduta ? `
      <div class="record-block">
        <h3>Conduta médica</h3>
        <div class="form-grid">
          <p class="field full"><span>Hipótese / avaliação médica</span>${escapeHtml(p.conduta.hipotese || "-")}</p>
          <p class="field full"><span>Conduta</span>${escapeHtml(p.conduta.conduta || "-")}</p>
          <p class="field full"><span>Observações da consulta</span>${escapeHtml(p.conduta.obs || "-")}</p>
        </div>
      </div>
    ` : ""}
  `, `<button class="secondary-action" data-action="close-modal">Fechar</button>`);
}

const noRecord = "Sem registro";

function recordValue(value) {
  if (value === undefined || value === null || value === "" || value === "--" || value === "-") return noRecord;
  return displayText(value);
}

function hasRecordValue(value) {
  return recordValue(value) !== noRecord;
}

function hasAnyRecordValue(...values) {
  return values.some(hasRecordValue);
}

function clinicalAlertText(alerts = {}, statusKey, descriptionKey) {
  const description = alerts[descriptionKey];
  if (hasRecordValue(description)) return description;
  return alerts[statusKey] || noRecord;
}

function clinicalAlertsFromPatient(patient = {}) {
  const alerts = patient.triagemRisco?.alertasClinicos || {};
  return {
    alergias: clinicalAlertText({ ...alerts, alergiasDescricao: alerts.alergiasDescricao || patient.alergias }, "possuiAlergia", "alergiasDescricao"),
    medicamentosUsoContinuo: clinicalAlertText({ ...alerts, medicamentosUsoContinuo: alerts.medicamentosUsoContinuo || patient.medicamentosUsoContinuo }, "usaMedicacaoContinua", "medicamentosUsoContinuo"),
    comorbidades: clinicalAlertText({ ...alerts, comorbidadesDescricao: alerts.comorbidadesDescricao || patient.comorbidades }, "possuiComorbidades", "comorbidadesDescricao"),
    tratamentoEmAndamento: clinicalAlertText(alerts, "tratamentoEmAndamento", "tratamentoDescricao"),
    medicacaoAntesChegada: clinicalAlertText(alerts, "usouMedicacaoAntes", "medicacaoAntesDescricao"),
    gestacao: alerts.gestacaoSuspeita || patient.triagemRisco?.gestante || noRecord
  };
}

function cleanClinicalText(value) {
  const text = String(value || "").trim();
  if (!text) return noRecord;
  const letters = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const vowels = (text.match(/[aeiouáéíóúâêôãõàü]/gi) || []).length;
  const hasMeaningfulSeparator = /[\s.,;:]/.test(text);
  if (text.length >= 12 && (!hasMeaningfulSeparator || vowels / Math.max(letters, 1) < 0.22)) return noRecord;
  return text;
}

function cleanTriageJustification(value) {
  return cleanClinicalText(value);
}

function recordField(label, value, extra = "") {
  return `<p class="field ${extra}"><span>${escapeHtml(label)}</span>${escapeHtml(recordValue(value))}</p>`;
}

function optionalRecordField(label, value, extra = "") {
  return hasRecordValue(value) ? recordField(label, value, extra) : "";
}

function recordStatusField(label, value) {
  return `<p class="field"><span>${escapeHtml(label)}</span>${value ? status(value) : escapeHtml(noRecord)}</p>`;
}

function recordTagField(label, value) {
  return `<p class="field"><span>${escapeHtml(label)}</span>${value ? tag(value) : escapeHtml(noRecord)}</p>`;
}

function recordSection(title, body) {
  return `
    <div class="record-block">
      <h3>${escapeHtml(title)}</h3>
      ${body || `<p class="muted">${noRecord}</p>`}
    </div>
  `;
}

function relationByPatient(listName, patient = {}) {
  return GsiApi.list(listName).filter((item) => item.pacienteId === patient.id || (!!item.paciente && item.paciente === patient.nome));
}

function firstRelation(listName, patient = {}) {
  return relationByPatient(listName, patient)[0] || {};
}

function elapsedBetween(startTs, endTs, startClock = "", endClock = "") {
  const start = Number(startTs);
  const end = Number(endTs);
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) return formatRecordElapsed(end - start);
  const startMin = minutesFromClock(startClock);
  const endMin = minutesFromClock(endClock);
  if (startMin === null || endMin === null) return noRecord;
  const delta = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin) + endMin;
  return formatRecordElapsed(delta * 60000);
}

function formatRecordElapsed(ms) {
  if (ms === undefined || ms === null || ms < 0) return noRecord;
  const totalMin = ms > 0 ? Math.max(1, Math.ceil(ms / 60000)) : 0;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function totalStayValue(patient = {}, chegada = "", horaDesfecho = "") {
  if (patient.horaDesfechoFinalTs || patient.horaDesfechoTs || hasRecordValue(horaDesfecho)) {
    return elapsedBetween(patient.horaChegadaTs, patient.horaDesfechoFinalTs || patient.horaDesfechoTs, chegada, horaDesfecho);
  }
  return "Em andamento";
}

function eventSortValue(event) {
  if (Number.isFinite(Number(event.ts))) return Number(event.ts);
  const minutes = minutesFromClock(event.time);
  return minutes === null ? Infinity : minutes;
}

function addTimelineEvent(events, time, label, ts) {
  if (!time || time === "--" || time === "-") return;
  events.push({ time, label, ts });
}

function listItems(items, emptyText = noRecord) {
  if (!items.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `<ul class="list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function observationRecords(patient = {}) {
  return [
    ["Observação clínica", patient.observacaoClinica],
    ["Observação pediátrica", patient.observacaoPediatrica],
    ["Observação obstétrica", patient.observacaoObstetrica]
  ].filter(([, obs]) => !!obs);
}

function openPatientModal(id) {
  const p = patientById(id);
  if (!p) return;

  const atendimento = firstRelation("atendimentos", p);
  const exames = relationByPatient("exames", p);
  const prescricoes = relationByPatient("prescricoes", p);
  const transferencia = firstRelation("transferencias", p);
  const observacoes = observationRecords(p);
  const evolucoes = p.evolucoesEnfermagem || [];
  const stabilizationStatus = p.estabilizacao ? getPatientChecklistStatus(p).label : "";
  const triageJustification = cleanTriageJustification(p.triagemRisco?.justificativaClassificacao);
  const condutaRegistrada = cleanClinicalText(p.conduta?.conduta);
  const prescricaoRegistrada = cleanClinicalText(p.conduta?.prescricao);
  const desfechoFinal = p.desfechoFinal || p.desfecho || "";
  const horaDesfecho = p.horaDesfechoFinal || p.horaDesfecho || transferencia.horaSaidaTransferencia || transferencia.saida || "";
  const chegada = p.horaChegada || atendimento.chegada || "";
  const inicioConsulta = p.horaInicioConsulta || atendimento.inicioConsulta || "";
  const profissionalConsulta = p.profissionalResponsavel || atendimento.profissional || "";
  const hasTriageData = Boolean(p.triagemRisco || p.sinaisVitais || p.horaInicioTriagem || p.horaFimTriagem || p.classificacao);
  const hasConsultData = Boolean(inicioConsulta || p.horaChamadaConsulta || p.conduta);
  const hasTransferData = Boolean(transferencia.id || hasAnyRecordValue(transferencia.status, transferencia.destino, transferencia.checklist, transferencia.horaSaidaTransferencia, transferencia.saida));
  const alertasClinicos = clinicalAlertsFromPatient(p);
  const timeline = [];

  addTimelineEvent(timeline, chegada, "Ficha aberta", p.horaChegadaTs);
  addTimelineEvent(timeline, p.horaInicioTriagem, "Triagem iniciada", p.horaInicioTriagemTs);
  addTimelineEvent(timeline, p.horaFimTriagem, "Triagem concluída", p.horaFimTriagemTs);
  addTimelineEvent(timeline, p.horaChamadaConsulta, "Paciente chamado para consulta", p.horaChamadaConsultaTs);
  addTimelineEvent(timeline, inicioConsulta, "Consulta iniciada", p.horaInicioConsultaTs);
  addTimelineEvent(timeline, p.horaConduta, "Conduta médica registrada", p.horaCondutaTs);
  evolucoes.forEach((item) => addTimelineEvent(timeline, item.horario, "Evolução de enfermagem registrada"));
  prescricoes.forEach((item) => addTimelineEvent(timeline, item.horario, `Prescrição: ${item.medicamento || "medicação"}`));
  exames.forEach((item) => {
    addTimelineEvent(timeline, item.horario, `Exame solicitado: ${item.exame || item.tipo || "exame"}`);
    addTimelineEvent(timeline, item.horarioLiberacao, `Resultado liberado: ${item.exame || item.tipo || "exame"}`);
  });
  observacoes.forEach(([tipo, obs]) => {
    addTimelineEvent(timeline, obs.inicio, `Entrada em ${tipo}`, obs.inicioTimestamp);
    (obs.reavaliacoes || []).forEach((item) => addTimelineEvent(timeline, item.horario, `Reavaliação em ${tipo}`));
  });
  if (p.estabilizacao) {
    addTimelineEvent(timeline, p.estabilizacao.inicio, "Entrada na Sala de Estabilização", p.estabilizacao.inicioTimestamp);
    (p.estabilizacao.reavaliacoes || []).forEach((item) => addTimelineEvent(timeline, item.horario, "Reavaliação na Sala de Estabilização"));
  }
  addTimelineEvent(timeline, transferencia.horario || transferencia.horaSolicitacaoTransferencia, "Transferência solicitada", transferencia.horaSolicitacaoTransferenciaTs);
  addTimelineEvent(timeline, transferencia.horaAprovacaoVaga, "Vaga de transferência aprovada", transferencia.horaAprovacaoVagaTs);
  addTimelineEvent(timeline, transferencia.horaSaidaTransferencia || transferencia.saida, "Saída de transferência confirmada", transferencia.horaSaidaTransferenciaTs);
  addTimelineEvent(timeline, horaDesfecho, `Desfecho final: ${desfechoFinal || "registrado"}`, p.horaDesfechoFinalTs || p.horaDesfechoTs);

  const sinais = p.sinaisVitais;
  const sinaisBody = sinais ? `
    <div class="form-grid">
      ${optionalRecordField("Pressão arterial", sinais.pa)}
      ${optionalRecordField("Frequência cardíaca", sinais.fc)}
      ${optionalRecordField("Frequência respiratória", sinais.fr)}
      ${optionalRecordField("Saturação", sinais.sat)}
      ${optionalRecordField("Temperatura", sinais.temp)}
      ${optionalRecordField("Glicemia", sinais.glicemia)}
      ${optionalRecordField("Dor (0 a 10)", sinais.dor)}
      ${optionalRecordField("Observações da triagem", sinais.obs, "full")}
    </div>
  ` : "";

  const alertasClinicosBody = `
    <div class="form-grid">
      ${recordField("Alergias", alertasClinicos.alergias)}
      ${recordField("Medicamentos de uso contínuo", alertasClinicos.medicamentosUsoContinuo, "full")}
      ${recordField("Comorbidades", alertasClinicos.comorbidades, "full")}
      ${recordField("Tratamento em andamento", alertasClinicos.tratamentoEmAndamento, "full")}
      ${recordField("Medicação antes da chegada", alertasClinicos.medicacaoAntesChegada, "full")}
      ${recordField("Gestação/suspeita", alertasClinicos.gestacao)}
    </div>
  `;

  const enfermagemBody = evolucoes.length ? recordSection("Enfermagem/medicação", listItems(evolucoes.map((item) => `
    <strong>${escapeHtml(recordValue(item.horario))}</strong> -
    ${escapeHtml(recordValue(item.evolucao || item.procedimentos || item.medicacoes))}
    <br><span class="muted">${escapeHtml(recordValue(item.profissional))}</span>
  `))) : "";

  const farmaciaBody = prescricoes.length ? recordSection("Farmácia", listItems(prescricoes.map((item) => `
    <strong>${escapeHtml(recordValue(item.medicamento))}</strong> -
    ${escapeHtml(recordValue(item.dose))} ${escapeHtml(recordValue(item.via))}
    <br><span class="muted">${escapeHtml(recordValue(item.status))} | ${escapeHtml(recordValue(item.horario))} | ${escapeHtml(recordValue(item.prescritor))}</span>
  `))) : "";

  const examesBody = exames.length ? recordSection("Exames", listItems(exames.map((item) => `
    <strong>${escapeHtml(recordValue(item.exame || item.tipo))}</strong> -
    ${escapeHtml(recordValue(item.status))}
    <br><span class="muted">${escapeHtml(recordValue(item.horario))} | Resultado: ${escapeHtml(recordValue(item.resultado))}${item.critico ? " | Resultado crítico comunicado" : ""}</span>
  `))) : "";

  const observacaoBody = observacoes.length ? recordSection("Observação", observacoes.map(([tipo, obs]) => `
    <div class="form-grid">
      ${recordField("Tipo", tipo)}
      ${optionalRecordField("Entrada", obs.inicio)}
      ${optionalRecordField("Aceite/recebimento", obs.origem)}
      ${optionalRecordField("Saída", obs.saida)}
      ${optionalRecordField("Tempo de permanência", obs.inicioTimestamp ? elapsedBetween(obs.inicioTimestamp, p.horaDesfechoFinalTs || p.horaDesfechoTs || Date.now()) : "", "full")}
      ${optionalRecordField("Reavaliações", (obs.reavaliacoes || []).length ? `${obs.reavaliacoes.length} registro(s)` : "", "full")}
    </div>
  `).join("")) : "";

  const estabilizacaoBody = p.estabilizacao ? recordSection("Sala de Estabilização", `
    <div class="form-grid">
      ${optionalRecordField("Entrada", p.estabilizacao.inicio)}
      ${optionalRecordField("Origem", p.estabilizacao.origem)}
      ${optionalRecordField("Checklist de segurança", stabilizationStatus)}
      ${optionalRecordField("Reavaliações", (p.estabilizacao.reavaliacoes || []).length ? `${p.estabilizacao.reavaliacoes.length} registro(s)` : "")}
      ${optionalRecordField("Saída/encaminhamento", p.estabilizacao.saida || p.estabilizacao.encaminhamento, "full")}
    </div>
  `) : "";

  const transferenciaBody = hasTransferData ? recordSection("Transferência", `
    <div class="form-grid">
      ${optionalRecordField("Solicitação de transferência", transferencia.horario || transferencia.horaSolicitacaoTransferencia)}
      ${recordStatusField("Status da regulação", transferencia.status)}
      ${optionalRecordField("Vaga aprovada", transferencia.horaAprovacaoVaga || (transferencia.status === "Vaga confirmada" ? "Sim" : ""))}
      ${optionalRecordField("Checklist de transferência", transferencia.checklist)}
      ${optionalRecordField("Saída confirmada", transferencia.horaSaidaTransferencia || transferencia.saida)}
      ${optionalRecordField("Destino", transferencia.destino)}
      ${optionalRecordField("Profissional acompanhante", transferencia.acompanhante)}
      ${optionalRecordField("Desfecho", transferencia.desfechoFinal || p.desfechoFinal)}
    </div>
  `) : "";

  const timelineBody = timeline.length
    ? `<ul class="list">${timeline.sort((a, b) => eventSortValue(a) - eventSortValue(b)).map((event) => `<li><strong>${escapeHtml(event.time)}</strong> - ${escapeHtml(event.label)}</li>`).join("")}</ul>`
    : `<p class="muted">${noRecord}</p>`;

  openModal("Prontuário do paciente", `
    ${recordSection("Identificação do paciente", `
      <div class="form-grid">
        ${recordField("Nome", p.nome, "full")}
        ${recordField("Nascimento / idade", `${recordValue(p.nascimento)} | ${calculateAge(p.nascimento)}`)}
        ${recordField("Município/UF", municipioUfLabel(p))}
        ${recordField("CPF", p.cpf)}
        ${recordField("Cartão SUS", p.sus)}
      </div>
    `)}
    ${recordSection("Dados da entrada/ficha", `
      <div class="form-grid">
        ${recordField("Hora de chegada", chegada)}
        ${recordField("Abertura da ficha", chegada)}
        ${recordField("Queixa principal", p.queixa || atendimento.motivo, "full")}
        ${recordStatusField("Status atual", p.status)}
      </div>
    `)}
    ${hasTriageData ? recordSection("Triagem", `
      <div class="form-grid">
        ${recordTagField("Classificação de risco", p.classificacao || p.triagemRisco?.classificacaoSugerida)}
        ${optionalRecordField("Início da triagem", p.horaInicioTriagem)}
        ${optionalRecordField("Fim da triagem", p.horaFimTriagem)}
        ${optionalRecordField("Profissional da triagem", p.triagemRisco?.profissional)}
        ${optionalRecordField("Categoria profissional", p.triagemRisco?.categoriaProfissional)}
        ${optionalRecordField("Registro profissional", p.triagemRisco?.registroProfissional)}
        ${recordField("Justificativa", triageJustification, "full")}
      </div>
      <h3>Alertas clínicos</h3>
      ${alertasClinicosBody}
      ${sinaisBody}
    `) : ""}
    ${hasConsultData ? recordSection("Consulta médica", `
      <div class="form-grid">
        ${optionalRecordField("Horário da chamada", p.horaChamadaConsulta)}
        ${optionalRecordField("Início da consulta", inicioConsulta)}
        ${optionalRecordField("Profissional responsável", profissionalConsulta)}
        ${recordField("Conduta registrada", condutaRegistrada, "full")}
        ${recordField("Prescrição", prescricaoRegistrada, "full")}
        ${optionalRecordField("Solicitação de exame", p.conduta?.exames, "full")}
        ${optionalRecordField("Destino após consulta", p.conduta?.destino)}
      </div>
    `) : ""}
    ${enfermagemBody}
    ${farmaciaBody}
    ${examesBody}
    ${observacaoBody}
    ${estabilizacaoBody}
    ${transferenciaBody}
    ${recordSection("Desfecho final", `
      <div class="form-grid">
        ${recordField("Desfecho", desfechoFinal)}
        ${recordField("Hora do desfecho", horaDesfecho)}
      </div>
    `)}
    ${recordSection("Tempos do atendimento", `
      <div class="form-grid">
        ${recordField("Tempo até triagem", elapsedBetween(p.horaChegadaTs, p.horaInicioTriagemTs || p.horaFimTriagemTs, chegada, p.horaInicioTriagem || p.horaFimTriagem))}
        ${recordField("Triagem até consulta", elapsedBetween(p.horaFimTriagemTs, p.horaInicioConsultaTs, p.horaFimTriagem, inicioConsulta))}
        ${observacoes.length ? recordField("Tempo em observação", observacoes[0]?.[1]?.inicioTimestamp ? elapsedBetween(observacoes[0][1].inicioTimestamp, p.horaDesfechoFinalTs || p.horaDesfechoTs || Date.now()) : "") : ""}
        ${hasTransferData ? recordField("Tempo até transferência", transferencia.horaSaidaTransferenciaTs ? elapsedBetween(p.horaChegadaTs, transferencia.horaSaidaTransferenciaTs, chegada, transferencia.horaSaidaTransferencia) : "") : ""}
        ${recordField("Permanência total", totalStayValue(p, chegada, horaDesfecho), "full")}
      </div>
    `)}
    ${recordSection("Linha do tempo do atendimento", timelineBody)}
  `, `<button class="secondary-action" data-action="close-modal">Fechar</button>`);
}

function openStockModal() {
  openModal("Adicionar item ao estoque", `
    <form id="stockForm" class="form-grid">
      ${field("Medicamento", "nome")}
      ${field("Quantidade atual", "quantidade", "0 un")}
      ${field("Estoque mínimo", "minimo", "0 un")}
      ${selectField("Situação", "situacao", ["Adequado", "Critico"])}
      ${field("Validade", "validade", "12/2026")}
      ${field("Localização", "local", "Armário A1")}
    </form>
  `, `<button class="secondary-action" data-action="close-modal">Cancelar</button>${isActionAllowed(ESTOQUE_MOVIMENTAR_ACTION_RULE)
    ? `<button class="action-button" data-action="save-stock">Salvar item</button>`
    : `<button class="action-button" disabled title="Apenas o perfil Farmácia (ou permissão estoque.movimentar) pode salvar itens de estoque">Salvar item (sem permissão)</button>`}`);
}

function openReportPreview(name) {
  const today = new Date().toLocaleDateString("pt-BR");
  openModal(name, `
    <div class="modal-card-print">
      <p class="muted">Hospital Municipal Haydée Carvalho Leite Santos | Canindé de São Francisco - SE</p>
      <p class="muted">Emitido em ${today} | Dados fictícios para fins de demonstração</p>
      <pre>${name}
Período: últimos 7 dias (simulado)
Total de registros considerados: ${Math.floor(40 + Math.random() * 80)}

Este é um relatório demonstrativo gerado localmente no navegador,
sem conexão com banco de dados ou sistemas oficiais.
Em produção, este modelo será substituído por consulta real
aos módulos assistenciais, com filtros de período, setor e
classificação de risco.</pre>
    </div>
  `, `<button class="secondary-action" data-action="close-modal">Fechar</button><button class="action-button" data-action="print-report">Imprimir / salvar PDF</button>`);
}

const TRIAGEM_GATED_ACTIONS = ["classify-risk", "save-risk", "open-triage-modal", "save-triage", "call-to-triage"];
const PACIENTE_CREATE_GATED_ACTIONS = ["open-register-patient", "save-patient"];
const ATENDIMENTO_OPEN_GATED_ACTIONS = ["call-patient", "start-care"];
const ENFERMAGEM_GATED_ACTIONS = ["open-nursing-modal", "save-nursing-evolution"];
const CONSULTA_INICIAR_GATED_ACTIONS = ["call-to-consult", "open-start-consult-modal", "save-start-consult", "save-call-consult"];
const CONSULTA_CONDUTA_GATED_ACTIONS = ["open-conduct-modal", "save-conduct", "discharge-patient"];
const EXAMES_GERENCIAR_GATED_ACTIONS = ["start-collection", "mark-in-progress", "open-release-modal", "save-exam-release", "cancel-exam"];
const EXAME_SOLICITAR_GATED_ACTIONS = ["open-exam-request", "save-exam"];
const PRESCRICAO_DISPENSAR_GATED_ACTIONS = ["rx-status"];
const ESTOQUE_MOVIMENTAR_GATED_ACTIONS = ["open-stock-item", "save-stock"];
const ESTABILIZACAO_CHECKLIST_GATED_ACTIONS = ["open-stabilization-checklist-modal", "toggle-stabilization-checklist-item"];
const CONFIGURACOES_GATED_ACTIONS = ["toggle-config"];

function handleAction(action, button) {
  const id = button.dataset.id;
  if (TRIAGEM_GATED_ACTIONS.includes(action) && !isActionAllowed(TRIAGEM_ACTION_RULE)) {
    showToast("Você não tem permissão para esta ação de triagem.", "warn");
    return;
  }
  if (PACIENTE_CREATE_GATED_ACTIONS.includes(action) && !isActionAllowed(PACIENTE_CREATE_ACTION_RULE)) {
    showToast("Você não tem permissão para cadastrar pacientes.", "warn");
    return;
  }
  if (ATENDIMENTO_OPEN_GATED_ACTIONS.includes(action) && !isActionAllowed(ATENDIMENTO_OPEN_ACTION_RULE)) {
    showToast("Você não tem permissão para abrir atendimentos.", "warn");
    return;
  }
  if (ENFERMAGEM_GATED_ACTIONS.includes(action) && !isActionAllowed(ENFERMAGEM_ACTION_RULE)) {
    showToast("Você não tem permissão para esta ação de enfermagem.", "warn");
    return;
  }
  if (CONSULTA_INICIAR_GATED_ACTIONS.includes(action) && !isActionAllowed(CONSULTA_INICIAR_ACTION_RULE)) {
    showToast("Você não tem permissão para iniciar consultas.", "warn");
    return;
  }
  if (CONSULTA_CONDUTA_GATED_ACTIONS.includes(action) && !isActionAllowed(CONSULTA_CONDUTA_ACTION_RULE)) {
    showToast("Você não tem permissão para registrar conduta médica.", "warn");
    return;
  }
  if (EXAMES_GERENCIAR_GATED_ACTIONS.includes(action) && !isActionAllowed(EXAMES_GERENCIAR_ACTION_RULE)) {
    showToast("Você não tem permissão para gerenciar este exame.", "warn");
    return;
  }
  if (EXAME_SOLICITAR_GATED_ACTIONS.includes(action) && !isActionAllowed(EXAME_SOLICITAR_ACTION_RULE)) {
    showToast("Sem permissão para solicitar exame.", "warn");
    return;
  }
  if (PRESCRICAO_DISPENSAR_GATED_ACTIONS.includes(action) && !isActionAllowed(PRESCRICAO_DISPENSAR_ACTION_RULE)) {
    showToast("Sem permissão para dispensar prescrição.", "warn");
    return;
  }
  if (ESTOQUE_MOVIMENTAR_GATED_ACTIONS.includes(action) && !isActionAllowed(ESTOQUE_MOVIMENTAR_ACTION_RULE)) {
    showToast("Sem permissão para movimentar estoque.", "warn");
    return;
  }
  if (action === "route-to-stabilization" && !isActionAllowed(OBSERVACAO_ENCAMINHAR_ESTABILIZACAO_ACTION_RULE)) {
    showToast("Sem permissão para encaminhar para a estabilização.", "warn");
    return;
  }
  if (ESTABILIZACAO_CHECKLIST_GATED_ACTIONS.includes(action) && !isActionAllowed(ESTABILIZACAO_CHECKLIST_ACTION_RULE)) {
    showToast("Sem permissão para marcar o checklist de estabilização.", "warn");
    return;
  }
  if (["open-prescription", "save-prescription"].includes(action) && !isActionAllowed(PRESCRICAO_CRIAR_ACTION_RULE)) {
    showToast("Sem permissão para prescrever medicação.", "warn");
    return;
  }
  if (["open-transfer-request", "save-transfer"].includes(action) && !isActionAllowed(TRANSFERENCIA_SOLICITAR_ACTION_RULE)) {
    showToast("Sem permissão para solicitar transferência.", "warn");
    return;
  }
  if (action === "discharge-observation" && !isActionAllowed(OBSERVACAO_ALTA_ACTION_RULE)) {
    showToast("Sem permissão para dar alta da observação.", "warn");
    return;
  }
  if (action === "reset-demo" && !isActionAllowed(RESET_DEMO_ACTION_RULE)) {
    showToast("Sem permissão para restaurar dados demo.", "warn");
    return;
  }
  if (CONFIGURACOES_GATED_ACTIONS.includes(action) && !isActionAllowed(CONFIGURACOES_ACTION_RULE)) {
    // O navegador ja alterna button.checked antes do evento de click chegar
    // aqui - reverter explicitamente para nao deixar a UI mostrar um valor
    // que nao foi (e nao podera ser) persistido.
    button.checked = !button.checked;
    showToast("Sem permissão para alterar configurações.", "warn");
    return;
  }
  if (action === "open-register-patient") return openRegisterPatient();
  if (action === "close-modal") return closeModal();
  if (action === "start-care") {
    GsiApi.update("pacientes", id, { status: "Em atendimento" });
    GsiApi.create("atendimentos", { pacienteId: id, chegada: nowTime(), profissional: "Equipe de plantão", status: "Em atendimento", espera: "00:00" });
    showToast("Atendimento iniciado com sucesso.");
    return renderPage(currentPage);
  }
  if (action === "classify-risk") {
    showToast("A classificação final deve ser registrada na Triagem.", "warn");
    setPatientTimeIfMissing(id, "horaInicioTriagem");
    return openTriageModal(id);
  }
  if (action === "save-risk") {
    showToast("Fluxo atualizado: registre a classificação final pela Triagem.", "warn");
    closeModal();
    setPatientTimeIfMissing(id, "horaInicioTriagem");
    return openTriageModal(id);
  }
  if (action === "call-patient") {
    const p = patientById(id);
    createCallRecord({
      pacienteId: id,
      paciente: p?.nome || button.dataset.nome || "Paciente fictício",
      setor: button.dataset.setor || button.dataset.destino || "Atendimento",
      destino: button.dataset.destino || button.dataset.setor || "Atendimento",
      sala: button.dataset.sala || "",
      profissional: button.dataset.profissional || ""
    });
    showToast("Paciente enviado ao Painel de Chamada.");
    return renderPage("painel-chamada");
  }
  if (action === "open-triage-modal") {
    setPatientTimeIfMissing(id, "horaInicioTriagem");
    return openTriageModal(id);
  }
  if (action === "save-triage") {
    const form = byId("triageForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const sinaisVitais = { pa: values.pa, fc: values.fc, fr: values.fr, sat: values.sat, temp: values.temp, glicemia: values.glicemia, dor: values.dor, obs: values.obs };
    const alertasClinicos = {
      possuiAlergia: values.possuiAlergia,
      alergiasDescricao: values.alergiasDescricao,
      usaMedicacaoContinua: values.usaMedicacaoContinua,
      medicamentosUsoContinuo: values.medicamentosUsoContinuo,
      possuiComorbidades: values.possuiComorbidades,
      comorbidadesDescricao: values.comorbidadesDescricao,
      tratamentoEmAndamento: values.tratamentoEmAndamento,
      tratamentoDescricao: values.tratamentoDescricao,
      usouMedicacaoAntes: values.usouMedicacaoAntes,
      medicacaoAntesDescricao: values.medicacaoAntesDescricao,
      gestacaoSuspeita: values.gestacaoSuspeita
    };
    const triagemRisco = {
      profissional: values.profissionalTriagem,
      categoriaProfissional: values.categoriaProfissionalTriagem,
      registroProfissional: values.registroProfissionalTriagem,
      alertasClinicos,
      sinaisGravidade: values.sinaisGravidade,
      dorToracica: values.dorToracica,
      faltaAr: values.faltaAr,
      alteracaoConsciencia: values.alteracaoConsciencia,
      sangramentoAtivo: values.sangramentoAtivo,
      traumaAcidente: values.traumaAcidente,
      febre: values.febre,
      vomitosDiarreia: values.vomitosDiarreia,
      gestante: values.gestante,
      crianca: values.crianca,
      dorIntensa: values.dorIntensa,
      classificacaoSugerida: values.classificacaoSugerida,
      classificacaoFinal: values.classificacao,
      justificativaClassificacao: values.justificativaClassificacao
    };
    setPatientTimeIfMissing(id, "horaFimTriagem");
    GsiApi.update("pacientes", id, { status: "Triagem concluída", queixa: values.queixa, classificacao: values.classificacao, sinaisVitais, triagemRisco });
    const existing = GsiApi.list("atendimentos").find((a) => a.pacienteId === id);
    if (existing) {
      GsiApi.update("atendimentos", existing.id, { status: "Triagem concluída", motivo: values.motivo, local: values.local, periodo: values.periodo });
    } else {
      GsiApi.create("atendimentos", { pacienteId: id, chegada: nowTime(), profissional: "Enfermagem - Triagem", status: "Triagem concluída", espera: "00:00", motivo: values.motivo, local: values.local, periodo: values.periodo });
    }
    showToast("Triagem salva, classificação e atendimento atualizados.");
    closeModal();
    return renderPage("triagem");
  }
  if (action === "open-exam-request") return openExamModal(id || "p1", button.dataset.origem || "Consulta Médica");
  if (action === "open-prescription") return openPrescriptionModal(id || "p1");
  if (action === "open-transfer-request") return openTransferModal(id || "p1");
  if (action === "call-to-triage") {
    const p = patientById(id);
    setPatientTimeIfMissing(id, "horaChamadaTriagem");
    createCallRecord({ pacienteId: id, paciente: p?.nome || "Paciente fictício", setor: "Triagem", destino: "Triagem / Classificação de Risco", sala: "Sala de Triagem", profissional: "Enfermagem" });
    showToast("Paciente chamado para a Triagem. Veja o Painel de Chamada.");
    return renderPage(currentPage);
  }
  if (action === "call-to-consult") return openCallConsultModal(id);
  if (action === "save-call-consult") {
    const form = byId("callConsultForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const sala = values.consultorio === "Outro" ? (values.consultorioOutro || "").trim() : values.consultorio;
    const profissional = (values.profissional || "").trim() || "Equipe médica";
    const p = patientById(id);
    setPatientTimeIfMissing(id, "horaChamadaConsulta");
    createCallRecord({ pacienteId: id, paciente: p?.nome || "Paciente fictício", setor: "Consulta médica", destino: "Consulta médica", sala, profissional });
    showToast("Paciente chamado para a Consulta. Veja o Painel de Chamada.");
    closeModal();
    return renderPage(currentPage);
  }
  if (action === "open-start-consult-modal") return openStartConsultModal(id);
  if (action === "save-start-consult") {
    const form = byId("startConsultForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const patient = patientById(id) || {};
    const atendimentoAtual = GsiApi.list("atendimentos").find((a) => a.pacienteId === id) || {};
    const profissional = (values.medico === "Outro profissional médico" ? (values.medicoOutro || "").trim() : values.medico) || "Equipe médica";
    const salaAtendimento = (values.sala || "").trim() || getPatientConsultRoom(patient, atendimentoAtual);
    const patientWithConsultTime = setPatientTimeIfMissing(id, "horaInicioConsulta") || patientById(id);
    GsiApi.update("pacientes", id, { status: "Em consulta", profissionalResponsavel: profissional, consultorioAtual: salaAtendimento, salaAtendimento });
    const patch = { status: "Em consulta", profissional, inicioConsulta: patientWithConsultTime?.horaInicioConsulta || nowTime(), crm: values.crm, salaAtendimento, observacaoInicial: values.obsInicial };
    const existing = GsiApi.list("atendimentos").find((a) => a.pacienteId === id);
    if (existing) {
      GsiApi.update("atendimentos", existing.id, patch);
    } else {
      GsiApi.create("atendimentos", { pacienteId: id, chegada: nowTime(), espera: "00:00", ...patch });
    }
    showToast("Consulta iniciada com " + profissional + ".");
    closeModal();
    return renderPage("consulta");
  }
  if (action === "open-conduct-modal") return openConductModal(id);
  if (action === "save-conduct") {
    const form = byId("conductForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    setPatientTimeIfMissing(id, "horaConduta");
    GsiApi.update("pacientes", id, { conduta: { avaliacao: values.avaliacao, hipotese: values.hipotese, conduta: values.conduta, prescricao: values.prescricao, exames: values.exames, destino: values.destino, obs: values.obs } });
    if (values.destino === "Dar alta" || values.destino === "Alta após consulta") {
      setPatientTimeIfMissing(id, "horaDesfecho");
      GsiApi.update("pacientes", id, { status: "Alta", desfecho: "Alta após consulta" });
      showToast("Conduta registrada e alta concedida.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Medicação e alta") {
      setPatientTimeIfMissing(id, "horaDesfecho");
      GsiApi.update("pacientes", id, { status: "Alta", desfecho: "Medicação e alta" });
      showToast("Conduta registrada e alta concedida após medicação.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Evasão/desistência") {
      setPatientTimeIfMissing(id, "horaDesfecho");
      GsiApi.update("pacientes", id, { status: "Evasão/desistência", desfecho: "Evasão/desistência" });
      showToast("Evasão/desistência registrada.", "warn");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Óbito") {
      setPatientTimeIfMissing(id, "horaDesfecho");
      GsiApi.update("pacientes", id, { status: "Óbito", desfecho: "Óbito" });
      showToast("Óbito registrado.", "warn");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Observação Clínica") {
      GsiApi.update("pacientes", id, { status: "Em observação clínica", desfecho: "Observação Clínica", observacaoClinica: { origem: "Consulta Médica", inicio: nowTime(), inicioTimestamp: Date.now(), reavaliacoes: [] } });
      showToast("Paciente encaminhado para Observação Clínica.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Observação Pediátrica") {
      GsiApi.update("pacientes", id, { status: "Em observação pediátrica", desfecho: "Observação Pediátrica", observacaoPediatrica: { origem: "Consulta Médica", inicio: nowTime(), inicioTimestamp: Date.now(), reavaliacoes: [] } });
      showToast("Paciente encaminhado para Observação Pediátrica.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Observação Obstétrica") {
      GsiApi.update("pacientes", id, { status: "Em observação obstétrica", desfecho: "Observação Obstétrica", observacaoObstetrica: { origem: "Consulta Médica", inicio: nowTime(), inicioTimestamp: Date.now(), reavaliacoes: [] } });
      showToast("Paciente encaminhado para Observação Obstétrica.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Sala de Estabilização") {
      GsiApi.update("pacientes", id, { status: "Sala de estabilização", desfecho: "Sala de estabilização", estabilizacao: { origem: "Consulta Médica", inicio: nowTime(), inicioTimestamp: Date.now(), reavaliacoes: [] } });
      showToast("Paciente encaminhado para a Sala de Estabilização.");
      closeModal();
      return renderPage("consulta");
    }
    if (values.destino === "Solicitar exame") {
      showToast("Conduta registrada. Abrindo solicitação de exame.");
      return openExamModal(id, "Consulta Médica");
    }
    if (values.destino === "Prescrever medicação") {
      showToast("Conduta registrada. Abrindo prescrição.");
      return openPrescriptionModal(id);
    }
    if (values.destino === "Solicitar transferência" || values.destino === "Transferência regulada") {
      GsiApi.update("pacientes", id, { desfecho: "Transferência regulada" });
      showToast("Conduta registrada. Abrindo solicitação de transferência.");
      return openTransferModal(id);
    }
    closeModal();
    return renderPage("consulta");
  }
  if (action === "save-patient") {
    const form = byId("patientForm");
    if (!requireForm(form)) return;
    if (button.disabled) return;
    const payload = formValues(form);
    const textoOriginalBotao = button.textContent;
    button.disabled = true;
    button.textContent = "Salvando...";
    createPacienteRealFromLocal(payload)
      .then((pacienteReal) => {
        // Cadastro real criado com sucesso - cria o registro local (status/
        // fila/demonstrativo, fora do escopo desta fase) com a referencia
        // pacienteSupabaseId, e ja popula o cache em memoria diretamente
        // (sem precisar de um novo round-trip via loadPacientesReais()).
        GsiApi.create("pacientes", { ...payload, status: "Aguardando triagem", horaChegada: nowTime(), horaChegadaTs: Date.now(), pacienteSupabaseId: pacienteReal.id });
        pacientesReaisState.porId[pacienteReal.id] = pacienteReal;
        showToast("Paciente cadastrado e adicionado na tabela.");
        closeModal();
        renderPage("pacientes");
      })
      .catch((err) => {
        // Nao cria fallback local silencioso de proposito - se o cadastro
        // real falhar (rede, RLS, validacao), o paciente NAO e criado em
        // lugar nenhum, para nao divergir Supabase/localStorage as
        // escondidas do usuario. Modal permanece aberto com os dados
        // digitados intactos (nenhum reset de formulario acontece aqui).
        console.error("GSI Pacientes reais: erro ao criar paciente real", err);
        button.disabled = false;
        button.textContent = textoOriginalBotao;
        showToast(err?.message || "Não foi possível cadastrar o paciente no servidor. Tente novamente.", "warn");
      });
    return;
  }
  if (action === "save-exam") {
    const form = byId("examForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const patient = patientById(values.pacienteId);
    GsiApi.create("exames", { ...values, origem: examCareOrigin(values, patient), horario: nowTime(), status: "Solicitado", resultado: "Pendente" });
    showToast("Solicitação enviada para Exames.");
    closeModal();
    return renderPage("exames");
  }
  if (action === "save-prescription") {
    const form = byId("prescriptionForm");
    if (!requireForm(form)) return;
    GsiApi.create("prescricoes", { ...formValues(form), horario: nowTime(), status: "Pendente" });
    showToast("Prescrição enviada para Farmácia.");
    closeModal();
    return renderPage("farmacia");
  }
  if (action === "save-transfer") {
    const form = byId("transferForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const motivo = values.motivo === "Outro" ? (values.motivoOutro || "").trim() || "Outro" : values.motivo;
    const destino = values.destino === "Outro" ? (values.destinoOutro || "").trim() || "Outro" : values.destino;
    const { motivoOutro, destinoOutro, ...rest } = values;
    GsiApi.create("transferencias", { ...rest, motivo, destino, status: "Em analise", checklist: "Pendente", saida: "--" });
    showToast("Solicitação enviada para Transferências.");
    closeModal();
    return renderPage("transferencias");
  }
  if (action === "rx-status") {
    GsiApi.update("prescricoes", id, { status: button.dataset.status });
    showToast("Status da prescrição atualizado.");
    return renderPage(currentPage);
  }
  if (action === "start-collection") {
    GsiApi.update("exames", id, { status: "Em coleta" });
    showToast("Coleta iniciada.");
    return renderPage(currentPage);
  }
  if (action === "mark-in-progress") {
    GsiApi.update("exames", id, { status: "Em execucao" });
    showToast("Exame marcado como em execução.");
    return renderPage(currentPage);
  }
  if (action === "cancel-exam") {
    GsiApi.update("exames", id, { status: "Cancelado" });
    showToast("Exame cancelado.", "warn");
    return renderPage(currentPage);
  }
  if (action === "open-release-modal") return openExamReleaseModal(id);
  if (action === "save-exam-release") {
    const form = byId("examReleaseForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const profissional = values.profissional === "Outro profissional" ? (values.profissionalOutro || "").trim() : values.profissional;
    if (!profissional) {
      showToast("Informe o profissional responsável pela liberação.", "warn");
      return;
    }
    const critico = values.critico === "Sim";
    GsiApi.update("exames", id, {
      status: critico ? "Resultado critico comunicado" : "Resultado liberado",
      resultado: values.resultado,
      observacoes: values.observacoes,
      critico,
      profissionalLiberacao: profissional,
      horarioLiberacao: nowTime()
    });
    showToast(critico ? "Resultado crítico comunicado à equipe." : "Resultado liberado com sucesso.", critico ? "warn" : "success");
    closeModal();
    return renderPage("exames");
  }
  if (action === "reset-demo") {
    GsiApi.resetDemoData();
    showToast("Dados demonstrativos restaurados.");
    return renderPage(currentPage);
  }
  if (action === "view-patient") return openPatientModal(id);
  if (action === "go-to-stage") return renderPage(button.dataset.page || "pacientes");
  if (action === "discharge-patient") {
    setPatientTimeIfMissing(id, "horaDesfecho");
    GsiApi.update("pacientes", id, { status: "Alta", desfecho: "Alta após consulta" });
    showToast("Paciente recebeu alta.");
    return renderPage(currentPage);
  }
  if (action === "view-exam-result") {
    const exam = GsiApi.list("exames").find((e) => e.id === id);
    const p = exam?.pacienteId ? patientById(exam.pacienteId) : null;
    openModal("Resultado do exame", `
      <p><strong>${escapeHtml(p?.nome || exam?.paciente || "")}</strong> - ${escapeHtml(exam?.exame || "")}</p>
      ${exam?.critico ? '<p class="status danger">Resultado crítico comunicado à equipe</p>' : ""}
      <pre>${escapeHtml(exam?.resultado || "Resultado pendente")}</pre>
      ${exam?.observacoes ? `<p class="muted">Observações: ${escapeHtml(exam.observacoes)}</p>` : ""}
      ${exam?.profissionalLiberacao ? `<p class="muted">Liberado por ${escapeHtml(exam.profissionalLiberacao)} às ${escapeHtml(exam.horarioLiberacao || "")}</p>` : ""}
    `, `<button class="secondary-action" data-action="close-modal">Fechar</button>`);
    return;
  }
  if (action === "print-exam") {
    showToast("Documento de solicitação gerado (simulação).");
    return;
  }
  if (action === "request-restock") {
    showToast(`Reposição de "${button.dataset.nome || "medicamento"}" solicitada ao almoxarifado.`, "warn");
    return;
  }
  if (action === "open-stock-item") return openStockModal();
  if (action === "save-stock") {
    const form = byId("stockForm");
    if (!requireForm(form)) return;
    GsiApi.create("estoque", formValues(form));
    showToast("Item adicionado ao estoque.");
    closeModal();
    return renderPage("farmacia");
  }
  // Gates Etapa 2.2 — Regulação de Transferência
  // transfer-status cobre Aprovar vaga (data-status="Vaga confirmada") e
  // Cancelar (data-status="Cancelado") — ambos exigem aprovar_vaga.
  // transfer-checklist abre o modal que contem confirm-transfer-checklist;
  // gatear aqui evita que o modal sequer abra sem permissao.
  if (["transfer-status", "transfer-checklist"].includes(action) && !isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE)) {
    showToast("Sem permissão para gerenciar regulação de transferência.", "warn");
    return;
  }
  if (action === "confirm-transfer-checklist" && !isActionAllowed(TRANSFERENCIA_APROVAR_VAGA_ACTION_RULE)) {
    showToast("Sem permissão para confirmar checklist de transferência.", "warn");
    return;
  }
  if (action === "transfer-departure" && !isActionAllowed(TRANSFERENCIA_CONFIRMAR_SAIDA_ACTION_RULE)) {
    showToast("Sem permissão para confirmar saída de transferência.", "warn");
    return;
  }
  if (action === "transfer-status") {
    GsiApi.update("transferencias", id, { status: button.dataset.status });
    showToast("Status da transferência atualizado.");
    return renderPage(currentPage);
  }
  if (action === "transfer-checklist") return openTransferChecklistModal(id);
  if (action === "confirm-transfer-checklist") {
    const form = byId("transferChecklistForm");
    if (!requireForm(form)) return;
    GsiApi.update("transferencias", id, { checklist: "Completo" });
    showToast("Checklist de transferência concluído.");
    closeModal();
    return renderPage(currentPage);
  }
  if (action === "transfer-departure") {
    const horarioSaida = nowTime();
    const saidaTs = Date.now();
    GsiApi.update("transferencias", id, {
      status: "Concluida",
      saida: horarioSaida,
      horaSaidaTransferencia: horarioSaida,
      horaSaidaTransferenciaTs: saidaTs,
      desfechoFinal: "Transferência regulada",
      horaDesfechoFinal: horarioSaida,
      horaDesfechoFinalTs: saidaTs
    });
    const transferencia = GsiApi.list("transferencias").find((t) => t.id === id);
    if (transferencia?.pacienteId) {
      setPatientTimeIfMissing(transferencia.pacienteId, "horaDesfecho");
      const paciente = patientById(transferencia.pacienteId) || {};
      GsiApi.update("pacientes", transferencia.pacienteId, {
        status: "Transferência regulada",
        desfecho: "Transferência regulada",
        desfechoFinal: "Transferência regulada",
        horaDesfechoFinal: paciente.horaDesfechoFinal || horarioSaida,
        horaDesfechoFinalTs: paciente.horaDesfechoFinalTs || saidaTs
      });
    }
    showToast("Saída do paciente registrada.");
    return renderPage(currentPage);
  }
  if (action === "generate-report") return openReportPreview(button.dataset.nome || "Relatório");
  if (action === "open-mobilidade-report") return openMobilidadeReportModal();
  if (action === "open-observatorio-ficha") return openObservatorioFichaTecnicaModal();
  if (action === "open-tv-panel") return renderPage("painel-tv");
  if (action === "enable-call-audio") {
    if (!supportsCallAudio()) {
      showToast("Este navegador não oferece suporte ao áudio automático do painel.", "warn");
      return renderPage("painel-tv");
    }
    localStorage.setItem(callAudioStorageKey, "ativo");
    markLatestCallAsSeen();
    speakText("Áudio do painel de chamada ativado.");
    showToast("Áudio do painel de chamada ativado.");
    return renderPage("painel-tv");
  }
  if (action === "disable-call-audio") {
    localStorage.setItem(callAudioStorageKey, "inativo");
    if (supportsCallAudio()) window.speechSynthesis.cancel();
    showToast("Áudio desativado.", "warn");
    return renderPage("painel-tv");
  }
  if (action === "print-report") return window.print();
  if (action === "toggle-config") {
    const chave = button.dataset.id;
    const novoValor = button.checked;
    const valorAnterior = getConfig(chave);
    button.disabled = true;
    saveConfiguracaoSistema(chave, novoValor)
      .then(() => {
        configSistemaState.valores[chave] = novoValor;
        showToast("Preferência atualizada.");
      })
      .catch((err) => {
        console.error("GSI Configurações: erro ao salvar configuracoes_sistema", err);
        button.checked = valorAnterior;
        showToast("Não foi possível salvar a configuração. Tente novamente.", "warn");
      })
      .finally(() => {
        button.disabled = !isActionAllowed(CONFIGURACOES_ACTION_RULE);
      });
    return;
  }
  if (action === "discharge-observation") {
    setPatientTimeIfMissing(id, "horaDesfecho");
    GsiApi.update("pacientes", id, { status: "Alta da observação", desfecho: "Alta da observação" });
    showToast("Alta da observação registrada.");
    return renderPage(currentPage);
  }
  if (action === "open-nursing-modal") return openNursingModal(id);
  if (action === "save-nursing-evolution") {
    const form = byId("nursingForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const profissional = values.profissional === "Outro profissional" ? (values.profissionalOutro || "").trim() : values.profissional;
    if (!profissional) {
      showToast("Informe o profissional responsável.", "warn");
      return;
    }
    const p = patientById(id);
    const evolucoesEnfermagem = [...(p?.evolucoesEnfermagem || []), {
      procedimentos: values.procedimentos, medicacoes: values.medicacoes, curativos: values.curativos,
      evolucao: values.evolucao, sinais: values.sinais, profissional, horario: nowTime()
    }];
    GsiApi.update("pacientes", id, { evolucoesEnfermagem });
    showToast("Evolução de enfermagem registrada.");
    closeModal();
    return renderPage("enfermagem");
  }
  // Gate Etapa 2.2 — Reavaliação de Observação/Estabilização.
  // Cobre open-observation-reassess-modal (abertura do modal) e
  // save-observation-reassess (escrita clinica em localStorage). O gate duplo
  // garante defesa em profundidade: botao nao aparece (gate visual acima) e,
  // se acionado por outro meio, a action e bloqueada aqui antes de qualquer
  // escrita no GsiApi.
  if (["open-observation-reassess-modal", "save-observation-reassess"].includes(action) && !isActionAllowed(OBSERVACAO_REAVALIAR_ACTION_RULE)) {
    showToast("Sem permissão para registrar reavaliação.", "warn");
    return;
  }
  if (action === "open-observation-reassess-modal") return openObservationReassessModal(id, button.dataset.modulo || "observacaoClinica");
  if (action === "save-observation-reassess") {
    const form = byId("observationReassessForm");
    if (!requireForm(form)) return;
    const values = formValues(form);
    const profissional = values.profissional === "Outro profissional" ? (values.profissionalOutro || "").trim() : values.profissional;
    if (!profissional) {
      showToast("Informe o profissional responsável.", "warn");
      return;
    }
    const modulo = values.modulo || "observacaoClinica";
    const p = patientById(id);
    const obs = p?.[modulo] || { reavaliacoes: [] };
    const reavaliacoes = [...(obs.reavaliacoes || []), {
      pa: values.pa, fc: values.fc, sat: values.sat, temp: values.temp,
      evolucao: values.evolucao, conduta: values.conduta, profissional, horario: nowTime()
    }];
    GsiApi.update("pacientes", id, { [modulo]: { ...obs, reavaliacoes } });
    showToast("Reavaliação registrada.");
    closeModal();
    const pageMap = { observacaoClinica: "observacao-clinica", observacaoPediatrica: "observacao-pediatrica", observacaoObstetrica: "observacao-obstetrica", estabilizacao: "estabilizacao" };
    return renderPage(pageMap[modulo] || currentPage);
  }
  if (action === "route-to-stabilization") {
    const p = patientById(id);
    const obs = p?.estabilizacao || { reavaliacoes: [] };
    GsiApi.update("pacientes", id, { status: "Sala de estabilização", desfecho: "Sala de estabilização", estabilizacao: { ...obs, origem: obs.origem || "Observação Clínica", inicio: nowTime(), inicioTimestamp: Date.now() } });
    showToast("Paciente encaminhado para a Sala de Estabilização.");
    return renderPage(currentPage);
  }
  if (action === "open-stabilization-checklist-modal") {
    return openStabilizationChecklistModal(id);
  }
  if (action === "toggle-stabilization-checklist-item") {
    const p = patientById(button.dataset.id);
    if (!p) return;
    const saved = { ...(p.checklistEstabilizacao || {}), [button.dataset.item]: button.checked };
    GsiApi.update("pacientes", p.id, { checklistEstabilizacao: saved });
    const updated = patientById(p.id);
    appModal.querySelector(".modal-body").innerHTML = stabilizationChecklistModalBody(updated);
    if (currentPage === "estabilizacao") content.innerHTML = pages.estabilizacao();
    return;
  }
  if (action === "open-settings-from-menu") {
    closeUserMenu();
    return renderPage("configuracoes");
  }
  if (action === "demo-logout") {
    closeUserMenu();
    if (window.GsiAuth && typeof window.GsiAuth.signOut === "function") {
      window.GsiAuth.signOut();
    } else {
      showToast("Funcionalidade demonstrativa.", "warn");
    }
    return;
  }
  showToast("Ação simulada executada.");
}

sideNav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (button) renderPage(button.dataset.page);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  handleAction(button.dataset.action, button);
});

mobileMenu.addEventListener("click", () => {
  sidebar.classList.add("is-open");
  overlay.classList.add("is-open");
});

overlay.addEventListener("click", closeMenu);

if (sectorSelect) {
  sectorSelect.innerHTML = sectorOptions.map(([label, id]) => `<option value="${id}">${escapeHtml(label)}</option>`).join("");
  sectorSelect.addEventListener("change", () => renderPage(sectorSelect.value));
}

function getOperationalProfile() {
  return localStorage.getItem(OPERATIONAL_PROFILE_KEY) || operationalProfiles[0];
}

function setOperationalProfile(value) {
  localStorage.setItem(OPERATIONAL_PROFILE_KEY, value);
  if (userMenuProfileBadge) userMenuProfileBadge.textContent = getOperationalProfile();
}

function closeUserMenu() {
  if (!userMenuPanel || userMenuPanel.hidden) return;
  userMenuPanel.hidden = true;
  userMenuButton.setAttribute("aria-expanded", "false");
}

if (userMenuButton && userMenuPanel) {
  userMenuProfileSelect.innerHTML = operationalProfiles.map((profile) => `<option value="${escapeHtml(profile)}">${escapeHtml(profile)}</option>`).join("");
  userMenuProfileSelect.value = getOperationalProfile();
  userMenuProfileBadge.textContent = getOperationalProfile();

  userMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = userMenuPanel.hidden;
    userMenuPanel.hidden = !willOpen;
    userMenuButton.setAttribute("aria-expanded", String(willOpen));
  });

  userMenuProfileSelect.addEventListener("change", () => setOperationalProfile(userMenuProfileSelect.value));

  document.addEventListener("click", (event) => {
    if (!userMenuPanel.hidden && !event.target.closest(".user-menu-wrap")) closeUserMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeUserMenu();
  });
}

window.addEventListener("hashchange", () => {
  const page = window.location.hash.replace("#", "");
  if (page && pages[page] && page !== currentPage) renderPage(page);
});

// Etapa 2.1: quando auth.js termina de resolver a sessao (login, logout ou
// carregamento inicial), perfis/permissoes reais ja estao disponiveis em
// window.GsiAuth. Re-renderiza o menu e revalida a rota atual, que pode ter
// sido exibida de forma otimista (fail-open) antes da sessao carregar.
window.addEventListener("gsiauth:ready", () => {
  renderPage(currentPage);
});

window.addEventListener("beforeprint", () => {
  document.querySelectorAll(".modal-body .panel, .modal-body .card, .modal-body .metric-card, .modal-body .report-card, .modal-body .table-wrap").forEach((element) => {
    element.dataset.printBoxShadow = element.style.boxShadow || "";
    element.style.boxShadow = "none";
    element.style.webkitBoxShadow = "none";
  });
});

window.addEventListener("afterprint", () => {
  document.querySelectorAll("[data-print-box-shadow]").forEach((element) => {
    element.style.boxShadow = element.dataset.printBoxShadow || "";
    element.style.webkitBoxShadow = "";
    delete element.dataset.printBoxShadow;
  });
});

renderPage(currentPage);
