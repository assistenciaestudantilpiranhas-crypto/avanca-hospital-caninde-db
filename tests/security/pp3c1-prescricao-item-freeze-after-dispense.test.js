/**
 * PP3-C.1 — Testes de segurança: congelamento de prescricao_itens após dispensação
 *
 * Estratégia:
 *   - Suites estáticas (1-3): verificam arquivos de migration/rollback sem tocar no banco.
 *   - Suites de schema (4-8): consultam pg_proc/pg_trigger/pg_index via queryLocalRows.
 *   - Suites DML (9-13): fixture transacional BEGIN/ROLLBACK via runPsqlScript.
 *   - Suite drift (14): testes de mutação em memória — provam que o guard detectaria drift.
 *
 * Pré-condição: banco local com migration 20260810000001 aplicada (após ETAPA 5 — db reset).
 * Pré-condição seed: atendimentos, dom_status_prescricao e estoque_itens populados.
 *
 * Fixture DML: totalmente transacional (BEGIN/ROLLBACK via stdin psql).
 * Nenhum dado persiste após cada teste.
 *
 * 23 casos cobertos:
 *   1.  Migration file existe no disco
 *   2.  Rollback file existe no disco
 *   3.  Migration embeds EXPECTED_PROSRC_MD5 correto no guard P-8
 *   4.  Migration contém guards G-1..G-19
 *   5.  Migration contém post-guards P-1..P-18
 *   6.  Rollback contém guards R-G1..R-G15
 *   7.  Migration: SECURITY DEFINER, SET search_path, OWNER TO postgres, REVOKE
 *   8.  Função prosecdef=true, owner=postgres, proconfig={search_path=public}
 *   9.  Função pronargs=0, rettype=trigger, language=plpgsql, MD5 normalizado correto
 *  10.  EXECUTE não concedido a public, anon, authenticated
 *  11.  Trigger BEFORE UPDATE, tgfoid correto, tgenabled='O'
 *  12.  Índice parcial com definição correta (pg_get_indexdef)
 *  13.  Baseline preservado: ≥3 políticas + audit trigger + estoque block trigger
 *  14.  [DML] Item sem dispensação: UPDATE de campo congelado PERMITIDO
 *  15.  [DML] Item com saída: UPDATE de medicamento_nome BLOQUEADO
 *  16.  [DML] Item com saída: UPDATE de dose + via BLOQUEADO
 *  17.  [DML] Item com saída: UPDATE de prescricao_id BLOQUEADO
 *  18.  [DML] Item com saída: UPDATE de created_at BLOQUEADO
 *  19.  [DML] Item com saída: UPDATE de deleted_at BLOQUEADO
 *  20.  [DML] Item com saída: UPDATE de created_by BLOQUEADO
 *  21.  [DML] Item com saída: UPDATE de medicamento_id BLOQUEADO
 *  22.  [DML] Item com saída: campos livres (hora_administracao_ts) PERMITIDO
 *  23.  [DML] Somente tipo='ajuste' (sem saída): UPDATE de campo congelado PERMITIDO
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll } from 'vitest';
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
  findLocalDbContainer,
} from '../helpers/local-supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers estáticos
// ---------------------------------------------------------------------------

function normalizeProsrc(body) {
  return body
    .replace(/--[^\n]*/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function md5hex(text) {
  return createHash('md5').update(text, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Hash e caminhos auditáveis
// ---------------------------------------------------------------------------

const EXPECTED_PROSRC_MD5 = 'e85bd11fd7f1ef07e921c6b1a588ea43';

const MIGRATION_FILE = resolve(
  __dirname,
  '../../supabase/migrations/20260810000001_pp3c1_prescricao_item_freeze_after_dispense.sql',
);
const ROLLBACK_FILE = resolve(
  __dirname,
  '../../supabase/rollback/20260810000001_pp3c1_prescricao_item_freeze_after_dispense_rollback.sql',
);

// ---------------------------------------------------------------------------
// Helper DML transacional — envia script raw ao psql via stdin (BEGIN/ROLLBACK)
// Sem -c flag: psql lê stdin em modo script, processando meta-comandos (\gset).
// expectError=true: espera exit status != 0 (trigger bloqueou a operação).
// ---------------------------------------------------------------------------

function runPsqlScript(sql, { expectError = false } = {}) {
  assertLocalOnlyStatus();
  const container = findLocalDbContainer();
  const result = spawnSync(
    'docker',
    [
      'exec', '-i', container,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8' },
  );
  if (expectError) {
    if (result.status === 0) {
      throw new Error(
        `Esperava erro (trigger deveria bloquear), mas psql terminou com status 0.\nstdout: ${result.stdout}`,
      );
    }
    return { blocked: true, stderr: result.stderr, stdout: result.stdout };
  }
  if (result.status !== 0) {
    throw new Error(
      `psql falhou (status ${result.status}) — operação deveria ser PERMITIDA.\n` +
        `stderr: ${result.stderr}\nstdout: ${result.stdout}`,
    );
  }
  return { blocked: false, stdout: result.stdout };
}

// Prefixo comum para fixture DML — totalmente autossuficiente (TRANSACTIONAL_SELF_CONTAINED_FIXTURE).
// Cria dentro da transação: paciente mínimo → atendimento mínimo → estoque_item →
// entrada de saldo (PP3-B.3: nunca alterar quantidade_atual diretamente) →
// prescricao → prescricao_item.
// Usa tabelas de domínio seedadas (dom_status_atendimento / dom_status_prescricao)
// com lookup por codigo para ser determinístico.
// Nunca depende de seed clínico (atendimentos, usuarios).
// hora_movimentacao_ts: NOT NULL obrigatório em estoque_movimentacoes.
function buildFixturePrefix() {
  return `
-- VERBOSITY verbose: faz o psql incluir SQLSTATE no output de erro (ex: SQLSTATE: P0001).
-- Necessário para provar que o bloqueio é P0001 e não outro erro.
\\set VERBOSITY verbose

BEGIN;

-- dom_status_atendimento e dom_status_prescricao são seedados pela migration 20260623100001.
SELECT id AS v_status_atend_id FROM public.dom_status_atendimento WHERE codigo = 'aguardando_triagem';
\\gset

SELECT id AS v_status_presc_id FROM public.dom_status_prescricao WHERE codigo = 'pendente';
\\gset

-- Paciente mínimo (obrigatório para atendimentos.paciente_id NOT NULL FK).
-- cpf/cartao_sus/telefone/perfil_residencia são nullable — não preencher.
INSERT INTO public.pacientes (nome, data_nascimento, municipio)
  VALUES ('PP3C1_PACIENTE', '1980-01-01', 'PP3C1_CIDADE')
  RETURNING id AS v_paciente_id;
\\gset

-- Atendimento mínimo: queixa_principal, etapa_atual e hora_chegada_ts são NOT NULL.
INSERT INTO public.atendimentos (
  paciente_id, status_id, queixa_principal, etapa_atual, hora_chegada_ts
)
  VALUES (
    :'v_paciente_id'::uuid,
    :'v_status_atend_id'::uuid,
    'PP3C1_QUEIXA',
    'triagem',
    now()
  )
  RETURNING id AS v_atend_id;
\\gset

-- Estoque item com quantidade_atual=0 (PP3-B.3: saldo nasce zerado).
INSERT INTO public.estoque_itens (nome, quantidade_atual, quantidade_minima)
  VALUES ('PP3C1_TEST_' || gen_random_uuid()::text, 0, 0)
  RETURNING id AS v_estoque_id;
\\gset

-- Saldo criado exclusivamente via movimentacao tipo='entrada' (PP3-B.3).
-- hora_movimentacao_ts: NOT NULL sem default — obrigatório.
INSERT INTO public.estoque_movimentacoes (
  item_id, tipo_movimentacao, quantidade, hora_movimentacao_ts
)
  VALUES (:'v_estoque_id'::uuid, 'entrada', 100, now());

INSERT INTO public.prescricoes (atendimento_id, hora_prescricao_ts)
  VALUES (:'v_atend_id'::uuid, now())
  RETURNING id AS v_presc_id;
\\gset

INSERT INTO public.prescricao_itens (
  prescricao_id, status_id, medicamento_id,
  medicamento_nome, dose, via
)
VALUES (
  :'v_presc_id'::uuid, :'v_status_presc_id'::uuid, :'v_estoque_id'::uuid,
  'MED_TEST_PP3C1', '10mg', 'oral'
)
RETURNING id AS v_item_id;
\\gset
`;
}

// Acrescenta o registro de saída (dispensação) ao prefixo da fixture.
// prescricao_item_id vinculado: establece HAS_EVER_BEEN_DISPENSED = TRUE.
// hora_movimentacao_ts: NOT NULL obrigatório.
function buildDispensadoSection() {
  return `
INSERT INTO public.estoque_movimentacoes (
  item_id, tipo_movimentacao, quantidade, prescricao_item_id, hora_movimentacao_ts
)
  VALUES (:'v_estoque_id'::uuid, 'saida', 1, :'v_item_id'::uuid, now());
`;
}

// Fixture para teste de ajuste (sem saída real — HAS_EVER_BEEN_DISPENSED permanece FALSE).
// hora_movimentacao_ts: NOT NULL obrigatório.
function buildAjusteSection() {
  return `
INSERT INTO public.estoque_movimentacoes (
  item_id, tipo_movimentacao, quantidade, hora_movimentacao_ts
)
  VALUES (:'v_estoque_id'::uuid, 'ajuste', -1, now());
`;
}

// ===========================================================================
// Suite 1 — Arquivos existem no disco
// ===========================================================================

describe('PP3-C.1 Suite 1 — Arquivos de migration e rollback existem', () => {
  it('[caso 1] migration file existe', () => {
    expect(existsSync(MIGRATION_FILE)).toBe(true);
  });

  it('[caso 2] rollback file existe', () => {
    expect(existsSync(ROLLBACK_FILE)).toBe(true);
  });
});

// ===========================================================================
// Suite 2 — Análise estática da migration
// ===========================================================================

describe('PP3-C.1 Suite 2 — Análise estática da migration', () => {
  let sql;

  beforeAll(() => {
    sql = readFileSync(MIGRATION_FILE, 'utf8');
  });

  it('[caso 3] migration embeds EXPECTED_PROSRC_MD5 correto no guard P-8', () => {
    expect(sql).toContain(EXPECTED_PROSRC_MD5);
  });

  it('[caso 4] migration contém todos os pre-guards G-1..G-19', () => {
    // G-10 e G-17 usam variantes a/b (G-10a, G-10b, G-17a, G-17b) — busca por prefixo.
    for (let i = 1; i <= 19; i++) {
      const label = (i === 10 || i === 17) ? `[G-${i}a]` : `[G-${i}]`;
      expect(sql, `guard [G-${i}] ausente`).toContain(label);
    }
  });

  it('[caso 5] migration contém todos os post-guards P-1..P-18', () => {
    // P-12 usa variantes a/b (P-12a, P-12b) — busca pela primeira variante.
    for (let i = 1; i <= 18; i++) {
      const label = (i === 12) ? `[P-${i}a]` : `[P-${i}]`;
      expect(sql, `post-guard [P-${i}] ausente`).toContain(label);
    }
  });

  it('[caso 7a] migration declara SECURITY DEFINER com SET search_path = public', () => {
    const lc = sql.toLowerCase();
    expect(lc).toContain('security definer');
    expect(lc).toContain('set search_path = public');
  });

  it('[caso 7b] migration contém OWNER TO postgres explícito', () => {
    expect(sql.toLowerCase()).toContain('owner to postgres');
  });

  it('[caso 7c] migration revoga EXECUTE de public, anon e authenticated', () => {
    const lc = sql.replace(/\s+/g, ' ').toLowerCase();
    expect(lc).toMatch(/revoke execute.*from public/s);
    expect(lc).toMatch(/revoke execute.*from anon/s);
    expect(lc).toMatch(/revoke execute.*from authenticated/s);
  });
});

// ===========================================================================
// Suite 3 — Análise estática do rollback
// ===========================================================================

describe('PP3-C.1 Suite 3 — Análise estática do rollback', () => {
  let sql;

  beforeAll(() => {
    sql = readFileSync(ROLLBACK_FILE, 'utf8');
  });

  it('[caso 6] rollback contém todos os guards R-G1..R-G15', () => {
    // R-G7 usa variantes a/b/c (R-G7a, R-G7b, R-G7c) — busca pela primeira variante.
    for (let i = 1; i <= 15; i++) {
      const label = (i === 7) ? `[R-G${i}a]` : `[R-G${i}]`;
      expect(sql, `rollback guard [R-G${i}] ausente`).toContain(label);
    }
  });

  it('[caso 6b] rollback DROP TRIGGER e DROP FUNCTION e DROP INDEX presentes', () => {
    const lc = sql.toLowerCase();
    expect(lc).toContain('drop trigger if exists trg_protect_prescricao_item_post_dispense');
    expect(lc).toContain('drop function if exists public.fn_protect_prescricao_item_after_dispense');
    expect(lc).toContain('drop index if exists public.idx_estoque_movimentacoes_prescricao_item_saida');
  });

  it('[caso 6c] rollback NAO faz DROP TABLE nem TRUNCATE', () => {
    const stripped = sql.replace(/--[^\n]*/g, '').toLowerCase();
    expect(stripped).not.toMatch(/drop\s+table/);
    expect(stripped).not.toMatch(/truncate/);
  });
});

// ===========================================================================
// Suite 4 — Estrutura da função em pg_proc
// ===========================================================================

describe('PP3-C.1 Suite 4 — Função fn_protect_prescricao_item_after_dispense em pg_proc', () => {
  beforeAll(async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
  });

  it('[caso 8a] função existe com prosecdef=true (SECURITY DEFINER)', async () => {
    const rows = await queryLocalRows(
      `SELECT prosecdef FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_protect_prescricao_item_after_dispense'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(true);
  });

  it('[caso 8b] owner=postgres', async () => {
    const rows = await queryLocalRows(
      `SELECT pg_get_userbyid(proowner) AS owner
       FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_protect_prescricao_item_after_dispense'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].owner).toBe('postgres');
  });

  it('[caso 8c] proconfig contém search_path=public', async () => {
    const rows = await queryLocalRows(
      `SELECT proconfig
       FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_protect_prescricao_item_after_dispense'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].proconfig).toContain('search_path=public');
  });

  it('[caso 9a] pronargs=0, rettype=trigger, language=plpgsql', async () => {
    const rows = await queryLocalRows(
      `SELECT p.pronargs,
              t.typname    AS rettype,
              l.lanname    AS lang
       FROM   pg_proc p
       JOIN   pg_namespace n  ON n.oid = p.pronamespace
       JOIN   pg_type t       ON t.oid = p.prorettype
       JOIN   pg_language l   ON l.oid = p.prolang
       WHERE  p.proname = 'fn_protect_prescricao_item_after_dispense'
         AND  n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].pronargs).toBe(0);
    expect(rows[0].rettype).toBe('trigger');
    expect(rows[0].lang).toBe('plpgsql');
  });

  it('[caso 9b] MD5 normalizado do prosrc = EXPECTED_PROSRC_MD5', async () => {
    const rows = await queryLocalRows(
      `SELECT prosrc FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_protect_prescricao_item_after_dispense'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    const computed = md5hex(normalizeProsrc(rows[0].prosrc));
    expect(computed).toBe(EXPECTED_PROSRC_MD5);
  });
});

// ===========================================================================
// Suite 5 — EXECUTE não concedido a roles públicos
// ===========================================================================

describe('PP3-C.1 Suite 5 — EXECUTE grants revogados', () => {
  beforeAll(async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
  });

  it('[caso 10] public, anon e authenticated não têm EXECUTE na função', async () => {
    const rows = await queryLocalRows(
      `SELECT (aclexplode(coalesce(proacl, acldefault('f', proowner)))).grantee::regrole::text AS grantee
       FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_protect_prescricao_item_after_dispense'
         AND n.nspname = 'public'`,
    );
    const grantees = rows.map((r) => r.grantee);
    expect(grantees).not.toContain('PUBLIC');
    expect(grantees).not.toContain('public');
    expect(grantees).not.toContain('anon');
    expect(grantees).not.toContain('authenticated');
  });
});

// ===========================================================================
// Suite 6 — Trigger em pg_trigger
// ===========================================================================

describe('PP3-C.1 Suite 6 — Trigger trg_protect_prescricao_item_post_dispense', () => {
  beforeAll(async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
  });

  it('[caso 11a] trigger existe em prescricao_itens e é BEFORE UPDATE', async () => {
    const rows = await queryLocalRows(
      `SELECT tgname, tgtype, tgenabled
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE t.tgname = 'trg_protect_prescricao_item_post_dispense'
         AND c.relname = 'prescricao_itens'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    // tgtype: bit 2 = BEFORE, bit 16 = UPDATE → bitmask & 18 == 18
    expect(rows[0].tgtype & 18).toBe(18);
  });

  it('[caso 11b] tgenabled=O (trigger habilitado)', async () => {
    const rows = await queryLocalRows(
      `SELECT tgenabled
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       WHERE t.tgname = 'trg_protect_prescricao_item_post_dispense'
         AND c.relname = 'prescricao_itens'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tgenabled).toBe('O');
  });

  it('[caso 11c] tgfoid aponta para fn_protect_prescricao_item_after_dispense', async () => {
    const rows = await queryLocalRows(
      `SELECT p.proname
       FROM pg_trigger t
       JOIN pg_class c    ON c.oid = t.tgrelid
       JOIN pg_proc p     ON p.oid = t.tgfoid
       WHERE t.tgname = 'trg_protect_prescricao_item_post_dispense'
         AND c.relname = 'prescricao_itens'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].proname).toBe('fn_protect_prescricao_item_after_dispense');
  });
});

// ===========================================================================
// Suite 7 — Índice parcial
// ===========================================================================

describe('PP3-C.1 Suite 7 — Índice parcial idx_estoque_movimentacoes_prescricao_item_saida', () => {
  beforeAll(async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
  });

  it('[caso 12] índice parcial existe com definição correta', async () => {
    const rows = await queryLocalRows(
      `SELECT pg_get_indexdef(i.oid) AS indexdef
       FROM pg_index ix
       JOIN pg_class i  ON i.oid = ix.indexrelid
       JOIN pg_class t  ON t.oid = ix.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE i.relname = 'idx_estoque_movimentacoes_prescricao_item_saida'
         AND t.relname = 'estoque_movimentacoes'
         AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    const def = rows[0].indexdef.toLowerCase();
    expect(def).toContain('estoque_movimentacoes');
    expect(def).toContain('prescricao_item_id');
    expect(def).toContain('saida');
    expect(def).toContain('is not null');
    expect(def).not.toContain('unique');
  });
});

// ===========================================================================
// Suite 8 — Baseline preservado
// ===========================================================================

describe('PP3-C.1 Suite 8 — Baseline preservado após migration', () => {
  beforeAll(async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
  });

  it('[caso 13a] ≥3 políticas RLS existem em prescricao_itens', async () => {
    const rows = await queryLocalRows(
      `SELECT polname FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'prescricao_itens' AND n.nspname = 'public'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('[caso 13b] trg_audit_prescricao_itens tgfoid = fn_audit_trigger', async () => {
    const rows = await queryLocalRows(
      `SELECT p.proname
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_proc p  ON p.oid = t.tgfoid
       WHERE t.tgname = 'trg_audit_prescricao_itens'
         AND c.relname = 'prescricao_itens'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].proname).toBe('fn_audit_trigger');
  });

  it('[caso 13c] trg_block_update_estoque_movimentacoes tgfoid = fn_block_update_delete', async () => {
    const rows = await queryLocalRows(
      `SELECT p.proname
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_proc p  ON p.oid = t.tgfoid
       WHERE t.tgname = 'trg_block_update_estoque_movimentacoes'
         AND c.relname = 'estoque_movimentacoes'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].proname).toBe('fn_block_update_delete');
  });
});

// ===========================================================================
// Suites 9–13 — DML transacional (fixture BEGIN/ROLLBACK via runPsqlScript)
// ===========================================================================

describe('PP3-C.1 Suite 9 — [DML] Item sem dispensação: UPDATE de campo congelado PERMITIDO', () => {
  it('[caso 14] UPDATE medicamento_nome SEM saída vinculada deve ser permitido e valor confirmado', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      `
-- Sem INSERT de saída: item não dispensado — trigger não deve bloquear.
UPDATE public.prescricao_itens
  SET medicamento_nome = 'ALTERADO_PERMITIDO'
  WHERE id = :'v_item_id'::uuid;

-- Prova que o novo valor foi realmente aplicado (não basta exit=0).
SELECT 'PP3C1_ALLOW_OK' AS mark
  FROM public.prescricao_itens
  WHERE id = :'v_item_id'::uuid
    AND medicamento_nome = 'ALTERADO_PERMITIDO';

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: false });
    expect(r.stdout).toContain('PP3C1_ALLOW_OK');
  });
});

describe('PP3-C.1 Suite 10 — [DML] Item com saída: campos congelados (medicamento, dose, via) BLOQUEADOS', () => {
  it('[caso 15] UPDATE medicamento_nome com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens SET medicamento_nome = 'ALTERADO_BLOQUEADO' WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    // Prova que o bloqueio veio especificamente do trigger PP3-C.1 com SQLSTATE P0001.
    const out = r.stderr + r.stdout;
    expect(out).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
    expect(out).toContain('P0001');
  });

  it('[caso 16] UPDATE dose + via com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens SET dose = '999mg', via = 'ALTERADA' WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });
});

describe('PP3-C.1 Suite 11 — [DML] Item com saída: campos de identidade congelados', () => {
  it('[caso 17] UPDATE prescricao_id com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
INSERT INTO public.prescricoes (atendimento_id, hora_prescricao_ts)
  VALUES (:'v_atend_id'::uuid, now())
  RETURNING id AS v_presc2_id;
\\gset

UPDATE public.prescricao_itens SET prescricao_id = :'v_presc2_id'::uuid WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });

  it('[caso 18] UPDATE created_at com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens SET created_at = now() - interval '1 year' WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });

  it('[caso 19] UPDATE deleted_at com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens SET deleted_at = now() WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });

  it('[caso 20] UPDATE created_by com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    // Não usar SELECT FROM usuarios — a tabela exige FK para auth.users (não criável em transação local).
    // O trigger (BEFORE UPDATE) dispara ANTES da validação de FK, então gen_random_uuid() é suficiente
    // para provar que o campo está congelado: o trigger levanta P0001 antes de qualquer verificação de FK.
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens SET created_by = gen_random_uuid() WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });

  it('[caso 21] UPDATE medicamento_id com saída vinculada deve ser BLOQUEADO com P0001', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
INSERT INTO public.estoque_itens (nome, quantidade_atual, quantidade_minima)
  VALUES ('PP3C1_MED2_' || gen_random_uuid()::text, 0, 0)
  RETURNING id AS v_estoque2_id;
\\gset

UPDATE public.prescricao_itens SET medicamento_id = :'v_estoque2_id'::uuid WHERE id = :'v_item_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: true });
    expect(r.stderr + r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  });
});

describe('PP3-C.1 Suite 12 — [DML] Item com saída: campos livres PERMITIDOS', () => {
  it('[caso 22] UPDATE hora_administracao_ts com saída vinculada deve ser PERMITIDO e valor confirmado', () => {
    assertLocalOnlyStatus();
    // Usa timestamp fixo para poder verificar via SELECT após o UPDATE.
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
UPDATE public.prescricao_itens
  SET hora_administracao_ts = '2020-01-01 00:00:00+00'::timestamptz
  WHERE id = :'v_item_id'::uuid;

-- Prova que o campo livre foi realmente atualizado (não basta exit=0).
SELECT 'PP3C1_ALLOW_OK' AS mark
  FROM public.prescricao_itens
  WHERE id = :'v_item_id'::uuid
    AND hora_administracao_ts = '2020-01-01 00:00:00+00'::timestamptz;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: false });
    expect(r.stdout).toContain('PP3C1_ALLOW_OK');
  });

  it('[caso 24] UPDATE status_id com saída vinculada deve ser PERMITIDO e valor confirmado', () => {
    assertLocalOnlyStatus();
    // status_id é campo livre de workflow (lifecycle: pendente→separado→administrado).
    // Deve permanecer mutável mesmo após HAS_EVER_BEEN_DISPENSED.
    // Usa 'separado' (seedado em dom_status_prescricao por 20260623100001).
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      `
SELECT id AS v_status_separado_id FROM public.dom_status_prescricao WHERE codigo = 'separado';
\\gset

UPDATE public.prescricao_itens
  SET status_id = :'v_status_separado_id'::uuid
  WHERE id = :'v_item_id'::uuid;

-- Prova que o status foi realmente atualizado para 'separado'.
SELECT 'PP3C1_ALLOW_OK' AS mark
  FROM public.prescricao_itens
  WHERE id = :'v_item_id'::uuid
    AND status_id = :'v_status_separado_id'::uuid;

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: false });
    expect(r.stdout).toContain('PP3C1_ALLOW_OK');
  });
});

describe('PP3-C.1 Suite 13 — [DML] Somente ajuste (sem saída): campo congelado PERMITIDO', () => {
  it('[caso 23] tipo=ajuste NÃO aciona congelamento — UPDATE medicamento_nome deve ser PERMITIDO e valor confirmado', () => {
    assertLocalOnlyStatus();
    const script =
      buildFixturePrefix() +
      buildAjusteSection() +
      `
-- Somente ajuste registrado, sem saída real: HAS_EVER_BEEN_DISPENSED = FALSE.
-- Trigger não deve bloquear.
UPDATE public.prescricao_itens SET medicamento_nome = 'AJUSTE_NAO_CONGELA' WHERE id = :'v_item_id'::uuid;

-- Prova que o valor foi realmente aplicado.
SELECT 'PP3C1_ALLOW_OK' AS mark
  FROM public.prescricao_itens
  WHERE id = :'v_item_id'::uuid
    AND medicamento_nome = 'AJUSTE_NAO_CONGELA';

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: false });
    expect(r.stdout).toContain('PP3C1_ALLOW_OK');
  });
});

// ===========================================================================
// Suite 15 — Saída + ajuste posterior: HAS_EVER_BEEN_DISPENSED permanece TRUE
// ===========================================================================
// Prova: ajuste (tipo='ajuste') posterior à saída NÃO descongela o item.
// Usa DO block com EXCEPTION handler para:
//   1. Capturar P0001 + mensagem sem encerrar o psql (ON_ERROR_STOP=1 abortaria).
//   2. Preservar a transação para que o SELECT de verificação possa rodar.
//   3. Confirmar que o valor original (MED_TEST_PP3C1) permanece intacto.

describe('PP3-C.1 Suite 15 — [DML] Saída + ajuste posterior: campo congelado permanece BLOQUEADO', () => {
  it('[caso 25] saída + ajuste: UPDATE de campo congelado deve ser BLOQUEADO com P0001 e valor original intacto', () => {
    assertLocalOnlyStatus();
    // psql não expande variáveis :'var' dentro de blocos $$...$$ (enviados ao servidor como literal).
    // RAISE NOTICE do handler pode não ser capturado via docker exec sem TTY.
    // Solução: TEMP TABLE como canal de saída do DO block → SELECT comunica ao stdout.
    const script =
      buildFixturePrefix() +
      buildDispensadoSection() +
      buildAjusteSection() +
      `
-- Canal de saída: o DO block escreve o resultado na temp table; SELECT lê para stdout.
CREATE TEMP TABLE pp3c1_result (mark text) ON COMMIT DROP;

-- Passa o UUID via session config (único mecanismo que cruza a barreira $$...$$).
SELECT set_config('pp3c1.item_id', :'v_item_id', true);

DO $$
DECLARE
  v_item_id uuid;
BEGIN
  v_item_id := current_setting('pp3c1.item_id')::uuid;

  UPDATE public.prescricao_itens
    SET medicamento_nome = 'AJUSTE_NAO_DESCONGELA'
    WHERE id = v_item_id;

  -- Se chegou aqui o trigger não bloqueou — falha do teste.
  RAISE EXCEPTION 'PP3C1_TRIGGER_NOT_FIRED: UPDATE nao foi bloqueado apos saida+ajuste.';

EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = 'P0001'
     AND SQLERRM LIKE '%GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE%'
  THEN
    -- Emite o token de prova para stdout via temp table.
    -- O savepoint implícito do EXCEPTION reverteu o UPDATE (valor original intacto).
    INSERT INTO pp3c1_result
      VALUES ('PP3C1_BLOCK_CORRECT:SQLSTATE=P0001:GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
  ELSE
    -- Erro inesperado: re-lançar para reprovar o teste.
    RAISE EXCEPTION 'PP3C1_WRONG_ERROR SQLSTATE=% MSG=%', SQLSTATE, SQLERRM;
  END IF;
END;
$$;

-- Exibe o token de prova do handler para o test runner capturar via r.stdout.
SELECT mark FROM pp3c1_result;

-- Prova que o valor original está intacto (UPDATE bloqueado e revertido pelo savepoint).
SELECT 'PP3C1_INTACT_OK' AS mark
  FROM public.prescricao_itens
  WHERE id = :'v_item_id'::uuid
    AND medicamento_nome = 'MED_TEST_PP3C1';

ROLLBACK;
`;
    const r = runPsqlScript(script, { expectError: false });
    // Todos os tokens vão para r.stdout (via SELECT da temp table).
    expect(r.stdout).toContain('PP3C1_BLOCK_CORRECT');
    expect(r.stdout).toContain('P0001');
    expect(r.stdout).toContain('GSI_PRESCRICAO_ITEM_FROZEN_AFTER_DISPENSE');
    expect(r.stdout).toContain('PP3C1_INTACT_OK');
  });
});

// ===========================================================================
// Suite 14 — Guard de drift: testes de mutação do corpo da função (em memória)
//
// Provam que o algoritmo de detecção (MD5 normalizado) detectaria qualquer
// alteração no corpo de fn_protect_prescricao_item_after_dispense.
// Executam puramente em memória, sem acesso ao banco.
// ===========================================================================

describe('PP3-C.1 Suite 14 — Guard drift: testes de mutação do corpo da função', () => {
  let fnBody;

  beforeAll(() => {
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
    const match = migrationSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_protect_prescricao_item_after_dispense\s*\(\s*\)[\s\S]*?\$\$([\s\S]+?)\$\$\s*;/i,
    );
    fnBody = match ? match[1] : '';
  });

  it('corpo extraído da migration tem MD5 = EXPECTED_PROSRC_MD5', () => {
    expect(fnBody).not.toBe('');
    expect(md5hex(normalizeProsrc(fnBody))).toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] remover tipo_movimentacao = saida muda o MD5', () => {
    const mutated = fnBody.replace("tipo_movimentacao  = 'saida'", "tipo_movimentacao = 'entrada'");
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] remover short-circuit v_campos_historicos_alterados muda o MD5', () => {
    const mutated = fnBody.replace('IF NOT v_campos_historicos_alterados THEN', 'IF FALSE THEN');
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] trocar RAISE EXCEPTION por RETURN NEW muda o MD5', () => {
    const mutated = fnBody.replace(
      'RAISE EXCEPTION',
      'RETURN NEW; -- RAISE EXCEPTION',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] remover prescricao_item_id = OLD.id da consulta muda o MD5', () => {
    const mutated = fnBody.replace('WHERE  prescricao_item_id = OLD.id', 'WHERE TRUE');
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] remover campo deleted_at do short-circuit muda o MD5', () => {
    const mutated = fnBody.replace(
      'NEW.deleted_at        IS DISTINCT FROM OLD.deleted_at        OR',
      '',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });

  it('[mutação] adicionar lógica arbitrária ao corpo muda o MD5', () => {
    const mutated = fnBody.replace(
      'RETURN NEW;\nEND;',
      "RAISE NOTICE 'log extra';\nRETURN NEW;\nEND;",
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(EXPECTED_PROSRC_MD5);
  });
});
