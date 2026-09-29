/**
 * OpenAI-compatible LLM provider for the AI discovery platform.
 *
 * Implements the AIProvider seam against any OpenAI-compatible
 * /chat/completions endpoint (OpenAI itself, APInex, MiniMax, local models…).
 *
 * Design rules (do not weaken these):
 * 1. The LLM never invents facts. It receives candidate websites/models
 *    already loaded from the database (IDs, names, reasons, verification
 *    status) and may only RETURN A RANKING over those IDs plus short
 *    plain-language reasons. Any ID/kind pair it returns that is not in the
 *    candidate set is dropped as a hallucination.
 * 2. The LLM never mints verification statuses or prices/limits. Scores,
 *    reasons sourced from the DB, and verification badges all come from the
 *    rule-based engine's output; the LLM only re-orders and may add
 *    explanatory reasons.
 * 3. Any LLM failure (network, timeout, bad JSON, empty result) falls back
 *    to the rule-based engine — generateRecommendations never rejects
 *    because of the LLM.
 * 4. The API key lives server-side only, read from env. It is never put
 *    into a response, log line, or error message.
 */
import { z } from "zod";
import {
  AI_TYPES,
  recommendConstraintsSchema,
  type AiType,
  type ParsedGoal,
  type RecommendConstraints,
  type RecommendRequest,
  type RecommendResponse,
  type RecommendationItem,
} from "ai-discover-shared";
import { config } from "../../config.js";
import { query } from "../../db.js";
import { parseGoal, recommend } from "../recommender.js";
import type { AIProvider } from "./AIProvider.js";

export interface LlmEndpointConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Per-request timeout in ms. Defaults to 15_000. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RANK_CANDIDATES = 12;
const MAX_LLM_REASONS = 2;
const MAX_REASON_CHARS = 200;

const analyzeGoalSchema = z.object({
  keywords: z.array(z.string().max(60)).max(40).default([]),
  capabilitySlugs: z.array(z.string().max(80)).max(20).default([]),
  categorySlugs: z.array(z.string().max(80)).max(20).default([]),
  tasks: z.array(z.string().max(80)).max(20).default([]),
  aiTypes: z.array(z.string().max(40)).max(12).default([]),
  constraints: recommendConstraintsSchema.optional().default({}),
});

const rankingSchema = z.object({
  ranking: z
    .array(
      z.object({
        kind: z.enum(["website", "model"]),
        id: z.string().uuid(),
        reasons: z.array(z.string().max(MAX_REASON_CHARS)).max(MAX_LLM_REASONS).default([]),
      }),
    )
    .max(MAX_RANK_CANDIDATES),
});

/* ------------------------------------------------------------------ */
/* low-level chat call                                                 */
/* ------------------------------------------------------------------ */

async function chatJson(cfg: LlmEndpointConfig, system: string, user: string): Promise<unknown> {
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    // NB: no response_format=json_object — some compatible gateways reject it;
    // we parse defensively instead.
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`LLM request failed with HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = body?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned no content");
  }
  return extractJson(content);
}

/** Parse the first JSON object found in model output (tolerates code fences). */
export function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("LLM output contained no JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/* ------------------------------------------------------------------ */
/* vocabulary validation                                               */
/* ------------------------------------------------------------------ */

async function knownSlugs(table: "capabilities" | "categories"): Promise<Set<string>> {
  // Tolerant of schemas without the soft-delete column (e.g. simplified test schemas).
  const variants = [
    `SELECT slug FROM ${table} WHERE deleted_at IS NULL`,
    `SELECT slug FROM ${table}`,
  ];
  for (const sql of variants) {
    try {
      const { rows } = await query(sql);
      return new Set(rows.map((r) => String(r.slug).toLowerCase()));
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "42703") continue; // undefined column -> try the plainer query
      throw err;
    }
  }
  return new Set();
}

function sanitizeStringList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = v.trim().toLowerCase();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function sanitizeAiTypes(values: string[]): AiType[] {
  const known = new Set<string>(AI_TYPES);
  return sanitizeStringList(values).filter((v) => known.has(v)) as AiType[];
}

/* ------------------------------------------------------------------ */
/* pure helpers (unit-testable)                                        */
/* ------------------------------------------------------------------ */

/**
 * Drop any ranking entry whose (kind, id) is not in the DB candidate set.
 * This is the anti-hallucination gate: the LLM can only re-order records
 * that actually exist.
 */
export function validateRanking(
  candidates: Pick<RecommendationItem, "kind" | "id">[],
  ranking: { kind: "website" | "model"; id: string; reasons: string[] }[],
): { kind: "website" | "model"; id: string; reasons: string[] }[] {
  const allowed = new Set(candidates.map((c) => `${c.kind}:${c.id}`));
  const seen = new Set<string>();
  const out: { kind: "website" | "model"; id: string; reasons: string[] }[] = [];
  for (const r of ranking) {
    const key = `${r.kind}:${r.id}`;
    if (!allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Merge LLM-drafted reasons after the DB-backed ones, capped and de-duplicated. */
export function mergeLlmReasons(base: string[], extra: string[]): string[] {
  const out = [...base];
  const seen = new Set(base.map((s) => s.toLowerCase()));
  for (const r of extra) {
    const s = r.trim().slice(0, MAX_REASON_CHARS);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* prompts                                                             */
/* ------------------------------------------------------------------ */

const ANALYZE_SYSTEM = `You parse what a user wants to accomplish into structured data for an AI-tool discovery platform.
Reply with a single JSON object and nothing else, with these keys:
{
  "keywords": ["important words from the request"],
  "capabilitySlugs": ["slugs like text-generation, image-generation, image-editing, video-generation, audio-generation, code-generation, chat, data-analysis, research — only use slugs that appear in the provided vocabulary lists"],
  "categorySlugs": ["category slugs from the provided vocabulary, if any"],
  "tasks": ["short task names like image generation, code generation, summarization, translation, voice synthesis, data analysis, conversation, content writing"],
  "aiTypes": ["one or more of: chat, image, video, audio, music, voice, stt, embedding, code, agent, multimodal, other"],
  "constraints": {
    "preferFree": true when the user wants free options,
    "noCreditCard": true when the user says no credit card,
    "noPayment": true when the user will not pay anything,
    "noLogin": true when the user wants no account / no login,
    "beginnerFriendly": true when the user is a beginner or wants easy tools,
    "apiRequired": true when the user needs an API,
    "regionCode": "2-letter country code if the user mentions a country/region",
    "categories": ["category slugs the user explicitly names"]
  }
}
Only include constraints the user actually expressed. Omit everything else. Do not invent capabilities or categories outside the vocabulary lists.`;

const RANK_SYSTEM = `You re-rank AI tools for a user's goal. You are given a JSON list of candidate websites/models that already exist in our database, each with its id, name, rule-based score, reasons, and verification status.
Reply with a single JSON object and nothing else:
{ "ranking": [ { "kind": "website" | "model", "id": "<id exactly as given>", "reasons": ["1-2 short plain-language reasons why this fits the goal"] } ] }
Rules:
- ONLY use ids from the provided candidate list, copied exactly. Never invent ids, names, prices, limits, or free tiers.
- Do not change or add verification statuses, prices, or limits. Reasons must stay generic (what the tool does, who it suits), never factual claims like "20 requests/day".
- Order best-first. You may omit candidates that do not fit.`;

/* ------------------------------------------------------------------ */
/* provider                                                            */
/* ------------------------------------------------------------------ */

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";
  protected readonly llm: LlmEndpointConfig;

  constructor(opts?: Partial<LlmEndpointConfig>) {
    const baseUrl = opts?.baseUrl ?? config.aiLlmBaseUrl;
    const apiKey = opts?.apiKey ?? (config.aiLlmApiKey || config.openaiApiKey);
    const model = opts?.model ?? config.aiLlmModel;
    if (!baseUrl) {
      throw new Error("LLM provider not configured — set AI_LLM_BASE_URL");
    }
    if (!apiKey) {
      throw new Error("LLM provider not configured — set AI_LLM_API_KEY (or OPENAI_API_KEY)");
    }
    if (!model) {
      throw new Error("LLM provider not configured — set AI_LLM_MODEL");
    }
    this.llm = {
      baseUrl,
      apiKey,
      model,
      timeoutMs: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  async analyzeGoal(goal: string): Promise<ParsedGoal> {
    try {
      const [capSlugs, catSlugs] = await Promise.all([
        knownSlugs("capabilities"),
        knownSlugs("categories"),
      ]);
      const raw = await chatJson(
        this.llm,
        `${ANALYZE_SYSTEM}\nKnown capability slugs: ${[...capSlugs].join(", ")}\nKnown category slugs: ${[...catSlugs].join(", ")}`,
        goal,
      );
      const parsed = analyzeGoalSchema.parse(raw);
      const capabilitySlugs = parsed.capabilitySlugs
        .map((s) => s.toLowerCase())
        .filter((s) => capSlugs.has(s));
      const categorySlugs = parsed.categorySlugs
        .map((s) => s.toLowerCase())
        .filter((s) => catSlugs.has(s));
      const aiTypes = sanitizeAiTypes(parsed.aiTypes);
      const tasks = sanitizeStringList(parsed.tasks);
      const hasSignal =
        capabilitySlugs.length > 0 ||
        categorySlugs.length > 0 ||
        tasks.length > 0 ||
        aiTypes.length > 0;
      if (!hasSignal) {
        return parseGoal(goal); // LLM gave nothing usable -> deterministic fallback
      }
      const constraints = recommendConstraintsSchema.parse(parsed.constraints ?? {});
      return {
        keywords: sanitizeStringList(parsed.keywords),
        capabilitySlugs,
        categorySlugs,
        tasks,
        aiTypes,
        inferredConstraints: constraints,
      };
    } catch {
      return parseGoal(goal);
    }
  }

  async classifyTask(goal: string): Promise<string[]> {
    const parsed = await this.analyzeGoal(goal);
    return parsed.tasks;
  }

  async extractRequirements(
    goal: string,
    constraints?: RecommendConstraints,
  ): Promise<RecommendConstraints> {
    const parsed = await this.analyzeGoal(goal);
    // Explicit caller constraints always win over LLM-inferred ones.
    return { ...(parsed.inferredConstraints ?? {}), ...(constraints ?? {}) };
  }

  async generateRecommendations(req: RecommendRequest): Promise<RecommendResponse> {
    // 1. Parse the goal (LLM with rule-based fallback inside analyzeGoal).
    let parsed: ParsedGoal;
    try {
      parsed = await this.analyzeGoal(req.goal);
    } catch {
      parsed = parseGoal(req.goal);
    }
    const constraints: RecommendConstraints = {
      ...(parsed.inferredConstraints ?? {}),
      ...(req.constraints ?? {}),
    };

    // 2. Rule-based engine fetches DB candidates, scores them, and attaches
    //    DB-backed reasons + verification. This is the source of truth.
    const base = await recommend({ goal: req.goal, constraints });
    const candidates = base.items;
    if (candidates.length === 0) {
      return { ...base, parsedGoal: parsed, engine: "rule-based" };
    }

    // 3. Ask the LLM to re-rank the top candidates. Any failure -> rule-based.
    try {
      const ranked = await this.rankWithLlm(req.goal, candidates);
      const order = new Map(ranked.map((r, i) => [`${r.kind}:${r.id}`, i]));
      const byKey = new Map(candidates.map((c) => [`${c.kind}:${c.id}`, c]));
      const items: RecommendationItem[] = ranked.map((r) => {
        const c = byKey.get(`${r.kind}:${r.id}`)!;
        return { ...c, reasons: mergeLlmReasons(c.reasons, r.reasons) };
      });
      // Keep unranked candidates after the ranked ones (rule-based order).
      for (const c of candidates) {
        if (!order.has(`${c.kind}:${c.id}`)) items.push(c);
      }
      return {
        items: items.slice(0, 10),
        parsedGoal: parsed,
        totalCandidates: base.totalCandidates,
        engine: "llm",
        llmModel: this.llm.model,
      };
    } catch {
      return { ...base, parsedGoal: parsed, engine: "rule-based" };
    }
  }

  private async rankWithLlm(
    goal: string,
    candidates: RecommendationItem[],
  ): Promise<{ kind: "website" | "model"; id: string; reasons: string[] }[]> {
    const shortlist = candidates.slice(0, MAX_RANK_CANDIDATES).map((c) => ({
      kind: c.kind,
      id: c.id,
      name: c.name,
      ruleScore: c.score,
      reasons: c.reasons,
      verificationStatus: c.verification.status,
    }));
    const raw = await chatJson(
      this.llm,
      RANK_SYSTEM,
      JSON.stringify({ goal, candidates: shortlist }),
    );
    const parsed = rankingSchema.parse(raw);
    return validateRanking(shortlist, parsed.ranking);
  }
}
