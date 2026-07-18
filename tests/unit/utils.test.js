import { describe, expect, it, vi } from "vitest";
import {
  calculateAge,
  escapeHtml,
  formatDateBR,
  formatElapsed,
  formatWaitTime,
  minutesFromClock,
  normalizeText,
  numericFromText,
} from "../../src/shared/utils.js";

describe("shared utils", () => {
  it("normalizes accents, spaces and case", () => {
    expect(normalizeText("  Canindé de São Francisco  ")).toBe("caninde de sao francisco");
  });

  it("normalizes null and undefined like the legacy String conversion", () => {
    expect(normalizeText(null)).toBe("null");
    expect(normalizeText(undefined)).toBe("");
  });

  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml("<b>TESTE_1 & 'x'</b>")).toBe("&lt;b&gt;TESTE_1 &amp; &#39;x&#39;&lt;/b&gt;");
  });

  it("formats ISO date as Brazilian date", () => {
    expect(formatDateBR("2026-07-18")).toBe("18/07/2026");
  });

  it("returns original invalid date text", () => {
    expect(formatDateBR("18/07/2026")).toBe("18/07/2026");
  });

  it("parses decimal number with comma", () => {
    expect(numericFromText("37,5")).toBe(37.5);
  });

  it("returns null for invalid numeric text", () => {
    expect(numericFromText("abc")).toBeNull();
  });

  it("converts clock text to minutes", () => {
    expect(minutesFromClock("02:15")).toBe(135);
  });

  it("returns null for invalid clock text", () => {
    expect(minutesFromClock("agora")).toBeNull();
  });

  it("calculates age after birthday", () => {
    vi.setSystemTime(new Date(2026, 6, 18));

    expect(calculateAge("17/07/2000")).toBe(26);
  });

  it("calculates age before birthday", () => {
    vi.setSystemTime(new Date(2026, 6, 18));

    expect(calculateAge("19/07/2000")).toBe(25);
  });

  it("formats elapsed milliseconds as hh:mm", () => {
    expect(formatElapsed(90 * 60000)).toBe("01:30");
  });

  it("uses fallback when wait start timestamp is invalid", () => {
    expect(formatWaitTime(null, "00:10")).toBe("00:10");
  });
});
