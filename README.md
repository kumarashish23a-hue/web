# AI Discovery & Recommendation Platform

**Know what you're getting before you use an AI service.**

A catalog platform that helps people discover AI websites and models — and shows, before they sign up, whether a service has a free tier, whether it asks for a credit card, what its limits are, and how trustworthy that information is. Every commercial fact (price, limit, requirement) carries a **verification status** backed by a recorded source, so users never mistake demo data for real-world truth.

> ⚠️ **Status:** Under active construction (Phase 50 — documentation). The database, backend, frontend, and scripts are being built in parallel by sibling workers from the shared spec in [CONTRACT.md](CONTRACT.md). Where these docs describe behavior the implementation may shape slightly differently, you'll see a note: *"confirm against implementation"*.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  FRONTEND — React 19 + Vite + TypeScript + react-router-dom  │ │
│  │  Pages (explore, search, compare, recommend, admin console)  │ │
│  │  Hand-rolled CSS (no UI framework), dark/light mode, mobile  │ │
│  └───────────────────────────┬──────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────┘
                               │  fetch()  JSON over HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND — Node 24 + TypeScript + Express 5  (backend/)             │
│  ┌──────────────┐ ┌───────────────┐ ┌────────────────────────────┐ │
│  │  Routes      │ │  Services     │ │  AI abstraction            │ │
│  │  /api/v1/*   │ │  recommender, │ │  AIProvider interface      │ │
│  │  zod-validated│ │  auth, search,│ │  RuleBasedProvider (live)  │ │
│  │  inputs      │ │  verification │ │  OpenAIProvider (stub/TODO)│ │
│  └──────────────┘ └───────────────┘ └────────────────────────────┘ │
│  Auth: Bearer JWT (access, 1h) + httpOnly refresh cookie (30d)     │
│  RBAC enforced server-side · rate limiting · Helmet · CORS        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  single db.ts → query(text, params)
                               │  (DB_ADAPTER=pglite for tests/dev)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DATABASE — PostgreSQL 14+  (database/)                             │
│  Migrations 001–005: catalog → commerce → verification → users →   │
│  admin. Seed: fictional DEMO data only (all flagged is_demo).      │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this shape?** The frontend is a thin viewer: all security decisions, verification logic, and scoring live in the backend (or DB constraints). The database is the source of truth for facts + their verification state; the backend adds auth, RBAC, and the explainable rule-based recommender.

---

## Monorepo structure

```
/home/hatch/workspace/web/
├── package.json            # npm workspaces: frontend, backend, shared
├── .env.example            # every env var, documented (copy to .env)
├── CONTRACT.md             # authoritative build spec (read first)
├── README.md               # this file
├── docs/                   # detailed guides (architecture, api, …)
├── frontend/               # React 19 + Vite + TS + react-router-dom
├── backend/                # Node 24 + TS + Express 5 + services layer
│   └── src/services/ai/    # AIProvider interface + RuleBasedProvider
├── shared/                 # TS types + zod schemas used by both
├── database/
│   ├── migrations/         # 001_*.sql … 005_*.sql (plain PostgreSQL)
│   └── seeds/              # 001_demo_seed.sql — fictional DEMO data only
└── scripts/                # verify-*.mjs (PGlite, run with node)
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **24** | Runtime for backend, frontend dev/build, scripts |
| npm | bundled with Node 24 | Workspaces enabled |
| PostgreSQL | **14+** | Production / real local dev. **OR** skip it: scripts and backend tests can run in **PGlite mode** (in-memory Postgres, no install) |
| `psql` client | any recent | Only needed to run migrations against a real Postgres |

**PGlite mode:** no database server required. Set `DB_ADAPTER=pglite` and the backend uses an in-memory Postgres-compatible engine — perfect for tests and getting started. See [docs/database.md](docs/database.md).

---

## Setup

All commands run from the monorepo root **`/home/hatch/workspace/web`** (your terminal's folder for this project), unless a step says otherwise.

### 1. Install dependencies

```bash
cd /home/hatch/workspace/web
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env and set real values (JWT secrets, DATABASE_URL, …)
```

Generate strong secrets for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3a. Database — real Postgres

```bash
# create the database (once)
createdb ai_discovery

# run migrations in order (001 → 005)
for f in database/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# load fictional demo seed data (all rows flagged is_demo=true)
psql "$DATABASE_URL" -f database/seeds/001_demo_seed.sql
```

See [docs/database.md](docs/database.md) for the full migration-by-migration breakdown.

### 3b. Database — PGlite (no Postgres install)

```bash
# verify schema against in-memory PGlite
npm run verify:schema

# verify seed data (applies migrations + seed in-memory, asserts demo flags)
npm run verify:seed
```

To run the backend in PGlite mode: set `DB_ADAPTER=pglite` in `.env` (see [`.env.example`](.env.example)).

### 4. Build

```bash
npm run build        # tsc build across workspaces
```

### 5. Run

```bash
# terminal 1 — backend (from /home/hatch/workspace/web)
cd backend && npm run dev      # or: npm start (confirm against implementation)

# terminal 2 — frontend (from /home/hatch/workspace/web)
cd frontend && npm run dev
```

- Backend API: `http://localhost:4000/api/v1`
- Frontend: `http://localhost:5173`

> *Confirm exact `dev`/`start` script names against the implementation — the sibling backend/frontend workers own their `package.json` scripts.*

### 6. Bootstrap the first admin (super_admin)

There is **no default admin account** — by design. After signing up a normal user account, run this SQL against your database (replace the UUID with that user's id):

```sql
INSERT INTO admin_users (user_id, role)
VALUES ('<user-uuid-here>', 'super_admin');
```

Full instructions: [docs/admin.md](docs/admin.md).

---

## Environment variables

Copied from [`.env.example`](.env.example). Never commit `.env` (secrets stay out of git).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes (real PG) | — | Postgres connection string for the backend |
| `DB_ADAPTER` | no | `pg` | Set to `pglite` to run backend against in-memory PGlite (tests / dev without Postgres) |
| `JWT_ACCESS_SECRET` | yes | — | Signs short-lived (1h) access tokens |
| `JWT_REFRESH_SECRET` | yes | — | Signs 30-day refresh tokens |
| `PORT` | no | `4000` | Backend listen port |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Allowed frontend origin |
| `NODE_ENV` | no | `development` | `production` enables stricter defaults |
| `VITE_API_BASE_URL` | yes (frontend) | — | Frontend → backend base URL, e.g. `http://localhost:4000/api/v1` (baked in at build time) |
| `AI_PROVIDER` | no | `rule-based` | Set to `llm` (or `openai`) to make the LLM goal parser the default for `/recommend` |
| `AI_LLM_BASE_URL` | for LLM | — | OpenAI-compatible chat-completions base URL, e.g. `https://api.apinex.bond/v1`. Server-side only |
| `AI_LLM_API_KEY` | for LLM | — | LLM API key (`OPENAI_API_KEY` also honored as fallback). Server-side only, **never** prefixed `VITE_` |
| `AI_LLM_MODEL` | for LLM | — | Model id, e.g. `free/claude-sonnet-4.6` |
| `SMTP_HOST` | for email | — | SMTP server used to send verification + password-reset emails. If unset, links are logged to the console in non-production; production returns a generic error |
| `SMTP_PORT` | no | `587` | SMTP port (`465` enables implicit TLS) |
| `SMTP_USER` / `SMTP_PASS` | for email auth | — | SMTP credentials (server-side only, never prefixed `VITE_`) |
| `SMTP_FROM` | for email | — | Sender address, e.g. `AI Discover <no-reply@example.com>` |
| `FRONTEND_URL` | no | `CORS_ORIGIN` | Base URL used to build email links (`/verify-email?token=…`, `/reset-password?token=…`) |

---

## Database

- **Migrations** `001`–`005` (plain PostgreSQL, apply in order): `001` catalog (providers, categories, capabilities, websites, models + join tables), `002` commerce (plans, limits, payment methods, access requirements, regions, cancellation, API access), `003` verification (sources, verification_records, change_history, monitoring, discovery foundation), `004` users (accounts, profiles, preferences, favorites, stacks, submissions, analytics), `005` admin (roles, admin_users, audit_logs).
- **Conventions:** snake_case tables/columns; UUID primary keys via `gen_random_uuid()`; `created_at`/`updated_at` everywhere; **soft delete** (`deleted_at`, public queries always filter it out); **`is_demo`** flag on websites/models/plans — seed sets it `true`.
- **Seed data** is 100% fictional (Astra AI, CanvasForge, EchoVoice, DocuMind, ResearchBase, ClipGenius — six demo websites and six demo models) and every commercial claim ships as `unverified` with the note "DEMO data — not real".

Full details: [docs/database.md](docs/database.md).

---

## Authentication flows

| Flow | Endpoint | How it works |
|---|---|---|
| Sign up | `POST /api/v1/auth/signup` | email + password → creates user (email lowercased, bcrypt hash), sends verification token |
| Verify email | `POST /api/v1/auth/verify-email` | token → `email_verified = true` |
| Login | `POST /api/v1/auth/login` | returns **access JWT (1h)** in body + **refresh token (30d)** as httpOnly cookie |
| Me | `GET /api/v1/auth/me` | Bearer access token → current user + profile |
| Logout | `POST /api/v1/auth/logout` | clears refresh cookie |
| Password reset | `POST /api/v1/auth/request-password-reset` → `POST /api/v1/auth/reset-password` | token-based, hashed tokens stored in DB |

**Design notes:** stateless access JWT (1h) for API calls; long-lived refresh in an httpOnly cookie (not readable by JS) for session renewal. Secrets come from env only. See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md).

---

## Admin system + roles

Role hierarchy (server-side enforced): **super_admin > admin > editor > verifier**.

| Role | Capabilities |
|---|---|
| `verifier` | Read everything + verification actions (approve/reject/request-review/mark-outdated). No content edits. |
| `editor` | All verifier powers + CRUD on catalog/commerce content + submit items for verification. |
| `admin` | All editor powers + manage user roles **below** admin + publish/unpublish. |
| `super_admin` | Everything, including assigning admin roles. |

The admin console (`/admin/*` routes) covers: dashboard metrics, websites, models, categories, plans/pricing, verification queue, sources, submissions review, users, audit log. The Add Website flow is a guided 10-step process; the verification queue enforces the doctrine "no source ⇒ never shown as verified". Details + the bootstrap SQL snippet: [docs/admin.md](docs/admin.md).

---

## API overview

Base path: **`/api/v1`**. JSON, camelCase keys. Standard envelope:

- Success: `{ "data": …, "meta": { page, limit, total, totalPages } }` (meta on paginated routes)
- Error: `{ "error": { "code": "SNAKE_CASE", "message": "…" } }`

| Area | Highlights |
|---|---|
| Auth | `POST /auth/signup\|login\|logout\|verify-email\|request-password-reset\|reset-password`, `GET /auth/me` |
| Catalog (public) | `GET /websites`, `/websites/:slug`, `/models`, `/models/:slug`, `/categories`, `/categories/:slug` |
| Discovery (public) | `GET /search?q=`, `GET /compare?type=website\|model&ids=…`, `POST /recommend` (goal + constraints → ranked, explained results) |
| Transparency (public) | `GET /pricing?website=`, `/access?website=`, `/sources?entity=`, `/verification?entity=` |
| User (auth) | `/favorites`, `/stacks`, `/profile`, `/preferences`, `/submissions`, `/search-history` |
| Admin (role-gated) | `/admin/*` — dashboard, CRUD, pricing, verification queue, submissions, users, roles (super_admin only), audit logs |

Rate-limited: auth, recommend, submissions. Full route reference: [docs/api.md](docs/api.md).

---

## Recommendation engine

Deterministic, rule-based, and explainable — no black box:

1. **parseGoal** — keyword → capabilities/categories/tasks (pure function, unit-testable).
2. **Candidate fetch** — SQL over catalog + constraints.
3. **Score** — weighted signals: capability match, free-tier fit, constraint satisfaction, verification recency.
4. **Explain** — every item returns `reasons: string[]` plus `verification: { status, lastChecked }`.

Input: `{ goal: string, constraints?: { preferFree, noCreditCard, noPayment, noLogin, beginnerFriendly, apiRequired, regionCode, categories } }`.
**Honesty rule:** the engine never labels something verified unless a `verification_records` row with `status='verified'` exists.

An `AIProvider` interface (`backend/src/services/ai/AIProvider.ts`) defines the seam for LLM-powered recommendations later; `RuleBasedProvider` implements it today, `OpenAIProvider` is a stub that throws "not configured". Details + worked example: [docs/recommendation-engine.md](docs/recommendation-engine.md).

---

## Data-verification policy

- **Statuses:** `verified` · `partially_verified` · `unverified` · `outdated` · `disputed`. UI badges always pair color with a **text label** (never color alone).
- **The core rule:** *no source ⇒ never shown as verified.* A `verified` badge requires a `verification_records` row with `status='verified'` linked to a `sources` row (official pricing page, docs, terms, …).
- **Demo data is clearly marked:** every seed row has `is_demo=true` and verification notes "DEMO data — not real".
- **User submissions are never auto-trusted:** commercial claims from submissions enter a review queue; a verifier checks the source before anything changes status.
- **History is kept:** `change_history` records field-level changes; `monitoring_checks` tracks re-check status (`current`/`due_for_check`/`outdated`/`changed`/`under_review`).

Full doctrine: [docs/data-verification.md](docs/data-verification.md).

---

## Testing

| Command (from repo root) | What it does |
|---|---|
| `npm run verify:schema` | Applies migrations `001`–`005` to PGlite; asserts tables, columns, enums, FKs exist |
| `npm run verify:seed` | Migrations + seed on PGlite; asserts counts, all demo rows flagged `is_demo`, **nothing marked verified** |
| `npm run verify:api` | Boots backend against PGlite (`DB_ADAPTER=pglite`); exercises routes via `fetch` on an ephemeral port |
| `npm run build` | `tsc` across all workspaces — must be green before reporting done |
| `npm test` | Workspace test scripts (Node built-in `node --test`; confirm against implementation) |

No external test framework — Node's built-in test runner + PGlite. Backend tests hit a real Express app on an ephemeral port with `fetch`.

---

## Deployment (Docker-ready notes)

- **Backend:** containerize with a Node 24 slim base image; run `npm ci --workspace=backend` (confirm build steps against implementation); inject all secrets (`DATABASE_URL`, `JWT_*_SECRET`, future LLM keys) as environment variables at deploy time — **never bake them into the image**. Suggested Dockerfile approach (confirm against implementation):
  ```dockerfile
  FROM node:24-slim
  WORKDIR /app
  COPY package*.json ./
  COPY backend/ backend/
  COPY shared/ shared/
  RUN npm ci --workspace=backend --workspace=shared
  RUN npm run build --workspace=backend
  EXPOSE 4000
  CMD ["node", "backend/dist/index.js"]
  ```
- **Frontend:** static build (`npm run build` in `frontend/` → `dist/`); serve from any static host or CDN; set `VITE_API_BASE_URL` at **build time** to the deployed API URL.
- **Database:** use a managed Postgres 14+ (or your own server). Apply migrations `001`→`005` in order with `psql` before first boot. Run seed only for demo/staging environments — **never seed demo data into production**.
- **Networking:** terminate TLS at the load balancer / platform; set `CORS_ORIGIN` to the real frontend origin; run migrations + bootstrap the first `super_admin` before opening the admin console.
- **Monitoring:** `monitoring_checks` table is the foundation for freshness tracking; automated checkers are a TODO (see below).

---

## Roadmap / future (all TODO)

Per CONTRACT §51-era planning — none of these are built yet:

- **Semantic search** — vector embeddings over websites/models/descriptions (pgvector or external index).
- **Price alerts** — notify users when a plan price or limit changes.
- **LLM-powered recommendations** — implement `OpenAIProvider` (or Anthropic) behind the existing `AIProvider` seam; keys server-side only.
- **Automated verification** — scheduled jobs that re-fetch official sources and update `monitoring_checks` (foundation tables exist; no checker runs yet).
- **Discovery automation** — crawl `discovery_sources` → `discovery_candidates` → editor review pipeline.
- **OAuth login** — Google/GitHub sign-in (stub only).
- **Email sending** — real transactional email for verification/reset (currently token flows without a mailer).
- **Richer analytics** — dashboards over `analytics_events`.
- **Mobile apps** — API is already JSON + token auth, so clients are feasible later.

---

## Intentionally incomplete / stubs

Honest list of what's stubbed or foundation-only (per the contract's "no fake functionality" rule — each ships as a clean stub + TODO, not a fake):

| Area | State |
|---|---|
| `OpenAIProvider` (`backend/src/services/ai/`) | Stub — throws "not configured" until an API key + implementation land |
| Automated verification checker | Foundation tables (`monitoring_checks`) only; **no checker runs** |
| Discovery automation | Foundation tables (`discovery_sources`, `discovery_candidates`) only; no crawler |
| OAuth (Google/GitHub) | TODO — password auth only |
| Email sending | TODO — verification/reset tokens are generated; no mailer sends them |
| Vector / semantic search | TODO — search is keyword-based (`?q=`) |
| Price alerts | TODO |
| `analytics_events` | Table exists; product dashboards not built |

---

## Docs index

- [docs/architecture.md](docs/architecture.md) — system design, RBAC matrix, request flow, security
- [docs/database.md](docs/database.md) — schema per migration, enums, indexes, seeds, migration how-to
- [docs/admin.md](docs/admin.md) — admin console, roles, verification queue, bootstrap
- [docs/api.md](docs/api.md) — full `/api/v1` route reference
- [docs/data-verification.md](docs/data-verification.md) — the verification doctrine
- [docs/recommendation-engine.md](docs/recommendation-engine.md) — how recommendations work + the LLM seam

---

*Built from [CONTRACT.md](CONTRACT.md). Implementation details marked "confirm against implementation" are owned by the database/backend/frontend workers building in parallel.*
