import { vi } from "vitest";

export function createMockSupabaseQuery(tables = {}) {
  const calls = [];
  const normalizedTables = Object.fromEntries(
    Object.entries(tables).map(([name, table]) => [name, normalizeTable(name, table)])
  );
  const client = {
    from(tableName) {
      const state = {
        tableName,
        filters: {},
        inFilters: {},
        orderBy: null,
        limitValue: null,
        operation: "select",
        payload: null,
      };
      calls.push({ table: tableName, state });
      return builder(state, normalizedTables[tableName] || normalizeTable(tableName, {}));
    },
  };
  return { client, calls, tables: normalizedTables };
}

function normalizeTable(name, table) {
  if (Array.isArray(table)) return { rows: [...table], sequence: 1, name };
  return { rows: [...(table.rows || [])], sequence: table.sequence || 1, name, ...table };
}

function builder(state, table) {
  const api = {
    select() {
      return api;
    },
    eq(column, value) {
      state.filters[column] = value;
      return api;
    },
    in(column, values) {
      state.inFilters[column] = values;
      return api;
    },
    order(column, options) {
      state.orderBy = { column, options };
      return api;
    },
    limit(value) {
      state.limitValue = value;
      return api;
    },
    insert(payload) {
      state.operation = "insert";
      state.payload = payload;
      return api;
    },
    update(payload) {
      state.operation = "update";
      state.payload = payload;
      return api;
    },
    async maybeSingle() {
      const result = resolve(table, state);
      if (result.error) return result;
      return { data: (result.data || [])[0] || null, error: null };
    },
    async single() {
      const result = resolve(table, state);
      if (result.error) return result;
      return { data: Array.isArray(result.data) ? result.data[0] : result.data, error: null };
    },
    then(resolveThen, rejectThen) {
      return Promise.resolve(resolve(table, state)).then(resolveThen, rejectThen);
    },
  };
  return api;
}

function resolve(table, state) {
  if (table.error) return { data: null, error: table.error };
  if (state.operation === "insert") return insertRow(table, state);
  if (state.operation === "update") return updateRows(table, state);
  return { data: selectRows(table, state), error: null };
}

function insertRow(table, state) {
  if (table.insertError) return { data: null, error: table.insertError };
  if (table.insertResult) return { data: table.insertResult, error: null };
  const payload = Array.isArray(state.payload) ? state.payload[0] : state.payload;
  const row = { id: `${state.tableName}-${table.sequence++}`, ...payload };
  table.rows.push(row);
  return { data: [row], error: null };
}

function updateRows(table, state) {
  if (table.updateError) return { data: null, error: table.updateError };
  if (table.updateResult) return { data: table.updateResult, error: null };
  const matches = selectRows(table, { ...state, operation: "select" });
  const updated = matches.map((row) => {
    Object.assign(row, state.payload);
    return row;
  });
  return { data: updated, error: null };
}

function selectRows(table, state) {
  let rows = typeof table.rows === "function" ? table.rows(state) : [...(table.rows || [])];
  rows = rows.filter((row) =>
    Object.entries(state.filters).every(([key, value]) => row[key] === value)
  );
  rows = rows.filter((row) =>
    Object.entries(state.inFilters).every(([key, values]) => values.includes(row[key]))
  );
  if (state.orderBy) {
    const { column, options } = state.orderBy;
    rows.sort((a, b) => new Date(a[column] || 0) - new Date(b[column] || 0));
    if (options?.ascending === false) rows.reverse();
  }
  if (Number.isFinite(state.limitValue)) rows = rows.slice(0, state.limitValue);
  return rows;
}

export const mockQueryError = (message) => new Error(message);
export const fn = vi.fn;
