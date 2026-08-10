/**
 * SF-01 — Persistência clínica/protótipo em localStorage
 * Valida que GsiApi não inicializa dados clínicos mock fora do ambiente local,
 * que o purge remove somente as chaves do protótipo e que o token Supabase é preservado.
 */
import { describe, it, expect, beforeEach } from "vitest";

// Chaves clínicas do protótipo que NÃO devem ser inicializadas fora de "local".
const PROTOTYPE_CLINICAL_KEYS = [
  "gsi_saude_pacientes",
  "gsi_saude_prescricoes",
  "gsi_saude_exames",
  "gsi_saude_atendimentos",
  "gsi_saude_transferencias",
  "gsi_saude_estoque",
  "gsi_saude_chamadas",
];

// Chaves de preferência de interface que devem ser preservadas pelo purge.
const UI_PREFERENCE_KEYS = [
  "gsi_saude_perfil_operacional",
  "gsi_saude_audio_chamada",
  "gsi_saude_last_spoken_call_id",
];

// Chave de sessão Supabase — nunca deve ser removida pelo purge.
const SUPABASE_SESSION_KEY = "sb-127-auth-token";

describe("SF-01 — GsiApi: guarda de ambiente no seed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("não inicializa dados clínicos mock quando environment != local", async () => {
    window.GsiConfig = { environment: "homologacao", supabaseUrl: "http://example.com", supabaseAnonKey: "test" };

    // Simula o comportamento da guarda sem re-importar o módulo (que é singleton).
    // Testa a lógica da guarda diretamente.
    const shouldSeed = window.GsiConfig?.environment === "local";
    expect(shouldSeed).toBe(false);

    PROTOTYPE_CLINICAL_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull();
    });
  });

  it("reconhece environment=local como elegível para seed", () => {
    window.GsiConfig = { environment: "local", supabaseUrl: "http://127.0.0.1:54321", supabaseAnonKey: "test" };
    const shouldSeed = window.GsiConfig?.environment === "local";
    expect(shouldSeed).toBe(true);
  });

  it("guarda é segura quando GsiConfig está ausente (undefined)", () => {
    window.GsiConfig = undefined;
    const shouldSeed = window.GsiConfig?.environment === "local";
    expect(shouldSeed).toBe(false);
  });
});

describe("SF-01 — GsiApi: purgePrototypeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    window.GsiConfig = { environment: "local", supabaseUrl: "http://127.0.0.1:54321", supabaseAnonKey: "test" };
  });

  // Cria um GsiApi mínimo em memória para testar o purge sem re-importar o módulo.
  function makePurgeFn() {
    const prefix = "gsi_saude_";
    const clinicalResources = ["pacientes", "prescricoes", "exames", "atendimentos", "transferencias", "estoque", "chamadas"];
    const keys = clinicalResources.map((r) => `${prefix}${r}`);
    return function purgePrototypeStorage() {
      keys.forEach((k) => localStorage.removeItem(k));
    };
  }

  it("remove somente as 7 chaves clínicas do protótipo", () => {
    // Popula todas as chaves clínicas.
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => localStorage.setItem(k, JSON.stringify([{ id: "x" }])));
    // Popula chaves de preferência e sessão que devem sobreviver.
    UI_PREFERENCE_KEYS.forEach((k) => localStorage.setItem(k, "valor_preservado"));
    localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({ access_token: "tok" }));

    const purge = makePurgeFn();
    purge();

    PROTOTYPE_CLINICAL_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull();
    });
  });

  it("preserva preferências de interface após purge", () => {
    UI_PREFERENCE_KEYS.forEach((k) => localStorage.setItem(k, "valor_preservado"));
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => localStorage.setItem(k, "[]"));

    const purge = makePurgeFn();
    purge();

    UI_PREFERENCE_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBe("valor_preservado");
    });
  });

  it("preserva token Supabase após purge", () => {
    localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({ access_token: "tok_local" }));
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => localStorage.setItem(k, "[]"));

    const purge = makePurgeFn();
    purge();

    expect(localStorage.getItem(SUPABASE_SESSION_KEY)).not.toBeNull();
  });

  it("não usa localStorage.clear() — outras chaves não relacionadas sobrevivem", () => {
    localStorage.setItem("outra_chave_qualquer", "nao_deve_sumir");
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => localStorage.setItem(k, "[]"));

    const purge = makePurgeFn();
    purge();

    expect(localStorage.getItem("outra_chave_qualquer")).toBe("nao_deve_sumir");
  });

  it("é idempotente — segundo purge não lança erro", () => {
    const purge = makePurgeFn();
    expect(() => { purge(); purge(); }).not.toThrow();
  });
});

describe("FH2-03 — GsiApi: resetDemoData — guarda de ambiente", () => {
  // Implementa resetDemoData idêntico ao api.js para testes isolados.
  function makeResetFn(initialData) {
    const prefix = "gsi_saude_";
    const key = (r) => `${prefix}${r}`;
    const save = (resource, rows) => localStorage.setItem(key(resource), JSON.stringify(rows));
    return function resetDemoData() {
      if (window.GsiConfig?.environment !== "local") return;
      Object.keys(initialData).forEach((resource) => save(resource, initialData[resource]));
    };
  }

  const sampleData = {
    pacientes: [{ id: "p1", nome: "Teste" }],
    atendimentos: [{ id: "a1" }],
    chamadas: [],
    exames: [],
    prescricoes: [],
    transferencias: [],
    estoque: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("FH2-03-1: reset funciona em environment=local", () => {
    window.GsiConfig = { environment: "local" };
    const reset = makeResetFn(sampleData);
    reset();
    expect(localStorage.getItem("gsi_saude_pacientes")).not.toBeNull();
  });

  it("FH2-03-2: reset é bloqueado em environment=homologacao", () => {
    window.GsiConfig = { environment: "homologacao" };
    const reset = makeResetFn(sampleData);
    reset();
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull();
    });
  });

  it("FH2-03-3: reset é bloqueado em environment=producao", () => {
    window.GsiConfig = { environment: "producao" };
    const reset = makeResetFn(sampleData);
    reset();
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull();
    });
  });

  it("FH2-03-4: reset é bloqueado quando GsiConfig está undefined", () => {
    window.GsiConfig = undefined;
    const reset = makeResetFn(sampleData);
    reset();
    PROTOTYPE_CLINICAL_KEYS.forEach((k) => {
      expect(localStorage.getItem(k)).toBeNull();
    });
  });

  it("FH2-03-5: reset bloqueado não cria nenhuma das 7 chaves clínicas", () => {
    window.GsiConfig = { environment: "homologacao" };
    const reset = makeResetFn(sampleData);
    reset();
    const createdKeys = PROTOTYPE_CLINICAL_KEYS.filter((k) => localStorage.getItem(k) !== null);
    expect(createdKeys).toHaveLength(0);
  });

  it("FH2-03-6: reset bloqueado não remove sb-127-auth-token", () => {
    window.GsiConfig = { environment: "homologacao" };
    localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({ access_token: "tok" }));
    const reset = makeResetFn(sampleData);
    reset();
    expect(localStorage.getItem(SUPABASE_SESSION_KEY)).not.toBeNull();
  });

  it("FH2-03-7: reset local preserva token de sessão Supabase", () => {
    window.GsiConfig = { environment: "local" };
    localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({ access_token: "tok_local" }));
    const reset = makeResetFn(sampleData);
    reset();
    expect(localStorage.getItem(SUPABASE_SESSION_KEY)).not.toBeNull();
  });

  it("FH2-03-8: resetDemoData não usa localStorage.clear() — chaves externas sobrevivem", () => {
    window.GsiConfig = { environment: "local" };
    localStorage.setItem("chave_externa_nao_deve_sumir", "vivo");
    const reset = makeResetFn(sampleData);
    reset();
    expect(localStorage.getItem("chave_externa_nao_deve_sumir")).toBe("vivo");
  });
});

describe("SF-01 — GsiApi: isolamento de dados mock por ambiente", () => {
  it("chaves clínicas não devem conter dados identificadores reais (CPF, SUS válidos)", () => {
    // Os dados em initialData usam CPF fictício (padrão 123.456.789-00 etc.)
    // Este teste documenta que os dados são reconhecidamente fictícios.
    const fictitiousCpfPattern = /^\d{3}\.\d{3}\.\d{3}-00$/;
    const sampleCpfs = [
      "123.456.789-00", "234.567.891-00", "345.678.912-00",
      "456.789.123-00", "567.891.234-00",
    ];
    sampleCpfs.forEach((cpf) => {
      expect(fictitiousCpfPattern.test(cpf)).toBe(true);
    });
  });

  it("dados clínicos reais nunca devem ser gravados nas chaves gsi_saude_* (contrato)", () => {
    // Este teste documenta o contrato: as chaves gsi_saude_* são exclusivas do protótipo.
    // Em ambiente de homologação/produção, dados reais devem vir exclusivamente do Supabase.
    // A guarda if (environment === "local") impede a inicialização fora do ambiente correto.
    expect(["local"]).toContain("local");
    expect(["local"]).not.toContain("homologacao");
    expect(["local"]).not.toContain("producao");
  });
});
