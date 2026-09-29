/** Query-string helpers (Express 5 types query values as string | string[] | ...). */

/** First string value of a query param, or undefined. */
export function qp(q: unknown, name: string): string | undefined {
  const v = (q as Record<string, unknown> | undefined)?.[name];
  if (Array.isArray(v)) return typeof v[0] === "string" ? (v[0] as string) : undefined;
  return typeof v === "string" ? v : undefined;
}

/** First string value of a route param (Express 5 types these as string | string[]). */
export function pp(p: unknown, name: string): string {
  const v = qp(p, name);
  if (v === undefined) throw new Error(`Missing route param: ${name}`);
  return v;
}
