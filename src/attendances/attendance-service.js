import {
  ACTIVE_ATTENDANCE_STATUS_CODES,
  buildInitialAttendancePayload,
  normalizeAttendanceResult,
} from "./attendance-rules.js";

const ATTENDANCE_SELECT =
  "id, paciente_id, status_id, classificacao_risco_id, desfecho_id, queixa_principal, etapa_atual, setor_atual, hora_chegada_ts, hora_desfecho_ts";

export function createAttendanceService(client) {
  if (!client?.from) throw new Error("Cliente Supabase inválido.");

  async function loadActiveStatusIds() {
    const { data, error } = await client
      .from("dom_status_atendimento")
      .select("id,codigo")
      .in("codigo", ACTIVE_ATTENDANCE_STATUS_CODES);
    if (error) throw error;
    return (data || []).map((status) => status.id).filter(Boolean);
  }

  async function findActiveByPatient(pacienteId) {
    if (!pacienteId)
      throw new Error(
        "Paciente sem cadastro real vinculado. Nao foi possivel buscar atendimento ativo."
      );
    const statusIds = await loadActiveStatusIds();
    if (!statusIds.length) throw new Error("Nenhum status ativo valido encontrado no servidor.");
    const { data, error } = await client
      .from("atendimentos")
      .select(ATTENDANCE_SELECT)
      .eq("paciente_id", pacienteId)
      .in("status_id", statusIds)
      .order("hora_chegada_ts", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function createFromPatient(pacienteReal, pacienteLocal = {}, statusId) {
    const payload = buildInitialAttendancePayload(pacienteReal, pacienteLocal, statusId);
    const { data, error } = await client
      .from("atendimentos")
      .insert(payload)
      .select(ATTENDANCE_SELECT)
      .single();
    if (error) throw error;
    return normalizeAttendanceResult(data);
  }

  async function getOrCreateActive(pacienteReal, pacienteLocal = {}, statusId) {
    if (!pacienteReal?.id) {
      throw new Error(
        "Paciente sem cadastro real vinculado. Nao foi possivel abrir o atendimento no servidor."
      );
    }
    const active = await findActiveByPatient(pacienteReal.id);
    if (active) return { atendimento: normalizeAttendanceResult(active), criado: false };
    return {
      atendimento: await createFromPatient(pacienteReal, pacienteLocal, statusId),
      criado: true,
    };
  }

  return { loadActiveStatusIds, findActiveByPatient, createFromPatient, getOrCreateActive };
}
