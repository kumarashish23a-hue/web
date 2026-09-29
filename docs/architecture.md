# Architecture

> Ground truth: [CONTRACT.md](../CONTRACT.md). Where behavior is marked *"confirm against implementation"*, the sibling workers own the final detail.

## System diagram

```
┌───────────────────────────────────────────────────────────────────┐
│ BROWSER                                                           │
│  React 19 SPA (frontend/)                                         │
│   routes: / /explore /websites[/:slug] /models[/:slug]            │
│           /categories/:slug /search /compare /recommend            │
│           /stack/:id /profile /favorites /login /signup /submit    │
│           /admin/* (17 admin routes)                              │
│   components: WebsiteCard, ModelCard, PricingCard,                 │
│     VerificationBadge, AccessBadge, FreeBadge, ComparisonTable, … │
│   state: fetch() → /api/v1 · dark/light via CSS variables         │
└───────────────────────────────┬───────────────────────────────────┘
                                │ HTTPS · JSON · camelCase
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│ API — Express 5, Node 24 (backend/)                               │
│  routes (/api/v1) → zod validation → services → db.ts             │
│  services: auth, recommender, search, verification, admin …       │
│  ai/: AIProvider interface                                        │
│        ├─ RuleBasedProvider  (live — deterministic, explainable)  │
│        └─ OpenAIProvider     (stub — throws "not configured")     │
│  cross-cutting: JWT auth · RBAC · rate limiting · Helmet · CORS   │
└───────────────────────────────┬───────────────────────────────────┘
                                │ query(text, params)
                                │ (DB_ADAPTER=pglite → in-memory)
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│ PostgreSQL 14+ (database/)                                        │
│  001 catalog · 002 commerce · 003 verification · 004 users        │
│  005 admin — plus 001_demo_seed.sql (fictional, is_demo=true)      │
└───────────────────────────────────────────────────────────────────┘
```

**Separation of concerns:** the frontend renders; the backend decides (auth, RBAC, scoring, verification rules); the database stores facts *and* their verification state. Enforcement never lives in the browser.

## Monorepo layout

```
/home/hatch/workspace/web/
├── package.json            # npm workspaces: ["frontend","backend","shared"]
├── .env.example            # all env vars documented
├── frontend/               # React 19 + Vite + TS + react-router-dom 7
│   └── src/
│       ├── components/     # Button, Card, WebsiteCard, ModelCard, …
│       ├── pages/          # route components
│       └── …               # (confirm against implementation)
├── backend/                # Node 24 + TS + Express 5
│   └── src/
│       ├── routes/         # /api/v1 route handlers
│       ├── services/       # recommender.ts, auth, …
│       │   └── ai/         # AIProvider.ts + providers
│       ├── db.ts           # single query(text, params) export
│       └── …               # (confirm against implementation)
├── shared/                 # TS types + zod schemas shared by both
├── database/
│   ├── migrations/         # 001–005, plain PostgreSQL, apply in order
│   └── seeds/              # 001_demo_seed.sql (fictional DEMO only)
├── scripts/                # verify-schema.mjs, verify-seed.mjs, verify-api.mjs
└── docs/                   # this folder
```

## Request flow (example: POST /api/v1/recommend)

```
frontend (Recommend page)
   │  POST /api/v1/recommend   { goal, constraints }
   ▼
Express route
   │  1. zod schema validates body (shared/ schemas)
   │  2. rate limiter (recommend is rate-limited)
   ▼
services/recommender.ts
   │  parseGoal(goal) → keywords → capabilities/categories/tasks   (pure fn)
   │  candidate fetch via db.query(...)                            (SQL)
   │  score: capability match + free-tier fit + constraint
   │         satisfaction + verification recency                   (weighted)
   │  attach reasons[] + verification { status, lastChecked }
   ▼
db.ts → query(text, params) → Postgres (or PGlite if DB_ADAPTER=pglite)
   ▼
JSON response  { data: [ { …, reasons, verification } ] }
   camelCase at the API boundary (DB is snake_case)
```

**Error path:** any failure returns the error envelope `{ "error": { "code": "SNAKE_CASE", "message": "…" } }` with an appropriate HTTP status. No stack traces leak to the client.

## Auth / session design

| Piece | Detail |
|---|---|
| Sign-up / login | `POST /api/v1/auth/signup`, `/login` — email lowercased, bcrypt (`bcryptjs`) password hash |
| Access token | JWT, **1 hour** expiry, sent as `Authorization: Bearer <token>` |
| Refresh token | JWT, **30 days**, stored in an **httpOnly cookie** (invisible to JS → XSS can't steal it) |
| Secrets | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` from env only |
| Email verify / password reset | Single-use token hashes in `email_verification_tokens` / `password_reset_tokens` with `expires_at` + `used_at` |
| Email delivery | `src/services/mail.ts` (nodemailer SMTP, env `SMTP_*`). No SMTP in dev → link logged to console; no SMTP in prod → generic 503, token never exposed |
| Sessions are stateless | No server session store; revocation model is token expiry (confirm against implementation for any blocklist) |

### OAuth integration

Authentication stays modular: OAuth is **not implemented** — but the seam a
future provider route needs already exists in `backend/src/services/auth.ts`,
so no OAuth login can ever require duplicating user/session logic.

**The seam.** The functions a provider callback would call are:

| Step | Function | Notes |
|---|---|---|
| Find-or-create user | `findOrCreateUserByEmail(email, { displayName, emailVerified })` | Email is lowercased; returns the existing user or inserts a password-less one (`password_hash` is NULL — see `database/migrations/006_users_oauth.sql`). Race-safe on concurrent callbacks (unique-violation re-read). |
| Issue tokens | `signAccessToken(userId)`, `signRefreshToken(userId)`, `refreshCookieOptions()` | The exact same JWT/cookie issuance password login uses (`POST /login` in `routes/auth.ts` composes these). |
| Fetch the user | `getUserById(userId)` | Camel-cased `User` record for the response. |

**Steps to add a provider** (e.g. Google):
1. New route (e.g. `POST /api/v1/auth/oauth/:provider/callback`) **behind the auth rate limiter**.
2. Verify the provider's **ID token server-side** (fetch the provider's JWKS, check `aud`, `iss`, expiry) and read the email **from the verified token claims**.
3. Call `findOrCreateUserByEmail(email, { displayName: <name claim>, emailVerified: <email_verified claim> })`.
4. Sign the tokens (`signAccessToken` / `signRefreshToken`), set the refresh cookie via `refreshCookieOptions()`, return `{ user, accessToken }` like `/login` does.

**Must NOT do:**
- Never accept a client-supplied email as the identity — only the email inside the server-verified ID token.
- Never store provider access/refresh tokens unless encrypted at rest with a dedicated KMS/secret key (there is no encrypted credential store for this today — don't improvise one with a plaintext column).
- Never write a second "login" path that builds JWTs or inserts users directly; go through the seam functions above so sessions stay identical.
- A NULL-`password_hash` user cannot authenticate via `/login` (`loginUser` rejects with `INVALID_CREDENTIALS`); the only way to add a password later is the normal reset flow.
- A provider-linking table (e.g. `oauth_identities(provider, provider_user_id, user_id)`) will be needed before *linking* an OAuth login to an existing password account — out of scope until a provider is added.

## RBAC matrix

Roles form a strict hierarchy: **super_admin > admin > editor > verifier**. Checks run **server-side** on every admin route — the frontend hides buttons, the backend enforces.

| Capability | verifier | editor | verifier+editor → | admin | super_admin |
|---|---|---|---|---|---|
| Read catalog/admin data | ✅ | ✅ | | ✅ | ✅ |
| Verification actions (approve / reject / request-review / mark-outdated) | ✅ | ✅ | | ✅ | ✅ |
| CRUD catalog & commerce content (websites, models, categories, plans, …) | ❌ | ✅ | | ✅ | ✅ |
| Submit items for verification | ❌ (n/a — already verifies) | ✅ | | ✅ | ✅ |
| Manage `sources` records | ❌ | ✅ | | ✅ | ✅ |
| Review user submissions | ❌ | ✅ | | ✅ | ✅ |
| Publish / unpublish content | ❌ | ❌ | | ✅ | ✅ |
| Manage user roles **below** admin | ❌ | ❌ | | ✅ | ✅ |
| Assign / change admin roles (incl. admin, super_admin) | ❌ | ❌ | | ❌ | ✅ |
| Read audit logs | ✅ (own scope; confirm) | ✅ | | ✅ | ✅ |

Per the contract: *verifier = read + verification actions only; editor = CRUD content + submit for verification; admin = also manage roles below admin and publish/unpublish; super_admin = everything including assigning admin roles.*

## Error envelope

```jsonc
// success
{ "data": { /* … */ }, "meta": { "page": 1, "limit": 20, "total": 128, "totalPages": 7 } }
// error
{ "error": { "code": "WEBSITE_NOT_FOUND", "message": "No website with that slug." } }
```

- `code` is always `SNAKE_CASE`.
- `message` is human-readable and safe to display.
- Never include stack traces, SQL, or secret values in error responses.

## Pagination

- Query params: `?page=1&limit=20` (confirm defaults/max against implementation).
- Response `meta`: `{ page, limit, total, totalPages }`.
- Applies to list routes (websites, models, search, admin tables, audit logs, …).

## Rate limiting

`express-rate-limit` on the abuse-prone routes:

| Route group | Why |
|---|---|
| `POST /auth/*` (signup, login, resets) | Credential stuffing / spam accounts |
| `POST /recommend` | Expensive scoring pipeline |
| `POST /submissions` | Spam submissions |

Exact windows/limits: confirm against implementation.

## Security headers & hardening

- **Helmet** — secure HTTP headers on all responses.
- **CORS** — configurable via `CORS_ORIGIN` (default `http://localhost:5173`).
- **zod validation on all inputs** — shared schemas in `shared/`; invalid input → `400` with a validation error code, never a crash.
- **Parameterized queries only** — all DB access goes through `db.query(text, params)`; no string-interpolated SQL.
- **Soft deletes** — public queries always add `deleted_at IS NULL`; admin "delete" sets `deleted_at` (archive). No hard deletes except in tests.
- **No secrets in the frontend** — LLM keys live server-side only and are never `VITE_`-prefixed.

## Secrets handling

| Rule | Detail |
|---|---|
| Source | Environment variables only (`.env` locally, platform env in deploy) |
| Documented | Every variable listed in `.env.example` (see README table) |
| Never committed | `.env` is git-ignored; example file carries placeholders, not values |
| Frontend boundary | Vite bakes `VITE_*` into the bundle at build time — so **no secret may ever be `VITE_`-prefixed** |
| Rotation | JWT secrets can be rotated by changing env + restarting (invalidates existing tokens — acceptable) |

## Why rule-based recommender first (and the LLM seam)

The recommender is **deterministic and explainable by design**:

1. A beginner user must be able to ask *"why was this recommended?"* and get a real answer (`reasons: string[]`), not model vibes.
2. Verification honesty ("never claim verified without a `verification_records` row") is a hard rule — easier to guarantee in code than in a prompt.
3. It works offline, costs nothing per query, and is unit-testable (`parseGoal` is a pure function).

The **LLM seam** keeps the door open without committing to it: `backend/src/services/ai/AIProvider.ts` declares

```ts
interface AIProvider {
  analyzeGoal(goal: string): …;
  classifyTask(input: string): …;
  extractRequirements(input: string): …;
  generateRecommendations(input: …): …;
}
```

`RuleBasedProvider` implements it today; `OpenAIProvider` is a stub that throws `"not configured"`. Swapping in a real LLM later means: implement the interface, read the key from env (server-side only), wire it in — no route or frontend changes. See [recommendation-engine.md](recommendation-engine.md).
