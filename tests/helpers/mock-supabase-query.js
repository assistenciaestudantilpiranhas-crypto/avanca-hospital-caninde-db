import { vi } from "vitest";

export function createMockSupabaseQuery(tables = {}) {
  const calls = [];
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
      return builder(state, tables[tableName] || {});
    },
  };
  return { client, calls };
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
  if (state.operation === "insert") {
    if (table.insertError) return { data: null, error: table.insertError };
    return {
      data: table.insertResult || [{ id: `${state.tableName}-inserted`, ...state.payload }],
      error: null,
    };
  }
  if (state.operation === "update") {
    if (table.updateError) return { data: null, error: table.updateError };
    return {
      data: table.updateResult || [{ id: state.filters.id, ...state.payload }],
      error: null,
    };
  }
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
  return { data: rows, error: null };
}

export const mockQueryError = (message) => new Error(message);
export const fn = vi.fn;
