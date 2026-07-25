import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LOCAL_HOST_PATTERN = /^(127\.0\.0\.1|localhost)$/i;
let cachedStatus = null;
let cachedContainer = null;

export function loadLocalSupabaseStatus() {
  if (cachedStatus) return cachedStatus;
  findLocalDbContainer();
  cachedStatus = {
    API_URL: "http://127.0.0.1:54321",
    DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    REST_URL: "http://127.0.0.1:54321/rest/v1",
    GRAPHQL_URL: "http://127.0.0.1:54321/graphql/v1",
  };
  assertLocalOnlyStatus(cachedStatus);
  return cachedStatus;
}

export function assertLocalOnlyStatus(status = loadLocalSupabaseStatus()) {
  const urls = [status.API_URL, status.DB_URL, status.REST_URL, status.GRAPHQL_URL].filter(Boolean);
  for (const value of urls) {
    const url = new URL(value.replace(/^postgresql:\/\//, "http://"));
    if (!LOCAL_HOST_PATTERN.test(url.hostname)) {
      throw new Error(`Recusado: Supabase nao-local detectado em ${value}`);
    }
    if (/supabase\.co/i.test(value)) throw new Error(`Recusado: host Cloud detectado em ${value}`);
  }
  return true;
}

export function findLocalDbContainer() {
  if (cachedContainer) return cachedContainer;
  const raw = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  const name = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("supabase_db_"));
  if (!name) throw new Error("Container local supabase_db_* nao encontrado.");
  cachedContainer = name;
  return name;
}

export function readSecuritySql(relativePath) {
  return readFileSync(new URL(`../security/sql/${relativePath}`, import.meta.url), "utf8");
}

// execLocalRows: equivalente a queryLocalRows mas para DML (INSERT/UPDATE/DELETE ... RETURNING).
// Usa "WITH _q AS (...) SELECT json_agg..." para manter o DML no nivel superior da instrucao,
// evitando o erro "data-modifying statement must be at the top level" do PostgreSQL.
export function execLocalRows(sql) {
  assertLocalOnlyStatus();
  const cleanSql = sql.trim().replace(/;+\s*$/g, "");
  const wrapped = `with _q as (${cleanSql}) select coalesce(json_agg(row_to_json(_q)), '[]'::json) from _q`;
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      findLocalDbContainer(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      wrapped,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`Falha ao executar DML local: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout.trim() || "[]");
}

export function queryLocalRows(sql) {
  assertLocalOnlyStatus();
  const cleanSql = sql.trim().replace(/;+\s*$/g, "");
  const wrapped = `select coalesce(json_agg(row_to_json(q)), '[]'::json) from (${cleanSql}) q`;
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      findLocalDbContainer(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      wrapped,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`Falha ao consultar Supabase local: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout.trim() || "[]");
}

export function querySqlFile(relativePath) {
  return queryLocalRows(readSecuritySql(relativePath));
}

/**
 * Resolve a chave de servico (admin) do Supabase local.
 *
 * Suporta dois formatos de saida do CLI:
 *   1. `supabase status -o env`  →  KEY="value" (preferido; estavel entre versoes)
 *   2. `supabase status`         →  JSON {"KEY": "value"} ou human-readable
 *
 * Hierarquia de preferencia da chave (ambas funcionam como admin key local):
 *   SERVICE_ROLE_KEY (JWT)  >  SECRET_KEY (sb_secret_...)
 *
 * Mapeamento dos formatos de CLI:
 *   Formato antigo  →  ANON_KEY / SERVICE_ROLE_KEY
 *   Formato atual   →  PUBLISHABLE_KEY (anon/public) / SECRET_KEY (admin)
 *   Ambos coexistem no formato -o env para compatibilidade.
 *
 * Protecao local-only: valida API_URL antes de retornar.
 *
 * Lanca excecao se nenhuma chave for encontrada — nunca retorna null.
 * O caller deve tratar a excecao como falha de setup (nao skip).
 */
export function resolveLocalServiceKey() {
  // shell:true + string de comando e necessario no Windows para executar
  // arquivos .cmd (npx.cmd) — cmd.exe e o unico que pode interpretar batch files.
  // Em Linux/Mac, shell:true com "npx" tambem funciona corretamente.
  const shellCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  // Tentativa 1: saida estruturada  supabase status -o env
  // Formato: KEY="value"  (estavel entre versoes do CLI)
  const envResult = spawnSync(
    `${shellCmd} supabase status -o env`,
    { encoding: "utf8", shell: true, cwd: process.cwd() }
  );
  const envText = (envResult.stdout ?? "") + (envResult.stderr ?? "");

  // Valida API_URL local-only (se presente na saida)
  const apiUrlEnvMatch = envText.match(/^API_URL="?([^"\n\r]+)"?/m);
  if (apiUrlEnvMatch) {
    const apiUrl = apiUrlEnvMatch[1].trim();
    try {
      const u = new URL(apiUrl);
      if (!LOCAL_HOST_PATTERN.test(u.hostname))
        throw new Error(`Recusado: API_URL nao-local detectada: ${apiUrl}`);
      if (/supabase\.co/i.test(apiUrl))
        throw new Error(`Recusado: host Cloud detectado em API_URL: ${apiUrl}`);
    } catch (e) {
      if (e.message.startsWith("Recusado:")) throw e;
    }
  }

  // Extrai KEY="value" ou KEY=value de qualquer linha do output env
  const parseEnvLine = (text, key) => {
    const m = text.match(new RegExp(`(?:^|\\r?\\n)${key}="?([^"\\n\\r]+)"?`));
    return m?.[1]?.trim() ?? null;
  };

  // SERVICE_ROLE_KEY (JWT — compativel com Auth Admin API como Bearer token)
  // SECRET_KEY      (sb_secret_... — novo formato do CLI, aceito como apikey)
  const keyFromEnv =
    parseEnvLine(envText, "SERVICE_ROLE_KEY") ??
    parseEnvLine(envText, "SECRET_KEY");
  if (keyFromEnv) return keyFromEnv;

  // Tentativa 2: saida plain  supabase status  (JSON ou human-readable)
  const plainResult = spawnSync(
    `${shellCmd} supabase status`,
    { encoding: "utf8", shell: true, cwd: process.cwd() }
  );
  const plainText = (plainResult.stdout ?? "") + (plainResult.stderr ?? "");

  // JSON: "SERVICE_ROLE_KEY": "eyJ..."
  let m = plainText.match(/"SERVICE_ROLE_KEY":\s*"([^"]+)"/);
  if (m) return m[1];

  // JSON: "SECRET_KEY": "sb_secret_..."
  m = plainText.match(/"SECRET_KEY":\s*"([^"]+)"/);
  if (m) return m[1];

  // Human-readable CLI antigo: "service_role key: eyJ..."
  m = plainText.match(/service_role\s+key\s*:\s*(\S+)/i);
  if (m) return m[1];

  // Human-readable CLI atual: "   Secret: sb_secret_..." ou "Secret key: sb_secret_..."
  m = plainText.match(/^\s*Secret(?:\s+key)?\s*:\s*(\S+)/im);
  if (m) return m[1];

  throw new Error(
    "Chave de servico Supabase local nao encontrada. " +
      "Verifique: 'npx.cmd supabase status -o env' deve conter SERVICE_ROLE_KEY ou SECRET_KEY."
  );
}
