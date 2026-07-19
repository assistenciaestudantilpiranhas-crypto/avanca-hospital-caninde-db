import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_DONE_STATUS_CODE,
  DEFAULT_TRANSFER_CHECKLIST_ITEMS,
  TRANSFER_OUTCOME_CODE,
  TRANSFER_STATUS_CODES,
  assertApprovedForDeparture,
  assertChecklistComplete,
  assertDepartureTime,
  assertOpenAttendance,
  buildAttendanceOutcomePayload,
  buildAttendanceTransferPayload,
  buildChecklistRows,
  buildDepartureTransferPayload,
  buildTransferInsertPayload,
  canApproveTransfer,
  isChecklistComplete,
  requireTransferId,
  validateTransferRequest,
} from "../../src/transfers/transfer-rules.js";
import {
  completeChecklist,
  incompleteChecklist,
  makeTransfer,
  makeTransferRequest,
} from "../fixtures/transfers.js";

describe("transfer rules", () => {
  it("exige atendimento_id", () => {
    expect(() => validateTransferRequest(makeTransferRequest({ atendimentoId: null }))).toThrow(
      "Atendimento real"
    );
  });

  it("exige paciente_id", () => {
    expect(() => validateTransferRequest(makeTransferRequest({ pacienteId: null }))).toThrow(
      "Paciente"
    );
  });

  it("exige destino", () => {
    expect(() => validateTransferRequest(makeTransferRequest({ destino: "" }))).toThrow("Destino");
  });

  it("exige motivo", () => {
    expect(() => validateTransferRequest(makeTransferRequest({ motivo: "" }))).toThrow("Motivo");
  });

  it("rejeita payload null", () => {
    expect(() => validateTransferRequest(null)).toThrow("Payload");
  });

  it("monta status inicial em_analise", () => {
    expect(
      buildTransferInsertPayload(makeTransferRequest(), "status-initial", "2026-07-19T11:00:00Z")
    ).toMatchObject({
      status_id: "status-initial",
      atendimento_id: "attendance-1",
    });
  });

  it("monta payload de atendimento em transferencia", () => {
    expect(buildAttendanceTransferPayload("attendance-transfer")).toMatchObject({
      status_id: "attendance-transfer",
    });
  });

  it("bloqueia checklist incompleto", () => {
    expect(() => assertChecklistComplete(incompleteChecklist())).toThrow("Checklist incompleto");
  });

  it("checklist completo permite saida", () => {
    expect(isChecklistComplete(completeChecklist())).toBe(true);
  });

  it("bloqueia saida sem vaga aprovada", () => {
    expect(() =>
      assertApprovedForDeparture(makeTransfer({ status_codigo: TRANSFER_STATUS_CODES.INITIAL }))
    ).toThrow("Vaga");
  });

  it("bloqueia concluir transferencia ja concluida", () => {
    expect(() =>
      assertApprovedForDeparture(makeTransfer({ status_codigo: TRANSFER_STATUS_CODES.DONE }))
    ).toThrow("concluida");
  });

  it("exige hora de saida", () => {
    expect(() => assertDepartureTime(makeTransfer(), null)).toThrow("Hora de saida");
  });

  it("bloqueia saida antes da solicitacao", () => {
    expect(() => assertDepartureTime(makeTransfer(), "2026-07-19T10:59:00Z")).toThrow("anteceder");
  });

  it("monta status concluida", () => {
    expect(buildDepartureTransferPayload("transfer-status-done", "2026-07-19T12:00:00Z")).toEqual({
      status_id: "transfer-status-done",
      hora_saida_ts: "2026-07-19T12:00:00.000Z",
    });
  });

  it("monta desfecho transferencia_regulada", () => {
    expect(
      buildAttendanceOutcomePayload({
        statusId: "attendance-status-outcome",
        desfechoId: "outcome-transfer",
        horaDesfechoTs: "2026-07-19T12:00:00Z",
      })
    ).toMatchObject({
      status_id: "attendance-status-outcome",
      desfecho_id: "outcome-transfer",
      etapa_atual: "Transferencia concluida",
      setor_atual: "Transferencia regulada",
    });
    expect(ATTENDANCE_DONE_STATUS_CODE).toBe("desfecho_registrado");
    expect(TRANSFER_OUTCOME_CODE).toBe("transferencia_regulada");
  });

  it("exige id Supabase da transferencia", () => {
    expect(() => requireTransferId(undefined)).toThrow("Transferencia real");
  });

  it("bloqueia atendimento encerrado", () => {
    expect(() =>
      assertOpenAttendance({ id: "attendance-1", hora_desfecho_ts: "2026-07-19T12:00:00Z" })
    ).toThrow("encerrado");
  });

  it("identifica aprovacao duplicada como idempotente", () => {
    expect(
      canApproveTransfer(makeTransfer({ status_codigo: TRANSFER_STATUS_CODES.APPROVED })).idempotent
    ).toBe(true);
  });

  it("gera uma linha por item de checklist", () => {
    expect(
      buildChecklistRows("transfer-1", completeChecklist(), "2026-07-19T12:00:00Z")
    ).toHaveLength(DEFAULT_TRANSFER_CHECKLIST_ITEMS.length);
  });
});
