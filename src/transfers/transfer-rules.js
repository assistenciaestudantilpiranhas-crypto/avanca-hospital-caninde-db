export const TRANSFER_STATUS_CODES = {
  INITIAL: "em_analise",
  APPROVED: "vaga_confirmada",
  DONE: "concluida",
};

export const ATTENDANCE_TRANSFER_STATUS_CODE = "em_transferencia_regulada";
export const ATTENDANCE_DONE_STATUS_CODE = "desfecho_registrado";
export const TRANSFER_OUTCOME_CODE = "transferencia_regulada";
export const TRANSFER_REQUEST_STAGE = "Em transferencia regulada";
export const TRANSFER_REQUEST_SECTOR = "Regulacao de Transferencias";
export const TRANSFER_DONE_STAGE = "Transferencia concluida";
export const TRANSFER_DONE_SECTOR = "Transferencia regulada";
export const DEFAULT_TRANSFER_CHECKLIST_ITEMS = [
  "identificacao_confirmada",
  "documentos_clinicos",
  "vaga_regulada",
  "transporte_definido",
  "acompanhante_orientado",
];

export function requireTransferId(id) {
  if (!id) throw new Error("Transferencia real nao encontrada.");
  return id;
}

export function assertOpenAttendance(attendance = {}) {
  if (!attendance?.id) throw new Error("Atendimento real nao encontrado.");
  if (attendance.hora_desfecho_ts || attendance.status_codigo === ATTENDANCE_DONE_STATUS_CODE) {
    throw new Error("Atendimento encerrado nao permite nova conclusao de transferencia.");
  }
  return attendance;
}

export function validateTransferRequest(payload = {}) {
  if (!payload || typeof payload !== "object")
    throw new Error("Payload de transferencia invalido.");
  if (!payload.atendimentoId)
    throw new Error(
      "Atendimento real nao encontrado. Inicie o atendimento antes de solicitar transferencia."
    );
  if (!payload.pacienteId) throw new Error("Paciente obrigatorio para transferencia.");
  if (!String(payload.destino || "").trim())
    throw new Error("Destino da transferencia obrigatorio.");
  if (!String(payload.motivo || "").trim()) throw new Error("Motivo da transferencia obrigatorio.");
  return payload;
}

export function buildTransferInsertPayload(payload = {}, statusId, nowIso) {
  const valid = validateTransferRequest(payload);
  if (!statusId) throw new Error("Status inicial de transferencia nao encontrado.");
  return {
    atendimento_id: valid.atendimentoId,
    status_id: statusId,
    motivo: valid.motivo,
    destino: valid.destino,
    acompanhante: valid.acompanhante || null,
    tipo_transporte: valid.tipoTransporte || null,
    usou_ambulancia:
      valid.usouAmbulancia === "Sim" ? true : valid.usouAmbulancia === "Nao" ? false : null,
    hora_solicitacao_ts: nowIso,
  };
}

export function buildAttendanceTransferPayload(statusId) {
  if (!statusId) throw new Error("Status em_transferencia_regulada nao encontrado.");
  return {
    status_id: statusId,
    etapa_atual: TRANSFER_REQUEST_STAGE,
    setor_atual: TRANSFER_REQUEST_SECTOR,
  };
}

export function canApproveTransfer(transfer = {}) {
  requireTransferId(transfer.id);
  if (transfer.status_codigo === TRANSFER_STATUS_CODES.DONE || transfer.hora_saida_ts) {
    throw new Error("Transferencia concluida nao pode aprovar vaga novamente.");
  }
  return transfer.status_codigo === TRANSFER_STATUS_CODES.APPROVED ||
    Boolean(transfer.hora_aprovacao_vaga_ts)
    ? { allowed: true, idempotent: true }
    : { allowed: true, idempotent: false };
}

export function assertApprovedForDeparture(transfer = {}) {
  requireTransferId(transfer.id);
  if (transfer.status_codigo === TRANSFER_STATUS_CODES.DONE || transfer.hora_saida_ts) {
    throw new Error("Transferencia concluida nao pode concluir novamente.");
  }
  if (
    transfer.status_codigo !== TRANSFER_STATUS_CODES.APPROVED &&
    !transfer.hora_aprovacao_vaga_ts
  ) {
    throw new Error("Vaga nao aprovada nao permite confirmar saida.");
  }
  return transfer;
}

export function isChecklistComplete(
  checklist = {},
  requiredItems = DEFAULT_TRANSFER_CHECKLIST_ITEMS
) {
  return requiredItems.every((item) => checklist[item] === true);
}

export function assertChecklistComplete(
  checklist = {},
  requiredItems = DEFAULT_TRANSFER_CHECKLIST_ITEMS
) {
  if (!isChecklistComplete(checklist, requiredItems))
    throw new Error("Checklist incompleto bloqueia saida.");
  return true;
}

export function assertDepartureTime(transfer = {}, horaSaidaTs) {
  if (!horaSaidaTs) throw new Error("Hora de saida obrigatoria.");
  const departure = new Date(horaSaidaTs);
  const requested = new Date(transfer.hora_solicitacao_ts || 0);
  if (Number.isNaN(departure.getTime())) throw new Error("Hora de saida invalida.");
  if (transfer.hora_solicitacao_ts && departure < requested) {
    throw new Error("Saida nao pode anteceder solicitacao.");
  }
  return departure.toISOString();
}

export function buildChecklistRows(
  transferenciaId,
  checklist = {},
  nowIso,
  requiredItems = DEFAULT_TRANSFER_CHECKLIST_ITEMS
) {
  requireTransferId(transferenciaId);
  assertChecklistComplete(checklist, requiredItems);
  return requiredItems.map((item) => ({
    transferencia_id: transferenciaId,
    item,
    concluido: true,
    concluido_em: nowIso,
  }));
}

export function buildDepartureTransferPayload(statusId, horaSaidaTs) {
  if (!statusId) throw new Error("Status concluida nao encontrado.");
  if (!horaSaidaTs) throw new Error("Hora de saida obrigatoria.");
  return { status_id: statusId, hora_saida_ts: new Date(horaSaidaTs).toISOString() };
}

export function buildAttendanceOutcomePayload({ statusId, desfechoId, horaDesfechoTs } = {}) {
  if (!statusId) throw new Error("Status desfecho_registrado nao encontrado.");
  if (!desfechoId) throw new Error("Desfecho transferencia_regulada nao encontrado.");
  if (!horaDesfechoTs) throw new Error("Hora de desfecho obrigatoria.");
  return {
    status_id: statusId,
    desfecho_id: desfechoId,
    hora_desfecho_ts: new Date(horaDesfechoTs).toISOString(),
    etapa_atual: TRANSFER_DONE_STAGE,
    setor_atual: TRANSFER_DONE_SECTOR,
  };
}
