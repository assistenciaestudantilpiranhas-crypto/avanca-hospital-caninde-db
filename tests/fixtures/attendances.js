import { patientReal } from "./patients.js";

export const activeStatus = { id: "status-aguardando-triagem", codigo: "aguardando_triagem" };
export const closedStatus = { id: "status-desfecho", codigo: "desfecho_registrado" };

export const activeAttendance = {
  id: "atendimento-ativo-1",
  paciente_id: patientReal.id,
  status_id: activeStatus.id,
  status_codigo: activeStatus.codigo,
  queixa_principal: "TESTE_QUEIXA",
  etapa_atual: "Aguardando triagem",
  setor_atual: null,
  hora_chegada_ts: "2026-07-19T10:00:00.000Z",
  hora_desfecho_ts: null,
};

export const closedAttendance = {
  ...activeAttendance,
  id: "atendimento-encerrado-1",
  status_id: closedStatus.id,
  status_codigo: closedStatus.codigo,
  hora_desfecho_ts: "2026-07-19T12:00:00.000Z",
};
