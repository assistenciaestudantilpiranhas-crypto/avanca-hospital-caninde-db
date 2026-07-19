import { describe, expect, it } from "vitest";
import { createAttendanceService } from "../../src/attendances/attendance-service.js";
import { createPatientService } from "../../src/patients/patient-service.js";
import { createPermissionChecker } from "../../src/permissions/permission-rules.js";
import { createReceptionTriageFlow } from "../../src/reception/reception-triage-flow.js";
import { createTriageService } from "../../src/triage/triage-service.js";
import { makeAuth } from "../fixtures/permissions.js";
import { makePatientLocal, makeTables, makeTriageInput } from "../fixtures/triage.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";

function setup({ tables = {}, auth = receptionNurseAuth() } = {}) {
  const mock = createMockSupabaseQuery(makeTables(tables));
  const permissions = createPermissionChecker(auth);
  const patientService = createPatientService(mock.client);
  const attendanceService = createAttendanceService(mock.client);
  const triageService = createTriageService(mock.client, { usuario: { id: "user-TESTE" } });
  return {
    ...mock,
    flow: createReceptionTriageFlow({
      patientService,
      attendanceService,
      triageService,
      permissions,
    }),
  };
}

function receptionNurseAuth() {
  return makeAuth({ permissoes: ["paciente.criar", "atendimento.abrir", "triagem.classificar"] });
}

function nurseOnlyAuth() {
  return makeAuth({ permissoes: ["triagem.classificar"] });
}

function techOnlyAuth() {
  return makeAuth({ permissoes: ["triagem.classificar"] });
}

describe("reception to triage integrated flow", () => {
  it("1. cria paciente novo, cria atendimento, registra triagem e avanca", async () => {
    const { flow, tables } = setup();
    const result = await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput(),
    });
    expect(result.ok).toBe(true);
    expect(tables.pacientes.rows).toHaveLength(1);
    expect(tables.atendimentos.rows).toHaveLength(1);
    expect(tables.triagens.rows).toHaveLength(1);
    expect(result.atendimento.status_id).toBe("status-wait-consult");
  });

  it("2. reutiliza paciente existente e cria atendimento quando nao ha ativo", async () => {
    const existing = {
      id: "patient-real",
      nome: "TESTE_REAL",
      cpf: "111.222.333-44",
      cartao_sus: null,
    };
    const { flow, tables } = setup({ tables: { pacientes: { rows: [existing] } } });
    const result = await flow.run({
      patientLocal: makePatientLocal({ sus: "" }),
      triageInput: makeTriageInput(),
    });
    expect(result.paciente.id).toBe("patient-real");
    expect(tables.pacientes.rows).toHaveLength(1);
    expect(tables.atendimentos.rows).toHaveLength(1);
  });

  it("3. reutiliza atendimento ativo existente", async () => {
    const { flow, tables } = setup({
      tables: {
        pacientes: { rows: [{ id: "patient-real", cpf: "111.222.333-44", cartao_sus: null }] },
        atendimentos: {
          rows: [
            {
              id: "attendance-active",
              paciente_id: "patient-real",
              status_id: "status-wait-triage",
              hora_chegada_ts: "2026-07-19T09:00:00Z",
            },
          ],
        },
      },
    });
    const result = await flow.run({
      patientLocal: makePatientLocal({ sus: "" }),
      triageInput: makeTriageInput(),
    });
    expect(result.atendimentoInicial.id).toBe("attendance-active");
    expect(tables.atendimentos.rows).toHaveLength(1);
  });

  it("4. cria novo atendimento quando o anterior esta encerrado", async () => {
    const { flow, tables } = setup({
      tables: {
        pacientes: { rows: [{ id: "patient-real", cpf: "111.222.333-44", cartao_sus: null }] },
        atendimentos: {
          rows: [
            {
              id: "attendance-old",
              paciente_id: "patient-real",
              status_id: "status-discharged",
              hora_desfecho_ts: "2026-07-19T08:00:00Z",
            },
          ],
        },
      },
    });
    await flow.run({ patientLocal: makePatientLocal({ sus: "" }), triageInput: makeTriageInput() });
    expect(tables.atendimentos.rows).toHaveLength(2);
  });

  it("5. interrompe CPF/CNS conflitante antes de criar atendimento", async () => {
    const { flow, tables } = setup({
      tables: {
        pacientes: {
          rows: [
            { id: "patient-cpf", cpf: "111.222.333-44", cartao_sus: null },
            { id: "patient-cns", cpf: null, cartao_sus: "700 0000 0000 001" },
          ],
        },
      },
    });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() })
    ).rejects.toThrow("CPF e CNS");
    expect(tables.atendimentos.rows).toHaveLength(0);
    expect(tables.triagens.rows).toHaveLength(0);
  });

  it("6. preserva identidade real quando nome digitado diverge", async () => {
    const { flow } = setup({
      tables: {
        pacientes: {
          rows: [{ id: "patient-real", nome: "TESTE_NOME_BANCO", cpf: "111.222.333-44" }],
        },
      },
    });
    const result = await flow.run({
      patientLocal: makePatientLocal({ nome: "TESTE_NOME_DIGITADO", sus: "" }),
      triageInput: makeTriageInput(),
    });
    expect(result.paciente.nome).toBe("TESTE_NOME_BANCO");
  });

  it("7. usuario sem permissao de recepcao nao cria paciente nem atendimento", async () => {
    const { flow, tables } = setup({
      auth: makeAuth({ perfis: ["Enfermeiro"], permissoes: ["triagem.classificar"] }),
    });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput(), mode: "triage" })
    ).rejects.toThrow("Paciente sem registro");
    expect(tables.pacientes.rows).toHaveLength(0);
    expect(tables.atendimentos.rows).toHaveLength(0);
  });

  it("8. triagem sem paciente real orienta recepcao", async () => {
    const { flow } = setup({ auth: nurseOnlyAuth() });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput(), mode: "triage" })
    ).rejects.toThrow("Solicite a Recepcao");
  });

  it("9. triagem sem atendimento real nao cria atendimento implicitamente", async () => {
    const { flow, tables } = setup({
      auth: nurseOnlyAuth(),
      tables: { pacientes: { rows: [{ id: "patient-real", cpf: "111.222.333-44" }] } },
    });
    await expect(
      flow.run({
        patientLocal: makePatientLocal({ sus: "" }),
        triageInput: makeTriageInput(),
        mode: "triage",
      })
    ).rejects.toThrow("Atendimento nao encontrado");
    expect(tables.atendimentos.rows).toHaveLength(0);
  });

  it("10. enfermeiro autorizado registra triagem com atendimento real", async () => {
    const { flow, tables } = setup({
      auth: nurseOnlyAuth(),
      tables: {
        pacientes: { rows: [{ id: "patient-real", cpf: "111.222.333-44" }] },
        atendimentos: {
          rows: [
            {
              id: "attendance-active",
              paciente_id: "patient-real",
              status_id: "status-wait-triage",
            },
          ],
        },
      },
    });
    const result = await flow.run({
      patientLocal: makePatientLocal({ sus: "" }),
      triageInput: makeTriageInput(),
      mode: "triage",
    });
    expect(result.ok).toBe(true);
    expect(tables.triagens.rows).toHaveLength(1);
  });

  it("11. tecnico em enfermagem segue regra atual e pode classificar", async () => {
    const { flow } = setup({
      auth: techOnlyAuth(),
      tables: {
        pacientes: { rows: [{ id: "patient-real", cpf: "111.222.333-44" }] },
        atendimentos: {
          rows: [
            {
              id: "attendance-active",
              paciente_id: "patient-real",
              status_id: "status-wait-triage",
            },
          ],
        },
      },
    });
    await expect(
      flow.run({
        patientLocal: makePatientLocal({ sus: "" }),
        triageInput: makeTriageInput(),
        mode: "triage",
      })
    ).resolves.toMatchObject({ ok: true });
  });

  it("12. registra classificacoes sugerida e confirmada iguais", async () => {
    const { flow, tables } = setup();
    await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput({
        classificacaoSugerida: "Verde",
        classificacaoConfirmada: "Verde",
      }),
    });
    expect(tables.triagens.rows[0].classificacao_sugerida_id).toBe("risk-green");
    expect(tables.triagens.rows[0].classificacao_confirmada_id).toBe("risk-green");
  });

  it("13. registra classificacoes sugerida e confirmada diferentes", async () => {
    const { flow, tables } = setup();
    await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput({
        classificacaoSugerida: "Verde",
        classificacaoConfirmada: "Laranja",
      }),
    });
    expect(tables.triagens.rows[0].classificacao_sugerida_id).toBe("risk-green");
    expect(tables.triagens.rows[0].classificacao_confirmada_id).toBe("risk-orange");
  });

  it("14. erro ao criar paciente interrompe fluxo", async () => {
    const { flow, tables } = setup({
      tables: { pacientes: { rows: [], insertError: mockQueryError("paciente falhou") } },
    });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() })
    ).rejects.toThrow("paciente falhou");
    expect(tables.atendimentos.rows).toHaveLength(0);
  });

  it("15. erro ao criar atendimento nao afirma criacao", async () => {
    const { flow, tables } = setup({
      tables: { atendimentos: { rows: [], insertError: mockQueryError("atendimento falhou") } },
    });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() })
    ).rejects.toThrow("atendimento falhou");
    expect(tables.triagens.rows).toHaveLength(0);
  });

  it("16. erro ao inserir triagem nao avanca atendimento falsamente", async () => {
    const { flow, tables } = setup({
      tables: { triagens: { rows: [], insertError: mockQueryError("triagem falhou") } },
    });
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() })
    ).rejects.toThrow("triagem falhou");
    expect(tables.atendimentos.rows[0].status_id).toBe("status-wait-triage");
  });

  it("17. erro ao atualizar atendimento indica falha parcial", async () => {
    const { flow } = setup({
      tables: {
        atendimentos: { rows: [], updateError: mockQueryError("update atendimento falhou") },
      },
    });
    const result = await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput(),
    });
    expect(result.ok).toBe(false);
    expect(result.falhaParcial).toBe(true);
  });

  it("18. chamada duplicada nao cria dois atendimentos ativos", async () => {
    const { flow, tables } = setup();
    await flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() });
    await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput({ horaFimTs: "2026-07-19T10:09:00Z" }),
    });
    expect(tables.atendimentos.rows).toHaveLength(1);
  });

  it("19. fluxo duas vezes nao duplica paciente nem atendimento e atualiza triagem", async () => {
    const { flow, tables } = setup();
    await flow.run({ patientLocal: makePatientLocal(), triageInput: makeTriageInput() });
    await flow.run({
      patientLocal: makePatientLocal(),
      triageInput: makeTriageInput({ classificacaoConfirmada: "Vermelho" }),
    });
    expect(tables.pacientes.rows).toHaveLength(1);
    expect(tables.atendimentos.rows).toHaveLength(1);
    expect(tables.triagens.rows).toHaveLength(1);
    expect(tables.triagens.rows[0].classificacao_confirmada_id).toBe("risk-red");
  });

  it("20. payload incompleto gera erro controlado", async () => {
    const { flow } = setup();
    await expect(
      flow.run({ patientLocal: makePatientLocal(), triageInput: { classificacaoSugerida: "Azul" } })
    ).rejects.toThrow("confirmada");
  });
});
