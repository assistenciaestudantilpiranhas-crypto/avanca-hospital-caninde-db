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
