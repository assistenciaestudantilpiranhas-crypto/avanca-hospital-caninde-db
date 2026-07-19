import {
  buildTriageAttendanceUpdatePayload,
  buildTriageInsertPayload,
  normalizeRiskCode,
  TRIAGE_FINAL_STATUS_CODE,
  validateTriageInput,
} from "./triage-rules.js";

const TRIAGE_SELECT =
  "id, atendimento_id, classificacao_sugerida_id, classificacao_confirmada_id, hora_inicio_ts, hora_fim_ts";
const ATTENDANCE_SELECT =
  "id, paciente_id, status_id, classificacao_risco_id, desfecho_id, queixa_principal, etapa_atual, setor_atual, hora_chegada_ts, hora_desfecho_ts";

export function createTriageService(client, { usuario = null } = {}) {
  if (!client?.from) throw new Error("Cliente Supabase invalido.");

  async function findRiskClassification(value) {
    const codigo = normalizeRiskCode(value);
    if (!codigo)
      throw new Error("Classificacao de risco invalida. Revise a triagem antes de salvar.");
    const { data, error } = await client
      .from("dom_classificacao_risco")
      .select("id,codigo,nome")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id)
      throw new Error("Classificacao de risco invalida. Revise a triagem antes de salvar.");
    return data;
  }

  async function findFinalStatus() {
    const { data, error } = await client
      .from("dom_status_atendimento")
      .select("id,codigo")
      .eq("codigo", TRIAGE_FINAL_STATUS_CODE)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error("Status final aguardando_consulta nao encontrado.");
    return data;
  }

  async function insertOrUpdateTriage(row) {
    const { data: existente, error: erroBusca } = await client
      .from("triagens")
      .select("id")
      .eq("atendimento_id", row.atendimento_id)
      .maybeSingle();
    if (erroBusca) throw erroBusca;
    if (existente?.id) {
      const { data, error } = await client
        .from("triagens")
        .update(row)
        .eq("id", existente.id)
        .select(TRIAGE_SELECT)
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("Servidor nao confirmou a atualizacao da triagem.");
      return { triagem: data, criada: false };
    }
    const { data, error } = await client
      .from("triagens")
      .insert(row)
      .select(TRIAGE_SELECT)
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("Servidor nao confirmou o registro da triagem.");
    return { triagem: data, criada: true };
  }

  async function updateAttendanceAfterTriage(atendimentoId, updatePayload) {
    if (!atendimentoId) throw new Error("Atendimento obrigatorio para atualizar triagem.");
    const { data, error } = await client
      .from("atendimentos")
      .update(updatePayload)
      .eq("id", atendimentoId)
      .select(ATTENDANCE_SELECT)
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("Servidor nao confirmou a atualizacao do atendimento.");
    return data;
  }

  async function register(input = {}) {
    const validated = validateTriageInput(input);
    const suggested = await findRiskClassification(validated.classificacaoSugeridaCodigo);
    const confirmed = await findRiskClassification(validated.classificacaoConfirmadaCodigo);
    const status = await findFinalStatus();
    const row = buildTriageInsertPayload(
      {
        ...validated,
        classificacaoSugeridaId: suggested.id,
        classificacaoConfirmadaId: confirmed.id,
      },
      usuario
    );
    const triageResult = await insertOrUpdateTriage(row);
    try {
      const attendance = await updateAttendanceAfterTriage(
        validated.atendimentoId,
        buildTriageAttendanceUpdatePayload({ statusId: status.id, classificacaoId: confirmed.id })
      );
      return { ok: true, ...triageResult, atendimento: attendance, falhaParcial: false };
    } catch (error) {
      return { ok: false, ...triageResult, atendimento: null, falhaParcial: true, error };
    }
  }

  return {
    findRiskClassification,
    findFinalStatus,
    insertOrUpdateTriage,
    updateAttendanceAfterTriage,
    register,
  };
}
