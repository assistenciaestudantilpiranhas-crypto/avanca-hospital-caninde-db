import {
  ATTENDANCE_DONE_STATUS_CODE,
  ATTENDANCE_TRANSFER_STATUS_CODE,
  buildAttendanceOutcomePayload,
  buildAttendanceTransferPayload,
  buildChecklistRows,
  buildDepartureTransferPayload,
  buildTransferInsertPayload,
  DEFAULT_TRANSFER_CHECKLIST_ITEMS,
  TRANSFER_OUTCOME_CODE,
  TRANSFER_STATUS_CODES,
  assertApprovedForDeparture,
  assertChecklistComplete,
  assertDepartureTime,
  assertOpenAttendance,
  canApproveTransfer,
  requireTransferId,
} from "./transfer-rules.js";

const TRANSFER_SELECT =
  "id, atendimento_id, status_id, motivo, destino, hora_solicitacao_ts, hora_aprovacao_vaga_ts, checklist_confirmado_em, hora_saida_ts";
const ATTENDANCE_SELECT =
  "id, paciente_id, status_id, desfecho_id, etapa_atual, setor_atual, hora_desfecho_ts";

export function createTransferService(client, { now = () => new Date().toISOString() } = {}) {
  if (!client?.from) throw new Error("Cliente Supabase invalido.");

  async function findTransferStatus(codigo) {
    const { data, error } = await client
      .from("dom_status_transferencia")
      .select("id,codigo")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error(`Status de transferencia nao encontrado: ${codigo}`);
    return data;
  }

  async function findAttendanceStatus(codigo) {
    const { data, error } = await client
      .from("dom_status_atendimento")
      .select("id,codigo")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error(`Status de atendimento nao encontrado: ${codigo}`);
    return data;
  }

  async function findOutcome(codigo) {
    const { data, error } = await client
      .from("dom_desfechos")
      .select("id,codigo")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error(`Desfecho nao encontrado: ${codigo}`);
    return data;
  }

  async function getTransfer(id) {
    requireTransferId(id);
    const { data, error } = await client
      .from("transferencias")
      .select(TRANSFER_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error("Transferencia real nao encontrada.");
    return data;
  }

  async function requestTransfer(payload) {
    assertOpenAttendance({
      id: payload?.atendimentoId,
      hora_desfecho_ts: payload?.horaDesfechoTs,
      status_codigo: payload?.statusAtendimentoCodigo,
    });
    const [statusInitial, statusAttendance] = await Promise.all([
      findTransferStatus(TRANSFER_STATUS_CODES.INITIAL),
      findAttendanceStatus(ATTENDANCE_TRANSFER_STATUS_CODE),
    ]);
    const nowIso = now();
    const { data: transferencia, error: transferError } = await client
      .from("transferencias")
      .insert(buildTransferInsertPayload(payload, statusInitial.id, nowIso))
      .select(TRANSFER_SELECT)
      .single();
    if (transferError) throw transferError;
    try {
      const { data: atendimento, error: attendanceError } = await client
        .from("atendimentos")
        .update(buildAttendanceTransferPayload(statusAttendance.id))
        .eq("id", payload.atendimentoId)
        .select(ATTENDANCE_SELECT)
        .single();
      if (attendanceError) throw attendanceError;
      if (!atendimento?.id) throw new Error("Servidor nao confirmou a atualizacao do atendimento.");
      return { ok: true, transferencia, atendimento, falhaParcial: false };
    } catch (error) {
      return { ok: false, transferencia, atendimento: null, falhaParcial: true, error };
    }
  }

  async function approveVacancy(id) {
    const existing = await getTransfer(id);
    const approval = canApproveTransfer({ ...existing, status_codigo: existing.status_codigo });
    if (approval.idempotent) return { ok: true, transferencia: existing, idempotent: true };
    const statusApproved = await findTransferStatus(TRANSFER_STATUS_CODES.APPROVED);
    const { data, error } = await client
      .from("transferencias")
      .update({ status_id: statusApproved.id, hora_aprovacao_vaga_ts: now() })
      .eq("id", id)
      .select(TRANSFER_SELECT)
      .single();
    if (error) throw error;
    return { ok: true, transferencia: data, idempotent: false };
  }

  async function confirmChecklist(id, checklist, requiredItems = DEFAULT_TRANSFER_CHECKLIST_ITEMS) {
    requireTransferId(id);
    assertChecklistComplete(checklist, requiredItems);
    const nowIso = now();
    const { error: itemError } = await client
      .from("checklist_transferencia_itens")
      .insert(buildChecklistRows(id, checklist, nowIso, requiredItems));
    if (itemError) throw itemError;
    const { data, error } = await client
      .from("transferencias")
      .update({ checklist_confirmado_em: nowIso })
      .eq("id", id)
      .select(TRANSFER_SELECT)
      .single();
    if (error) throw error;
    return { ok: true, transferencia: data };
  }

  async function confirmDeparture({ transferenciaId, atendimentoId, checklist }) {
    const transfer = await getTransfer(transferenciaId);
    assertApprovedForDeparture({
      ...transfer,
      status_codigo: transfer.status_codigo || statusCodeFromId(transfer.status_id),
    });
    assertChecklistComplete(checklist);
    if (!atendimentoId)
      throw new Error("Atendimento real nao encontrado ao confirmar saida de transferencia.");
    const horaSaidaTs = assertDepartureTime(transfer, now());
    const statusDone = await findTransferStatus(TRANSFER_STATUS_CODES.DONE);
    const { data: transferencia, error: transferError } = await client
      .from("transferencias")
      .update(buildDepartureTransferPayload(statusDone.id, horaSaidaTs))
      .eq("id", transferenciaId)
      .select(TRANSFER_SELECT)
      .single();
    if (transferError) throw transferError;
    try {
      const [statusAttendance, outcome] = await Promise.all([
        findAttendanceStatus(ATTENDANCE_DONE_STATUS_CODE),
        findOutcome(TRANSFER_OUTCOME_CODE),
      ]);
      const { data: atendimento, error: attendanceError } = await client
        .from("atendimentos")
        .update(
          buildAttendanceOutcomePayload({
            statusId: statusAttendance.id,
            desfechoId: outcome.id,
            horaDesfechoTs: horaSaidaTs,
          })
        )
        .eq("id", atendimentoId)
        .select(ATTENDANCE_SELECT)
        .single();
      if (attendanceError) throw attendanceError;
      if (!atendimento?.id) throw new Error("Servidor nao confirmou o desfecho do atendimento.");
      return { ok: true, transferencia, atendimento, falhaParcial: false };
    } catch (error) {
      return { ok: false, transferencia, atendimento: null, falhaParcial: true, error };
    }
  }

  function statusCodeFromId(statusId) {
    if (statusId === "transfer-status-approved") return TRANSFER_STATUS_CODES.APPROVED;
    if (statusId === "transfer-status-done") return TRANSFER_STATUS_CODES.DONE;
    if (statusId === "transfer-status-analysis") return TRANSFER_STATUS_CODES.INITIAL;
    return null;
  }

  return {
    findTransferStatus,
    findAttendanceStatus,
    findOutcome,
    getTransfer,
    requestTransfer,
    approveVacancy,
    confirmChecklist,
    confirmDeparture,
  };
}
