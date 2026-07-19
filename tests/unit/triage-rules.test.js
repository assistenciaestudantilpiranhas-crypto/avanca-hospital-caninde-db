import { describe, expect, it } from "vitest";
import {
  buildTriageAttendanceUpdatePayload,
  buildTriageInsertPayload,
  isValidRiskCode,
  normalizeRiskCode,
  TRIAGE_FINAL_SECTOR,
  TRIAGE_FINAL_STAGE,
  TRIAGE_FINAL_STATUS_CODE,
  validateTriageInput,
} from "../../src/triage/triage-rules.js";
import { makeTriageInput } from "../fixtures/triage.js";

describe("triage rules", () => {
  it("normaliza classificacao com acento e caixa", () => {
    expect(normalizeRiskCode("  Amarelo ")).toBe("amarelo");
  });

  it("aceita somente classificacoes conhecidas", () => {
    expect(isValidRiskCode("Vermelho")).toBe(true);
    expect(isValidRiskCode("Roxo")).toBe(false);
  });

  it("exige paciente_id", () => {
    expect(() => validateTriageInput(makeTriageInput({ pacienteId: null }))).toThrow("Paciente");
  });

  it("exige atendimento_id", () => {
    expect(() => validateTriageInput(makeTriageInput({ atendimentoId: undefined }))).toThrow(
      "Atendimento"
    );
  });

  it("exige classificacao sugerida valida", () => {
    expect(() => validateTriageInput(makeTriageInput({ classificacaoSugerida: "Roxo" }))).toThrow(
      "sugerida"
    );
  });

  it("exige classificacao confirmada valida", () => {
    expect(() =>
      validateTriageInput(makeTriageInput({ classificacaoConfirmada: "Preto" }))
    ).toThrow("confirmada");
  });

  it("permite confirmacao diferente da sugerida", () => {
    const result = validateTriageInput(
      makeTriageInput({ classificacaoSugerida: "Verde", classificacaoConfirmada: "Amarelo" })
    );
    expect(result.classificacaoSugeridaCodigo).toBe("verde");
    expect(result.classificacaoConfirmadaCodigo).toBe("amarelo");
  });

  it("exige hora de inicio", () => {
    expect(() => validateTriageInput(makeTriageInput({ horaInicioTs: null }))).toThrow("inicio");
  });

  it("exige hora de fim", () => {
    expect(() => validateTriageInput(makeTriageInput({ horaFimTs: null }))).toThrow("fim");
  });

  it("bloqueia fim anterior ao inicio", () => {
    expect(() =>
      validateTriageInput(
        makeTriageInput({ horaInicioTs: "2026-07-19T10:00:00Z", horaFimTs: "2026-07-19T09:59:00Z" })
      )
    ).toThrow("anteceder");
  });

  it("retorna status, etapa e setor finais coerentes", () => {
    const result = validateTriageInput(makeTriageInput());
    expect(result.statusFinalCodigo).toBe(TRIAGE_FINAL_STATUS_CODE);
    expect(result.etapaAtual).toBe(TRIAGE_FINAL_STAGE);
    expect(result.setorAtual).toBe(TRIAGE_FINAL_SECTOR);
  });

  it("trata payload null como incompleto", () => {
    expect(() => validateTriageInput(null)).toThrow("incompleto");
  });

  it("monta payload de insert com ids reais e usuario", () => {
    const payload = buildTriageInsertPayload(
      {
        ...makeTriageInput(),
        classificacaoSugeridaId: "risk-yellow",
        classificacaoConfirmadaId: "risk-orange",
      },
      { id: "user-nurse" }
    );
    expect(payload).toMatchObject({
      atendimento_id: "attendance-1",
      profissional_id: "user-nurse",
      classificacao_sugerida_id: "risk-yellow",
      classificacao_confirmada_id: "risk-orange",
      updated_by: "user-nurse",
    });
  });

  it("bloqueia payload de insert sem classificacao existente", () => {
    expect(() => buildTriageInsertPayload(makeTriageInput(), null)).toThrow("sugerida");
  });

  it("monta payload de atualizacao do atendimento", () => {
    expect(
      buildTriageAttendanceUpdatePayload({
        statusId: "status-wait-consult",
        classificacaoId: "risk-yellow",
      })
    ).toEqual({
      status_id: "status-wait-consult",
      classificacao_risco_id: "risk-yellow",
      etapa_atual: "Aguardando consulta",
      setor_atual: "Consulta medica",
    });
  });
});
