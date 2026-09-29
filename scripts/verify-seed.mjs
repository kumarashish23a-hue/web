// verify-seed.mjs — applies migrations + demo seed to a fresh PGlite DB,
// then asserts: expected row counts, all demo rows flagged, nothing verified,
// every website has >=1 category and >=1 model link.
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
  console.log(`applied ${migs.length} migrations + ${seeds.length} seed files`);

  // --------------------------------------------------------- row counts ---
  ok((await count(db, 'ai_websites')) === 6, 'ai_websites has 6 rows');
  ok((await count(db, 'ai_models')) === 6, 'ai_models has 6 rows');
  ok((await count(db, 'providers')) === 2, 'providers has 2 rows');
  ok((await count(db, 'categories')) === 20, 'categories has 20 rows');
  ok((await count(db, 'capabilities')) >= 10, `capabilities has ${await count(db, 'capabilities')} rows (>=10)`);
  ok((await count(db, 'website_categories')) >= 6, 'website_categories has rows');
  ok((await count(db, 'model_categories')) >= 6, 'model_categories has rows');
  ok((await count(db, 'model_capabilities')) >= 6, 'model_capabilities has rows');
  ok((await count(db, 'website_models')) === 6, 'website_models has 6 rows');
  ok((await count(db, 'plans')) >= 6, `plans has ${await count(db, 'plans')} rows (>=6)`);
  ok((await count(db, 'plan_limits')) >= 6, 'plan_limits has rows');
  ok((await count(db, 'access_requirements')) === 6, 'access_requirements has 6 rows (one per website)');
  ok((await count(db, 'regional_availability', "country_code = 'IN'")) >= 6, 'regional_availability covers IN for all websites');
  ok((await count(db, 'cancellation_policies')) === 6, 'cancellation_policies has 6 rows');
  ok((await count(db, 'api_access')) === 6, 'api_access has 6 rows');
  ok((await count(db, 'sources')) >= 1, 'sources has rows');
  ok((await count(db, 'verification_records')) >= 1, 'verification_records has rows');

  // ----------------------------------------------------- is_demo flags ---
  ok((await count(db, 'ai_websites', 'is_demo IS NOT TRUE')) === 0, 'ALL ai_websites rows have is_demo=true');
  ok((await count(db, 'ai_models', 'is_demo IS NOT TRUE')) === 0, 'ALL ai_models rows have is_demo=true');
  ok((await count(db, 'plans', 'is_demo IS NOT TRUE')) === 0, 'ALL plans rows have is_demo=true');

  // ------------------------------------------------- nothing verified ---
  ok((await count(db, 'verification_records', "status = 'verified'")) === 0,
     'NO verification_records row has status=verified');
  ok((await count(db, 'verification_records', "status = 'unverified'")) === (await count(db, 'verification_records')),
     'ALL verification_records rows have status=unverified');
  ok((await count(db, 'verification_records', "notes LIKE '%DEMO data — not real%'")) === (await count(db, 'verification_records')),
     'ALL verification_records notes carry "DEMO data — not real"');

  // ------------------------------------- website coverage (cat + model) ---
  const w = await db.query(`SELECT id, slug FROM ai_websites`);
  for (const row of w.rows) {
    const cats = await count(db, 'website_categories', `website_id = '${row.id}'`);
    const mods = await count(db, 'website_models', `website_id = '${row.id}'`);
    ok(cats >= 1, `website ${row.slug} has >=1 category (${cats})`);
    ok(mods >= 1, `website ${row.slug} has >=1 model link (${mods})`);
  }

  // ---------------------------------------------------- no real names ---
  const REAL = ['openai', 'anthropic', 'google', 'microsoft', 'meta', 'deepseek', 'mistral',
                'chatgpt', 'claude', 'gemini', 'copilot', 'midjourney', 'dall-e', 'whisper',
                'stable diffusion', 'llama', 'grok', 'perplexity'];
  const names = await db.query(`SELECT lower(name) AS n FROM ai_websites UNION SELECT lower(name) FROM ai_models`);
  const bad = names.rows.filter(r => REAL.some(real => r.n.includes(real)));
  ok(bad.length === 0, `no real company/model names in seed${bad.length ? ' (found: ' + bad.map(b => b.n).join(', ') + ')' : ''}`);

  // --------------------------------------------------- mixed card rows ---
  ok((await count(db, 'access_requirements', 'credit_card_required = false')) >= 1, 'access_requirements has no-card rows');
  ok((await count(db, 'access_requirements', 'credit_card_required = true')) >= 1, 'access_requirements has card-required rows');

  // ------------------------------------------------------- idempotency ---
  for (const f of seeds) await db.exec(readFileSync(join(seedDir, f), 'utf8'));
  ok((await count(db, 'ai_websites')) === 6, 'seed re-run keeps ai_websites at 6 rows');
  ok((await count(db, 'plans')) === 9, `seed re-run keeps plans at 9 rows (got ${await count(db, 'plans')})`);
} finally {
  await db.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('failures:'); for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('SEED OK');
