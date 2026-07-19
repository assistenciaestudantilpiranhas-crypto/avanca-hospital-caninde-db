export const ACTIVE_ATTENDANCE_STATUS_CODES = [
  "aguardando_triagem",
  "em_triagem",
  "aguardando_consulta",
  "em_consulta",
  "em_observacao",
  "em_estabilizacao",
  "em_transferencia_regulada",
];

export const CLOSED_ATTENDANCE_STATUS_CODES = ["alta", "desfecho_registrado", "cancelado"];

export function isActiveAttendance(attendance = {}, activeStatusIds = []) {
  if (!attendance) return false;
  if (attendance.hora_desfecho_ts) return false;
  if (attendance.status_codigo)
    return ACTIVE_ATTENDANCE_STATUS_CODES.includes(attendance.status_codigo);
  return activeStatusIds.includes(attendance.status_id);
}

export function selectMostRecentActiveAttendance(attendances = [], activeStatusIds = []) {
  return (
    [...attendances]
      .filter((attendance) => isActiveAttendance(attendance, activeStatusIds))
      .sort((a, b) => new Date(b.hora_chegada_ts || 0) - new Date(a.hora_chegada_ts || 0))[0] ||
    null
  );
}

export function canCreateNewAttendance(attendances = [], activeStatusIds = []) {
  return !selectMostRecentActiveAttendance(attendances, activeStatusIds);
}

export function buildInitialAttendancePayload(pacienteReal = {}, pacienteLocal = {}, statusId) {
  if (!pacienteReal?.id) {
    throw new Error(
      "Paciente sem cadastro real vinculado. Não foi possível abrir o atendimento no servidor."
    );
  }
  if (!statusId) throw new Error("Status inicial aguardando_triagem não encontrado.");
  const horaChegadaTs = Number.isFinite(pacienteLocal?.horaChegadaTs)
    ? new Date(pacienteLocal.horaChegadaTs).toISOString()
    : new Date().toISOString();
  return {
    paciente_id: pacienteReal.id,
    status_id: statusId,
    queixa_principal: pacienteLocal?.queixa || "Não informado",
    etapa_atual: "Aguardando triagem",
    hora_chegada_ts: horaChegadaTs,
  };
}

export function normalizeAttendanceResult(attendance = {}) {
  if (!attendance?.id) throw new Error("Atendimento real sem id retornado.");
  return { ...attendance, atendimentoSupabaseId: attendance.id };
}
