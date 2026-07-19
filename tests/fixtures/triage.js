export const riskClassifications = [
  { id: "risk-red", codigo: "vermelho", nome: "Vermelho" },
  { id: "risk-orange", codigo: "laranja", nome: "Laranja" },
  { id: "risk-yellow", codigo: "amarelo", nome: "Amarelo" },
  { id: "risk-green", codigo: "verde", nome: "Verde" },
  { id: "risk-blue", codigo: "azul", nome: "Azul" },
];

export const attendanceStatuses = [
  { id: "status-wait-triage", codigo: "aguardando_triagem" },
  { id: "status-in-triage", codigo: "em_triagem" },
  { id: "status-wait-consult", codigo: "aguardando_consulta" },
  { id: "status-discharged", codigo: "alta" },
];

export function makeTriageInput(overrides = {}) {
  return {
    pacienteId: "patient-1",
    atendimentoId: "attendance-1",
    classificacaoSugerida: "Amarelo",
    classificacaoConfirmada: "Amarelo",
    horaInicioTs: "2026-07-19T10:00:00.000Z",
    horaFimTs: "2026-07-19T10:08:00.000Z",
    historiaBreve: "TESTE_dor abdominal",
    sinaisVitais: { pa: "120x80", fc: "82" },
    justificativaClassificacao: "TESTE_protocolo institucional",
    prioridade: "Amarelo",
    orientacaoInicial: "TESTE_aguardar consulta",
    ...overrides,
  };
}

export function makePatientLocal(overrides = {}) {
  return {
    nome: "TESTE_PACIENTE FLUXO",
    nascimento: "10/01/1990",
    cpf: "111.222.333-44",
    sus: "700 0000 0000 001",
    telefone: "(85) 99999-0000",
    municipio: "Caninde",
    perfil: "Residente",
    queixa: "TESTE_queixa principal",
    horaChegadaTs: Date.UTC(2026, 6, 19, 9, 45, 0),
    statusInicialId: "status-wait-triage",
    ...overrides,
  };
}

export function makeTables(overrides = {}) {
  return {
    pacientes: { rows: [], sequence: 1 },
    atendimentos: { rows: [], sequence: 1 },
    triagens: { rows: [], sequence: 1 },
    dom_classificacao_risco: { rows: riskClassifications },
    dom_status_atendimento: { rows: attendanceStatuses },
    ...overrides,
  };
}
