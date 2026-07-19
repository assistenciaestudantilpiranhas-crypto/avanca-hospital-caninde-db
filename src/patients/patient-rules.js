export function normalizeCpf(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeCns(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function hasPatientIdentity(value) {
  return Boolean(String(value || "").trim());
}

export function parseDateBRToISO(value = "") {
  const parts = String(value || "")
    .trim()
    .split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function buildPatientPayload(payload = {}) {
  const dataNascimento = parseDateBRToISO(payload.nascimento);
  if (!payload.nome || !String(payload.nome).trim())
    throw new Error("Nome do paciente é obrigatório.");
  if (!dataNascimento) throw new Error("Data de nascimento inválida. Use o formato DD/MM/AAAA.");
  return {
    nome: payload.nome,
    data_nascimento: dataNascimento,
    cpf: payload.cpf || null,
    cartao_sus: payload.sus || null,
    telefone: payload.telefone || null,
    municipio: payload.municipio,
    perfil_residencia: payload.perfil || null,
  };
}

export function comparePatientIdentity(local = {}, real = {}) {
  return {
    sameCpf: hasPatientIdentity(local.cpf) && normalizeCpf(local.cpf) === normalizeCpf(real.cpf),
    sameCns:
      hasPatientIdentity(local.sus) && normalizeCns(local.sus) === normalizeCns(real.cartao_sus),
  };
}

export function detectPatientIdentityConflict(cpfPatient, cnsPatient) {
  if (!cpfPatient || !cnsPatient) return null;
  if (cpfPatient.id === cnsPatient.id) return null;
  return new Error("CPF e CNS informados apontam para pacientes reais diferentes.");
}

export function mergeLocalWithRealPatient(local = {}, real = {}) {
  if (!real?.id) return { ...local };
  return {
    ...local,
    pacienteSupabaseId: real.id,
    nome: real.nome,
    nascimento: real.data_nascimento,
    cpf: real.cpf,
    sus: real.cartao_sus,
    telefone: real.telefone,
    municipio: real.municipio,
    perfil: real.perfil_residencia,
  };
}

export function isRealPatient(patient = {}) {
  return Boolean(patient?.id);
}

export function isLocalPatient(patient = {}) {
  return Boolean(patient?.id || patient?.nome) && !patient?.pacienteSupabaseId;
}
