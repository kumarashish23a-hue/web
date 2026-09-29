# Recommendation engine

> Ground truth: [CONTRACT.md](../CONTRACT.md) (`backend/src/services/recommender.ts`, `backend/src/services/ai/`). Scoring weights and keyword lists: *confirm against implementation*.

## Design philosophy

The engine is **deterministic, rule-based, and explainable** — deliberately, not as a placeholder:

1. **Explainability is a feature.** Every recommendation ships `reasons: string[]` ("Free tier available", "No credit card required", "Matches: image generation"). A beginner can ask *why* and get an answer.
2. **Verification honesty is enforceable in code.** The rule "never claim verified without a `verification_records` row with `status='verified'`" is a hard check, not a prompt instruction.
3. **Zero marginal cost, offline-capable, unit-testable.** `parseGoal` is a pure function; the whole pipeline runs on the DB you already have.

An `AIProvider` seam (below) keeps LLM-powered recommendations possible later without rewriting routes or the frontend.

## Pipeline

```
POST /api/v1/recommend   { goal, constraints? }
        │
        ▼
1. parseGoal(goal)          keyword → capabilities / categories / tasks
        │                   (pure function, unit-testable)
        ▼
2. Candidate fetch          SQL over ai_websites / ai_models / website_models /
                            plans / access_requirements / verification_records,
                            pre-filtered by hard constraints
        ▼
3. Score                    weighted signals per candidate
        ▼
4. Explain                  reasons[] + verification { status, lastChecked }
        │
        ▼
{ data: [ { …, score, reasons, verification } ] }   ranked
```

### 1. parseGoal

Maps free text to the catalog's controlled vocabulary. Example mappings (confirm exact keyword lists against implementation):

| User says | Maps to |
|---|---|
| "make images", "draw", "art" | capability `image-generation`, category image |
| "write", "blog", "essay" | capability `text-generation`, ai_type `chat` |
| "free", "no card", "without paying" | constraints `preferFree`, `noCreditCard` |
| "code", "debug", "programming" | capability `code-assistance`, ai_type `code` |
| "video", "voice", "music" | ai_type `video` / `voice` / `music` |

Unknown words are ignored (not guessed) — the engine degrades to category/keyword fallback rather than hallucinating a mapping.

### 2. Candidate fetch

SQL pulls websites/models matching the parsed capabilities/categories, then applies **hard constraints** as filters (a candidate that violates one is removed, not down-ranked):

- `noCreditCard` → `access_requirements.credit_card_required = false`
- `noPayment` → plans of kind `free`/`freemium` exist (confirm exact logic)
- `beginnerFriendly` → `ai_websites.beginner_friendly = true`
- `apiRequired` → `api_access.has_api = true`
- `regionCode` → `regional_availability` row with `available = true` for that `country_code`
- `categories` → join-table membership

### 3. Scoring (weighted signals)

| Signal | What it measures |
|---|---|
| Capability match | Overlap between parsed capabilities and `model_capabilities` / categories |
| Free-tier fit | Presence/quality of free plan (`plans.kind`) and limits |
| Constraint satisfaction | How cleanly soft preferences are met |
| Verification recency | `verified` beats `partially_verified` beats `unverified`; fresher `verified_at`/`last_checked_at` wins ties |

Exact weights: confirm against implementation. The output is a ranked list — scores are internal; users see the ranking plus reasons.

### 4. Explain

Each item returns:

```jsonc
{
  "reasons": [
    "Matches: image generation",
    "Free tier available",
    "No credit card required"
  ],
  "verification": { "status": "verified", "lastChecked": "2026-09-20T…" }
}
```

## Input / output contract

**Request** — `POST /api/v1/recommend`:

```jsonc
{
  "goal": "I want a free AI tool to generate images without a credit card",
  "constraints": {
    "preferFree": true,
    "noCreditCard": true,
    "noPayment": true,
    "noLogin": false,
    "beginnerFriendly": true,
    "apiRequired": false,
    "regionCode": "IN",
    "categories": ["image"]
  }
}
```

All `constraints` fields are optional; sensible defaults come from `user_preferences` for logged-in users (confirm merge behavior against implementation).

**Response:**

```jsonc
{
  "data": [
    {
      "type": "website",
      "id": "…",
      "slug": "canvasforge",
      "name": "CanvasForge",
      "tagline": "…",
      "score": 0.92,
      "reasons": [
        "Matches: image generation",
        "Free tier available",
        "No credit card required",
        "Beginner-friendly"
      ],
      "verification": { "status": "unverified", "lastChecked": null },
      "isDemo": true
    }
  ]
}
```

> The example uses the fictional demo seed name **CanvasForge** and shows `verification.status: "unverified"` — because demo data is never verified (see [data-verification.md](data-verification.md)). The UI must render the demo marker honestly.

## Verification honesty rule

Enforced in code, not convention: before the engine labels an item `verified`, it must find a `verification_records` row with `status='verified'` for that entity. Otherwise the item reports its true status (`unverified`, `partially_verified`, …) and the UI badges it accordingly. **The recommender never upgrades a status.**

## LLM provider (live, opt-in)

`backend/src/services/ai/AIProvider.ts` defines the seam; `backend/src/services/ai/openaiCompatible.ts`
implements it against any OpenAI-compatible `/chat/completions` endpoint.

| Implementation | State |
|---|---|
| `RuleBasedProvider` | **Live, default** — deterministic pipeline above |
| `OpenAICompatibleProvider` (`OpenAIProvider` alias) | **Live, opt-in** — LLM goal parsing + re-ranking |

How it works:

1. **Goal parsing** — the LLM turns the natural-language goal into structured data
   (keywords, capability/category slugs, tasks, AI types, inferred constraints like
   `noCreditCard`). Slugs are validated against the `capabilities`/`categories`
   tables — unknown slugs are dropped. Any LLM failure falls back to the rule-based
   keyword parser.
2. **Candidate sourcing** — the rule-based engine fetches and scores DB candidates
   as usual. The LLM never sees raw DB rows beyond id/name/score/reasons/status.
3. **Re-ranking** — the LLM orders the top candidates and may add 1–2 short
   plain-language reasons each. `validateRanking()` drops any `(kind, id)` not in
   the candidate set, so hallucinated references can never reach the user.
4. **Verification honesty** — unchanged: statuses come from `verification_records`
   only. The LLM cannot mint `verified` badges, prices, or limits.

### Enabling it (all server-side)

In the backend environment (never `VITE_`-prefixed, never in the frontend bundle):

```bash
AI_PROVIDER=llm                                  # or keep rule-based default
AI_LLM_BASE_URL=https://api.apinex.bond/v1       # any OpenAI-compatible endpoint
AI_LLM_API_KEY=sk-...                            # stays server-side
AI_LLM_MODEL=free/claude-sonnet-4.6
```

Works with APInex, MiniMax (`https://api.minimax.io/v1`), OpenAI, or a local
OpenAI-compatible server. `OPENAI_API_KEY` is still honored as a fallback for the key.

Per-request opt-in without changing the default: `POST /api/v1/recommend` accepts
`{ "goal": "...", "useLlm": true }`. If the LLM is requested but not configured,
or the call fails/times out (15s), the endpoint silently falls back to the
rule-based engine — recommendations never 500 because of the LLM. The response
carries `engine: "rule-based" | "llm"` (and `llmModel` when applicable).

No route, schema, or frontend changes are needed — that's the point of the seam.

## Future: semantic-search seam

Keyword search (`GET /search?q=`) is the v1. A future semantic layer (embeddings over names/descriptions, pgvector or an external index) would slot in as:

- a new candidate-fetch strategy inside the recommender (same scoring/explain steps), and/or
- an upgraded `/search` backend — the API shape stays the same.

Marked TODO in the contract; nothing to integrate yet.
