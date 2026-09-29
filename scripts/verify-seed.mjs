// verify-seed.mjs — applies migrations + ALL seed files to a fresh PGlite DB,
// then asserts:
//  (demo seed) expected row counts, all demo rows flagged, nothing verified,
//  every website has >=1 category and >=1 model link;
//  (real starter seed) 10 real websites + 24 real models, all is_demo=false,
//  every real website has >=1 category and >=1 model link, every verification
//  record is partially_verified (never 'verified'), every source has a URL,
//  and a seed re-run is idempotent.
// Prints PASS/FAIL per assertion, exits non-zero on failure.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'database', 'migrations');
const seedDir = join(root, 'database', 'seeds');

let passed = 0;
let failed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed++; console.log(`PASS  ${label}`); }
  else { failed++; failures.push(label); console.log(`FAIL  ${label}`); }
}
async function count(db, table, where = 'true') {
  const r = await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`);
  return r.rows[0].n;
}

const db = new PGlite();
try {
  const migs = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of migs) await db.exec(readFileSync(join(migDir, f), 'utf8'));
  const seeds = readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();
  if (seeds.length === 0) throw new Error('no seed files found');
  for (const f of seeds) await db.exec(readFileSync(join(seedDir, f), 'utf8'));
  console.log(`applied ${migs.length} migrations + ${seeds.length} seed files (${seeds.join(', ')})`);

  const DEMO_W = `id::text LIKE '44444444-%'`;
  const DEMO_M = `id::text LIKE '55555555-%'`;
  const REAL_W = `is_demo = false`;
  const REAL_M = `is_demo = false`;

  // ------------------------------------------- demo seed row counts ---
  ok((await count(db, 'ai_websites', `${DEMO_W}`)) === 6, 'demo seed: 6 websites');
  ok((await count(db, 'ai_models', `${DEMO_M}`)) === 6, 'demo seed: 6 models');
  ok((await count(db, 'providers', `name IN ('Nova Labs','Fable Systems')`)) === 2, 'demo seed: 2 providers');
  ok((await count(db, 'categories')) === 20, 'categories has 20 rows');
  ok((await count(db, 'capabilities')) >= 10, `capabilities has ${await count(db, 'capabilities')} rows (>=10)`);
  ok((await count(db, 'plans', 'is_demo = true')) === 9, `demo seed: 9 plans (got ${await count(db, 'plans', 'is_demo = true')})`);

  // ------------------------------------------- real seed row counts ---
  ok((await count(db, 'ai_websites', REAL_W)) === 10, `real seed: 10 websites (got ${await count(db, 'ai_websites', REAL_W)})`);
  ok((await count(db, 'ai_models', REAL_M)) === 24, `real seed: 24 models (got ${await count(db, 'ai_models', REAL_M)})`);
  ok((await count(db, 'providers', `id::text LIKE 'c1000000-%'`)) === 14, `real seed: 14 providers (got ${await count(db, 'providers', `id::text LIKE 'c1000000-%'`)})`);
  ok((await count(db, 'plans', REAL_W)) === 42, `real seed: 42 plans (got ${await count(db, 'plans', REAL_W)})`);
  ok((await count(db, 'plan_limits', `plan_id::text LIKE 'c5000000-%'`)) === 4, `real seed: 4 plan limits (got ${await count(db, 'plan_limits', `plan_id::text LIKE 'c5000000-%'`)})`);
  ok((await count(db, 'access_requirements', `id::text LIKE 'c7000000-%'`)) === 10, `real seed: 10 access_requirements (got ${await count(db, 'access_requirements', `id::text LIKE 'c7000000-%'`)})`);
  ok((await count(db, 'cancellation_policies', `id::text LIKE 'c8000000-%'`)) === 6, `real seed: 6 cancellation policies (got ${await count(db, 'cancellation_policies', `id::text LIKE 'c8000000-%'`)})`);
  ok((await count(db, 'api_access', `id::text LIKE 'c9000000-%'`)) === 10, `real seed: 10 api_access rows (got ${await count(db, 'api_access', `id::text LIKE 'c9000000-%'`)})`);
  ok((await count(db, 'sources', `id::text LIKE 'cb000000-%'`)) === 36, `real seed: 36 sources (got ${await count(db, 'sources', `id::text LIKE 'cb000000-%'`)})`);
  ok((await count(db, 'verification_records', `id::text LIKE 'cc000000-%'`)) === 34, `real seed: 34 verification records (got ${await count(db, 'verification_records', `id::text LIKE 'cc000000-%'`)})`);
  ok((await count(db, 'monitoring_checks', `id::text LIKE 'cd000000-%'`)) === 10, `real seed: 10 monitoring checks (got ${await count(db, 'monitoring_checks', `id::text LIKE 'cd000000-%'`)})`);
  ok((await count(db, 'website_models', `id::text LIKE 'c4000000-%'`)) === 26, `real seed: 26 website_model links (got ${await count(db, 'website_models', `id::text LIKE 'c4000000-%'`)})`);
  ok((await count(db, 'website_payment_methods', `website_id::text LIKE 'c2000000-%'`)) === 6, `real seed: 6 website payment methods (got ${await count(db, 'website_payment_methods', `website_id::text LIKE 'c2000000-%'`)})`);

  // --------------------------------- is_demo flags + honest statuses ---
  ok((await count(db, 'ai_websites', 'is_demo IS NOT TRUE')) === 0 || true, 'skip: mixed demo/real websites expected now');
  ok((await count(db, 'ai_websites', REAL_W)) === 10 && (await count(db, 'ai_websites', 'is_demo = true')) === 6,
     'websites split 10 real + 6 demo');
  ok((await count(db, 'ai_models', REAL_M)) === 24 && (await count(db, 'ai_models', 'is_demo = true')) === 6,
     'models split 24 real + 6 demo');
  ok((await count(db, 'verification_records', "status = 'verified'")) === 0,
     'NO verification_records row has status=verified');
  ok((await count(db, 'verification_records', `id::text LIKE 'cc000000-%' AND status = 'partially_verified'`)) === 34,
     'ALL 34 real verification records are partially_verified (never verified)');
  ok((await count(db, 'verification_records', `id::text LIKE 'cc000000-%' AND notes LIKE '%Research pass 2026-09-29%'`)) === 34,
     'ALL real verification records carry the research-pass note');
  ok((await count(db, 'verification_records', `id::text LIKE 'eeeeeeee-%' AND status = 'unverified'`)) === 5,
     'ALL 5 demo verification records stay unverified');
  ok((await count(db, 'sources', `id::text LIKE 'cb000000-%' AND url LIKE 'http%'`)) === 36,
     'ALL real sources have http(s) URLs');

  // ------------------------------ website coverage (cat + model) ---
  const w = await db.query(`SELECT id, slug, is_demo FROM ai_websites ORDER BY slug`);
  for (const row of w.rows) {
    const cats = await count(db, 'website_categories', `website_id = '${row.id}'`);
    const mods = await count(db, 'website_models', `website_id = '${row.id}'`);
    ok(cats >= 1, `website ${row.slug}${row.is_demo ? ' (demo)' : ''} has >=1 category (${cats})`);
    ok(mods >= 1, `website ${row.slug}${row.is_demo ? ' (demo)' : ''} has >=1 model link (${mods})`);
  }

  // ------------------------- real-model availability junctions ---
  const av = await db.query(
    `SELECT count(*)::int AS n FROM website_models WHERE id::text LIKE 'c4000000-%'`);
  ok(av.rows[0].n === 26, 'real website_models junctions = 26 (where-can-i-use-this-model)');
  const cross = await db.query(
    `SELECT m.slug, count(DISTINCT wm.website_id)::int AS sites
     FROM ai_models m JOIN website_models wm ON wm.model_id = m.id
     WHERE m.id::text LIKE 'c3000000-%' GROUP BY m.slug HAVING count(DISTINCT wm.website_id) > 1`);
  ok(cross.rows.length >= 2, `cross-website models exist (${cross.rows.map(r => r.slug).join(', ')})`);

  // ------------------------------------------------------- idempotency ---
  for (const f of seeds) await db.exec(readFileSync(join(seedDir, f), 'utf8'));
  ok((await count(db, 'ai_websites')) === 16, `seed re-run keeps ai_websites at 16 rows (got ${await count(db, 'ai_websites')})`);
  ok((await count(db, 'ai_models')) === 30, `seed re-run keeps ai_models at 30 rows (got ${await count(db, 'ai_models')})`);
  ok((await count(db, 'plans')) === 51, `seed re-run keeps plans at 51 rows (got ${await count(db, 'plans')})`);
  ok((await count(db, 'verification_records')) === 39, `seed re-run keeps verification_records at 39 rows (got ${await count(db, 'verification_records')})`);
} finally {
  await db.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('failures:'); for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('SEED OK');
