# Database

> Ground truth: [CONTRACT.md](../CONTRACT.md) + `database/migrations/001–005`. Confirm column-level details against the migration files.

## Conventions (apply everywhere)

| Convention | Detail |
|---|---|
| Naming | `snake_case` tables and columns |
| Primary keys | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (no pgcrypto dependency) |
| Timestamps | `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()` |
| Soft delete | `deleted_at timestamptz NULL` on `ai_websites`, `ai_models`, `providers`, `categories`. **Public queries always filter `deleted_at IS NULL`.** Admin "delete" = archive (set `deleted_at`); no hard deletes except in tests |
| Demo flag | `is_demo boolean DEFAULT false` on `ai_websites`, `ai_models`, `plans` — seed sets `true` |
| API boundary | Backend maps `snake_case` → `camelCase` when serializing JSON |
| Postgres version | 14+ dialect SQL |

## Enum types

```sql
verification_status:  'verified' | 'partially_verified' | 'unverified' | 'outdated' | 'disputed'
monitoring_status:    'current' | 'due_for_check' | 'outdated' | 'changed' | 'under_review'
admin_role:           'super_admin' | 'admin' | 'editor' | 'verifier'
plan_kind:            'free' | 'free_trial' | 'freemium' | 'paid' | 'usage_based' | 'subscription' | 'api_only'
billing_cycle:        'monthly' | 'yearly' | 'one_time' | 'usage' | 'none'
submission_kind:      'website' | 'model' | 'pricing' | 'free_access' | 'correction'
submission_status:    'pending_review' | 'approved' | 'rejected' | 'needs_info'
favorite_kind:        'website' | 'model' | 'stack'
source_type:          'official_pricing' | 'official_model_page' | 'official_docs' | 'official_terms'
                      | 'official_billing' | 'official_cancellation' | 'other'
payment_method_code:  'credit_card' | 'debit_card' | 'upi' | 'paypal'
                      | 'bank_transfer' | 'apple_pay' | 'google_pay' | 'other'
ai_type:              'chat' | 'image' | 'video' | 'audio' | 'music' | 'voice' | 'stt'
                      | 'embedding' | 'code' | 'agent' | 'multimodal' | 'other'
```

## Migration 001 — catalog

The "what exists" layer. No prices, no requirements here — just the catalog of things.

| Table | Purpose | Key columns |
|---|---|---|
| `providers` | Companies/orgs that make models | `name` UNIQUE, `slug` UNIQUE, `website_url`, `description`, `deleted_at` |
| `categories` | Browse taxonomy (20 seeded) | `name` UNIQUE, `slug` UNIQUE, `description`, `icon`, `sort_order`, `deleted_at` |
| `capabilities` | What a model can do (drives the recommender) | `name` UNIQUE, `slug` UNIQUE, `description` |
| `ai_websites` | AI service websites | `name`, `slug` UNIQUE, `tagline`, `description`, `official_url`, `logo_url`, `is_open_source`, `beginner_friendly`, `monitoring_status`, `last_checked_at`, `is_demo`, `deleted_at` |
| `ai_models` | Individual models | `provider_id` FK→providers (NULL ok), `name`, `slug` UNIQUE, `description`, `model_type` (ai_type), `is_open_source`, `license`, `context_window_tokens` NULL, `input_modalities text[]`, `output_modalities text[]`, `api_available`, `is_demo`, `deleted_at` |
| `website_categories` | website ↔ category | PK (`website_id`, `category_id`) |
| `model_categories` | model ↔ category | PK (`model_id`, `category_id`) |
| `model_capabilities` | model ↔ capability | PK (`model_id`, `capability_id`) |
| `website_models` | which models a website offers | `website_id` FK, `model_id` FK, `UNIQUE(website_id, model_id)`, `access_status` text (`free`/`free_tier`/`free_trial`/`paid`/`unavailable`), `notes`. ⚠️ **Commercial facts live on plans/requirements, not here** |

**ER sketch (001):**
```
providers 1───* ai_models *───* capabilities   (via model_capabilities)
                          *───* categories     (via model_categories)
ai_websites *───* categories                    (via website_categories)
            *───* ai_models                     (via website_models)
```

## Migration 002 — commerce

The "what does it cost / what does it demand" layer. All of this is verifiable commercial fact.

| Table | Purpose | Key columns |
|---|---|---|
| `plans` | Pricing plans per website | `website_id` FK, `name`, `kind` (plan_kind), `billing_cycle`, `price_amount numeric(12,2)` NULL, `price_currency char(3)` NULL, `price_per` text (e.g. `'per month'`, `'per 1k tokens'`), `is_current` DEFAULT true, `is_demo` |
| `plan_limits` | Usage limits on a plan | `plan_id` FK, `limit_kind` text (`requests_per_day`\|`requests_per_month`\|`tokens_per_day`\|`images_per_day`\|`videos_per_day`\|`credits`\|`storage_mb`\|`other`), `limit_value` numeric NULL, `limit_unit` text NULL, `description` |
| `payment_methods` | Lookup: card, UPI, PayPal, … | `code` (payment_method_code) UNIQUE, `label` |
| `website_payment_methods` | which methods a site accepts | PK (`website_id`, `payment_method_id`), `notes` |
| `access_requirements` | signup friction, one row per website | `website_id` FK (UNIQUE-ish), `account_required`, `email_verification`, `phone_verification`, `credit_card_required`, `debit_card_required`, `payment_method_required`, `payment_required`, `minimum_age` NULL, `notes` |
| `regional_availability` | country availability | `website_id` FK, `country_code char(2)`, `available`, `notes`, `UNIQUE(website_id, country_code)` |
| `cancellation_policies` | how to cancel, one current row per website | `website_id` FK, `can_cancel`, `method`, `timing`, `auto_renewal`, `access_after_cancel`, `refund_info`, `source_url` |
| `api_access` | developer access, one row per website | `website_id` FK, `has_api`, `free_tier`, `pricing_text`, `rate_limits_text`, `docs_url` |

## Migration 003 — verification

The trust layer. This is what makes the platform different from a link list.

| Table | Purpose | Key columns |
|---|---|---|
| `sources` | Evidence for a claim | `source_type`, `url`, `page_title`, `retrieved_at`, `notes`, `created_by_admin` FK NULL |
| `verification_records` | **Polymorphic** verification ledger | `entity_type` text (`website`\|`model`\|`plan`\|`plan_limit`\|`access_requirement`\|`cancellation_policy`\|`api_access`\|`regional_availability`\|`website_model`), `entity_id` uuid, `claim` text, `status` (verification_status), `source_id` FK→sources NULL, `verified_by_admin` FK NULL, `verified_at`, `notes`. Indexed on (`entity_type`, `entity_id`) |
| `change_history` | Field-level audit of fact changes | `entity_type`, `entity_id` uuid, `field_name`, `old_value` text, `new_value` text, `changed_by_admin` FK NULL, `changed_at` DEFAULT now(). Indexed on (`entity_type`, `entity_id`) |
| `monitoring_checks` | Freshness tracking per website | `website_id` FK, `checked_at`, `status` (monitoring_status), `findings` text. **Foundation only — no automated checker runs yet** |
| `discovery_sources` | Where new sites could be found | `name`, `kind` text, `config` jsonb, `enabled` |
| `discovery_candidates` | Candidate sites awaiting review | `discovery_source_id` FK, `name`, `url`, `raw` jsonb, `status` text DEFAULT `'new'`. **Foundation only — no crawler runs yet** |

**Polymorphic pattern:** `verification_records` and `change_history` don't use FKs to each entity table. Instead, `entity_type` + `entity_id` identifies *any* verifiable thing (a plan, a limit, a whole website…). This keeps one ledger instead of nine tables.

## Migration 004 — users

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Accounts | `email` text UNIQUE (**always stored lowercased** — the contract keeps it simple instead of CITEXT), `password_hash` text, `email_verified` DEFAULT false |
| `email_verification_tokens` | Sign-up verification | `user_id` FK, `token_hash`, `expires_at`, `used_at` NULL |
| `password_reset_tokens` | Password reset | `user_id` FK, `token_hash`, `expires_at`, `used_at` NULL |
| `profiles` | Public profile | `id` PK/FK→users, `display_name` |
| `user_preferences` | Recommender + filter defaults | `user_id` PK/FK, `prefer_free`, `no_credit_card`, `no_payment`, `beginner_friendly`, `api_required`, `region_code char(2)` NULL |
| `user_favorites` | Bookmarks | `user_id` FK, `kind` (favorite_kind), `website_id`/`model_id`/`stack_id` FK NULL, `UNIQUE(user_id, kind, website_id, model_id, stack_id)` |
| `saved_stacks` | Saved recommendation sets | `user_id` FK, `title`, `goal_text` |
| `stack_items` | Items inside a stack | `stack_id` FK, `position`, `requirement_label`, `website_id`/`model_id` FK NULL, `reason`, `free_status`, `requirements_summary`, `limits_summary`, `confidence`, `verification_status` |
| `search_history` | Per-user search log | `user_id` FK, `query` text |
| `submissions` | User-suggested additions/corrections (anonymous allowed) | `user_id` FK NULL, `kind` (submission_kind), `status` (submission_status) DEFAULT `'pending_review'`, `payload` jsonb, `source_url`, `reviewed_by_admin` FK NULL, `reviewed_at` NULL, `review_notes` |
| `analytics_events` | Product events (**non-sensitive only**) | `user_id` FK NULL, `event_type`, `entity_type` NULL, `entity_id` NULL, `meta` jsonb |

## Migration 005 — admin

| Table | Purpose | Key columns |
|---|---|---|
| `admin_roles` | Role lookup | `code` (admin_role) UNIQUE, `label`. **Seeded with all four roles in this migration** |
| `admin_users` | Who is an admin | `user_id` FK UNIQUE, `role` (admin_role), `created_by_admin` FK NULL. **No default row — bootstrap is a manual SQL step** (see [admin.md](admin.md)) |
| `audit_logs` | Who changed what, when | `admin_user_id` FK, `action` text, `entity_type`, `entity_id` uuid NULL, `old_value`/`new_value` jsonb NULL, `ip` text NULL. Indexed on (`admin_user_id`), (`entity_type`, `entity_id`), (`created_at`) |

## Indexes

- `ai_websites(slug)`, `ai_websites(name)` (plain btree; trigram/full-text later), `ai_models(slug)`, `categories(slug)`
- `plans(website_id)`
- `verification_records(entity_type, entity_id)`, `change_history(entity_type, entity_id)`
- `users(email)`, `user_favorites(user_id)`, `saved_stacks(user_id)`, `submissions(status)`, `audit_logs(created_at)`

## Seed data (`database/seeds/001_demo_seed.sql`)

**Fictional. All of it.** Six demo websites — **Astra AI, CanvasForge, EchoVoice, DocuMind, ResearchBase, ClipGenius** — plus six demo models, providers, 20 categories, capabilities, plans with limits, and mixed access requirements (some no-card, some card-required, so constraint filtering can be exercised).

Every seeded website/model/plan carries **`is_demo = true`**, and every seeded `verification_records` row has `status = 'unverified'` with notes `"DEMO data — not real"`.

**Rules that are never broken:**
1. Never real company names, real pricing, or real limits in seeds.
2. `verify:seed` asserts: counts look right, all demo rows flagged, **nothing marked verified**.

## Running migrations

### Against real Postgres (psql)

```bash
# from /home/hatch/workspace/web, with DATABASE_URL set (see .env)
createdb ai_discovery                                   # once

for f in database/migrations/*.sql; do                  # 001 → 005 in order
  psql "$DATABASE_URL" -f "$f"
done

# demo/staging only — never in production:
psql "$DATABASE_URL" -f database/seeds/001_demo_seed.sql
```

Filenames sort alphabetically = apply order (`001_*` … `005_*`). Keep it that way when adding migrations (`006_*`, …).

### Via PGlite scripts (no Postgres needed)

```bash
# from /home/hatch/workspace/web
npm run verify:schema   # applies 001–005 to in-memory PGlite, asserts schema
npm run verify:seed     # + seed, asserts demo flags + nothing verified
```

### Backend in PGlite mode

Set `DB_ADAPTER=pglite` in `.env` — the backend's `db.ts` swaps its `pg`-driver `query(text, params)` for a PGlite-backed one with the same signature. Same SQL, zero Postgres. (Confirm the exact wiring against the backend implementation.)
