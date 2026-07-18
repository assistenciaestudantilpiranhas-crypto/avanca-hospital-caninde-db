import { vi } from "vitest";

export function createMockSupabaseAuth({
  signInResult = {
    data: { user: { id: "auth-user" }, session: { user: { id: "auth-user" } } },
    error: null,
  },
  signOutResult = { error: null },
  sessionResult = { data: { session: null }, error: null },
  tables = {},
} = {}) {
  const calls = {
    from: [],
    authEvents: [],
  };
  const subscribers = [];

  const client = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(signInResult),
      signOut: vi.fn().mockResolvedValue(signOutResult),
      getSession: vi.fn().mockResolvedValue(sessionResult),
      onAuthStateChange: vi.fn((callback) => {
        subscribers.push(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from(tableName) {
      calls.from.push(tableName);
      return createQueryBuilder(tableName, tables);
    },
  };

  async function emitAuthEvent(event, session) {
    calls.authEvents.push(event);
    await Promise.all(subscribers.map((callback) => callback(event, session)));
  }

  return { client, calls, emitAuthEvent };
}

function createQueryBuilder(tableName, tables) {
  const table = tables[tableName] || {};
  const query = {
    filters: {},
    select() {
      return query;
    },
    eq(column, value) {
      query.filters[column] = value;
      return query;
    },
    in(column, values) {
      query.filters[column] = values;
      return query;
    },
    async maybeSingle() {
      if (table.error) return { data: null, error: table.error };
      const rows = resolveRows(table, query.filters);
      return { data: rows[0] || null, error: null };
    },
    then(resolve, reject) {
      if (table.error)
        return Promise.resolve({ data: null, error: table.error }).then(resolve, reject);
      return Promise.resolve({ data: resolveRows(table, query.filters), error: null }).then(
        resolve,
        reject
      );
    },
  };
  return query;
}

function resolveRows(table, filters) {
  const rows = typeof table.rows === "function" ? table.rows(filters) : table.rows || [];
  return rows.filter((row) =>
    Object.entries(filters).every(([column, value]) => {
      if (Array.isArray(value)) return value.includes(row[column] || row.perfil_id);
      return row[column] === value;
    })
  );
}
