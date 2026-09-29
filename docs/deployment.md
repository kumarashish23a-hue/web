# Deployment Guide

Prep-only reference for deploying the AI Discovery & Recommendation Platform.
**Nothing here deploys anything** — it documents the steps for a human to run
when they're ready. Related: [README.md](../README.md),
[docs/admin.md](admin.md) (super_admin bootstrap), [docs/database.md](database.md).

Stack: **backend** = Node 24 + Express 5 + TypeScript (`backend/Dockerfile`,
entry `node backend/dist/src/index.js`); **frontend** = Vite SPA (static
`frontend/dist/`); **database** = PostgreSQL 14+.

---

## 1. Environment variables

Never bake secrets into the Docker image — inject them at deploy time
(`--env-file`, your platform's secret manager, etc.).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string for the backend |
| `JWT_ACCESS_SECRET` | yes (prod) | dev fallback | Signs 1h access tokens |
| `JWT_REFRESH_SECRET` | yes (prod) | dev fallback | Signs 30d refresh tokens |
| `CORS_ORIGIN` | yes (prod) | `http://localhost:5173` | Allowed frontend origin(s), comma-separated |
| `NODE_ENV` | recommended | `development` | Set `production` — boot **fails** without `DATABASE_URL` + JWT secrets |
| `PORT` | no | `4000` | Backend listen port |
| `DB_ADAPTER` | no | `pg` | Leave unset (or `pg`) in prod. `pglite` is dev/test only — never production |
| `AI_PROVIDER` | no | `rule-based` | Set to `llm` to make the LLM goal parser the default |
| `AI_LLM_BASE_URL` | for LLM | — | OpenAI-compatible chat-completions base URL. Server-side only |
| `AI_LLM_API_KEY` | for LLM | — | LLM API key. **Never** prefix `VITE_` |
| `AI_LLM_MODEL` | for LLM | — | Model id (e.g. `free/claude-sonnet-4.6`) |
| `SMTP_*` | optional | — | Transactional mailer (nodemailer): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL` (link base, defaults to `CORS_ORIGIN`). If unset and `NODE_ENV=production`, signup/reset return `503 EMAIL_UNAVAILABLE`; in dev the links are logged to the console |
| `VITE_API_BASE_URL` | yes (frontend) | — | Frontend → backend base URL, e.g. `https://api.example.com/api/v1`. **Baked in at build time** — rebuild the frontend if this changes |

Generate strong secrets (run once, store in your secret manager):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 2. Database — migrations (001 → 006, in order)

Use a managed Postgres 14+ (or your own server). The backend container does
not run migrations — do it once before first boot:

```bash
createdb ai_discovery   # once

# apply migrations in order
for f in database/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

This creates the catalog (001), commerce (002), verification (003), users
(004), admin (005), and OAuth-seam (006, nullable `password_hash`) schemas. Verify:

```bash
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"
```

## 3. Seeds — decide before you load

| Seed | Content | Load into production? |
|---|---|---|
| `database/seeds/001_demo_seed.sql` | Six fictional websites/models, **all flagged `is_demo=true`, all claims `unverified`** | **Never** — demo/staging only |
| `database/seeds/002_real_starter.sql` | Real catalog entries with recorded sources (`partially_verified`) | Yes, if you want a real starter catalog |

```bash
psql "$DATABASE_URL" -f database/seeds/002_real_starter.sql   # real starter
# psql "$DATABASE_URL" -f database/seeds/001_demo_seed.sql    # staging only!
```

## 4. Bootstrap the first super_admin

There is **no default admin** — by design. Sign up once via the frontend,
then grant the role in SQL. Full steps (find the user's UUID, insert into
`admin_users`): **docs/admin.md → "Role management + bootstrapping the first
super_admin"**. Log out and back in; `/admin` is then available.

---

## 5. Backend — container

Build from the **monorepo root** (the Dockerfile needs the `shared` workspace):

```bash
cp backend/.dockerignore .dockerignore   # docker only reads it at the context root
docker build -f backend/Dockerfile -t ai-discover-backend .
```

Run (secrets via env, never in the image):

```bash
docker run -d --name ai-discover-backend \
  --env-file .env -p 4000:4000 ai-discover-backend
```

The image runs `node backend/dist/src/index.js` as the non-root `node` user
with `NODE_ENV=production`. It includes a `HEALTHCHECK` on the health endpoint
below, so orchestrators can probe it.

### 6. Frontend — static build + SPA fallback

The app uses `BrowserRouter`, so **all routes must fall back to `index.html`**.

```bash
# 1) point at the deployed API, then build (value is baked in at build time)
#    edit frontend/.env.production or export it:
VITE_API_BASE_URL=https://api.example.com/api/v1
cd frontend && npm run build   # → frontend/dist/
```

**nginx** (`frontend/dist/` as root):

```nginx
server {
  listen 443 ssl;
  server_name app.example.com;
  root /srv/ai-discover/dist;

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

**Caddy**:

```
app.example.com {
  root * /srv/ai-discover/dist
  file_server
  try_files {path} /index.html
}
```

Serve `index.html` uncached (or with short TTL); hash-named `/assets/*` files
can be cached forever.

## 7. Health checks

No auth required — safe for load-balancer / orchestrator probes:

```bash
curl http://localhost:4000/api/v1/health
# {"data":{"status":"ok","time":"2026-09-29T…"}}
```

Expects HTTP 200 with `data.status === "ok"`. The Dockerfile's `HEALTHCHECK`
already probes this endpoint.

---

## 8. Pre-launch checklist

- [ ] Migrations `001`→`005` applied to the production database, in order
- [ ] Secrets set at deploy time: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (real, random, unique per environment — never committed, never in the image)
- [ ] Demo-seed decision: `001_demo_seed.sql` **not** loaded into production; `002_real_starter.sql` loaded only if wanted
- [ ] SMTP / email: `SMTP_HOST/PORT/USER/PASS/FROM` set for real sending, or understood that in production an unconfigured mailer makes signup/reset return `503 EMAIL_UNAVAILABLE` (dev logs the links to the console)
- [ ] `CORS_ORIGIN` = the real frontend origin (no `localhost` leftovers); `VITE_API_BASE_URL` points at the deployed API and was baked in at frontend build time
- [ ] `NODE_ENV=production` on the backend; `DB_ADAPTER` unset (never `pglite` in prod)
- [ ] First `super_admin` bootstrapped (docs/admin.md); admin console verified at `/admin`
- [ ] TLS terminated at the load balancer / platform in front of the API
- [ ] Health probe (`/api/v1/health`) green from the platform; a rollback plan exists (previous image tag + DB backup — migrations here are additive, so rolling back code does not roll back schema)

## Common pitfalls

- Changing `VITE_API_BASE_URL` after the fact does nothing — the frontend must be **rebuilt**.
- `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`, and both differ between staging and production; reusing one invalidates nobody but collapses your secret hygiene.
- The backend boot in production **fails fast** (`assertProdSecrets`) if `DATABASE_URL` or the JWT secrets are missing — check the container logs first.
- PGlite is dev/test only: it is in-memory and does not persist. If the API comes up empty on data, `DB_ADAPTER` is probably mis-set.
