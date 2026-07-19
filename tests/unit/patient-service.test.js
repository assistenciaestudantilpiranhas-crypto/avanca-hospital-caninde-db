import { describe, expect, it } from "vitest";
import { createPatientService } from "../../src/patients/patient-service.js";
import { otherPatientReal, patientLocal, patientReal } from "../fixtures/patients.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";

describe("patient service", () => {
  it("finds patient by CPF", async () => {
    const { client } = createMockSupabaseQuery({ pacientes: { rows: [patientReal] } });
    await expect(createPatientService(client).findBy("cpf", patientReal.cpf)).resolves.toEqual(
      patientReal
    );
  });
  it("finds patient by CNS", async () => {
    const { client } = createMockSupabaseQuery({ pacientes: { rows: [patientReal] } });
    await expect(
      createPatientService(client).findBy("cartao_sus", patientReal.cartao_sus)
    ).resolves.toEqual(patientReal);
  });
  it("returns null without identity", async () => {
    const { client } = createMockSupabaseQuery({ pacientes: { rows: [patientReal] } });
    await expect(createPatientService(client).findBy("cpf", "")).resolves.toBeNull();
  });
  it("reuses existing patient by CPF and does not insert", async () => {
    const { client, calls } = createMockSupabaseQuery({ pacientes: { rows: [patientReal] } });
    const result = await createPatientService(client).createFromLocal(patientLocal);
    expect(result._alreadyExisted).toBe(true);
    expect(calls.some((call) => call.state.operation === "insert")).toBe(false);
  });
  it("creates new patient when no duplicate exists", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { rows: [], insertResult: [patientReal] },
    });
    await expect(createPatientService(client).createFromLocal(patientLocal)).resolves.toEqual(
      patientReal
    );
  });
  it("throws query error", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { error: mockQueryError("query failed") },
    });
    await expect(createPatientService(client).findBy("cpf", patientReal.cpf)).rejects.toThrow(
      "query failed"
    );
  });
  it("throws insert error", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { rows: [], insertError: mockQueryError("insert failed") },
    });
    await expect(createPatientService(client).createFromLocal(patientLocal)).rejects.toThrow(
      "insert failed"
    );
  });
  it("throws update error", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { updateError: mockQueryError("update failed") },
    });
    await expect(
      createPatientService(client).updateFromLocal(
        { pacienteSupabaseId: patientReal.id },
        patientLocal
      )
    ).rejects.toThrow("update failed");
  });
  it("throws on multiple unexpected records", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { rows: [patientReal, { ...patientReal, id: "p2" }] },
    });
    await expect(createPatientService(client).findBy("cpf", patientReal.cpf)).rejects.toThrow(
      "Mais de um"
    );
  });
  it("throws on CPF/CNS conflict", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: {
        rows: [
          { ...patientReal, cartao_sus: "OUTRO_CNS" },
          { ...otherPatientReal, cartao_sus: patientLocal.sus },
        ],
      },
    });
    await expect(createPatientService(client).findDuplicate(patientLocal)).rejects.toThrow(
      "CPF e CNS"
    );
  });
  it("updates existing patient preserving real id", async () => {
    const { client } = createMockSupabaseQuery({ pacientes: { updateResult: [patientReal] } });
    const result = await createPatientService(client).updateFromLocal(
      { pacienteSupabaseId: patientReal.id },
      patientLocal
    );
    expect(result.id).toBe(patientReal.id);
  });
  it("creates when updating local patient without Supabase id", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { rows: [], insertResult: [patientReal] },
    });
    await expect(createPatientService(client).updateFromLocal({}, patientLocal)).resolves.toEqual(
      patientReal
    );
  });
});
