import { describe, expect, it } from "vitest";

describe("QA smoke environment", () => {
  it("executes Vitest with jsdom available", () => {
    document.body.innerHTML = '<main id="appContent"></main>';

    expect(document.querySelector("#appContent")).not.toBeNull();
    expect(window.document).toBe(document);
  });

  it("uses and clears localStorage through the test setup", () => {
    localStorage.setItem("TESTE_QA_SMOKE", "ok");

    expect(localStorage.getItem("TESTE_QA_SMOKE")).toBe("ok");
  });

  it("starts each test with clean localStorage", () => {
    expect(localStorage.getItem("TESTE_QA_SMOKE")).toBeNull();
  });
});
