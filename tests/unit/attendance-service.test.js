import { describe, expect, it } from "vitest";
import { createAttendanceService } from "../../src/attendances/attendance-service.js";
import { activeAttendance, activeStatus, closedAttendance } from "../fixtures/attendances.js";
import { patientLocal, patientReal } from "../fixtures/patients.js";
import { createPatientService } from "../../src/patients/patient-service.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";

function tables({
  patients = [],
  attendances = [],
  insertAttendance = activeAttendance,
  statusRows = [activeStatus],
} = {}) {
  return {
    pacientes: { rows: patients, insertResult: [patientReal] },
    dom_status_atendimento: { rows: statusRows },
    atendimentos: { rows: attendances, insertResult: [insertAttendance] },
  };
}

describe("attendance service", () => {
  it("loads active status ids", async () => {
    const { client } = createMockSupabaseQuery(tables());
    await expect(createAttendanceService(client).loadActiveStatusIds()).resolves.toEqual([
      activeStatus.id,
    ]);
  });
  it("finds active attendance by patient", async () => {
    const { client } = createMockSupabaseQuery(tables({ attendances: [activeAttendance] }));
    await expect(
      createAttendanceService(client).findActiveByPatient(patientReal.id)
    ).resolves.toEqual(activeAttendance);
  });
  it("returns null when no active attendance exists", async () => {
    const { client } = createMockSupabaseQuery(tables({ attendances: [] }));
    await expect(
      createAttendanceService(client).findActiveByPatient(patientReal.id)
    ).resolves.toBeNull();
  });
  it("creates attendance with initial status", async () => {
    const { client } = createMockSupabaseQuery(tables());
    const result = await createAttendanceService(client).createFromPatient(
      patientReal,
      patientLocal,
      activeStatus.id
    );
    expect(result.id).toBe(activeAttendance.id);
  });
  it("reuses existing active attendance", async () => {
    const { client } = createMockSupabaseQuery(tables({ attendances: [activeAttendance] }));
    const result = await createAttendanceService(client).getOrCreateActive(
      patientReal,
      patientLocal,
      activeStatus.id
    );
    expect(result.criado).toBe(false);
  });
  it("creates when previous attendance is closed", async () => {
    const { client } = createMockSupabaseQuery(tables({ attendances: [closedAttendance] }));
    const result = await createAttendanceService(client).getOrCreateActive(
      patientReal,
      patientLocal,
      activeStatus.id
    );
    expect(result.criado).toBe(true);
  });
  it("throws when patient id is missing", async () => {
    const { client } = createMockSupabaseQuery(tables());
    await expect(createAttendanceService(client).findActiveByPatient("")).rejects.toThrow(
      "Paciente"
    );
  });
  it("throws search error", async () => {
    const { client } = createMockSupabaseQuery({
      ...tables(),
      atendimentos: { error: mockQueryError("search failed") },
    });
    await expect(
      createAttendanceService(client).findActiveByPatient(patientReal.id)
    ).rejects.toThrow("search failed");
  });
  it("throws insert error", async () => {
    const { client } = createMockSupabaseQuery({
      ...tables(),
      atendimentos: { insertError: mockQueryError("insert failed") },
    });
    await expect(
      createAttendanceService(client).createFromPatient(patientReal, patientLocal, activeStatus.id)
    ).rejects.toThrow("insert failed");
  });
  it("throws when active status domain is empty", async () => {
    const { client } = createMockSupabaseQuery(tables({ statusRows: [] }));
    await expect(
      createAttendanceService(client).findActiveByPatient(patientReal.id)
    ).rejects.toThrow("Nenhum status");
  });
  it("distinguishes local and Supabase attendance by normalized id", async () => {
    const { client } = createMockSupabaseQuery(tables());
    const result = await createAttendanceService(client).createFromPatient(
      patientReal,
      patientLocal,
      activeStatus.id
    );
    expect(result.atendimentoSupabaseId).toBe(result.id);
  });
});

describe("integrated patient and attendance scenarios", () => {
  it("creates new patient and exactly one attendance", async () => {
    const { client, calls } = createMockSupabaseQuery(tables());
    const patient = await createPatientService(client).createFromLocal(patientLocal);
    const attendance = await createAttendanceService(client).getOrCreateActive(
      patient,
      patientLocal,
      activeStatus.id
    );
    expect(attendance.criado).toBe(true);
    expect(
      calls.filter((call) => call.table === "atendimentos" && call.state.operation === "insert")
    ).toHaveLength(1);
  });
  it("reuses existing patient by CPF and creates attendance", async () => {
    const { client } = createMockSupabaseQuery(tables({ patients: [patientReal] }));
    const patient = await createPatientService(client).createFromLocal(patientLocal);
    const attendance = await createAttendanceService(client).getOrCreateActive(
      patient,
      patientLocal,
      activeStatus.id
    );
    expect(patient._alreadyExisted).toBe(true);
    expect(attendance.criado).toBe(true);
  });
  it("reuses existing patient by CNS preserving identity", async () => {
    const { client } = createMockSupabaseQuery(
      tables({ patients: [{ ...patientReal, cpf: null }] })
    );
    const patient = await createPatientService(client).createFromLocal({
      ...patientLocal,
      cpf: "",
    });
    expect(patient.nome).toBe(patientReal.nome);
  });
  it("reuses active attendance for existing patient", async () => {
    const { client } = createMockSupabaseQuery(
      tables({ patients: [patientReal], attendances: [activeAttendance] })
    );
    const patient = await createPatientService(client).createFromLocal(patientLocal);
    const attendance = await createAttendanceService(client).getOrCreateActive(
      patient,
      patientLocal,
      activeStatus.id
    );
    expect(attendance.criado).toBe(false);
  });
  it("allows new attendance after previous concluded attendance", async () => {
    const { client } = createMockSupabaseQuery(
      tables({ patients: [patientReal], attendances: [closedAttendance] })
    );
    const attendance = await createAttendanceService(client).getOrCreateActive(
      patientReal,
      patientLocal,
      activeStatus.id
    );
    expect(attendance.criado).toBe(true);
  });
  it("does not create wrong patient on duplicate conflict", async () => {
    const { otherPatientReal } = await import("../fixtures/patients.js");
    const { client } = createMockSupabaseQuery({
      ...tables(),
      pacientes: {
        rows: [
          { ...patientReal, cartao_sus: "OUTRO_CNS" },
          { ...otherPatientReal, cartao_sus: patientLocal.sus },
        ],
      },
    });
    await expect(createPatientService(client).createFromLocal(patientLocal)).rejects.toThrow(
      "CPF e CNS"
    );
  });
  it("does not pretend attendance was created after insert failure", async () => {
    const { client } = createMockSupabaseQuery({
      ...tables(),
      atendimentos: { rows: [], insertError: mockQueryError("attendance insert failed") },
    });
    await expect(
      createAttendanceService(client).getOrCreateActive(patientReal, patientLocal, activeStatus.id)
    ).rejects.toThrow("attendance insert failed");
  });
  it("propagates Supabase failure without false success", async () => {
    const { client } = createMockSupabaseQuery({
      pacientes: { error: mockQueryError("supabase failed") },
    });
    await expect(createPatientService(client).createFromLocal(patientLocal)).rejects.toThrow(
      "supabase failed"
    );
  });
});
