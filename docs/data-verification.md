# Data verification doctrine

> Ground truth: [CONTRACT.md](../CONTRACT.md). This is the trust contract behind every badge in the UI.

## The core rule

**No source ⇒ never shown as verified.**

A claim (a price, a limit, "no credit card required") may only carry the `verified` badge when **all** of these hold:

1. A row exists in `verification_records` with `status = 'verified'` for that exact entity (`entity_type` + `entity_id`).
2. That row links to a `sources` row (`source_id`) — a real page the verifier opened.
3. `verified_by_admin` and `verified_at` are set.

If any piece is missing, the UI shows `unverified` (or `partially_verified` / `outdated` / `disputed` as appropriate). There is no "probably true" badge.

## Source types

`source_type` enum — most specific applicable type wins:

| Value | Use for |
|---|---|
| `official_pricing` | The provider's own pricing page |
| `official_model_page` | The provider's model/card page |
| `official_docs` | Official documentation |
| `official_terms` | Terms of service / legal pages |
| `official_billing` | Billing / subscription management pages |
| `official_cancellation` | Cancellation / refund policy pages |
| `other` | Anything else (with an explanatory note) |

Preferred order: official pages first. A `sources` row records `url`, `page_title`, `retrieved_at`, and `notes` — so a future verifier can re-check exactly what was seen.

## Verification statuses — what each means in the UI

| Status | Badge | Meaning |
|---|---|---|
| `verified` | **VERIFIED** (green) | Checked against a recorded source by an admin |
| `partially_verified` | **PARTIALLY VERIFIED** (amber) | Some claims on the entity verified, others not |
| `unverified` | **UNVERIFIED** (amber) | Default state — no verification performed yet |
| `outdated` | **OUTDATED** (red) | Was verified, but the source changed or the check expired |
| `disputed` | **DISPUTED** (red) | Conflicting information; under investigation |

Badges **always pair color with a text label** — never color alone (accessibility rule from the frontend contract). Leaving-site interstitial applies when opening `official_url` ("You are leaving this platform").

## Change history

`change_history` records every field-level change to a verifiable entity:

- `entity_type` + `entity_id` (same polymorphic vocabulary as verification records)
- `field_name`, `old_value`, `new_value` (text)
- `changed_by_admin` (NULL for non-admin/system changes), `changed_at`

This is how "the price was $10 last month" stays answerable. The admin console exposes it at `/admin/changes`.

## Monitoring statuses

`ai_websites.monitoring_status` + `monitoring_checks` track freshness per website:

| Status | Meaning |
|---|---|
| `current` | Recently checked, matches sources |
| `due_for_check` | Check interval elapsed — needs re-verification |
| `outdated` | Known to differ from sources |
| `changed` | A change was detected, awaiting review |
| `under_review` | A verifier is actively looking at it |

**Important:** the tables are foundation only — **no automated checker runs yet**. Status transitions are manual (admin actions) until the automated-verification TODO is built. `monitoring_checks` rows record `checked_at`, `status`, and free-text `findings`.

### Staleness recomputation (date-based only — safe, no scraping)

`POST /api/v1/admin/monitoring/recompute` (admin console: dashboard → "Recompute monitoring status"; CLI: `npm run monitoring:recompute` in `backend/`) recomputes `ai_websites.monitoring_status` purely from `last_checked_at` age:

| Age of `last_checked_at` | Transition |
|---|---|
| Older than 30 days | `current` → `due_for_check` |
| Older than 90 days | `current` / `due_for_check` → `outdated` |

Hard rules (enforced in `backend/src/services/monitoring.ts` and covered by tests):

- **Escalation only.** The job never marks anything `current` (or `verified`) — freshness can only be asserted by a human re-check (`POST /admin/monitoring`), which stamps `last_checked_at`.
- `changed` and `under_review` are never touched (a human is already on those).
- `outdated` is never downgraded back to `due_for_check` or `current`.
- Rows with `NULL` `last_checked_at` and soft-deleted rows are left alone.
- Every run writes an `audit_logs` entry (`monitoring.recompute`) with the counts.

**Real change detection — a price changed, a free tier disappeared, a new limit appeared — is a future MANUAL/admin step, not something this job does.** This job only tracks check-due dates from `last_checked_at`; it performs zero HTTP fetching, zero crawling, and zero scraping, and therefore cannot know whether a provider page changed. When a verifier opens the provider page by hand, records a `monitoring_checks` row, and updates the website, that human action is what may set statuses like `current` or `changed`.

## Verification queue process

1. New/edited commercial facts enter the system as `unverified`.
2. They appear in the admin verification queue (`/admin/verification`, `GET /admin/verification?status=`).
3. A verifier (or higher role) opens the item, opens the linked `source` URL, and confirms the claim.
4. The verifier takes exactly one action: **approve** → `verified`; **reject** → stays `unverified`/`disputed`; **request review** → escalated; **mark outdated** → `outdated` + re-check scheduled (manually, for now).
5. Every action writes to `audit_logs` (who, what, when, old/new values).

See [admin.md](admin.md) for the console workflow.

## How demo seed data is marked

Seed rows are **fictional** (Astra AI, CanvasForge, EchoVoice, DocuMind, ResearchBase, ClipGenius — never real companies) and carry two independent markers:

- `is_demo = true` on `ai_websites`, `ai_models`, `plans`
- `verification_records.status = 'unverified'` with notes `"DEMO data — not real"`

`npm run verify:seed` asserts both: every demo row flagged, **nothing marked verified**. Demo data must never be approved in the verification queue, and seed must never run against production.

## Policy for user submissions

Submissions (`/submit` → `submissions` table, `status = 'pending_review'`) are **never auto-trusted**:

- Commercial claims from submissions (prices, limits, "free") enter review as `unverified`, even if the submitter provides a URL.
- A reviewer independently opens the source and verifies before any status changes.
- Anonymous submissions are allowed (confirm against implementation) but held to the same bar.
- Abuse/spam is mitigated by rate limiting on `POST /submissions`.

## What "verified" does NOT mean

- It does not mean the provider will never change the price — it means *an admin confirmed this claim against this source at this time* (`verified_at` + `retrieved_at`).
- It does not transfer to related entities — verifying a website's name does not verify its plans. Each `entity_type`/`entity_id` pair is verified independently.
- It is not permanent — `outdated` and re-checks exist because the real world moves.
