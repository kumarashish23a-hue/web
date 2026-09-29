/** snake_case (DB) -> camelCase (API JSON) mapping at the API boundary. */

export function toCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function normaliseValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(normaliseValue);
  if (v !== null && typeof v === "object") {
    // jsonb objects pass through as-is (keys stay as stored)
    return v;
  }
  return v;
}

/** Convert one DB row's keys to camelCase. */
export function camelRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamel(k)] = normaliseValue(v);
  }
  return out as T;
}

/** Convert an array of DB rows' keys to camelCase. */
export function camelRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => camelRow<T>(r));
}
