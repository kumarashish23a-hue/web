// verify-schema.mjs — applies all migrations to a fresh in-memory PGlite DB,
// then asserts every table/column/enum/FK/unique/index from CONTRACT.md exists.
// Prints PASS/FAIL per assertion, exits non-zero on failure.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'database', 'migrations');

let passed = 0;
let failed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed++; console.log(`PASS  ${label}`); }
  else { failed++; failures.push(label); console.log(`FAIL  ${label}`); }
}

const db = new PGlite();
try {
  // Apply migrations in filename order.
  const files = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('no migration files found');
  for (const f of files) {
    await db.exec(readFileSync(join(migDir, f), 'utf8'));
  }
  console.log(`applied migrations: ${files.join(', ')}`);

  const q = (sql, params = []) => db.query(sql, params);

  // ------------------------------------------------------------ enums ---
  const EXPECTED_ENUMS = {
    verification_status: ['verified', 'partially_verified', 'unverified', 'outdated', 'disputed'],
    monitoring_status: ['current', 'due_for_check', 'outdated', 'changed', 'under_review'],
    admin_role: ['super_admin', 'admin', 'editor', 'verifier'],
    plan_kind: ['free', 'free_trial', 'freemium', 'paid', 'usage_based', 'subscription', 'api_only'],
    billing_cycle: ['monthly', 'yearly', 'one_time', 'usage', 'none'],
    submission_kind: ['website', 'model', 'pricing', 'free_access', 'correction'],
    submission_status: ['pending_review', 'approved', 'rejected', 'needs_info'],
    favorite_kind: ['website', 'model', 'stack'],
    source_type: ['official_pricing', 'official_model_page', 'official_docs', 'official_terms', 'official_billing', 'official_cancellation', 'other'],
    payment_method_code: ['credit_card', 'debit_card', 'upi', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay', 'other'],
    ai_type: ['chat', 'image', 'video', 'audio', 'music', 'voice', 'stt', 'embedding', 'code', 'agent', 'multimodal', 'other'],
  };
  for (const [name, labels] of Object.entries(EXPECTED_ENUMS)) {
    const r = await q(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = $1 ORDER BY e.enumsortorder`, [name]);
    const got = r.rows.map(x => x.enumlabel);
    ok(r.rows.length > 0, `enum ${name} exists`);
    ok(JSON.stringify(got) === JSON.stringify(labels), `enum ${name} labels [${got.join(',')}]`);
  }

  // ----------------------------------------------------------- tables ---
  // table -> expected columns
  const EXPECTED_TABLES = {
    providers: ['id','name','slug','website_url','description','created_at','updated_at','deleted_at'],
    categories: ['id','name','slug','description','icon','sort_order','created_at','updated_at','deleted_at'],
    capabilities: ['id','name','slug','description','created_at'],
    ai_websites: ['id','name','slug','tagline','description','official_url','logo_url','is_open_source','beginner_friendly','monitoring_status','last_checked_at','is_demo','created_at','updated_at','deleted_at'],
    ai_models: ['id','provider_id','name','slug','description','model_type','is_open_source','license','context_window_tokens','input_modalities','output_modalities','api_available','is_demo','created_at','updated_at','deleted_at'],
    website_categories: ['website_id','category_id'],
    model_categories: ['model_id','category_id'],
    model_capabilities: ['model_id','capability_id'],
    website_models: ['id','website_id','model_id','access_status','notes','created_at','updated_at'],
    plans: ['id','website_id','name','kind','billing_cycle','price_amount','price_currency','price_per','is_current','is_demo','created_at','updated_at'],
    plan_limits: ['id','plan_id','limit_kind','limit_value','limit_unit','description','created_at'],
    payment_methods: ['id','code','label','created_at'],
    website_payment_methods: ['website_id','payment_method_id','notes'],
    access_requirements: ['id','website_id','account_required','email_verification','phone_verification','credit_card_required','debit_card_required','payment_method_required','payment_required','minimum_age','notes','created_at','updated_at'],
    regional_availability: ['id','website_id','country_code','available','notes'],
    cancellation_policies: ['id','website_id','can_cancel','method','timing','auto_renewal','access_after_cancel','refund_info','source_url','created_at','updated_at'],
    api_access: ['id','website_id','has_api','free_tier','pricing_text','rate_limits_text','docs_url','created_at','updated_at'],
    sources: ['id','source_type','url','page_title','retrieved_at','notes','created_by_admin','created_at'],
    verification_records: ['id','entity_type','entity_id','claim','status','source_id','verified_by_admin','verified_at','notes','created_at','updated_at'],
    change_history: ['id','entity_type','entity_id','field_name','old_value','new_value','changed_by_admin','changed_at'],
    monitoring_checks: ['id','website_id','checked_at','status','findings','created_at'],
    discovery_sources: ['id','name','kind','config','enabled','created_at'],
    discovery_candidates: ['id','discovery_source_id','name','url','raw','status','created_at'],
    users: ['id','email','password_hash','email_verified','created_at','updated_at'],
    email_verification_tokens: ['id','user_id','token_hash','expires_at','used_at','created_at'],
    password_reset_tokens: ['id','user_id','token_hash','expires_at','used_at','created_at'],
    profiles: ['id','display_name','created_at','updated_at'],
    user_preferences: ['user_id','prefer_free','no_credit_card','no_payment','beginner_friendly','api_required','region_code','created_at','updated_at'],
    saved_stacks: ['id','user_id','title','goal_text','created_at','updated_at'],
    user_favorites: ['id','user_id','kind','website_id','model_id','stack_id','created_at'],
    stack_items: ['id','stack_id','position','requirement_label','website_id','model_id','reason','free_status','requirements_summary','limits_summary','confidence','verification_status'],
    search_history: ['id','user_id','query','created_at'],
    submissions: ['id','user_id','kind','status','payload','source_url','reviewed_by_admin','reviewed_at','review_notes','created_at','updated_at'],
    analytics_events: ['id','user_id','event_type','entity_type','entity_id','meta','created_at'],
    admin_roles: ['id','code','label'],
    admin_users: ['id','user_id','role','created_by_admin','created_at'],
    audit_logs: ['id','admin_user_id','action','entity_type','entity_id','old_value','new_value','ip','created_at'],
  };
  for (const [table, cols] of Object.entries(EXPECTED_TABLES)) {
    const r = await q(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
    const have = r.rows.map(x => x.column_name);
    ok(have.length > 0, `table ${table} exists`);
    for (const c of cols) ok(have.includes(c), `table ${table} has column ${c}`);
  }

  // ------------------------------------------------------- soft delete ---
  for (const t of ['ai_websites','ai_models','providers','categories']) {
    const r = await q(
      `SELECT is_nullable, data_type FROM information_schema.columns
       WHERE table_name = $1 AND column_name = 'deleted_at'`, [t]);
    ok(r.rows.length === 1 && r.rows[0].is_nullable === 'YES', `${t}.deleted_at nullable timestamptz`);
  }

  // ---------------------------------------------------------------- fks ---
  // [table, constrained column, referenced table]
  const EXPECTED_FKS = [
    ['ai_models','provider_id','providers'],
    ['website_categories','website_id','ai_websites'],
    ['website_categories','category_id','categories'],
    ['model_categories','model_id','ai_models'],
    ['model_categories','category_id','categories'],
    ['model_capabilities','model_id','ai_models'],
    ['model_capabilities','capability_id','capabilities'],
    ['website_models','website_id','ai_websites'],
    ['website_models','model_id','ai_models'],
    ['plans','website_id','ai_websites'],
    ['plan_limits','plan_id','plans'],
    ['website_payment_methods','website_id','ai_websites'],
    ['website_payment_methods','payment_method_id','payment_methods'],
    ['access_requirements','website_id','ai_websites'],
    ['regional_availability','website_id','ai_websites'],
    ['cancellation_policies','website_id','ai_websites'],
    ['api_access','website_id','ai_websites'],
    ['verification_records','source_id','sources'],
    ['verification_records','verified_by_admin','admin_users'],
    ['sources','created_by_admin','admin_users'],
    ['change_history','changed_by_admin','admin_users'],
    ['monitoring_checks','website_id','ai_websites'],
    ['discovery_candidates','discovery_source_id','discovery_sources'],
    ['email_verification_tokens','user_id','users'],
    ['password_reset_tokens','user_id','users'],
    ['profiles','id','users'],
    ['user_preferences','user_id','users'],
    ['saved_stacks','user_id','users'],
    ['user_favorites','user_id','users'],
    ['user_favorites','website_id','ai_websites'],
    ['user_favorites','model_id','ai_models'],
    ['user_favorites','stack_id','saved_stacks'],
    ['stack_items','stack_id','saved_stacks'],
    ['stack_items','website_id','ai_websites'],
    ['stack_items','model_id','ai_models'],
    ['search_history','user_id','users'],
    ['submissions','user_id','users'],
    ['submissions','reviewed_by_admin','admin_users'],
    ['analytics_events','user_id','users'],
    ['admin_users','user_id','users'],
    ['admin_users','created_by_admin','admin_users'],
    ['audit_logs','admin_user_id','admin_users'],
  ];
  for (const [table, col, ref] of EXPECTED_FKS) {
    const r = await q(
      `SELECT 1 FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_class rt ON rt.oid = c.confrelid
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype = 'f' AND t.relname = $1 AND rt.relname = $2 AND a.attname = $3`,
      [table, ref, col]);
    ok(r.rows.length > 0, `FK ${table}.${col} -> ${ref}`);
  }

  // ------------------------------------------------------------ uniques ---
  // [table, column list] — exact unique/PK constraint match (order-insensitive)
  const EXPECTED_UNIQUES = [
    ['providers',['name']], ['providers',['slug']],
    ['categories',['name']], ['categories',['slug']],
    ['capabilities',['name']], ['capabilities',['slug']],
    ['ai_websites',['slug']],
    ['ai_models',['slug']],
    ['website_categories',['website_id','category_id']],
    ['model_categories',['model_id','category_id']],
    ['model_capabilities',['model_id','capability_id']],
    ['website_models',['website_id','model_id']],
    ['payment_methods',['code']],
    ['website_payment_methods',['website_id','payment_method_id']],
    ['access_requirements',['website_id']],
    ['regional_availability',['website_id','country_code']],
    ['cancellation_policies',['website_id']],
    ['api_access',['website_id']],
    ['users',['email']],
    ['user_favorites',['user_id','kind','website_id','model_id','stack_id']],
    ['admin_roles',['code']],
    ['admin_users',['user_id']],
    ['stack_items',['stack_id','position']],
  ];
  for (const [table, cols] of EXPECTED_UNIQUES) {
    const r = await q(
      `SELECT array_agg(a.attname ORDER BY a.attname) AS cols
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype IN ('u','p') AND t.relname = $1
       GROUP BY c.oid`, [table]);
    const wanted = [...cols].sort().join(',');
    const found = r.rows.some(x => x.cols.join(',') === wanted);
    ok(found, `unique on ${table}(${cols.join(',')})`);
  }

  // ------------------------------------------------------------ indexes ---
  // [table, column list] — at least one index covering exactly/at least these columns
  const EXPECTED_INDEXES = [
    ['ai_websites',['slug']],
    ['ai_websites',['name']],
    ['ai_models',['slug']],
    ['categories',['slug']],
    ['plans',['website_id']],
    ['verification_records',['entity_type','entity_id']],
    ['change_history',['entity_type','entity_id']],
    ['users',['email']],
    ['user_favorites',['user_id']],
    ['saved_stacks',['user_id']],
    ['submissions',['status']],
    ['audit_logs',['created_at']],
    ['audit_logs',['admin_user_id']],
    ['audit_logs',['entity_type','entity_id']],
  ];
  for (const [table, cols] of EXPECTED_INDEXES) {
    const r = await q(
      `SELECT i.indexrelid, array_agg(a.attname ORDER BY x.ord) AS cols
       FROM pg_index i
       JOIN pg_class t ON t.oid = i.indrelid
       JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS x(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
       WHERE t.relname = $1 AND i.indisvalid
       GROUP BY i.indexrelid`, [table]);
    const found = r.rows.some(x => cols.every(c => x.cols.includes(c)));
    ok(found, `index on ${table}(${cols.join(',')})`);
  }

  // --------------------------------------------------- admin role seeds ---
  const rr = await q(`SELECT code FROM admin_roles ORDER BY code`);
  const codes = rr.rows.map(x => x.code).sort();
  ok(JSON.stringify(codes) === JSON.stringify(['admin','editor','super_admin','verifier']),
     `admin_roles seeded with 4 rows [${codes.join(',')}]`);

  // ------------------------------------------------- payment method seeds ---
  const pm = await q(`SELECT count(*)::int AS n FROM payment_methods`);
  ok(pm.rows[0].n === 8, `payment_methods seeded with 8 rows`);

  // ------------------------------------------------------- idempotency ---
  for (const f of files) {
    await db.exec(readFileSync(join(migDir, f), 'utf8'));
  }
  console.log('re-applied all migrations (idempotency check)');
  const t2 = await q(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`);
  ok(t2.rows[0].n === Object.keys(EXPECTED_TABLES).length,
     `table count still ${Object.keys(EXPECTED_TABLES).length} after re-run`);
} finally {
  await db.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('failures:'); for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('SCHEMA OK');
