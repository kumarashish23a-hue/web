/**
 * Single DB access point for the backend.
 *
 * - Default: `pg` Pool against DATABASE_URL.
 * - Tests/dev without Postgres: DB_ADAPTER=pglite uses @electric-sql/pglite
 *   in-memory and auto-applies ../../database/migrations/*.sql on first
 *   connect (sorted by filename).
 *
 * Both drivers expose `query(text, params)` returning `{ rows }`, so the rest
 * of the codebase stays driver-agnostic.
 */
import { readdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface DbRow {
  [key: string]: unknown;
}
export interface QueryResult {
  rows: DbRow[];
  rowCount: number;
}

type QueryFn = (text: string, params?: unknown[]) => Promise<QueryResult>;

let queryFn: QueryFn | null = null;
/** Multi-statement execution (migrations, fixtures). PGlite needs .exec(). */
let execFn: ((sql: string) => Promise<void>) | null = null;
let schemaReady: Promise<number> | null = null;
let pgliteDb: { query: QueryFn; close: () => Promise<void> } | null = null;
let pgPool: { query: QueryFn; end: () => Promise<void> } | null = null;

function backendDir(): string {
  // Walk up from this file until we find the backend package root, so the
  // migrations path works from src (tsx), dist, and tests alike.
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as { name?: string };
      if (pkg.name === "ai-discover-backend") return dir;
    } catch {
      /* keep walking up */
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("backend package root not found");
    dir = parent;
  }
}

function migrationsDir(): string {
  return path.resolve(backendDir(), "..", "database", "migrations");
}

async function applyMigrations(): Promise<number> {
  let files: string[] = [];
  try {
    files = (await readdir(migrationsDir()))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return 0; // no migrations directory (DB worker may not have landed yet)
  }
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir(), file), "utf8");
    if (sql.trim().length > 0) {
      await getExec()(sql);
    }
  }
  return files.length;
}

function getExec(): (sql: string) => Promise<void> {
  if (!execFn) throw new Error("DB not initialised — call initDb() first");
  return execFn;
}

/** Apply one SQL file's contents through the exec path. */
export async function applySqlFile(filePath: string): Promise<void> {
  await initDb();
  const sql = await readFile(filePath, "utf8");
  if (sql.trim().length > 0) await getExec()(sql);
}

/** Apply raw SQL text (used by tests for fixture schema). */
export async function applySqlText(sql: string): Promise<void> {
  await initDb();
  if (sql.trim().length > 0) await getExec()(sql);
}

function getQuery(): QueryFn {
  if (!queryFn) throw new Error("DB not initialised — call initDb() first");
  return queryFn;
}

/** Idempotent initialiser. Returns number of migration files applied. */
export async function initDb(): Promise<number> {
  if (!schemaReady) {
    schemaReady = (async () => {
      if (process.env.DB_ADAPTER === "pglite") {
        const { PGlite } = await import("@electric-sql/pglite");
        const db = new PGlite();
        pgliteDb = db as unknown as { query: QueryFn; close: () => Promise<void> };
        queryFn = async (text, params) => {
          const res = await db.query(text, params as unknown[]);
          const rows = res.rows as DbRow[];
          const rowCount = (res as { rowCount?: number }).rowCount ?? rows.length;
          return { rows, rowCount };
        };
        execFn = async (sql: string) => {
          await db.exec(sql);
        };
      } else {
        if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL is not set (or use DB_ADAPTER=pglite)");
        }
        const { Pool } = await import("pg");
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pgPool = pool as unknown as { query: QueryFn; end: () => Promise<void> };
        queryFn = async (text, params) => {
          const res = await pool.query(text, params);
          return { rows: res.rows as DbRow[], rowCount: res.rowCount ?? 0 };
        };
        execFn = async (sql: string) => {
          await pool.query(sql);
        };
      }
      return applyMigrations();
    })();
  }
  return schemaReady;
}

/** Single query export used across the backend. */
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  await initDb();
  return getQuery()(text, params);
}

export async function closeDb(): Promise<void> {
  if (pgliteDb) await pgliteDb.close().catch(() => undefined);
  if (pgPool) await pgPool.end().catch(() => undefined);
  pgliteDb = null;
  pgPool = null;
  queryFn = null;
  execFn = null;
  schemaReady = null;
}
