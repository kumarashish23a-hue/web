# BUILD CONTRACT — AI Discovery & Recommendation Platform

All work happens in `/home/hatch/workspace/web` (monorepo). All workers MUST follow this contract exactly so pieces fit together. Do NOT push to git (parent commits locally per phase). Do NOT run `git commit` yourself — write files, verify, and report.

## Monorepo layout
```
/home/hatch/workspace/web/
  package.json            # npm workspaces: ["frontend","backend","shared"]
  .env.example
  CONTRACT.md             # this file
  README.md               # docs worker writes
  frontend/               # React 19 + Vite + TS + react-router-dom
  backend/                # Node 24 + TS + Express 5, services layer
  shared/                 # TS types + zod schemas shared by both
  database/migrations/    # 001_*.sql … 005_*.sql, plain PostgreSQL
  database/seeds/         # 001_demo_seed.sql (DEMO data only)
  scripts/                # verify-*.mjs (PGlite), run with node
  docs/                   # architecture.md, database.md, admin.md, api.md, data-verification.md, recommendation-engine.md
```

## Tech versions (pin these)
- node: 24 (runtime), TypeScript ~5.7, Express 5, react 19, react-router-dom 7, vite 6/7, zod 3.x, bcryptjs, jsonwebtoken
- DB: PostgreSQL 14+ dialect SQL. No pgcrypto dependency (use built-in `gen_random_uuid()`).
- Tests: node built-in test runner (`node --test`) + `@electric-sql/pglite` for DB tests. No external test framework. Backend API tests: start the Express app on an ephemeral port, use `fetch`.

## Naming & conventions
- SQL: snake_case tables/columns. PK: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- Timestamps: `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`.
- Soft delete: `deleted_at timestamptz NULL` on ai_websites, ai_models, providers, categories. Public queries always filter `deleted_at IS NULL`. Admin can archive (set deleted_at) — no hard deletes except in tests.
- Demo seed: boolean `is_demo DEFAULT false` on ai_websites, ai_models, plans. Seed sets it true.
- TS: camelCase in API JSON. Backend maps snake_case → camelCase at the API boundary.

## Enums (Postgres enum types)
- verification_status: 'verified' | 'partially_verified' | 'unverified' | 'outdated' | 'disputed'
- monitoring_status: 'current' | 'due_for_check' | 'outdated' | 'changed' | 'under_review'
- admin_role: 'super_admin' | 'admin' | 'editor' | 'verifier'
- plan_kind: 'free' | 'free_trial' | 'freemium' | 'paid' | 'usage_based' | 'subscription' | 'api_only'
- billing_cycle: 'monthly' | 'yearly' | 'one_time' | 'usage' | 'none'
- submission_kind: 'website' | 'model' | 'pricing' | 'free_access' | 'correction'
- submission_status: 'pending_review' | 'approved' | 'rejected' | 'needs_info'
- favorite_kind: 'website' | 'model' | 'stack'
- source_type: 'official_pricing' | 'official_model_page' | 'official_docs' | 'official_terms' | 'official_billing' | 'official_cancellation' | 'other'
- payment_method_code: 'credit_card' | 'debit_card' | 'upi' | 'paypal' | 'bank_transfer' | 'apple_pay' | 'google_pay' | 'other'
- ai_type: 'chat' | 'image' | 'video' | 'audio' | 'music' | 'voice' | 'stt' | 'embedding' | 'code' | 'agent' | 'multimodal' | 'other'

## Core tables (migration 001 — catalog)
- providers(id, name UNIQUE, slug UNIQUE, website_url, description, created_at, updated_at, deleted_at)
- categories(id, name UNIQUE, slug UNIQUE, description, icon, sort_order, created_at, updated_at, deleted_at)
- capabilities(id, name UNIQUE, slug UNIQUE, description, created_at)
- ai_websites(id, name, slug UNIQUE, tagline, description, official_url, logo_url, is_open_source bool, beginner_friendly bool, monitoring_status, last_checked_at, is_demo, created_at, updated_at, deleted_at)
- ai_models(id, provider_id FK→providers NULL, name, slug UNIQUE, description, model_type ai_type, is_open_source bool, license, context_window_tokens int NULL, input_modalities text[], output_modalities text[], api_available bool, is_demo, created_at, updated_at, deleted_at)
- website_categories(website_id FK, category_id FK, PK both)
- model_categories(model_id FK, category_id FK, PK both)
- model_capabilities(model_id FK, capability_id FK, PK both)
- website_models(id, website_id FK, model_id FK, UNIQUE(website_id, model_id), access_status text ('free'|'free_tier'|'free_trial'|'paid'|'unavailable'), notes, created_at, updated_at) — commercial facts live on plans/requirements linked to website, NOT here.

## Commerce tables (migration 002)
- plans(id, website_id FK, name, kind plan_kind, billing_cycle, price_amount numeric(12,2) NULL, price_currency char(3) NULL, price_per text NULL (e.g. 'per month', 'per 1k tokens'), is_current bool DEFAULT true, is_demo, created_at, updated_at)
- plan_limits(id, plan_id FK, limit_kind text (requests_per_day|requests_per_month|tokens_per_day|images_per_day|videos_per_day|credits|storage_mb|other), limit_value numeric NULL, limit_unit text NULL, description text, created_at)
- payment_methods(id, code payment_method_code UNIQUE, label, created_at)
- website_payment_methods(website_id FK, payment_method_id FK, notes, PK both)
- access_requirements(id, website_id FK UNIQUE-ish one row per website: account_required bool, email_verification bool, phone_verification bool, credit_card_required bool, debit_card_required bool, payment_method_required bool, payment_required bool, minimum_age int NULL, notes, created_at, updated_at)
- regional_availability(id, website_id FK, country_code char(2), available bool, notes, UNIQUE(website_id, country_code))
- cancellation_policies(id, website_id FK (one current row per website), can_cancel bool, method text, timing text, auto_renewal bool, access_after_cancel text, refund_info text, source_url, created_at, updated_at)
- api_access(id, website_id FK (one row per website), has_api bool, free_tier bool, pricing_text text, rate_limits_text text, docs_url, created_at, updated_at)

## Verification tables (migration 003)
- sources(id, source_type, url, page_title, retrieved_at, notes, created_by_admin FK NULL, created_at)
- verification_records(id, entity_type text ('website'|'model'|'plan'|'plan_limit'|'access_requirement'|'cancellation_policy'|'api_access'|'regional_availability'|'website_model'), entity_id uuid, claim text, status verification_status, source_id FK→sources NULL, verified_by_admin FK NULL, verified_at, notes, created_at, updated_at). Index on (entity_type, entity_id).
- change_history(id, entity_type, entity_id uuid, field_name, old_value text, new_value text, changed_by_admin FK NULL, changed_at DEFAULT now()). Index on (entity_type, entity_id).
- monitoring_checks(id, website_id FK, checked_at, status monitoring_status, findings text, created_at) — foundation; no automated checker runs yet.
- discovery_sources(id, name, kind text, config jsonb, enabled bool, created_at) + discovery_candidates(id, discovery_source_id FK, name, url, raw jsonb, status text DEFAULT 'new', created_at) — foundation only.

## User tables (migration 004)
- users(id, email CITEXT UNIQUE — use citext extension if available else lower(email) unique index, password_hash text, email_verified bool DEFAULT false, created_at, updated_at). (PGlite: citext may not exist — use `email text UNIQUE` + store lowercased. Keep it simple: text UNIQUE, always lowercase in app.)
- email_verification_tokens(id, user_id FK, token_hash, expires_at, used_at NULL)
- password_reset_tokens(id, user_id FK, token_hash, expires_at, used_at NULL)
- profiles(id→users PK/FK, display_name, created_at, updated_at)
- user_preferences(user_id PK/FK, prefer_free bool, no_credit_card bool, no_payment bool, beginner_friendly bool, api_required bool, region_code char(2) NULL, created_at, updated_at)
- user_favorites(id, user_id FK, kind favorite_kind, website_id FK NULL, model_id FK NULL, stack_id FK NULL (nullable until stacks exist — same migration defines saved_stacks first), created_at, UNIQUE(user_id, kind, website_id, model_id, stack_id))
- saved_stacks(id, user_id FK, title, goal_text, created_at, updated_at)
- stack_items(id, stack_id FK, position int, requirement_label text, website_id FK NULL, model_id FK NULL, reason text, free_status text, requirements_summary text, limits_summary text, confidence text, verification_status verification_status)
- search_history(id, user_id FK, query text, created_at)
- submissions(id, user_id FK NULL (allow anonymous), kind submission_kind, status submission_status DEFAULT 'pending_review', payload jsonb, source_url, reviewed_by_admin FK NULL, reviewed_at NULL, review_notes, created_at, updated_at)
- analytics_events(id, user_id FK NULL, event_type text, entity_type NULL, entity_id NULL, meta jsonb, created_at) — non-sensitive product events only.

## Admin tables (migration 005)
- admin_roles(id, code admin_role UNIQUE, label)
- admin_users(id, user_id FK UNIQUE, role admin_role, created_by_admin FK NULL, created_at)
- audit_logs(id, admin_user_id FK, action text, entity_type, entity_id uuid NULL, old_value jsonb NULL, new_value jsonb NULL, ip text NULL, created_at). Index (admin_user_id), (entity_type, entity_id).
- Seed admin_roles rows for all four roles in migration 005. NO default admin user (bootstrap documented in docs/admin.md).

## Indexes
- ai_websites(slug), ai_websites(name) trigram-ish (plain btree; full-text later), ai_models(slug), categories(slug), plans(website_id), verification_records(entity_type, entity_id), change_history(entity_type, entity_id), users(email), user_favorites(user_id), saved_stacks(user_id), submissions(status), audit_logs(created_at).

## API contract (backend → /api/v1)
- Envelope: success `{ data, meta? }`, error `{ "error": { "code": "SNAKE_CASE", "message": "..." } }`.
- Pagination: `?page=1&limit=20` → meta `{ page, limit, total, totalPages }`.
- Auth: `POST /api/v1/auth/signup|login|logout|verify-email|request-password-reset|reset-password`, `GET /api/v1/auth/me`. Bearer JWT (access, 1h) + httpOnly refresh cookie (30d). JWT secret from env.
- Public: GET /websites, /websites/:slug, /models, /models/:slug, /categories, /categories/:slug, /search?q=, /compare?type=website|model&ids=a,b,c, POST /recommend (body {goal, constraints?}), GET /pricing?website=, /access?website=, /sources?entity=, /verification?entity=
- User (auth): /favorites CRUD, /stacks CRUD, /profile, /preferences, /submissions (create + own list), /search-history
- Admin (role-gated): /admin/* — dashboard stats, websites/models/categories/capabilities/providers CRUD, plans/limits/pricing, requirements, payment methods, cancellation, regions, api access, sources, verification queue (approve/reject/request-review/mark-outdated), submissions review, users list, admin_users management (super_admin only), audit logs read.
- RBAC server-side: super_admin > admin > editor > verifier. verifier: read + verification actions only. editor: CRUD content, no admin_users, no delete/publish toggles? Keep simple: editor can CRUD content + submit for verification; admin can also manage users' roles below admin and publish/unpublish; super_admin can do everything incl. assign admin roles.
- Rate limiting: express-rate-limit on auth + recommend + submissions. Helmet, CORS configurable, zod validation on all inputs, no stack traces to client.

## Recommendation engine (backend/src/services/recommender.ts)
- Deterministic, rule-based, explainable. Input: { goal: string, constraints?: { preferFree?, noCreditCard?, noPayment?, noLogin?, beginnerFriendly?, apiRequired?, regionCode?, categories?: string[] } }.
- Pipeline: parseGoal (keyword → capabilities/categories/tasks, pure function, unit-testable) → candidate fetch (SQL) → score (weighted signals: capability match, free-tier fit, constraint satisfaction, verification recency) → match reasons list per item.
- Output: ranked items with `reasons: string[]` and `verification: { status, lastChecked }`. Never claim verified without verification_records row with status='verified'.
- AI abstraction: backend/src/services/ai/AIProvider.ts interface { analyzeGoal(), classifyTask(), extractRequirements(), generateRecommendations() } + RuleBasedProvider implementing it + stub OpenAIProvider (TODO, throws "not configured"). All keys server-side only.

## Frontend contract
- Routes: /, /explore, /websites, /websites/:slug, /models, /models/:slug, /categories/:slug, /search, /compare, /recommend, /stack/:id, /profile, /favorites, /login, /signup, /submit, /admin + /admin/websites, /admin/models, /admin/categories, /admin/plans, /admin/pricing, /admin/submissions, /admin/verification, /admin/sources, /admin/changes, /admin/users, /admin/audit.
- Design system components (frontend/src/components/): Button, Card, WebsiteCard, ModelCard, CategoryCard, PricingCard, AccessBadge, FreeBadge, VerificationBadge, FilterPanel, SearchBar, ComparisonTable, RecommendationCard, StackCard, AdminTable, AdminSidebar, Modal, Toast, Pagination.
- Dark/light mode via CSS variables + toggle. Mobile responsive. No UI framework CSS (hand-rolled CSS modules or plain CSS).
- Data status UI: VERIFIED (green, text label), PARTIALLY_VERIFIED/UNVERIFIED (amber), OUTDATED/PAID/UNAVAILABLE (red) — always with text labels, never color alone.
- Leaving-site interstitial: when opening official_url, show confirm modal "You are leaving this platform."

## Seed data (database/seeds/001_demo_seed.sql)
- 6 DEMO websites (fictional names only, e.g. "Astra AI", "CanvasForge", "EchoVoice", "DocuMind", "ResearchBase", "ClipGenius"), 6 DEMO models, providers, categories (use the 20 from the brief), capabilities, plans with limits, access requirements (mixed: some no-card), verification_records with status 'unverified' and notes "DEMO data — not real". All is_demo=true.
- NEVER real company names, real pricing, or real limits in seeds.

## Verification scripts (scripts/)
- scripts/verify-schema.mjs — applies all migrations to PGlite, asserts tables/columns/enums/FKs exist.
- scripts/verify-seed.mjs — applies migrations + seed, asserts counts + all demo rows flagged + nothing marked verified.
- scripts/verify-api.mjs — boots backend against PGlite? Backend uses `pg` driver; for tests allow DATABASE_URL to point at PGlite via a small adapter OR test pure functions + route handlers with supertest-like fetch against an in-memory express app with a mock db. DECISION: backend DB layer = single `db.ts` exporting `query(text, params)`. For tests, backend accepts `DB_ADAPTER=pglite` env to use PGlite-backed query. DB worker + backend worker must both honor this.

## Docs (docs/ + README.md)
- README: overview, architecture, setup, env vars, database, auth, admin, API, recommendation engine, verification policy, deployment, testing, roadmap.
- docs/: architecture.md, database.md, admin.md, api.md, data-verification.md, recommendation-engine.md.

## Hard rules for all workers
1. No fake functionality: unfinished capabilities = clean stub + TODO comment + documented in README "Intentionally TODO".
2. Never mark anything verified without a source + verification_records row.
3. Never invent real-world company data. Demo data is fictional and flagged.
4. Secrets only in env; .env.example lists every var; never commit .env.
5. `npm run build` (tsc) and tests must pass for your area before you report done.
6. Do NOT git commit. Report file list + test results.
