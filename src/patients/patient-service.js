import {
  buildPatientPayload,
  detectPatientIdentityConflict,
  hasPatientIdentity,
} from "./patient-rules.js";

const PATIENT_SELECT =
  "id, nome, data_nascimento, cpf, cartao_sus, telefone, municipio, perfil_residencia";

export function createPatientService(client) {
  if (!client?.from) throw new Error("Cliente Supabase inválido.");

  async function findBy(field, value) {
    if (!hasPatientIdentity(value)) return null;
    const { data, error } = await client
      .from("pacientes")
      .select(PATIENT_SELECT)
      .eq(field, value)
      .limit(2);
    if (error) throw error;
    if ((data || []).length > 1) throw new Error(`Mais de um paciente encontrado por ${field}.`);
    return (data || [])[0] || null;
  }

  async function findDuplicate(payload = {}) {
    const byCpf = await findBy("cpf", String(payload.cpf || "").trim());
    const byCns = await findBy("cartao_sus", String(payload.sus || "").trim());
    const conflict = detectPatientIdentityConflict(byCpf, byCns);
    if (conflict) throw conflict;
    return byCpf || byCns || null;
  }

  async function createFromLocal(payload = {}) {
    const insertPayload = buildPatientPayload(payload);
    const existing = await findDuplicate(payload);
    if (existing) return { ...existing, _alreadyExisted: true };
    const { data, error } = await client
      .from("pacientes")
      .insert(insertPayload)
      .select(PATIENT_SELECT)
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("Servidor nao confirmou o cadastro do paciente.");
    return data;
  }

  async function updateFromLocal(pacienteLocal = {}, payload = {}) {
    if (!pacienteLocal.pacienteSupabaseId) return createFromLocal(payload);
    const updatePayload = buildPatientPayload(payload);
    const { data, error } = await client
      .from("pacientes")
      .update(updatePayload)
      .eq("id", pacienteLocal.pacienteSupabaseId)
      .select(PATIENT_SELECT)
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("Servidor nao confirmou a atualização do paciente.");
    return data;
  }

  return { findBy, findDuplicate, createFromLocal, updateFromLocal };
}
