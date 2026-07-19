import { describe, expect, it } from "vitest";
import {
  buildPatientPayload,
  comparePatientIdentity,
  detectPatientIdentityConflict,
  hasPatientIdentity,
  isLocalPatient,
  isRealPatient,
  mergeLocalWithRealPatient,
  normalizeCns,
  normalizeCpf,
  parseDateBRToISO,
} from "../../src/patients/patient-rules.js";
import { otherPatientReal, patientLocal, patientReal } from "../fixtures/patients.js";

describe("patient rules", () => {
  it("normalizes CPF digits", () => expect(normalizeCpf("111.222.333-44")).toBe("11122233344"));
  it("normalizes empty CPF", () => expect(normalizeCpf("")).toBe(""));
  it("normalizes CNS digits", () =>
    expect(normalizeCns("700 0000 0000 001")).toBe("70000000000001"));
  it("normalizes empty CNS", () => expect(normalizeCns(null)).toBe(""));
  it("detects patient identity values", () => {
    expect(hasPatientIdentity(" 123 ")).toBe(true);
    expect(hasPatientIdentity("")).toBe(false);
  });
  it("parses Brazilian date to ISO", () => expect(parseDateBRToISO("1/5/1990")).toBe("1990-05-01"));
  it("rejects invalid date", () => expect(parseDateBRToISO("1990-05-01")).toBeNull());
  it("builds controlled patient payload", () => {
    expect(buildPatientPayload(patientLocal)).toMatchObject({
      nome: "TESTE_PACIENTE_NOVO",
      data_nascimento: "1990-05-10",
      cpf: patientLocal.cpf,
      cartao_sus: patientLocal.sus,
    });
  });
  it("rejects invalid patient payload", () => {
    expect(() => buildPatientPayload({ ...patientLocal, nome: "" })).toThrow("Nome");
    expect(() => buildPatientPayload({ ...patientLocal, nascimento: "x" })).toThrow("Data");
  });
  it("compares CPF and CNS identifiers", () => {
    expect(comparePatientIdentity(patientLocal, patientReal)).toEqual({
      sameCpf: true,
      sameCns: true,
    });
  });
  it("detects CPF/CNS conflict between real patients", () => {
    expect(detectPatientIdentityConflict(patientReal, otherPatientReal)).toBeInstanceOf(Error);
  });
  it("does not flag conflict for same patient", () => {
    expect(detectPatientIdentityConflict(patientReal, { ...patientReal })).toBeNull();
  });
  it("preserves real identity over local divergent name", () => {
    const merged = mergeLocalWithRealPatient(
      { ...patientLocal, nome: "TESTE_DIGITADO" },
      patientReal
    );
    expect(merged.nome).toBe(patientReal.nome);
    expect(merged.pacienteSupabaseId).toBe(patientReal.id);
  });
  it("differentiates real and local patient", () => {
    expect(isRealPatient(patientReal)).toBe(true);
    expect(isLocalPatient(patientLocal)).toBe(true);
  });
  it("handles null patient merge safely", () => {
    expect(mergeLocalWithRealPatient(patientLocal, null).nome).toBe(patientLocal.nome);
  });
});
