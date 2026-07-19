export const TRIAGE_RISK_CODES = ["vermelho", "laranja", "amarelo", "verde", "azul"];
export const TRIAGE_FINAL_STATUS_CODE = "aguardando_consulta";
export const TRIAGE_FINAL_STAGE = "Aguardando consulta";
export const TRIAGE_FINAL_SECTOR = "Consulta medica";

export function normalizeRiskCode(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isValidRiskCode(value) {
  return TRIAGE_RISK_CODES.includes(normalizeRiskCode(value));
}

export function assertChronologicalTriageTimes(start, end) {
  if (!start) throw new Error("Hora de inicio da triagem obrigatoria.");
  if (!end) throw new Error("Hora de fim da triagem obrigatoria.");
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime())) throw new Error("Hora de inicio da triagem invalida.");
  if (Number.isNaN(endDate.getTime())) throw new Error("Hora de fim da triagem invalida.");
  if (endDate < startDate) throw new Error("Hora de fim nao pode anteceder o inicio da triagem.");
}

export function buildTriageInsertPayload(payload = {}, usuario = null) {
  if (!payload.atendimentoId) {
    throw new Error(
      "Atendimento sem cadastro real vinculado. Nao foi possivel salvar a triagem no servidor."
    );
  }
  if (!payload.pacienteId) {
    throw new Error(
      "Paciente sem cadastro real vinculado. Nao foi possivel salvar a triagem no servidor."
    );
  }
  if (!payload.classificacaoSugeridaId) throw new Error("Classificacao sugerida inexistente.");
  if (!payload.classificacaoConfirmadaId) throw new Error("Classificacao confirmada inexistente.");
  assertChronologicalTriageTimes(payload.horaInicioTs, payload.horaFimTs);
  return {
    atendimento_id: payload.atendimentoId,
    profissional_id: usuario?.id || null,
    classificacao_sugerida_id: payload.classificacaoSugeridaId,
    classificacao_confirmada_id: payload.classificacaoConfirmadaId,
    hora_inicio_ts: new Date(payload.horaInicioTs).toISOString(),
    hora_fim_ts: new Date(payload.horaFimTs).toISOString(),
    historia_breve: payload.historiaBreve || null,
    sinais_vitais: payload.sinaisVitais || null,
    justificativa_classificacao: payload.justificativaClassificacao || null,
    prioridade: payload.prioridade || null,
    orientacao_inicial: payload.orientacaoInicial || null,
    updated_by: usuario?.id || null,
  };
}

export function buildTriageAttendanceUpdatePayload({ statusId, classificacaoId } = {}) {
  if (!statusId) throw new Error("Status final aguardando_consulta nao encontrado.");
  if (!classificacaoId)
    throw new Error("Classificacao de risco invalida. Revise a triagem antes de salvar.");
  return {
    status_id: statusId,
    classificacao_risco_id: classificacaoId,
    etapa_atual: TRIAGE_FINAL_STAGE,
    setor_atual: TRIAGE_FINAL_SECTOR,
  };
}

export function validateTriageInput(input = {}) {
  if (!input || typeof input !== "object") throw new Error("Payload de triagem incompleto.");
  if (!input.pacienteId) throw new Error("Paciente obrigatorio para triagem.");
  if (!input.atendimentoId) throw new Error("Atendimento obrigatorio para triagem.");
  if (!isValidRiskCode(input.classificacaoSugerida))
    throw new Error("Classificacao sugerida invalida.");
  if (!isValidRiskCode(input.classificacaoConfirmada))
    throw new Error("Classificacao confirmada invalida.");
  assertChronologicalTriageTimes(input.horaInicioTs, input.horaFimTs);
  return {
    ...input,
    classificacaoSugeridaCodigo: normalizeRiskCode(input.classificacaoSugerida),
    classificacaoConfirmadaCodigo: normalizeRiskCode(input.classificacaoConfirmada),
    statusFinalCodigo: TRIAGE_FINAL_STATUS_CODE,
    etapaAtual: TRIAGE_FINAL_STAGE,
    setorAtual: TRIAGE_FINAL_SECTOR,
  };
}
