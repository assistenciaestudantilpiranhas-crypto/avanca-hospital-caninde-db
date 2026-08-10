/**
 * PP3-B.3 — Testes de segurança e integridade para public.estoque_itens
 *
 * Estratégia:
 *   - Testes estáticos: verificam o SQL da migration/rollback sem tocar no banco.
 *   - Testes de schema (queryLocalRows): verificam o estado do banco local apos aplicacao.
 *   - Testes DML (execLocalRows): executam operacoes no banco local para validar comportamento.
 *   - Testes de mutacao (Suite 15): provam que guards detectariam drift no corpo da funcao.
 *
 * Pré-condição schemas: banco local com migration 20260809000002 aplicada.
 * Pré-condição estáticos: arquivos de migration e rollback existentes (pre-apply).
 *
 * Suites:
 *   1.  Permission estoque.cadastrar
 *   2.  Coluna ativo
 *   3.  Policy SELECT operacional
 *   4.  Policy INSERT cadastro
 *   5.  Policy UPDATE cadastro
 *   6.  Ausencia de policy DELETE
 *   7.  Trigger block-delete (fn e trigger)
 *   8.  FK item_id NO ACTION
 *   9.  Auditoria
 *   10. Nao-regressao (PP3-B.1/B.2)
 *   11. Static: migration
 *   12. Static: rollback
 *   13. GAP 1 — saldo inicial (trg_protect_quantidade_inicial)
 *   14. GAP 2 — item inativo nao movimenta (fn_estoque_aplicar_movimentacao)
 *   15. Guard de drift — testes de mutacao do corpo da funcao critica
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll } from 'vitest';
import {
  assertLocalOnlyStatus,
  loadLocalSupabaseStatus,
  queryLocalRows,
  execLocalRows,
} from '../helpers/local-supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers estáticos
// ---------------------------------------------------------------------------

function stripLineComments(sql) {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

/**
 * Extrai o bloco SQL de uma política pelo nome (sem comentários de linha).
 */
function extractCreatePolicyBlock(sql, policyName) {
  const stripped = stripLineComments(sql);
  const pattern = new RegExp(
    `create\\s+policy\\s+${policyName}\\b[\\s\\S]*?;`,
    'i',
  );
  const match = stripped.match(pattern);
  return match ? match[0] : null;
}

/**
 * Normaliza o corpo de uma função PL/pgSQL da mesma forma que o guard SQL:
 *   1. Strip comentários de linha (-- ...)
 *   2. Lowercase
 *   3. Collapse whitespace em ' '
 *   4. Trim
 * Equivale ao SQL:
 *   md5(trim(regexp_replace(lower(regexp_replace(prosrc,'--[^\n]*','','g')),'\s+',' ','g')))
 */
function normalizeProsrc(body) {
  return body
    .replace(/--[^\n]*/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computa MD5 hex de uma string UTF-8 — equivalente ao md5() do PostgreSQL.
 */
function md5hex(text) {
  return createHash('md5').update(text, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Hashes conhecidos (auditáveis e imutáveis neste ciclo)
// ---------------------------------------------------------------------------

// Corpo baseline (pre-PP3-B.3) — verificado contra pg_proc.prosrc em 2026-08-09
const BASELINE_MD5 = 'c7331f52125366292592168b2649ea26';

// Corpo pós-migration (PP3-B.3 aplicada) — computado a partir do texto da migration
const POSTMIG_MD5 = '9c33736e459f95d7629c24f32a7c9005';

// ---------------------------------------------------------------------------
// Caminhos de arquivos
// ---------------------------------------------------------------------------

const MIGRATION_FILE = resolve(
  __dirname,
  '../../supabase/migrations/20260809000002_pp3b3_stock_items_lifecycle_and_rls.sql',
);
const ROLLBACK_FILE = resolve(
  __dirname,
  '../../supabase/rollback/20260809000002_pp3b3_stock_items_lifecycle_and_rls_rollback.sql',
);

// ---------------------------------------------------------------------------
// Suite 1: Permission estoque.cadastrar
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 1 — Permission estoque.cadastrar', () => {
  it('deve existir no schema com modulo=Estoque', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT chave, modulo FROM public.permissoes WHERE chave = 'estoque.cadastrar'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].chave).toBe('estoque.cadastrar');
    expect(rows[0].modulo).toBe('Estoque');
  });

  it('deve estar vinculada ao perfil Farmácia', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT pa.nome
       FROM public.perfil_permissao pp
       JOIN public.permissoes pe ON pe.id = pp.permissao_id
       JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
       WHERE pe.chave = 'estoque.cadastrar' AND pa.nome = 'Farmácia'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('deve estar vinculada ao perfil Administração', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT pa.nome
       FROM public.perfil_permissao pp
       JOIN public.permissoes pe ON pe.id = pp.permissao_id
       JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
       WHERE pe.chave = 'estoque.cadastrar' AND pa.nome = 'Administração'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('nao deve estar vinculada a perfis fora da matriz aprovada', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT pa.nome
       FROM public.perfil_permissao pp
       JOIN public.permissoes pe ON pe.id = pp.permissao_id
       JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
       WHERE pe.chave = 'estoque.cadastrar'
         AND pa.nome NOT IN ('Farmácia', 'Administração')`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Coluna ativo
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 2 — Coluna ativo em estoque_itens', () => {
  it('deve existir com tipo boolean NOT NULL', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'estoque_itens'
         AND column_name  = 'ativo'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('boolean');
    expect(rows[0].is_nullable).toBe('NO');
  });

  it('deve ter DEFAULT true', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'estoque_itens'
         AND column_name  = 'ativo'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].column_default).toBe('true');
  });

  it('nenhuma linha existente deve ter ativo=false (default retroativo correto)', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT count(*) AS total FROM public.estoque_itens WHERE ativo = false`,
    );
    expect(Number(rows[0].total)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Policy SELECT operacional
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 3 — Policy SELECT operacional', () => {
  it('policy estoque_itens_select_operacional deve existir', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname, cmd
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_select_operacional'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cmd).toBe('SELECT');
  });

  it('USING deve exigir ativo=true para ramo operacional e permitir admin/auditoria sem filtro', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT qual FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_select_operacional'`,
    );
    expect(rows).toHaveLength(1);
    const using = rows[0].qual.toLowerCase();
    expect(using).toContain('ativo');
    expect(using).toContain('true');
    expect(using).toContain('is_admin');
    expect(using).toContain('is_auditoria');
  });

  it('policy baseline select_farmacia deve estar AUSENTE', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_select_farmacia'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Policy INSERT cadastro
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 4 — Policy INSERT cadastro', () => {
  it('policy estoque_itens_insert_cadastro deve existir com cmd=INSERT', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname, cmd
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_insert_cadastro'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cmd).toBe('INSERT');
  });

  it('WITH CHECK deve exigir estoque.cadastrar ou is_admin', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT with_check FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_insert_cadastro'`,
    );
    expect(rows).toHaveLength(1);
    const wcheck = rows[0].with_check.toLowerCase();
    expect(wcheck).toContain('estoque.cadastrar');
    expect(wcheck).toContain('is_admin');
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Policy UPDATE cadastro
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 5 — Policy UPDATE cadastro', () => {
  it('policy estoque_itens_update_cadastro deve existir com cmd=UPDATE', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname, cmd
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_update_cadastro'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cmd).toBe('UPDATE');
  });

  it('USING deve exigir estoque.cadastrar ou is_admin', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT qual FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_update_cadastro'`,
    );
    expect(rows).toHaveLength(1);
    const using = rows[0].qual.toLowerCase();
    expect(using).toContain('estoque.cadastrar');
    expect(using).toContain('is_admin');
  });

  it('policy ALL baseline write_farmacia_admin deve estar AUSENTE', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND policyname = 'estoque_itens_write_farmacia_admin'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Ausência de policy DELETE
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 6 — Ausência de policy DELETE', () => {
  it('nenhuma policy DELETE deve existir em estoque_itens', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'estoque_itens'
         AND cmd = 'DELETE'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('authenticated nao deve ter DELETE grant em estoque_itens', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_schema   = 'public'
         AND table_name     = 'estoque_itens'
         AND grantee        = 'authenticated'
         AND privilege_type = 'DELETE'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 7: Trigger block-delete
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 7 — Trigger de bloqueio físico de DELETE', () => {
  it('fn_block_delete_estoque_itens deve existir em pg_proc', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT proname FROM pg_proc WHERE proname = 'fn_block_delete_estoque_itens'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('fn_block_delete_estoque_itens deve ser SECURITY INVOKER', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosecdef FROM pg_proc WHERE proname = 'fn_block_delete_estoque_itens'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(false);
  });

  it('trg_block_delete_estoque_itens deve existir como BEFORE DELETE', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT trigger_name, event_manipulation, action_timing
       FROM information_schema.triggers
       WHERE event_object_schema = 'public'
         AND event_object_table  = 'estoque_itens'
         AND trigger_name        = 'trg_block_delete_estoque_itens'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].event_manipulation).toBe('DELETE');
    expect(rows[0].action_timing).toBe('BEFORE');
  });

  it('DELETE fisico em estoque_itens deve ser bloqueado pelo trigger', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT id FROM public.estoque_itens LIMIT 1`,
    );
    if (rows.length === 0) return;
    const id = rows[0].id;
    await expect(
      Promise.resolve().then(() =>
        execLocalRows(`DELETE FROM public.estoque_itens WHERE id = '${id}' RETURNING id`),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 8: FK item_id NO ACTION
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 8 — FK item_id deve ser NO ACTION', () => {
  it('confdeltype deve ser "a" (NO ACTION)', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT confdeltype
       FROM pg_constraint
       WHERE conrelid = 'public.estoque_movimentacoes'::regclass
         AND conname  = 'estoque_movimentacoes_item_id_fkey'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].confdeltype).toBe('a');
  });

  it('FK deve referenciar estoque_itens(id)', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'public.estoque_movimentacoes'::regclass
         AND conname  = 'estoque_movimentacoes_item_id_fkey'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].def.toLowerCase()).toContain('estoque_itens(id)');
  });
});

// ---------------------------------------------------------------------------
// Suite 9: Auditoria
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 9 — Triggers de auditoria inalterados', () => {
  for (const trigger of [
    'trg_audit_estoque_itens',
    'trg_protect_quantidade_atual',
    'trg_updated_at_estoque_itens',
  ]) {
    it(`${trigger} deve existir`, async () => {
      assertLocalOnlyStatus(await loadLocalSupabaseStatus());
      const rows = await queryLocalRows(
        `SELECT trigger_name FROM information_schema.triggers
         WHERE event_object_schema = 'public'
           AND event_object_table  = 'estoque_itens'
           AND trigger_name        = '${trigger}'`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 10: Não-regressão
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 10 — Nao-regressao (policies PP3-B.1/B.2)', () => {
  const allPolicies = [
    { table: 'paciente_alergias', policy: 'paciente_alergias_select_clinico' },
    { table: 'paciente_comorbidades', policy: 'paciente_comorbidades_select_clinico' },
    { table: 'paciente_medicamentos_continuos', policy: 'paciente_medicamentos_continuos_select_clinico' },
    { table: 'paciente_alertas_clinicos', policy: 'paciente_alertas_clinicos_select_clinico' },
    { table: 'paciente_medicamentos_continuos', policy: 'paciente_medicamentos_continuos_insert_clinico' },
    { table: 'paciente_alertas_clinicos', policy: 'paciente_alertas_clinicos_insert_clinico' },
  ];

  for (const { table, policy } of allPolicies) {
    it(`policy ${policy} deve continuar existindo em ${table}`, async () => {
      assertLocalOnlyStatus(await loadLocalSupabaseStatus());
      const rows = await queryLocalRows(
        `SELECT policyname FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename  = '${table}'
           AND policyname = '${policy}'`,
      );
      expect(rows).toHaveLength(1);
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 11: Static — migration
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 11 — Análise estática da migration', () => {
  let migrationSql;

  beforeAll(() => {
    migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
  });

  it('migration deve conter todos os guardioes G-1..G-17', () => {
    for (let i = 1; i <= 17; i++) {
      expect(migrationSql).toContain(`[G-${i}]`);
    }
  });

  it('migration deve embedar hash baseline BASELINE_MD5 no guard G-16', () => {
    expect(migrationSql).toContain(BASELINE_MD5);
  });

  it('migration deve validar proconfig = {search_path=public} no guard G-15', () => {
    expect(migrationSql.toLowerCase()).toContain('search_path=public');
    expect(migrationSql.toLowerCase()).toContain('proconfig');
  });

  it('migration deve validar owner=postgres no guard G-15', () => {
    expect(migrationSql).toContain("'postgres'");
  });

  it('migration deve validar prosecdef no guard G-15', () => {
    expect(migrationSql.toLowerCase()).toContain('prosecdef');
  });

  it('migration deve validar linguagem plpgsql no guard G-15', () => {
    expect(migrationSql).toContain("'plpgsql'");
  });

  it('migration deve validar retorno trigger no guard G-15', () => {
    expect(migrationSql).toContain("'trigger'");
  });

  it('migration deve validar ausencia de EXECUTE grant para authenticated no guard G-15', () => {
    expect(migrationSql.toLowerCase()).toContain('authenticated');
    expect(migrationSql.toLowerCase()).toContain('execute');
  });

  it('migration NAO deve conter ON DELETE CASCADE em ADD CONSTRAINT', () => {
    const stripped = stripLineComments(migrationSql);
    const blocks = stripped.toLowerCase().match(/add\s+constraint[\s\S]*?;/g);
    if (blocks) {
      for (const block of blocks) {
        expect(block).not.toContain('on delete cascade');
      }
    }
  });

  it('migration deve criar policy SELECT com filtro ativo=true', () => {
    const block = extractCreatePolicyBlock(migrationSql, 'estoque_itens_select_operacional');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toContain('ativo');
  });

  it('migration deve criar policy INSERT com estoque.cadastrar', () => {
    const block = extractCreatePolicyBlock(migrationSql, 'estoque_itens_insert_cadastro');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toContain('estoque.cadastrar');
  });

  it('migration deve criar policy UPDATE com estoque.cadastrar', () => {
    const block = extractCreatePolicyBlock(migrationSql, 'estoque_itens_update_cadastro');
    expect(block).not.toBeNull();
    expect(block.toLowerCase()).toContain('estoque.cadastrar');
  });

  it('migration NAO deve criar policy DELETE', () => {
    const stripped = stripLineComments(migrationSql);
    const blocks = stripped.match(/create\s+policy\s+\S+\s+on\s+[^\n]+for\s+delete/gi);
    expect(blocks).toBeNull();
  });

  it('migration deve usar ON CONFLICT DO NOTHING para perfil_permissao', () => {
    expect(migrationSql.toLowerCase()).toContain('on conflict do nothing');
  });

  it('migration deve usar ON CONFLICT (chave) DO NOTHING para permissoes', () => {
    expect(migrationSql.toLowerCase()).toContain('on conflict (chave) do nothing');
  });

  it('migration deve incluir SET search_path = public na funcao modificada', () => {
    const match = migrationSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?as\s+\$\$/i,
    );
    expect(match).not.toBeNull();
    expect(match[0].toLowerCase()).toContain('set search_path');
    expect(match[0].toLowerCase()).toContain('public');
  });

  it('migration deve conter GAP 1 (fn_protect_quantidade_inicial)', () => {
    expect(migrationSql.toLowerCase()).toContain('fn_protect_quantidade_inicial');
    expect(migrationSql.toLowerCase()).toContain('trg_protect_quantidade_inicial');
    expect(migrationSql.toLowerCase()).toContain('is distinct from 0');
  });

  it('migration deve conter GAP 2 (v_ativo e not v_ativo)', () => {
    const stripped = stripLineComments(migrationSql);
    expect(stripped.toLowerCase()).toContain('v_ativo');
    expect(stripped.toLowerCase()).toContain('not v_ativo');
  });
});

// ---------------------------------------------------------------------------
// Suite 12: Static — rollback
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 12 — Análise estática do rollback', () => {
  let rollbackSql;

  beforeAll(() => {
    rollbackSql = readFileSync(ROLLBACK_FILE, 'utf8');
  });

  it('rollback deve conter guardioes R-G1..R-G7', () => {
    for (let i = 1; i <= 7; i++) {
      expect(rollbackSql).toContain(`[R-G${i}]`);
    }
  });

  it('rollback deve embedar POSTMIG_MD5 no guard R-G7', () => {
    expect(rollbackSql).toContain(POSTMIG_MD5);
  });

  it('rollback R-G7 deve validar proconfig pos-migration', () => {
    expect(rollbackSql.toLowerCase()).toContain('search_path=public');
    expect(rollbackSql.toLowerCase()).toContain('proconfig');
  });

  it('rollback R-G7 deve validar owner pos-migration', () => {
    expect(rollbackSql).toContain("'postgres'");
  });

  it('rollback R-G7 deve validar prosecdef pos-migration', () => {
    expect(rollbackSql.toLowerCase()).toContain('prosecdef');
  });

  it('rollback deve restaurar as 2 policies baseline', () => {
    expect(rollbackSql.toLowerCase()).toContain('estoque_itens_select_farmacia');
    expect(rollbackSql.toLowerCase()).toContain('estoque_itens_write_farmacia_admin');
  });

  it('rollback deve remover as 3 novas policies antes de recriar', () => {
    expect(rollbackSql.toLowerCase()).toContain('estoque_itens_select_operacional');
    expect(rollbackSql.toLowerCase()).toContain('estoque_itens_insert_cadastro');
    expect(rollbackSql.toLowerCase()).toContain('estoque_itens_update_cadastro');
  });

  it('rollback deve restaurar FK CASCADE', () => {
    expect(rollbackSql.toLowerCase()).toContain('on delete cascade');
  });

  it('rollback NAO deve fazer DROP TABLE nem TRUNCATE', () => {
    const stripped = stripLineComments(rollbackSql).toLowerCase();
    expect(stripped).not.toMatch(/drop\s+table/);
    expect(stripped).not.toMatch(/truncate/);
  });

  it('rollback deve restaurar fn com SET search_path = public', () => {
    const match = rollbackSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?as\s+\$\$/i,
    );
    expect(match).not.toBeNull();
    expect(match[0].toLowerCase()).toContain('set search_path');
  });

  it('rollback deve restaurar fn sem v_ativo no corpo', () => {
    const match = rollbackSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?\$\$\s*;/i,
    );
    expect(match).not.toBeNull();
    // Strip header, pegar so o corpo entre $$ ... $$
    const bodyMatch = match[0].match(/\$\$([\s\S]+)\$\$/);
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch[1].toLowerCase();
    expect(body).not.toContain('v_ativo');
    expect(body).toContain('gsi.allow_quantidade_update');
  });

  it('rollback deve remover trigger trg_protect_quantidade_inicial', () => {
    expect(rollbackSql.toLowerCase()).toContain(
      'drop trigger if exists trg_protect_quantidade_inicial',
    );
  });

  it('rollback deve remover funcao fn_protect_quantidade_inicial', () => {
    expect(rollbackSql.toLowerCase()).toContain(
      'drop function if exists public.fn_protect_quantidade_inicial',
    );
  });

  it('BASELINE_MD5 deve constar no rollback (identificacao da funcao restaurada)', () => {
    expect(rollbackSql).toContain(BASELINE_MD5);
  });
});

// ---------------------------------------------------------------------------
// Suite 13: GAP 1 — Saldo inicial (trg_protect_quantidade_inicial)
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 13 — GAP 1: saldo inicial protegido', () => {
  it('[static] migration deve conter is distinct from 0 na funcao de protecao', () => {
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
    expect(stripLineComments(migrationSql).toLowerCase()).toContain('is distinct from 0');
  });

  it('trg_protect_quantidade_inicial deve existir como BEFORE INSERT em estoque_itens', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT trigger_name, event_manipulation, action_timing
       FROM information_schema.triggers
       WHERE event_object_schema = 'public'
         AND event_object_table  = 'estoque_itens'
         AND trigger_name        = 'trg_protect_quantidade_inicial'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].event_manipulation).toBe('INSERT');
    expect(rows[0].action_timing).toBe('BEFORE');
  });

  it('fn_protect_quantidade_inicial deve ser SECURITY INVOKER', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosecdef FROM pg_proc WHERE proname = 'fn_protect_quantidade_inicial'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(false);
  });

  it('corpo de fn_protect_quantidade_inicial deve conter is distinct from 0', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosrc FROM pg_proc WHERE proname = 'fn_protect_quantidade_inicial'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosrc.toLowerCase()).toContain('is distinct from 0');
  });

  it('[DML] INSERT com quantidade_atual != 0 deve ser rejeitado pelo trigger', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    try {
      await expect(
        Promise.resolve().then(() =>
          execLocalRows(
            `INSERT INTO public.estoque_itens
               (nome, quantidade_atual, quantidade_minima)
             VALUES ('PP3B3_TESTE_TRANSACIONAL', 100, 0)
             RETURNING id`,
          ),
        ),
      ).rejects.toThrow();
    } finally {
      // Cleanup: remove test row if INSERT succeeded (trigger absent pre-migration).
      // Post-migration the INSERT fails before inserting, so nothing to remove.
      try {
        execLocalRows(
          `DELETE FROM public.estoque_itens
           WHERE nome = 'PP3B3_TESTE_TRANSACIONAL'
           RETURNING id`,
        );
      } catch (_) {}
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 14: GAP 2 — Item inativo não movimenta
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 14 — GAP 2: item inativo nao recebe movimentacao', () => {
  it('[static] migration fn_estoque_aplicar_movimentacao deve declarar v_ativo boolean', () => {
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
    const stripped = stripLineComments(migrationSql);
    const match = stripped.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?\$\$\s*;/i,
    );
    expect(match).not.toBeNull();
    expect(match[0].toLowerCase()).toContain('v_ativo');
    expect(match[0].toLowerCase()).toContain('boolean');
  });

  it('fn_estoque_aplicar_movimentacao deve continuar sendo SECURITY DEFINER', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosecdef FROM pg_proc WHERE proname = 'fn_estoque_aplicar_movimentacao'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(true);
  });

  it('proconfig deve ser {search_path=public}', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT proconfig FROM pg_proc
       JOIN pg_namespace n ON n.oid = pronamespace
       WHERE proname = 'fn_estoque_aplicar_movimentacao' AND n.nspname = 'public'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].proconfig).toContain('search_path=public');
  });

  it('corpo deve conter v_ativo e a verificacao IF NOT v_ativo', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosrc FROM pg_proc WHERE proname = 'fn_estoque_aplicar_movimentacao'`,
    );
    expect(rows).toHaveLength(1);
    const body = rows[0].prosrc.toLowerCase();
    expect(body).toContain('v_ativo');
    expect(body).toContain('not v_ativo');
  });

  it('verificacao de ativo deve aparecer antes de saldo negativo no corpo', async () => {
    assertLocalOnlyStatus(await loadLocalSupabaseStatus());
    const rows = await queryLocalRows(
      `SELECT prosrc FROM pg_proc WHERE proname = 'fn_estoque_aplicar_movimentacao'`,
    );
    expect(rows).toHaveLength(1);
    const body = rows[0].prosrc.toLowerCase();
    expect(body.indexOf('not v_ativo')).toBeLessThan(body.indexOf('v_quantidade_resultante < 0'));
  });

  it('[static] funcao na migration inclui SET search_path = public', () => {
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
    const match = migrationSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?as\s+\$\$/i,
    );
    expect(match).not.toBeNull();
    expect(match[0].toLowerCase()).toContain('set search_path');
  });

  it('[static] rollback deve restaurar funcao sem v_ativo (baseline exato)', () => {
    const rollbackSql = readFileSync(ROLLBACK_FILE, 'utf8');
    const match = rollbackSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?\$\$\s*;/i,
    );
    expect(match).not.toBeNull();
    const bodyMatch = match[0].match(/\$\$([\s\S]+)\$\$/);
    const body = bodyMatch[1].toLowerCase();
    expect(body).not.toContain('v_ativo');
    expect(body).toContain('gsi.allow_quantidade_update');
  });
});

// ---------------------------------------------------------------------------
// Suite 15: Guard de drift — testes de mutação do corpo da função crítica
//
// Estes testes provam que o algoritmo de detecção de drift (MD5 normalizado)
// detectaria qualquer mudança no corpo da função. Executam puramente em memória,
// sem acesso ao banco — compatíveis com estado pré-migration.
//
// Para cada mutação: aplica a modificação ao corpo baseline, normaliza, computa
// MD5, verifica que difere do BASELINE_MD5. Isso prova que o guard G-16 da
// migration (e R-G7 do rollback) detectariam a mutação.
// ---------------------------------------------------------------------------

describe('PP3-B.3 Suite 15 — Guard drift: testes de mutação do corpo da função', () => {
  let rollbackSql;
  let baselineBody;
  let postmigBody;

  beforeAll(() => {
    rollbackSql = readFileSync(ROLLBACK_FILE, 'utf8');
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');

    // Extrair corpo baseline do rollback (funcao restaurada = baseline)
    const baselineMatch = rollbackSql.match(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?\$\$([\s\S]+?)\$\$\s*;/i,
    );
    baselineBody = baselineMatch ? baselineMatch[1] : '';

    // Extrair corpo pos-migration da migration (funcao com v_ativo)
    // Pega o ultimo match de fn_estoque_aplicar_movimentacao (secao E3)
    const allMatches = [...migrationSql.matchAll(
      /create\s+or\s+replace\s+function\s+public\.fn_estoque_aplicar_movimentacao[\s\S]*?\$\$([\s\S]+?)\$\$\s*;/gi,
    )];
    postmigBody = allMatches.length > 0
      ? allMatches[allMatches.length - 1][1]
      : '';
  });

  // Verifica que os hashes conhecidos correspondem aos corpos extraidos
  it('corpo baseline do rollback deve ter MD5 = BASELINE_MD5', () => {
    expect(baselineBody).not.toBe('');
    expect(md5hex(normalizeProsrc(baselineBody))).toBe(BASELINE_MD5);
  });

  it('corpo pos-migration da migration deve ter MD5 = POSTMIG_MD5', () => {
    expect(postmigBody).not.toBe('');
    expect(md5hex(normalizeProsrc(postmigBody))).toBe(POSTMIG_MD5);
  });

  it('BASELINE_MD5 e POSTMIG_MD5 sao distintos (modificacao detectada)', () => {
    expect(BASELINE_MD5).not.toBe(POSTMIG_MD5);
  });

  // Mutacoes no corpo baseline — cada uma deve mudar o MD5
  it('[mutacao] alterar calculo do delta muda o MD5', () => {
    const mutated = baselineBody.replace(
      'v_delta := NEW.quantidade;',
      'v_delta := NEW.quantidade * 2;',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] remover FOR UPDATE muda o MD5', () => {
    const mutated = baselineBody.replace('for update;', ';');
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] alterar protecao de saldo negativo muda o MD5', () => {
    const mutated = baselineBody.replace(
      'v_quantidade_resultante < 0',
      'v_quantidade_resultante < -10',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] remover gsi.allow_quantidade_update (primeira chamada) muda o MD5', () => {
    const mutated = baselineBody.replace(
      "perform set_config('gsi.allow_quantidade_update', 'on', true);",
      '',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] remover gsi.allow_quantidade_update (segunda chamada) muda o MD5', () => {
    const mutated = baselineBody.replace(
      "perform set_config('gsi.allow_quantidade_update', 'off', true);",
      '',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] adicionar logica arbitraria ao corpo baseline muda o MD5', () => {
    const mutated = baselineBody.replace(
      'return NEW;',
      'raise notice \'log extra\'; return NEW;',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] trocar comparador de saldo para <= muda o MD5', () => {
    const mutated = baselineBody.replace(
      'v_quantidade_resultante < 0',
      'v_quantidade_resultante <= 0',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  it('[mutacao] alterar mensagem de erro de entrada muda o MD5', () => {
    const mutated = baselineBody.replace(
      'Movimentacao de entrada deve ter quantidade positiva.',
      'Movimentacao de entrada deve ser positiva.',
    );
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(BASELINE_MD5);
  });

  // Mutacoes no corpo pos-migration — cada uma deve mudar o POSTMIG_MD5
  it('[mutacao rollback] corpo pos-migration sem v_ativo teria MD5 diferente de POSTMIG_MD5', () => {
    // Simula: se o rollback precisasse validar um corpo sem v_ativo (seria o baseline)
    const withoutVAtivo = postmigBody
      .replace(/v_ativo\s+boolean;?\n?/i, '')
      .replace(/,\s*ativo\s*\n/i, '\n')
      .replace(/,\s*v_ativo\s*\n/i, '\n')
      .replace(/if not v_ativo then[\s\S]*?end if;\s*/i, '');
    expect(md5hex(normalizeProsrc(withoutVAtivo))).not.toBe(POSTMIG_MD5);
  });

  it('[mutacao rollback] corpo pos-migration com verificacao de ativo invertida muda POSTMIG_MD5', () => {
    const mutated = postmigBody.replace('if not v_ativo then', 'if v_ativo then');
    expect(md5hex(normalizeProsrc(mutated))).not.toBe(POSTMIG_MD5);
  });

  // Prova que o guard G-16 detecta se alguem embeda o hash errado
  it('[static] migration embeda BASELINE_MD5 correto no guard G-16', () => {
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
    // Extrai o hash embutido no guard
    const match = migrationSql.match(/v_baseline_md5\s+constant\s+text\s*:=\s*'([a-f0-9]{32})'/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe(BASELINE_MD5);
  });

  it('[static] rollback embeda POSTMIG_MD5 correto no guard R-G7', () => {
    const rollbackSql = readFileSync(ROLLBACK_FILE, 'utf8');
    const match = rollbackSql.match(/v_postmig_md5\s+constant\s+text\s*:=\s*'([a-f0-9]{32})'/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe(POSTMIG_MD5);
  });
});
