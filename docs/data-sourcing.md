# Data sourcing policy & research log

**Research date:** 2026-09-29
**Seed file:** `database/seeds/002_real_starter.sql`
**Verification script:** `scripts/verify-seed.mjs` (65 assertions)

## The honesty rule

Seed `001_demo_seed.sql` is **fictional demo data** (`is_demo=true`, every
verification record `unverified`). It exists so the UI and tests work before
real data arrives. It must never be shown as real.

Seed `002_real_starter.sql` is the **real starter catalog** (`is_demo=false`).
Every real row was added under these rules:

- Every verification record is **`partially_verified`** — never `verified`.
  Nothing in this file is fully verified. A row becomes `verified` only after
  a human admin completes the workflow below.
- Every factual or commercial claim must trace to a row in `sources`
  (captured 2026-09-29, real HTTPS URLs only — no `example.com`).
- If an official source did not confirm a price, limit, payment method, or
  requirement, it is **omitted or left NULL** — never guessed.
- All real websites and plans carry `last_checked_at = 2026-09-29`.

## What the real seed contains (2026-09-29)

- 10 real websites, 24 real models, 14 providers, 42 plans,
  4 plan limits, 10 access-requirement rows, 6 cancellation policies,
  10 API-access rows, 6 website payment methods, 26 website↔model junctions,
  36 sources, 34 verification records, 10 monitoring checks.

## Sourcing strength per website (2026-09-29)

**Strong official sourcing:** Claude (Anthropic pricing/model docs — prices,
rolling 5-hour usage, cancellation, context windows), Groq (official docs
model page — names, prices, contexts, rate limits), Hugging Face (official
pricing/PRO/API docs + official model cards), Perplexity (official Pro and
API pricing pages), ChatGPT (official plans + free-tier wording; prices
JS-rendered), Gemini (official API pricing), Microsoft Copilot (official
bundle prices).

**Weak or caveated sourcing:**

- **GitHub Copilot** — official page confirmed plan names and the 2,000
  completions/month free limit; paid dollar prices were only
  third-party-corroborated during this pass, so they are stored as NULL.
- **Midjourney** — official public pricing is login-gated: plan names kept,
  prices NULL. Official ToS supports age 13+, cancel anytime, no refund for
  the current period. Current model revision is third-party-reported.
- **ElevenLabs** — official domain was not fetchable by the research agent.
  Official SDK repo confirmed model IDs; an archived ToS snapshot confirmed
  cancel/renew/refund behavior. Pricing and limits are NULL. Weakest record.

## Deliberately omitted claims (unconfirmed on 2026-09-29)

- ChatGPT Go/Plus/Pro exact prices (JS-rendered, not captured); account
  requirement; minimum age.
- Gemini consumer paid prices, exact free limits, payment methods,
  cancellation steps.
- Microsoft Copilot cancellation flow, payment methods, exact free limits.
- Perplexity exact free usage count, monthly (non-annual) price, payment
  methods, cancellation flow.
- GitHub Copilot cancellation flow, payment methods; paid prices (NULL).
- Groq dollar free-credit allowance; card/phone/age/payment/cancellation.
- Hugging Face Team/Enterprise prices; card/payment/age details.
- Midjourney official prices, payment methods, exact current revision.
- ElevenLabs pricing/limits/payment methods (official site inaccessible).
- **Regional availability for all websites** — no sufficiently reliable
  official country claims were found, so no `regional_availability` rows
  were added.

## Admin re-verification workflow

To move a row from `partially_verified` to `verified`:

1. Open the row's linked `sources` in `sources` (URLs captured 2026-09-29).
2. Re-check each value on the live official page; update stale values.
3. Write the old→new change into the relevant `change_history` table.
4. Flip the verification record to `verified` with reviewer notes.
5. Set the next monitoring date (`monitoring_checks`).

Never mark a row `verified` from memory or third-party summaries alone.
