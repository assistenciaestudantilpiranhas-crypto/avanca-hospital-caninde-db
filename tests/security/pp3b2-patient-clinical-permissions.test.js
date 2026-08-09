/**
 * Testes de seguranca — PP3-B.2: Permissoes clinicas das 4 tabelas de dados persistentes
 * GSI ONE | Migration 20260809000001_pp3b2_patient_clinical_permissions_and_rls
 *
 * Valida via banco local (127.0.0.1:54322) e via inspecao estatica da migration que:
 *
 *   Suite 1  — 6 permissoes novas declaradas e criadas
 *   Suite 2  — Matriz exata de vinculos por perfil (leitura)
 *   Suite 3  — Matriz exata de vinculos por perfil (escrita)
 *   Suite 4  — Perfis sem acesso de leitura (Recepcao, Gestao, Leitura/Gestor, TEN-RX, Regulacao)
 *   Suite 5  — SELECT policies das 4 tabelas: estrutura e predicados
 *   Suite 6  — Filtro ativo=true no ramo operacional
 *   Suite 7  — Filtro paciente pai (deleted_at IS NULL) no ramo operacional
 *   Suite 8  — Admin e Auditoria fora dos filtros operacionais
 *   Suite 9  — is_linked_user() removido das 4 novas SELECT policies
 *   Suite 10 — INSERT/UPDATE de medicamentos e alertas: proxy removido
 *   Suite 11 — INSERT/UPDATE de alergias e comorbidades: sem regressao
 *   Suite 12 — Tabelas fora das 4 nao afetadas
 *   Suite 13 — Inspecao estatica da migration (sem banco local)
 *   Suite 14 — Inspecao estatica do rollback
 *   Suite 15 — Guardiao de drift: deteccao de desvio
 *
 * Pre-condicao para suites 1-12: banco local com todas as migrations ate
 * 20260809000001 aplicadas (npx.cmd supabase db reset).
 * Suites 13-14: apenas leitura de arquivo, sem banco.
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
} from "../helpers/local-supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Verificacao de ambiente (banco local)
// ---------------------------------------------------------------------------
let SUITE_SKIP_REASON = null;

try {
  assertLocalOnlyStatus(loadLocalSupabaseStatus());
} catch (e) {
  SUITE_SKIP_REASON = `Ambiente Supabase local indisponivel: ${e.message}`;
}

const cit = (name, fn) =>
  it(name, async (ctx) => {
    if (SUITE_SKIP_REASON) ctx.skip(SUITE_SKIP_REASON);
    await fn(ctx);
  });

// ---------------------------------------------------------------------------
// Inspecao estatica: carrega migration e rollback como texto
// ---------------------------------------------------------------------------
const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260809000001_pp3b2_patient_clinical_permissions_and_rls.sql"
);
const ROLLBACK_PATH = resolve(
  __dirname,
  "../../supabase/rollback/20260809000001_pp3b2_patient_clinical_permissions_and_rls_rollback.sql"
);

let migrationSql = "";
let rollbackSql = "";

try {
  migrationSql = readFileSync(MIGRATION_PATH, "utf8");
} catch {
  migrationSql = "";
}
try {
  rollbackSql = readFileSync(ROLLBACK_PATH, "utf8");
} catch {
  rollbackSql = "";
}

// ---------------------------------------------------------------------------
// Helpers de inspecao estatica
// ---------------------------------------------------------------------------

/**
 * Remove comentarios de linha SQL (-- ...) retornando apenas SQL ativo.
 * Preserva strings entre aspas simples para nao cortar valores literais.
 */
function stripLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => {
      // Remove tudo apos '--' que nao esteja dentro de uma string 'quoted'
      const result = [];
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "'" && !inString) { inString = true; result.push(line[i]); continue; }
        if (line[i] === "'" && inString) {
          // escaped '' inside PL/pgSQL string
          if (line[i + 1] === "'") { result.push("''"); i++; continue; }
          inString = false; result.push(line[i]); continue;
        }
        if (!inString && line[i] === "-" && line[i + 1] === "-") break;
        result.push(line[i]);
      }
      return result.join("");
    })
    .join("\n");
}

/**
 * Extrai o bloco SQL ativo de CREATE POLICY <name> ate (exclusive) o proximo
 * COMMENT ON POLICY, CREATE POLICY ou DROP POLICY. Retorna string vazia se nao
 * encontrar o inicio. Case-insensitive.
 */
function extractCreatePolicyBlock(sql, policyName) {
  const lower = sql.toLowerCase();
  const startMarker = `create policy ${policyName.toLowerCase()}`;
  const startIdx = lower.indexOf(startMarker);
  if (startIdx === -1) return "";
  // Busca o proximo delimitador apos o inicio
  const after = lower.slice(startIdx + startMarker.length);
  const delimiters = [
    after.indexOf("\ncreate policy "),
    after.indexOf("\ndrop policy "),
    after.indexOf("\ncomment on policy "),
  ].filter((i) => i !== -1);
  const endOffset = delimiters.length > 0 ? Math.min(...delimiters) : after.length;
  return sql.slice(startIdx, startIdx + startMarker.length + endOffset);
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FOUR_TABLES = [
  "paciente_alergias",
  "paciente_comorbidades",
  "paciente_medicamentos_continuos",
  "paciente_alertas_clinicos",
];

const NEW_SELECT_POLICIES = [
  { table: "paciente_alergias",               policy: "paciente_alergias_select_clinico",               perm: "paciente.alergia.visualizar" },
  { table: "paciente_comorbidades",           policy: "paciente_comorbidades_select_clinico",            perm: "paciente.comorbidade.visualizar" },
  { table: "paciente_medicamentos_continuos", policy: "paciente_medicamentos_continuos_select_clinico",  perm: "paciente.medicamento_continuo.visualizar" },
  { table: "paciente_alertas_clinicos",       policy: "paciente_alertas_clinicos_select_clinico",        perm: "paciente.alerta_clinico.visualizar" },
];

const OLD_SELECT_POLICIES = FOUR_TABLES.map(t => `${t}_select_linked`);

/** Permissoes de leitura criadas por esta migration. */
const READ_PERMS = [
  "paciente.alergia.visualizar",
  "paciente.comorbidade.visualizar",
  "paciente.medicamento_continuo.visualizar",
  "paciente.alerta_clinico.visualizar",
];

/** Permissoes de escrita criadas por esta migration. */
const WRITE_PERMS = [
  "paciente.medicamento_continuo.registrar",
  "paciente.alerta_clinico.registrar",
];

const ALL_NEW_PERMS = [...READ_PERMS, ...WRITE_PERMS];

/**
 * Matriz de leitura aprovada.
 * Chave: codigo da permissao. Valor: array de nomes de perfil que devem possuir.
 */
const READ_MATRIX = {
  "paciente.alergia.visualizar":              ["Técnico em Enfermagem", "Enfermeiro", "Médico", "Farmácia"],
  "paciente.comorbidade.visualizar":          ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
  "paciente.medicamento_continuo.visualizar": ["Técnico em Enfermagem", "Enfermeiro", "Médico", "Farmácia"],
  "paciente.alerta_clinico.visualizar":       ["Técnico em Enfermagem", "Enfermeiro", "Médico", "Farmácia"],
};

/**
 * Perfis que NAO devem ter nenhuma das 4 permissoes de leitura.
 */
const BLOCKED_PROFILES = [
  "Recepção",
  "Gestão Hospitalar",
  "Leitura/Gestor",
  "Técnico em RX",
  "Regulação de Transferência",
];

/**
 * Matriz de escrita aprovada.
 */
const WRITE_MATRIX = {
  "paciente.medicamento_continuo.registrar": ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
  "paciente.alerta_clinico.registrar":       ["Técnico em Enfermagem", "Enfermeiro", "Médico"],
};

// ---------------------------------------------------------------------------
// Suite 1: Existencia das 6 permissoes novas
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 1: existencia das 6 permissoes novas", () => {
  cit("as 6 permissoes novas existem na tabela permissoes", async () => {
    const inList = ALL_NEW_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select chave from public.permissoes
      where chave in (${inList})
      order by chave
    `);
    const found = rows.map(r => r.chave);
    for (const perm of ALL_NEW_PERMS) {
      expect(found, `permissao ausente: ${perm}`).toContain(perm);
    }
    expect(rows.length).toBe(6);
  });

  for (const perm of ALL_NEW_PERMS) {
    cit(`permissao ${perm} nao tem duplicidade (chave unica)`, async () => {
      const rows = queryLocalRows(`
        select count(*) as cnt from public.permissoes where chave = '${perm}'
      `);
      expect(Number(rows[0].cnt)).toBe(1);
    });
  }

  cit("4 permissoes de leitura tem modulo Pacientes", async () => {
    const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select chave from public.permissoes
      where chave in (${inList})
        and modulo = 'Pacientes'
    `);
    expect(rows.length).toBe(4);
  });

  cit("2 permissoes de escrita tem modulo Pacientes", async () => {
    const inList = WRITE_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select chave from public.permissoes
      where chave in (${inList})
        and modulo = 'Pacientes'
    `);
    expect(rows.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Matriz de vinculos de leitura
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 2: vinculos de leitura por perfil", () => {
  for (const [perm, profiles] of Object.entries(READ_MATRIX)) {
    cit(`${perm}: exatamente ${profiles.length} perfil(is) vinculado(s)`, async () => {
      const rows = queryLocalRows(`
        select pa.nome
        from public.perfil_permissao pp
        join public.perfis_acesso pa on pa.id = pp.perfil_id
        join public.permissoes p     on p.id  = pp.permissao_id
        where p.chave = '${perm}'
        order by pa.nome
      `);
      const found = rows.map(r => r.nome);
      for (const prof of profiles) {
        expect(found, `perfil ausente: ${prof} para ${perm}`).toContain(prof);
      }
      expect(found.length, `numero incorreto de vinculos para ${perm}`).toBe(profiles.length);
    });
  }

  cit("Farmacia NAO recebe paciente.comorbidade.visualizar", async () => {
    const rows = queryLocalRows(`
      select 1
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave = 'paciente.comorbidade.visualizar'
        and pa.nome = 'Farmácia'
    `);
    expect(rows.length, "Farmacia nao deve ter paciente.comorbidade.visualizar").toBe(0);
  });

  cit("Tecnico em Enfermagem recebe todas as 4 permissoes de leitura", async () => {
    const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select p.chave
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in (${inList})
        and pa.nome = 'Técnico em Enfermagem'
    `);
    expect(rows.length).toBe(4);
  });

  cit("Enfermeiro recebe todas as 4 permissoes de leitura", async () => {
    const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select p.chave
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in (${inList})
        and pa.nome = 'Enfermeiro'
    `);
    expect(rows.length).toBe(4);
  });

  cit("Medico recebe todas as 4 permissoes de leitura", async () => {
    const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select p.chave
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in (${inList})
        and pa.nome = 'Médico'
    `);
    expect(rows.length).toBe(4);
  });

  cit("Farmacia recebe 3 permissoes de leitura (sem comorbidade)", async () => {
    const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
    const rows = queryLocalRows(`
      select p.chave
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in (${inList})
        and pa.nome = 'Farmácia'
    `);
    expect(rows.length).toBe(3);
    const found = rows.map(r => r.chave);
    expect(found).not.toContain("paciente.comorbidade.visualizar");
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Matriz de vinculos de escrita
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 3: vinculos de escrita por perfil", () => {
  for (const [perm, profiles] of Object.entries(WRITE_MATRIX)) {
    cit(`${perm}: exatamente ${profiles.length} perfis vinculados`, async () => {
      const rows = queryLocalRows(`
        select pa.nome
        from public.perfil_permissao pp
        join public.perfis_acesso pa on pa.id = pp.perfil_id
        join public.permissoes p     on p.id  = pp.permissao_id
        where p.chave = '${perm}'
        order by pa.nome
      `);
      const found = rows.map(r => r.nome);
      for (const prof of profiles) {
        expect(found, `perfil ausente: ${prof} para ${perm}`).toContain(prof);
      }
      expect(found.length).toBe(profiles.length);
    });
  }

  cit("Farmacia NAO recebe paciente.medicamento_continuo.registrar", async () => {
    const rows = queryLocalRows(`
      select 1
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in ('paciente.medicamento_continuo.registrar','paciente.alerta_clinico.registrar')
        and pa.nome = 'Farmácia'
    `);
    expect(rows.length, "Farmacia nao deve ter permissoes de escrita clinica").toBe(0);
  });

  cit("Recepcao NAO recebe permissoes de escrita clinica novas", async () => {
    const rows = queryLocalRows(`
      select 1
      from public.perfil_permissao pp
      join public.perfis_acesso pa on pa.id = pp.perfil_id
      join public.permissoes p     on p.id  = pp.permissao_id
      where p.chave in ('paciente.medicamento_continuo.registrar','paciente.alerta_clinico.registrar')
        and pa.nome = 'Recepção'
    `);
    expect(rows.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Perfis bloqueados de leitura
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 4: perfis sem acesso de leitura", () => {
  for (const perfil of BLOCKED_PROFILES) {
    cit(`${perfil} nao possui nenhuma das 4 permissoes de leitura novas`, async () => {
      const inList = READ_PERMS.map(c => `'${c}'`).join(", ");
      const rows = queryLocalRows(`
        select p.chave
        from public.perfil_permissao pp
        join public.perfis_acesso pa on pa.id = pp.perfil_id
        join public.permissoes p     on p.id  = pp.permissao_id
        where p.chave in (${inList})
          and pa.nome = '${perfil}'
      `);
      expect(rows.length, `${perfil} nao deve ter permissoes de leitura clinica`).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 5: Estrutura das 4 novas SELECT policies
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 5: estrutura das 4 novas SELECT policies", () => {
  cit("as 4 novas SELECT policies existem no banco", async () => {
    const names = NEW_SELECT_POLICIES.map(e => `'${e.policy}'`).join(", ");
    const rows = queryLocalRows(`
      select policyname
      from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and policyname in (${names})
    `);
    expect(rows.length).toBe(4);
  });

  for (const entry of NEW_SELECT_POLICIES) {
    cit(`${entry.policy}: vinculada a tabela ${entry.table}`, async () => {
      const rows = queryLocalRows(`
        select tablename, roles
        from pg_policies
        where schemaname = 'public'
          and cmd = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      expect(rows[0].tablename).toBe(entry.table);
      expect(rows[0].roles).toContain("authenticated");
    });

    cit(`${entry.policy}: USING contem has_permission('${entry.perm}')`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual).toContain(entry.perm.toLowerCase());
      expect(qual).toContain("has_permission");
    });
  }

  cit("as 4 antigas SELECT policies (is_linked_user) foram removidas", async () => {
    const names = OLD_SELECT_POLICIES.map(p => `'${p}'`).join(", ");
    const rows = queryLocalRows(`
      select policyname from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and policyname in (${names})
    `);
    expect(rows.length, "policies antigas nao devem mais existir").toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Filtro ativo = true
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 6: filtro ativo = true nas SELECT policies operacionais", () => {
  for (const entry of NEW_SELECT_POLICIES) {
    cit(`${entry.table}: USING contem ativo = true`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase().replace(/\s+/g, " ");
      expect(qual, `ativo = true ausente em ${entry.table}`).toContain("ativo = true");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 7: Filtro paciente pai (deleted_at IS NULL)
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 7: filtro paciente pai deleted_at IS NULL", () => {
  for (const entry of NEW_SELECT_POLICIES) {
    cit(`${entry.table}: USING contem EXISTS subquery com pacientes.deleted_at IS NULL`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase().replace(/\s+/g, " ");
      expect(qual, `EXISTS ausente em ${entry.table}`).toContain("exists");
      expect(qual, `pacientes ausente em ${entry.table}`).toContain("pacientes");
      expect(qual, `deleted_at is null ausente em ${entry.table}`).toContain("deleted_at is null");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 8: Admin e Auditoria fora dos filtros
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 8: Admin e Auditoria sem restricao de filtro", () => {
  for (const entry of NEW_SELECT_POLICIES) {
    cit(`${entry.table}: USING contem is_admin() e is_auditoria() no nivel superior`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, `is_admin() ausente em ${entry.table}`).toContain("is_admin()");
      expect(qual, `is_auditoria() ausente em ${entry.table}`).toContain("is_auditoria()");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 9: is_linked_user() removido das novas SELECT policies
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 9: is_linked_user() removido das novas SELECT policies", () => {
  for (const entry of NEW_SELECT_POLICIES) {
    cit(`${entry.table}: USING NAO contem is_linked_user()`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'SELECT'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, `is_linked_user() nao deve estar nas novas policies`).not.toContain("is_linked_user");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 10: INSERT/UPDATE de medicamentos e alertas — proxy removido
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 10: INSERT/UPDATE de medicamentos e alertas sem proxy", () => {
  const DML_TABLES = [
    {
      table: "paciente_medicamentos_continuos",
      perm:  "paciente.medicamento_continuo.registrar",
    },
    {
      table: "paciente_alertas_clinicos",
      perm:  "paciente.alerta_clinico.registrar",
    },
  ];

  for (const entry of DML_TABLES) {
    cit(`${entry.table}: INSERT WITH CHECK contem ${entry.perm}`, async () => {
      const rows = queryLocalRows(`
        select with_check from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'INSERT'
          and policyname = '${entry.table}_insert_clinico'
      `);
      expect(rows.length).toBe(1);
      const wc = rows[0].with_check.toLowerCase();
      expect(wc).toContain(entry.perm.toLowerCase());
    });

    cit(`${entry.table}: INSERT NAO usa proxy paciente.alergia.registrar`, async () => {
      const rows = queryLocalRows(`
        select with_check from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'INSERT'
          and policyname = '${entry.table}_insert_clinico'
      `);
      expect(rows.length).toBe(1);
      const wc = rows[0].with_check.toLowerCase();
      expect(wc, "proxy alergia.registrar nao deve estar no INSERT").not.toContain("paciente.alergia.registrar");
      expect(wc, "proxy comorbidade.registrar nao deve estar no INSERT").not.toContain("paciente.comorbidade.registrar");
    });

    cit(`${entry.table}: UPDATE USING contem ${entry.perm}`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'UPDATE'
          and policyname = '${entry.table}_update_clinico'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual).toContain(entry.perm.toLowerCase());
    });

    cit(`${entry.table}: UPDATE NAO usa proxy paciente.alergia.registrar`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'UPDATE'
          and policyname = '${entry.table}_update_clinico'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual, "proxy alergia.registrar nao deve estar no UPDATE").not.toContain("paciente.alergia.registrar");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 11: Alergias e comorbidades INSERT/UPDATE sem regressao
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 11: alergias e comorbidades sem regressao em INSERT/UPDATE", () => {
  const PRESERVED = [
    { table: "paciente_alergias",     perm: "paciente.alergia.registrar" },
    { table: "paciente_comorbidades", perm: "paciente.comorbidade.registrar" },
  ];

  for (const entry of PRESERVED) {
    cit(`${entry.table}: INSERT preserva ${entry.perm}`, async () => {
      const rows = queryLocalRows(`
        select with_check from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'INSERT'
          and policyname = '${entry.table}_insert_clinico'
      `);
      expect(rows.length).toBe(1);
      const wc = rows[0].with_check.toLowerCase();
      expect(wc, `${entry.perm} deve permanecer no INSERT de ${entry.table}`).toContain(entry.perm.toLowerCase());
    });

    cit(`${entry.table}: UPDATE preserva ${entry.perm}`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'UPDATE'
          and policyname = '${entry.table}_update_clinico'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual).toContain(entry.perm.toLowerCase());
    });

    cit(`${entry.table}: DELETE policy nao foi alterada`, async () => {
      const rows = queryLocalRows(`
        select qual from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = 'DELETE'
          and policyname = '${entry.table}_delete_admin_only'
      `);
      expect(rows.length).toBe(1);
      const qual = rows[0].qual.toLowerCase();
      expect(qual).toContain("is_admin()");
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 12: Nenhuma tabela fora das 4 foi afetada
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 12: nenhuma tabela externa alterada", () => {
  const EXTERNAL_POLICIES = [
    { table: "pacientes",    policy: "pacientes_select_operacional",    cmd: "SELECT" },
    { table: "atendimentos", policy: "atendimentos_select_operacional", cmd: "SELECT" },
    { table: "consultas",    policy: "consultas_select_clinico",        cmd: "SELECT" },
    { table: "triagens",     policy: "triagens_select_clinico",         cmd: "SELECT" },
    { table: "chamadas",     policy: "chamadas_select_operacional",     cmd: "SELECT" },
  ];

  for (const entry of EXTERNAL_POLICIES) {
    cit(`${entry.table}: policy ${entry.policy} nao foi alterada por B2`, async () => {
      const rows = queryLocalRows(`
        select policyname from pg_policies
        where schemaname = 'public'
          and tablename  = '${entry.table}'
          and cmd        = '${entry.cmd}'
          and policyname = '${entry.policy}'
      `);
      expect(rows.length, `${entry.policy} deve existir e ser a versao anterior`).toBe(1);
    });
  }

  cit("policies PP3-B.1 (12 tabelas Classe B) preservadas", async () => {
    const b1Policies = [
      "chamadas_select_operacional",
      "triagens_select_clinico",
      "evolucoes_enfermagem_select_clinico",
      "observacoes_select_clinico",
      "reavaliacoes_observacao_select_clinico",
      "estabilizacoes_select_clinico",
      "checklist_estabilizacao_itens_select_clinico",
      "exames_select_diagnostico",
      "prescricoes_select_farmacia_clinico",
      "prescricao_itens_select_farmacia_clinico",
      "transferencias_select_operacional",
      "checklist_transferencia_itens_select_operacional",
    ];
    const inList = b1Policies.map(p => `'${p}'`).join(", ");
    const rows = queryLocalRows(`
      select policyname from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and policyname in (${inList})
    `);
    expect(rows.length, "todas as 12 policies B1 devem estar presentes").toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Suite 13: Inspecao estatica da migration
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 13: inspecao estatica da migration SQL", () => {
  it("arquivo de migration existe e nao e vazio", () => {
    expect(migrationSql.length, "migration SQL nao pode estar vazia").toBeGreaterThan(0);
  });

  it("migration contem as 6 permissoes novas nos INSERTs", () => {
    for (const perm of ALL_NEW_PERMS) {
      expect(migrationSql, `permissao ${perm} ausente na migration`).toContain(perm);
    }
  });

  it("migration NAO usa is_linked_user() nas novas SELECT policies", () => {
    // Inspeciona somente o bloco SQL ativo CREATE POLICY (ate COMMENT ON POLICY)
    // para nao capturar referencias historicas em comentarios ou docstrings.
    for (const entry of NEW_SELECT_POLICIES) {
      const block = extractCreatePolicyBlock(migrationSql, entry.policy).toLowerCase();
      expect(block, `bloco create policy ausente para ${entry.policy}`).not.toBe("");
      expect(block, `is_linked_user() nao deve estar no bloco ativo de ${entry.policy}`)
        .not.toContain("is_linked_user");
    }
  });

  it("migration contem ativo = true em todas as 4 SELECT policies", () => {
    for (const entry of NEW_SELECT_POLICIES) {
      const idx = migrationSql.toLowerCase().indexOf(entry.policy);
      expect(idx, `policy ${entry.policy} ausente na migration`).toBeGreaterThan(-1);
      const snippet = migrationSql.slice(idx, idx + 600).toLowerCase();
      expect(snippet, `ativo = true ausente para ${entry.policy}`).toContain("ativo = true");
    }
  });

  it("migration contem EXISTS pacientes deleted_at IS NULL em todas as 4 SELECT policies", () => {
    for (const entry of NEW_SELECT_POLICIES) {
      const block = extractCreatePolicyBlock(migrationSql, entry.policy).toLowerCase();
      expect(block, `bloco create policy ausente para ${entry.policy}`).not.toBe("");
      expect(block, `exists ausente para ${entry.policy}`).toContain("exists");
      expect(block, `deleted_at is null ausente para ${entry.policy}`).toContain("deleted_at is null");
    }
  });

  it("migration contem is_admin() e is_auditoria() em todas as 4 SELECT policies", () => {
    for (const entry of NEW_SELECT_POLICIES) {
      const block = extractCreatePolicyBlock(migrationSql, entry.policy).toLowerCase();
      expect(block, `bloco create policy ausente para ${entry.policy}`).not.toBe("");
      expect(block, `is_admin() ausente para ${entry.policy}`).toContain("is_admin()");
      expect(block, `is_auditoria() ausente para ${entry.policy}`).toContain("is_auditoria()");
    }
  });

  it("migration NAO contem service_role", () => {
    expect(migrationSql.toLowerCase()).not.toContain("service_role");
  });

  it("migration NAO contem DROP TABLE", () => {
    expect(migrationSql.toLowerCase()).not.toContain("drop table");
  });

  it("migration NAO contem ALTER TABLE", () => {
    expect(migrationSql.toLowerCase()).not.toContain("alter table");
  });

  it("migration NAO contem TRUNCATE", () => {
    // Verifica apenas SQL ativo — exclui comentarios de linha que possam mencionar TRUNCATE
    const activeSql = stripLineComments(migrationSql).toLowerCase();
    expect(activeSql).not.toContain("truncate");
  });

  it("migration NAO altera auth schema", () => {
    expect(migrationSql.toLowerCase()).not.toContain("auth.users");
    expect(migrationSql.toLowerCase()).not.toContain("auth.identities");
  });

  it("migration NAO contem DELETE em dados clinicos", () => {
    // Verifica apenas SQL ativo (sem comentarios) — comentarios do cabecalho
    // podem mencionar DELETE ao documentar o que esta migration nao faz.
    const activeSql = stripLineComments(migrationSql).toLowerCase();
    const deletions = activeSql.match(/\bdelete\b/g) || [];
    expect(deletions.length, "migration nao deve conter DELETE em SQL ativo").toBe(0);
  });

  it("migration NAO usa permissao de escrita como proxy de leitura em SELECT policies", () => {
    for (const entry of NEW_SELECT_POLICIES) {
      const idx = migrationSql.toLowerCase().indexOf(entry.policy);
      const snippet = migrationSql.slice(idx, idx + 800).toLowerCase();
      // Nenhuma permissao de escrita deve aparecer nos blocos das SELECT policies
      const writeProxies = [
        "paciente.alergia.registrar",
        "paciente.comorbidade.registrar",
        "triagem.classificar",
        "consulta.iniciar",
        "enfermagem.evolucao.registrar",
      ];
      for (const proxy of writeProxies) {
        expect(snippet, `proxy de escrita ${proxy} em SELECT policy ${entry.policy}`)
          .not.toContain(proxy);
      }
    }
  });

  it("migration contem guardiao de schema drift ($guard$ block)", () => {
    expect(migrationSql.toLowerCase()).toContain("$guard$");
    expect(migrationSql.toLowerCase()).toContain("raise exception");
  });

  it("migration INSERT em perfil_permissao usa ON CONFLICT DO NOTHING", () => {
    const occurrences = (migrationSql.toLowerCase().match(/on conflict.*do nothing/g) || []).length;
    expect(occurrences, "deve haver ON CONFLICT DO NOTHING para idempotencia").toBeGreaterThanOrEqual(6);
  });

  it("migration INSERT em permissoes usa ON CONFLICT (chave) DO NOTHING", () => {
    expect(migrationSql.toLowerCase()).toContain("on conflict (chave) do nothing");
  });
});

// ---------------------------------------------------------------------------
// Suite 14: Inspecao estatica do rollback
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 14: inspecao estatica do rollback SQL", () => {
  it("arquivo de rollback existe e nao e vazio", () => {
    expect(rollbackSql.length, "rollback SQL nao pode estar vazio").toBeGreaterThan(0);
  });

  it("rollback restaura as 4 SELECT policies para is_linked_user()", () => {
    for (const table of FOUR_TABLES) {
      expect(rollbackSql, `${table}_select_linked ausente no rollback`).toContain(
        `${table}_select_linked`
      );
    }
    const occurrences = (rollbackSql.toLowerCase().match(/is_linked_user\(\)/g) || []).length;
    expect(occurrences, "rollback deve conter is_linked_user() 4 vezes (uma por tabela)").toBeGreaterThanOrEqual(4);
  });

  it("rollback restaura INSERT/UPDATE de medicamentos_continuos com proxy", () => {
    const snippet = rollbackSql.toLowerCase();
    expect(snippet).toContain("paciente_medicamentos_continuos_insert_clinico");
    expect(snippet).toContain("paciente_medicamentos_continuos_update_clinico");
    expect(snippet).toContain("paciente.alergia.registrar");
    expect(snippet).toContain("paciente.comorbidade.registrar");
  });

  it("rollback restaura INSERT/UPDATE de alertas_clinicos com proxy", () => {
    const snippet = rollbackSql.toLowerCase();
    expect(snippet).toContain("paciente_alertas_clinicos_insert_clinico");
    expect(snippet).toContain("paciente_alertas_clinicos_update_clinico");
  });

  it("rollback remove vinculos perfil_permissao das 6 novas permissoes", () => {
    const snippet = rollbackSql.toLowerCase();
    for (const perm of ALL_NEW_PERMS) {
      expect(snippet, `${perm} ausente no rollback delete vinculos`).toContain(perm.toLowerCase());
    }
    expect(snippet).toContain("delete from public.perfil_permissao");
  });

  it("rollback remove as 6 permissoes da tabela permissoes", () => {
    const snippet = rollbackSql.toLowerCase();
    expect(snippet).toContain("delete from public.permissoes");
  });

  it("rollback NAO apaga dados clinicos (nenhum DELETE em tabelas de dados)", () => {
    // Apenas deletes em perfil_permissao e permissoes sao esperados
    const deleteLines = rollbackSql
      .split("\n")
      .filter(line => /\bdelete\b/i.test(line) && !/permissao|permissoes/i.test(line));
    expect(deleteLines.length, "rollback nao deve ter DELETE em dados clinicos").toBe(0);
  });

  it("rollback contem guardiao ($rguard$ block)", () => {
    expect(rollbackSql.toLowerCase()).toContain("$rguard$");
  });

  it("rollback NAO contem service_role", () => {
    expect(rollbackSql.toLowerCase()).not.toContain("service_role");
  });

  it("rollback NAO contem ALTER TABLE ou DROP TABLE", () => {
    expect(rollbackSql.toLowerCase()).not.toContain("alter table");
    expect(rollbackSql.toLowerCase()).not.toContain("drop table");
  });
});

// ---------------------------------------------------------------------------
// Suite 15: Guardiao detecta drift nas baselines (teste de comportamento esperado)
// ---------------------------------------------------------------------------

describe("pp3b2 Suite 15: guardiao de drift", () => {
  it("migration SQL contem validacao de is_linked_user() como baseline esperado", () => {
    expect(migrationSql.toLowerCase()).toContain("is_linked_user()");
    // A string deve aparecer no bloco de guardiao como baseline, nao em CREATE POLICY
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    expect(guardIdx).toBeGreaterThan(-1);
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    expect(guardBlock, "baseline is_linked_user() deve estar no bloco guardiao").toContain("is_linked_user()");
  });

  it("migration SQL contem raise exception no bloco guardiao", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    const raises = (guardBlock.match(/raise exception/g) || []).length;
    expect(raises, "guardiao deve ter pelo menos 5 raise exception").toBeGreaterThanOrEqual(5);
  });

  it("migration SQL valida existencia das colunas ativo e paciente_id", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    expect(guardBlock).toContain("ativo");
    expect(guardBlock).toContain("paciente_id");
  });

  it("migration SQL valida existencia de pacientes.deleted_at", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    expect(guardBlock).toContain("deleted_at");
    expect(guardBlock).toContain("pacientes");
  });

  it("migration SQL valida perfis esperados no guardiao", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    expect(guardBlock).toContain("técnico em enfermagem");
    expect(guardBlock).toContain("enfermeiro");
    expect(guardBlock).toContain("médico");
    expect(guardBlock).toContain("farmácia");
  });

  it("guardiao DML usa comparacao normalizada completa (nao apenas substring-proxy)", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    // Normaliza literais PL/pgSQL: '' (aspas duplas escapadas) -> ' (aspas simples)
    // para que comparacoes de conteudo sejam identicas ao valor de runtime
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase().replace(/''/g, "'");
    // Deve conter o baseline normalizado completo da expressao DML WITH CHECK
    expect(guardBlock, "baseline DML WITH CHECK normalizado ausente no guardiao").toContain(
      "has_permission('paciente.alergia.registrar') or has_permission('paciente.comorbidade.registrar') or is_admin()"
    );
    // Deve validar cmd da INSERT policy
    expect(guardBlock, "guardiao nao valida cmd da INSERT policy").toContain("v_actual_cmd <> 'insert'");
    // Deve validar roles da INSERT policy
    expect(guardBlock, "guardiao nao valida roles da INSERT policy").toContain(
      "v_actual_roles <> array['authenticated'::name]"
    );
    // Deve fazer normalizacao do WITH CHECK (v_norm_withcheck)
    expect(guardBlock, "normalizacao v_norm_withcheck ausente no guardiao DML").toContain("v_norm_withcheck");
    // Deve comparar USING e WITH CHECK da UPDATE policy
    expect(guardBlock, "guardiao nao compara USING da UPDATE policy").toContain("v_dml_bases_us");
  });

  it("guardiao valida perfis com contagem exata (exactly-once, G-12)", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    expect(guardBlock, "guardiao nao verifica duplicata de perfil (count > 1)").toContain("v_count > 1");
    expect(guardBlock, "guardiao nao usa count para perfis").toContain("count(*)");
  });

  it("guardiao valida metadata das permissoes novas (G-13)", () => {
    const guardIdx = migrationSql.toLowerCase().indexOf("$guard$");
    const guardEnd  = migrationSql.toLowerCase().indexOf("end $guard$");
    const guardBlock = migrationSql.slice(guardIdx, guardEnd).toLowerCase();
    // G-13 deve checar modulo da permissao preexistente
    expect(guardBlock, "G-13 ausente: modulo check nao encontrado no guardiao").toContain("v_perm_modulo");
    expect(guardBlock, "G-13 ausente: modulo 'pacientes' nao encontrado no guardiao").toContain("pacientes");
    // Deve rejeitar com RAISE EXCEPTION
    const raiseExceptions = (guardBlock.match(/raise exception/g) || []).length;
    expect(raiseExceptions, "guardiao deve ter pelo menos 10 raise exception apos hardening").toBeGreaterThanOrEqual(10);
  });

  it("rollback guardiao usa raise exception fail-closed (R-G1 e R-G2)", () => {
    const rguardIdx = rollbackSql.toLowerCase().indexOf("$rguard$");
    const rguardEnd  = rollbackSql.toLowerCase().indexOf("end $rguard$");
    const rguardBlock = rollbackSql.slice(rguardIdx, rguardEnd).toLowerCase();
    // RAISE NOTICE de sucesso (ex.: "validacoes passaram") e permitido.
    // O que NAO deve existir: RAISE NOTICE associado a policy ausente/drift
    // (isso seria fail-open). Verificar especificamente via regex.
    const noticeForMissing = /raise notice[^;]*nao encontrada/s.test(rguardBlock);
    expect(noticeForMissing, "rollback guardiao usa raise notice para policy ausente — deve usar raise exception").toBe(false);
    // Deve ter RAISE EXCEPTION para policy ausente (fail-closed)
    const exceptionForMissing = /raise exception[^;]*nao encontrada/s.test(rguardBlock);
    expect(exceptionForMissing, "rollback guardiao deve ter raise exception para policy ausente").toBe(true);
    // RAISE EXCEPTION para vinculos inesperados (R-G3)
    expect(rguardBlock, "rollback guardiao deve ter raise exception para vinculos inesperados")
      .toContain("v_unexpected_count");
  });

  it("rollback guardiao verifica vinculos externos antes de remover (R-G3)", () => {
    const rguardIdx = rollbackSql.toLowerCase().indexOf("$rguard$");
    const rguardEnd  = rollbackSql.toLowerCase().indexOf("end $rguard$");
    const rguardBlock = rollbackSql.slice(rguardIdx, rguardEnd).toLowerCase();
    // R-G3 deve verificar perfis fora da matriz aprovada
    expect(rguardBlock, "R-G3 ausente: contagem de vinculos inesperados nao encontrada").toContain(
      "v_unexpected_count"
    );
    expect(rguardBlock, "R-G3 ausente: join com perfis_acesso nao encontrado").toContain("perfis_acesso");
    expect(rguardBlock, "R-G3 deve rejeitar com raise exception").toContain("raise exception");
  });

  it("rollback NAO usa CASCADE ao remover permissoes", () => {
    expect(rollbackSql.toLowerCase()).not.toContain("cascade");
  });
});
