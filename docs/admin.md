# Admin console

> Ground truth: [CONTRACT.md](../CONTRACT.md). *"Confirm against implementation"* where the frontend worker's exact UI may differ.

## Admin panel pages (`/admin/*`)

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — metrics overview |
| `/admin/websites` | Website CRUD (incl. the guided Add Website flow) |
| `/admin/models` | Model CRUD |
| `/admin/categories` | Category CRUD |
| `/admin/plans` | Plans + limits management |
| `/admin/pricing` | Commerce editing (plans, limits, payment methods, regions, cancellation, API access) |
| `/admin/submissions` | User submissions review queue |
| `/admin/verification` | Verification queue (approve / reject / request-review / mark-outdated) |
| `/admin/sources` | Source records CRUD |
| `/admin/changes` | Change-history viewer |
| `/admin/users` | Platform users list |
| `/admin/audit` | Audit log (read-only) |

Roles gate every page server-side (see RBAC matrix in [architecture.md](architecture.md)): `verifier` = read + verification actions; `editor` = content CRUD; `admin` = + role management below admin & publish toggles; `super_admin` = + admin-role assignment.

## Dashboard metrics

The dashboard surfaces platform health at a glance (confirm exact widgets against implementation):

- Total websites / models / categories (excluding soft-deleted)
- Verification coverage: counts by `verification_status`
- Monitoring: websites `due_for_check` / `outdated` / `changed`
- Queues: open verification items, pending submissions
- Recent audit activity

## CRUD workflows

### Add Website — 10-step guided flow

Adding a website touches many tables, so the console walks an editor through it step by step. (Step order reconstructed from the schema — *confirm the exact step list against the implementation*.)

| Step | What you enter | Lands in |
|---|---|---|
| 1. Basics | Name, slug, tagline, description, official URL, logo URL | `ai_websites` |
| 2. Flags | Open-source? Beginner-friendly? | `ai_websites.is_open_source`, `beginner_friendly` |
| 3. Categories | Pick from the 20 seeded categories | `website_categories` |
| 4. Models | Link models the site offers (+ access status free/free_tier/free_trial/paid/unavailable) | `website_models` |
| 5. Plans | Plan names, kind (`free`/`freemium`/`paid`/…), billing cycle, price + currency | `plans` |
| 6. Plan limits | Per-plan limits (requests/day, tokens/day, images/day, …) | `plan_limits` |
| 7. Access requirements | Account? Email/phone verification? Card required? Minimum age? | `access_requirements` |
| 8. Payment & regions | Accepted payment methods; country availability | `website_payment_methods`, `regional_availability` |
| 9. Cancellation & API | Cancel method/timing/refunds; API availability + docs URL | `cancellation_policies`, `api_access` |
| 10. Sources & review | Attach source URLs for each claim, review the summary, **submit for verification** | `sources`, then queue entries |

Key rule: completing the flow does **not** mark anything verified. Commercial facts start as `unverified` until a verifier approves them against a source (see below).

### Edit / archive

- Editing a commercial fact writes a `change_history` row (field, old value, new value, who, when).
- "Delete" in the console = **archive**: sets `deleted_at`. The row disappears from public queries but stays in the DB. No hard deletes except in tests.

## Verification queue workflow

The queue lists `verification_records` rows needing attention. A verifier (or higher role) can:

| Action | Meaning | Resulting status |
|---|---|---|
| **Approve** | Claim checked against the linked `source` (official pricing page, docs, terms, …) | `verified` (+ `verified_by_admin`, `verified_at`) |
| **Reject** | Claim is wrong / unsupportable | stays `unverified` (or `disputed` if contested) |
| **Request review** | Needs a second pair of eyes | `under_review` (monitoring) / escalated |
| **Mark outdated** | Was true, source shows it changed | `outdated` → triggers re-verification |

Doctrine reminder (full text in [data-verification.md](data-verification.md)): **no source ⇒ never shown as verified.** A verifier must open the source URL and confirm the claim before approving. Demo seed rows (`is_demo=true`, notes "DEMO data — not real") must never be approved.

## Submissions review

Users (even anonymous) can submit via `/submit`: new websites, models, pricing info, free-access tips, corrections. Each `submissions` row arrives as `pending_review` with a JSON `payload` and optional `source_url`.

Reviewer workflow:

1. Open the submission — read `payload`, open `source_url`.
2. **Approve** → create/update the real records (as `unverified` until verified through the normal queue — *never auto-trust commercial claims*).
3. **Reject** → record `review_notes` explaining why.
4. **Needs info** → ask the submitter for a source or clarification.

`reviewed_by_admin`, `reviewed_at`, and `review_notes` are stored on the row.

## Role management + bootstrapping the first super_admin

**There is no default admin account.** Two ways to bootstrap:

**Option A — one-time endpoint (no SQL):** on a fresh install with zero
admins, `POST /api/v1/auth/bootstrap-superadmin` with
`{ "email", "password", "displayName" }` creates the user and grants
`super_admin` in one step. Once any admin exists the endpoint returns 404,
so it can never be used for later escalation.

**Option B — SQL:**

1. Sign up normally at `/signup` (this creates a row in `users`).
2. Find the user's id:
   ```sql
   SELECT id, email FROM users WHERE email = 'you@example.com';
   ```
3. Grant the role:
   ```sql
   INSERT INTO admin_users (user_id, role)
   VALUES ('<user-uuid-from-step-2>', 'super_admin');
   ```
4. Log out and back in — the admin console (`/admin`) is now available.

After that, role changes go through the console (Users / admin_users management), gated to `super_admin` for role assignment. `admin` may manage roles **below** admin; `editor` and `verifier` cannot touch roles at all.

## Audit log fields

Every admin mutation writes to `audit_logs`:

| Field | Meaning |
|---|---|
| `admin_user_id` | Which admin did it (FK → `admin_users`) |
| `action` | What happened, e.g. `website.create`, `plan.update`, `verification.approve` (confirm exact action strings against implementation) |
| `entity_type` | Polymorphic type: `website`, `model`, `plan`, … (same vocabulary as `verification_records`) |
| `entity_id` | UUID of the affected row (NULL when not applicable) |
| `old_value` / `new_value` | JSONB snapshots of what changed |
| `ip` | Request IP if captured |
| `created_at` | When |

The audit log is **read-only** in the console (`/admin/audit`) — admins can view and filter it, never edit or delete it.
