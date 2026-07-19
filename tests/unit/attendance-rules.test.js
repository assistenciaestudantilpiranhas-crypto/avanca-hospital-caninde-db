import { describe, expect, it, vi } from "vitest";
import {
  ACTIVE_ATTENDANCE_STATUS_CODES,
  buildInitialAttendancePayload,
  canCreateNewAttendance,
  isActiveAttendance,
  normalizeAttendanceResult,
  selectMostRecentActiveAttendance,
} from "../../src/attendances/attendance-rules.js";
import { activeAttendance, activeStatus, closedAttendance } from "../fixtures/attendances.js";
import { patientLocal, patientReal } from "../fixtures/patients.js";

describe("attendance rules", () => {
  it("defines active status codes", () =>
    expect(ACTIVE_ATTENDANCE_STATUS_CODES).toContain("aguardando_triagem"));
  it("identifies active attendance by status code", () =>
    expect(isActiveAttendance(activeAttendance)).toBe(true));
  it("does not treat concluded attendance as active", () =>
    expect(isActiveAttendance(closedAttendance)).toBe(false));
  it("handles empty attendance", () => expect(isActiveAttendance(null)).toBe(false));
  it("identifies active attendance by status id", () =>
    expect(isActiveAttendance({ status_id: activeStatus.id }, [activeStatus.id])).toBe(true));
  it("selects most recent active attendance", () => {
    const older = { ...activeAttendance, id: "old", hora_chegada_ts: "2026-01-01T00:00:00.000Z" };
    expect(selectMostRecentActiveAttendance([older, activeAttendance]).id).toBe(
      activeAttendance.id
    );
  });
  it("returns null for empty list", () => expect(selectMostRecentActiveAttendance([])).toBeNull());
  it("prevents duplicate when active exists", () =>
    expect(canCreateNewAttendance([activeAttendance])).toBe(false));
  it("allows new when only closed exists", () =>
    expect(canCreateNewAttendance([closedAttendance])).toBe(true));
  it("builds initial attendance payload", () => {
    expect(buildInitialAttendancePayload(patientReal, patientLocal, activeStatus.id)).toMatchObject(
      {
        paciente_id: patientReal.id,
        status_id: activeStatus.id,
        etapa_atual: "Aguardando triagem",
      }
    );
  });
  it("uses current timestamp when local timestamp is missing", () => {
    vi.setSystemTime(new Date("2026-07-19T13:00:00.000Z"));
    expect(buildInitialAttendancePayload(patientReal, {}, activeStatus.id).hora_chegada_ts).toBe(
      "2026-07-19T13:00:00.000Z"
    );
  });
  it("requires patient id and status id", () => {
    expect(() => buildInitialAttendancePayload({}, {}, activeStatus.id)).toThrow("Paciente");
    expect(() => buildInitialAttendancePayload(patientReal, {}, null)).toThrow("Status");
  });
  it("normalizes attendance result", () =>
    expect(normalizeAttendanceResult(activeAttendance).atendimentoSupabaseId).toBe(
      activeAttendance.id
    ));
  it("rejects incomplete attendance result", () =>
    expect(() => normalizeAttendanceResult({})).toThrow("sem id"));
});
