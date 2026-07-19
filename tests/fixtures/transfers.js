import { DEFAULT_TRANSFER_CHECKLIST_ITEMS } from "../../src/transfers/transfer-rules.js";

export const transferStatuses = [
  { id: "transfer-status-analysis", codigo: "em_analise" },
  { id: "transfer-status-approved", codigo: "vaga_confirmada" },
  { id: "transfer-status-done", codigo: "concluida" },
];

export const attendanceStatuses = [
  { id: "attendance-status-transfer", codigo: "em_transferencia_regulada" },
  { id: "attendance-status-outcome", codigo: "desfecho_registrado" },
];

export const outcomes = [{ id: "outcome-transfer", codigo: "transferencia_regulada" }];

export function completeChecklist() {
  return Object.fromEntries(DEFAULT_TRANSFER_CHECKLIST_ITEMS.map((item) => [item, true]));
}

export function incompleteChecklist() {
  return { ...completeChecklist(), documentos_clinicos: false };
}

export function makeTransferRequest(overrides = {}) {
  return {
    atendimentoId: "attendance-1",
    pacienteId: "patient-1",
    motivo: "TESTE_necessidade de UTI",
    destino: "TESTE_Hospital Referencia",
    acompanhante: "TESTE_Enfermeiro",
    tipoTransporte: "Ambulancia",
    usouAmbulancia: "Sim",
    ...overrides,
  };
}

export function makeTransfer(overrides = {}) {
  return {
    id: "transfer-1",
    atendimento_id: "attendance-1",
    status_id: "transfer-status-analysis",
    motivo: "TESTE_motivo",
    destino: "TESTE_destino",
    hora_solicitacao_ts: "2026-07-19T11:00:00.000Z",
    ...overrides,
  };
}

export function makeTables(overrides = {}) {
  return {
    transferencias: { rows: [], sequence: 1 },
    atendimentos: {
      rows: [
        { id: "attendance-1", paciente_id: "patient-1", status_id: "attendance-status-transfer" },
      ],
      sequence: 1,
    },
    checklist_transferencia_itens: { rows: [], sequence: 1 },
    dom_status_transferencia: { rows: transferStatuses },
    dom_status_atendimento: { rows: attendanceStatuses },
    dom_desfechos: { rows: outcomes },
    ...overrides,
  };
}
