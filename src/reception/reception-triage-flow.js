export const PATIENT_CREATE_ACTION_RULE = {
  permissoes: ["paciente.criar"],
  perfis: ["Recepcao", "Recepção"],
};

export const ATTENDANCE_OPEN_ACTION_RULE = {
  permissoes: ["atendimento.abrir"],
  perfis: ["Recepcao", "Recepção"],
};

export const TRIAGE_CLASSIFY_ACTION_RULE = {
  permissoes: ["triagem.classificar"],
  perfis: ["Tecnico em Enfermagem", "Técnico em Enfermagem", "Enfermeiro"],
};

export function createReceptionTriageFlow({
  patientService,
  attendanceService,
  triageService,
  permissions,
}) {
  if (!patientService || !attendanceService || !triageService) {
    throw new Error("Dependencias do fluxo recepcao-triagem incompletas.");
  }
  const can = (rule) => (permissions?.isActionAllowed ? permissions.isActionAllowed(rule) : false);

  async function resolvePatient({ patientLocal = {}, mode = "reception" } = {}) {
    if (patientLocal.pacienteSupabaseId)
      return { id: patientLocal.pacienteSupabaseId, _fromBridge: true };
    const existing = await patientService.findDuplicate(patientLocal);
    if (existing) return existing;
    if (mode === "triage" && !can(PATIENT_CREATE_ACTION_RULE)) {
      throw new Error(
        "Paciente sem registro no sistema. Solicite a Recepcao que abra o atendimento antes de iniciar a triagem."
      );
    }
    if (!can(PATIENT_CREATE_ACTION_RULE)) {
      throw new Error("Usuario sem permissao para cadastrar paciente.");
    }
    return patientService.createFromLocal(patientLocal);
  }

  async function resolveAttendance({ patientReal, patientLocal = {}, mode = "reception" } = {}) {
    const localAttendanceId = patientLocal.atendimentoSupabaseId;
    if (localAttendanceId)
      return {
        atendimento: { id: localAttendanceId, paciente_id: patientReal.id, _fromBridge: true },
        criado: false,
      };
    const active = await attendanceService.findActiveByPatient(patientReal.id);
    if (active) return { atendimento: active, criado: false };
    if (mode === "triage" && !can(ATTENDANCE_OPEN_ACTION_RULE)) {
      throw new Error(
        "Atendimento nao encontrado no sistema. Solicite a Recepcao que abra o atendimento antes de salvar a triagem."
      );
    }
    if (!can(ATTENDANCE_OPEN_ACTION_RULE)) {
      throw new Error("Usuario sem permissao para abrir atendimento.");
    }
    return attendanceService.getOrCreateActive(
      patientReal,
      patientLocal,
      patientLocal.statusInicialId
    );
  }

  async function run({ patientLocal = {}, triageInput = {}, mode = "reception" } = {}) {
    if (!can(TRIAGE_CLASSIFY_ACTION_RULE))
      throw new Error("Usuario sem permissao para salvar triagem.");
    const paciente = await resolvePatient({ patientLocal, mode });
    const attendanceResult = await resolveAttendance({ patientReal: paciente, patientLocal, mode });
    const atendimento = attendanceResult.atendimento;
    const triageResult = await triageService.register({
      ...triageInput,
      pacienteId: paciente.id,
      atendimentoId: atendimento.id,
    });
    if (!triageResult.ok)
      return {
        ok: false,
        paciente,
        atendimento,
        atendimentoCriado: attendanceResult.criado,
        ...triageResult,
      };
    return {
      ok: true,
      paciente,
      atendimento: triageResult.atendimento,
      atendimentoInicial: atendimento,
      atendimentoCriado: attendanceResult.criado,
      triagem: triageResult.triagem,
      triagemCriada: triageResult.criada,
      falhaParcial: false,
    };
  }

  return { resolvePatient, resolveAttendance, run };
}
