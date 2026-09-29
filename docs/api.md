# API reference — `/api/v1`

> Ground truth: [CONTRACT.md](../CONTRACT.md). Exact query-param defaults, error-code strings, and response field lists: *confirm against implementation*.

## Conventions

- **Base URL:** `/api/v1` (e.g. `http://localhost:4000/api/v1`)
- **Format:** JSON, `camelCase` keys.
- **Success envelope:** `{ "data": … }`, plus `"meta": { "page", "limit", "total", "totalPages" }` on paginated routes.
- **Error envelope:** `{ "error": { "code": "SNAKE_CASE", "message": "…" } }` — never stack traces.
- **Auth:** `Authorization: Bearer <access-jwt>` header. Refresh token travels as an httpOnly cookie (set by login, cleared by logout).
- **Pagination:** `?page=1&limit=20` on list routes.
- **Validation:** all inputs validated with zod (shared schemas); bad input → `400 VALIDATION_ERROR` (confirm code strings).

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), plus resource-specific codes like `WEBSITE_NOT_FOUND`.

---

## Auth

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/signup` | — | `{ email, password }` | `201` `{ data: { user } }` — creates user (email lowercased, bcrypt hash); verification token issued |
| `POST /auth/login` | — | `{ email, password }` | `200` `{ data: { user, accessToken } }` + httpOnly refresh cookie (30d) |
| `POST /auth/logout` | optional | — | `200` — clears refresh cookie |
| `POST /auth/verify-email` | — | `{ token }` | `200` — sets `email_verified=true` |
| `POST /auth/request-password-reset` | — | `{ email }` | `200` (always — doesn't reveal whether the email exists) |
| `POST /auth/reset-password` | — | `{ token, newPassword }` | `200` — rotates password, invalidates token |
| `GET /auth/me` | Bearer | — | `200` `{ data: { user, profile } }` |

Rate-limited: signup, login, password-reset endpoints.

---

## Websites (public)

| Method & path | Auth | Params | Response |
|---|---|---|---|
| `GET /websites` | — | `?page&limit`, filters: `?category=slug`, `?q=` (confirm) | Paginated website summaries (each with verification summary + badges) |
| `GET /websites/:slug` | — | — | Full detail: profile, categories, models offered, plans, limits, requirements, payment methods, regions, cancellation, API access, sources, verification statuses |

Soft-deleted (`deleted_at` set) rows are never returned.

## Models (public)

| Method & path | Auth | Params | Response |
|---|---|---|---|
| `GET /models` | — | `?page&limit`, filters: `?type=` (ai_type), `?capability=slug`, `?q=` (confirm) | Paginated model summaries |
| `GET /models/:slug` | — | — | Full detail: provider, type, license, context window, modalities, capabilities, categories, API availability, verification |

## Categories (public)

| Method & path | Auth | Params | Response |
|---|---|---|---|
| `GET /categories` | — | — | All categories (`name`, `slug`, `description`, `icon`, `sort_order`) |
| `GET /categories/:slug` | — | `?page&limit` | Category + paginated websites/models in it |

## Search / compare / recommend (public)

| Method & path | Auth | Params / body | Response |
|---|---|---|---|
| `GET /search?q=` | — | `q` (required), `?page&limit`, `?type=website\|model` (confirm) | Ranked mixed results (keyword search; vector/semantic search is a TODO) |
| `GET /compare?type=website\|model&ids=a,b,c` | — | `type`, comma-separated `ids` (UUIDs or slugs — confirm) | Side-by-side table: plans, limits, requirements, verification badges |
| `POST /recommend` | — | `{ goal: string, constraints?: { preferFree?, noCreditCard?, noPayment?, noLogin?, beginnerFriendly?, apiRequired?, regionCode?, categories?: string[] }, useLlm?: boolean }` | Ranked items: each with `reasons: string[]` + `verification: { status, lastChecked }`; response includes `engine: "rule-based" \| "llm"` (+ `llmModel`) |

`POST /recommend` is rate-limited. See [recommendation-engine.md](recommendation-engine.md) for the scoring contract and a worked example.

## Pricing / access / sources / verification (public)

| Method & path | Auth | Params | Response |
|---|---|---|---|
| `GET /pricing?website=` | — | `website` = slug (required) | Current plans + limits, each with verification status |
| `GET /access?website=` | — | `website` = slug (required) | Access requirements, payment methods, regional availability, cancellation policy, API access |
| `GET /sources?entity=` | — | `entity` = `type:id` (confirm format) | Source records backing the entity's claims |
| `GET /verification?entity=` | — | `entity` = `type:id` (confirm format) | Verification records: claim, status, source, `verifiedAt` |

These are the transparency endpoints — the UI's VERIFIED / UNVERIFIED / OUTDATED badges are rendered from here.

---

## User routes (auth required)

### Favorites

| Method & path | Body | Response |
|---|---|---|
| `GET /favorites` | — | User's favorites (`kind`: website \| model \| stack) |
| `POST /favorites` | `{ kind, websiteId? , modelId?, stackId? }` | `201` created favorite |
| `DELETE /favorites/:id` | — | `200` removed |

### Stacks

| Method & path | Body | Response |
|---|---|---|
| `GET /stacks` | — | User's saved stacks |
| `POST /stacks` | `{ title, goalText?, items: [{ requirementLabel, websiteId?, modelId?, reason?, … }] }` | `201` created stack |
| `GET /stacks/:id` | — | Stack + ordered `stack_items` (with per-item verification status) |
| `PUT /stacks/:id` | `{ title?, goalText?, items? }` | `200` updated |
| `DELETE /stacks/:id` | — | `200` deleted |

### Profile / preferences

| Method & path | Body | Response |
|---|---|---|
| `GET /profile` | — | `{ profile: { displayName, … } }` |
| `PUT /profile` | `{ displayName? }` | `200` updated |
| `GET /preferences` | — | `{ preferFree, noCreditCard, noPayment, beginnerFriendly, apiRequired, regionCode }` |
| `PUT /preferences` | Any subset of the above | `200` updated — these feed the recommender's default constraints |

### Submissions

| Method & path | Body | Response |
|---|---|---|
| `GET /submissions` | — | The caller's own submissions with statuses |
| `POST /submissions` | `{ kind: website\|model\|pricing\|free_access\|correction, payload: {…}, sourceUrl? }` | `201` — enters `pending_review`. Rate-limited. (Anonymous submission may be allowed — confirm) |

### Search history

| Method & path | Body | Response |
|---|---|---|
| `GET /search-history` | — | Recent queries |
| `DELETE /search-history` | — | `200` cleared |

---

## Admin routes (`/admin/*`, role-gated)

All routes require a valid Bearer token **and** an `admin_users` row. Minimum roles per the RBAC matrix (verifier < editor < admin < super_admin).

| Method & path | Min role | Purpose |
|---|---|---|
| `GET /admin/dashboard` | verifier | Stats: counts, verification coverage, monitoring flags, queue sizes |
| `GET /admin/websites` · `POST /admin/websites` | editor | List (paginated, incl. archived filter) · create |
| `GET /admin/websites/:id` · `PUT /admin/websites/:id` · `DELETE /admin/websites/:id` | editor | Read · update (writes `change_history`) · archive (sets `deleted_at`) |
| `GET /admin/models` · `POST /admin/models` | editor | Same pattern as websites |
| `GET /admin/models/:id` · `PUT` · `DELETE` | editor | Read · update · archive |
| `GET /admin/categories` · `POST` · `PUT /:id` · `DELETE /:id` | editor | Category CRUD |
| `GET /admin/capabilities` · `POST` · `PUT /:id` · `DELETE /:id` | editor | Capability CRUD (confirm route exists) |
| `GET /admin/providers` · `POST` · `PUT /:id` · `DELETE /:id` | editor | Provider CRUD (confirm route exists) |
| `GET /admin/plans?website=` · `POST /admin/plans` · `PUT /admin/plans/:id` | editor | Plans (+ nested limits) management |
| `PUT /admin/requirements/:websiteId` (confirm path) | editor | Access requirements upsert |
| `PUT /admin/cancellation/:websiteId` (confirm path) | editor | Cancellation policy upsert |
| `PUT /admin/api-access/:websiteId` (confirm path) | editor | API access upsert |
| `POST /admin/sources` · `PUT /admin/sources/:id` | editor | Source records |
| `GET /admin/verification?status=` | verifier | Verification queue (filter by status) |
| `POST /admin/verification/:id/approve` | verifier | Mark `verified` (requires linked source) |
| `POST /admin/verification/:id/reject` | verifier | Reject claim |
| `POST /admin/verification/:id/request-review` | verifier | Escalate for second review |
| `POST /admin/verification/:id/mark-outdated` | verifier | Mark `outdated`, trigger re-check |
| `GET /admin/submissions?status=` | editor | Submissions queue |
| `POST /admin/submissions/:id/approve` | editor | Approve → creates real records as `unverified` |
| `POST /admin/submissions/:id/reject` | editor | Reject with `review_notes` |
| `POST /admin/submissions/:id/needs-info` | editor | Request more info from submitter |
| `GET /admin/users` | admin | Platform users list (paginated) |
| `GET /admin/admin-users` · `POST /admin/admin-users` | super_admin | List admins · grant role |
| `PUT /admin/admin-users/:id` · `DELETE /admin/admin-users/:id` | super_admin | Change role · revoke admin |
| `GET /admin/audit` | verifier (confirm) | Read-only audit log, filterable by admin/entity/action |

**Notes:**
- `verifier` can read admin data and act on the verification queue, but cannot create/edit content.
- `DELETE` on content = archive (`deleted_at`), never hard delete.
- Role assignment (`/admin/admin-users`) is `super_admin`-only; `admin` may manage roles strictly below admin (confirm exact endpoint behavior against implementation).

---

## Versioning

The API is versioned in the path (`/api/v1`). Breaking changes → `/api/v2`; additive changes stay in v1.
