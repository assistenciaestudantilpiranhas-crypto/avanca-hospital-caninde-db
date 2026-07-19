export const TRANSFER_REQUEST_RULE = {
  permissoes: ["transferencia.solicitar"],
  perfis: ["Medico", "Médico"],
};
export const TRANSFER_APPROVE_RULE = {
  permissoes: ["transferencia.aprovar_vaga"],
  perfis: ["Regulacao de Transferencia", "Regulação de Transferência"],
};
export const TRANSFER_CHECKLIST_RULE = {
  permissoes: ["transferencia.confirmar_checklist"],
  perfis: ["Enfermeiro"],
};
export const TRANSFER_DEPARTURE_RULE = {
  permissoes: ["transferencia.confirmar_saida"],
  perfis: ["Enfermeiro"],
};

export function createTransferFlow({ transferService, permissions }) {
  if (!transferService) throw new Error("Servico de transferencia obrigatorio.");
  const can = (rule) => (permissions?.isActionAllowed ? permissions.isActionAllowed(rule) : false);
  const requirePermission = (rule, message) => {
    if (!can(rule)) throw new Error(message);
  };

  async function request(payload) {
    requirePermission(TRANSFER_REQUEST_RULE, "Usuario sem permissao para solicitar transferencia.");
    return transferService.requestTransfer(payload);
  }

  async function approve(transferenciaId) {
    requirePermission(
      TRANSFER_APPROVE_RULE,
      "Usuario sem permissao para aprovar vaga de transferencia."
    );
    return transferService.approveVacancy(transferenciaId);
  }

  async function checklist(transferenciaId, checklistPayload) {
    requirePermission(
      TRANSFER_CHECKLIST_RULE,
      "Usuario sem permissao para confirmar checklist de transferencia."
    );
    return transferService.confirmChecklist(transferenciaId, checklistPayload);
  }

  async function depart(payload) {
    requirePermission(
      TRANSFER_DEPARTURE_RULE,
      "Usuario sem permissao para confirmar saida de transferencia."
    );
    return transferService.confirmDeparture(payload);
  }

  async function runComplete({ requestPayload, checklistPayload }) {
    const requested = await request(requestPayload);
    if (!requested.ok) return requested;
    const approved = await approve(requested.transferencia.id);
    const checked = await checklist(requested.transferencia.id, checklistPayload);
    const departure = await depart({
      transferenciaId: requested.transferencia.id,
      atendimentoId: requestPayload.atendimentoId,
      checklist: checklistPayload,
    });
    return {
      ok: departure.ok,
      requested,
      approved,
      checked,
      departure,
      falhaParcial: departure.falhaParcial,
    };
  }

  return { request, approve, checklist, depart, runComplete };
}
