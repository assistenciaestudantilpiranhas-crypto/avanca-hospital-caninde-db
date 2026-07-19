import { describe, expect, it } from "vitest";
import { createTriageService } from "../../src/triage/triage-service.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";
import { makeTables, makeTriageInput } from "../fixtures/triage.js";

function setup(overrides = {}) {
  const mock = createMockSupabaseQuery(makeTables(overrides));
  return { ...mock, service: createTriageService(mock.client, { usuario: { id: "user-nurse" } }) };
}

describe("triage service", () => {
  it("localiza classificacao sugerida", async () => {
    const { service } = setup();
    await expect(service.findRiskClassification("Amarelo")).resolves.toMatchObject({
      id: "risk-yellow",
    });
  });

  it("falha quando classificacao nao existe", async () => {
    const { service } = setup();
    await expect(service.findRiskClassification("Roxo")).rejects.toThrow(
      "Classificacao de risco invalida"
    );
  });

  it("localiza status final aguardando_consulta", async () => {
    const { service } = setup();
    await expect(service.findFinalStatus()).resolves.toMatchObject({ id: "status-wait-consult" });
  });

  it("insere triagem nova", async () => {
    const { service, tables } = setup({
      atendimentos: {
        rows: [{ id: "attendance-1", paciente_id: "patient-1", status_id: "status-wait-triage" }],
      },
    });
    const result = await service.register(makeTriageInput());
    expect(result.ok).toBe(true);
    expect(result.triagemCriada ?? result.criada).toBe(true);
    expect(tables.triagens.rows).toHaveLength(1);
  });

  it("atualiza triagem existente de forma idempotente", async () => {
    const { service, tables } = setup({
      triagens: {
        rows: [
          {
            id: "triage-existing",
            atendimento_id: "attendance-1",
            classificacao_sugerida_id: "risk-green",
          },
        ],
      },
    });
    const result = await service.register(makeTriageInput({ classificacaoConfirmada: "Laranja" }));
    expect(result.criada).toBe(false);
    expect(tables.triagens.rows).toHaveLength(1);
    expect(tables.triagens.rows[0].classificacao_confirmada_id).toBe("risk-orange");
  });

  it("atualiza atendimento para aguardando_consulta", async () => {
    const { service, tables } = setup({
      atendimentos: {
        rows: [{ id: "attendance-1", paciente_id: "patient-1", status_id: "status-wait-triage" }],
      },
    });
    const result = await service.register(makeTriageInput());
    expect(result.atendimento.status_id).toBe("status-wait-consult");
    expect(tables.atendimentos.rows[0].etapa_atual).toBe("Aguardando consulta");
  });

  it("persiste hora_inicio_ts e hora_fim_ts", async () => {
    const { service, tables } = setup();
    await service.register(makeTriageInput());
    expect(tables.triagens.rows[0].hora_inicio_ts).toBe("2026-07-19T10:00:00.000Z");
    expect(tables.triagens.rows[0].hora_fim_ts).toBe("2026-07-19T10:08:00.000Z");
  });

  it("propaga erro no insert da triagem", async () => {
    const { service } = setup({
      triagens: { rows: [], insertError: mockQueryError("insert triagem falhou") },
    });
    await expect(service.register(makeTriageInput())).rejects.toThrow("insert triagem falhou");
  });

  it("retorna falha parcial quando update do atendimento falha", async () => {
    const { service, tables } = setup({
      atendimentos: {
        rows: [{ id: "attendance-1", paciente_id: "patient-1" }],
        updateError: mockQueryError("update falhou"),
      },
    });
    const result = await service.register(makeTriageInput());
    expect(result.ok).toBe(false);
    expect(result.falhaParcial).toBe(true);
    expect(result.error.message).toBe("update falhou");
    expect(tables.triagens.rows).toHaveLength(1);
  });

  it("nao retorna sucesso falso quando atendimento nao e confirmado", async () => {
    const { service } = setup({ atendimentos: { rows: [], updateResult: [] } });
    const result = await service.register(makeTriageInput());
    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("atualizacao do atendimento");
  });

  it("propaga erro de consulta em dominio de classificacao", async () => {
    const { service } = setup({
      dom_classificacao_risco: { rows: [], error: mockQueryError("dominio falhou") },
    });
    await expect(service.register(makeTriageInput())).rejects.toThrow("dominio falhou");
  });
});
