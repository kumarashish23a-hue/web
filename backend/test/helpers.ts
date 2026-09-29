/** Test helpers: boot the app against PGlite with schema, serve on ephemeral port. */
import type { Express } from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { applySqlFile, closeDb, initDb, query } from "../src/db.js";
import { buildApp } from "../src/app.js";

export async function testApp(): Promise<Express> {
  const applied = await initDb();
  if (applied === 0) {
    // Real migrations not present yet -> apply the contract-derived test schema.
    const sqlPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "test-schema.sql",
    );
    await applySqlFile(sqlPath);
  }
  return buildApp();
}

export async function startServer(app: Express): Promise<{
  base: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: async () => {
          await new Promise<void>((r) => server.close(() => r()));
          await closeDb();
        },
      });
    });
    server.on("error", reject);
  });
}

export { query, closeDb };

/** Minimal fetch wrapper returning { status, json, headers, cookies }. */
export async function api(
  base: string,
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; cookie?: string } = {},
): Promise<{ status: number; json: unknown; cookie: string | null }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.cookie) headers.cookie = opts.cookie;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const setCookie = res.headers.get("set-cookie");
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, cookie: setCookie };
}

export const data = (r: { json: unknown }): unknown =>
  (r.json as { data?: unknown } | null)?.data ?? null;

/** Create a user via the API; returns { user, accessToken, cookie }. */
export async function signupHelper(
  base: string,
  email: string,
  password = "password123",
): Promise<{ userId: string; token: string; cookie: string | null }> {
  const r = await api(base, "POST", "/api/v1/auth/signup", {
    body: { email, password, displayName: "Tester" },
  });
  if (r.status !== 201) throw new Error(`signup failed: ${r.status} ${JSON.stringify(r.json)}`);
  const d = data(r) as { user: { id: string }; accessToken: string };
  return { userId: d.user.id, token: d.accessToken, cookie: r.cookie };
}

/** Grant an admin role directly in the DB (tests only). */
export async function makeAdmin(userId: string, role = "super_admin"): Promise<string> {
  const { rows } = await query(
    "INSERT INTO admin_users (user_id, role) VALUES ($1, $2) RETURNING id",
    [userId, role],
  );
  return String(rows[0].id);
}
