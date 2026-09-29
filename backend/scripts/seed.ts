/**
 * Apply the fictional demo seed (database/seeds/001_demo_seed.sql).
 * The seed is idempotent (fixed UUIDs + ON CONFLICT DO NOTHING).
 * Run with: npm run db:seed
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applySqlFile, closeDb, initDb } from "../src/db.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

await initDb();
await applySqlFile(path.join(repoRoot, "database", "seeds", "001_demo_seed.sql"));
console.log("demo seed applied");
await closeDb();
