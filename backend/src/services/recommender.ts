/**
 * Deterministic, rule-based recommendation engine.
 *
 * Pipeline: parseGoal (keyword -> capabilities/categories/tasks, pure function)
 *   -> candidate fetch (SQL) -> score (weighted signals) -> reasons per item.
 *
 * Verification status is attached from verification_records only — we never
 * claim verified=true unless a 'verified' record exists.
 */
import type {
  AiType,
  ParsedGoal,
  RecommendConstraints,
  RecommendRequest,
  RecommendResponse,
  RecommendationItem,
  VerificationStatus,
} from "ai-discover-shared";
import { query } from "../db.js";

/* ------------------------------------------------------------------ */
/* parseGoal — pure function, unit-testable                             */
/* ------------------------------------------------------------------ */

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  "text-generation": [
    "write", "writing", "essay", "blog", "article", "copy", "copywriting", "content",
    "draft", "story", "stories", "novel", "poem", "lyrics", "email", "letter",
    "script", "summar", "paraphrase", "rewrite", "translat", "caption",
  ],
  "image-generation": [
    "image", "picture", "photo", "artwork", "illustration", "logo", "draw",
    "drawing", "painting", "thumbnail", "poster", "banner", "avatar", "wallpaper",
  ],
  "image-editing": ["edit photo", "retouch", "upscale", "background removal", "remove background", "inpaint"],
  "video-generation": ["video", "clip", "animation", "animate", "film", "movie", "short"],
  "audio-generation": [
    "audio", "sound", "music", "song", "voice", "voiceover", "podcast", "speech",
    "narrat", "tts", "text-to-speech", "sfx",
  ],
  "code-generation": [
    "code", "coding", "program", "debug", "script", "function", "sql", "regex",
    "app", "website", "api", "refactor",
  ],
  chat: ["chat", "chatbot", "conversation", "talk", "assistant", "ask", "q&a", "question"],
  "data-analysis": ["analy", "data", "dataset", "csv", "excel", "spreadsheet", "chart", "statistic"],
  research: ["research", "paper", "thesis", "citation", "literature", "study", "studies"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  writing: ["write", "writing", "essay", "blog", "copywriting", "content"],
  image: ["image", "picture", "photo", "art", "design", "draw"],
  video: ["video", "film", "animation", "clip"],
  audio: ["audio", "music", "voice", "podcast", "speech", "sound"],
  code: ["code", "coding", "program", "developer", "debug", "software"],
  chat: ["chat", "chatbot", "conversation", "assistant"],
  productivity: ["productivity", "productiv", "organize", "notes", "task", "workflow", "meeting"],
  education: ["learn", "study", "education", "course", "tutorial", "homework", "exam"],
  marketing: ["marketing", "seo", "ads", "brand", "social media"],
  business: ["business", "startup", "sales", "crm", "finance"],
  research: ["research", "science", "paper", "academic"],
};

const TASK_KEYWORDS: Record<string, string[]> = {
  summarization: ["summar"],
  translation: ["translat"],
  "image generation": ["generate image", "create image", "make image", "text to image"],
  "video generation": ["generate video", "create video", "text to video"],
  "code generation": ["write code", "generate code", "debug"],
  "voice synthesis": ["voiceover", "text to speech", "tts", "narrat"],
  "data analysis": ["analy", "dataset", "spreadsheet"],
  conversation: ["chat", "talk", "conversation", "ask"],
  "content writing": ["blog", "essay", "article", "copy"],
};

const AITYPE_KEYWORDS: Record<AiType, string[]> = {
  chat: ["chat", "chatbot", "conversation"],
  image: ["image", "picture", "photo", "draw"],
  video: ["video", "film", "animation"],
  audio: ["audio", "sound"],
  music: ["music", "song"],
  voice: ["voice", "voiceover", "speech", "podcast"],
  stt: ["transcri", "speech to text", "stt"],
  embedding: ["embedding", "semantic search", "vector"],
  code: ["code", "coding", "program", "debug"],
  agent: ["agent", "autonomous", "workflow automation"],
  multimodal: ["multimodal", "vision", "image and text"],
  other: [],
};

function matchAny(haystack: string, needles: string[]): string[] {
  return needles.filter((n) => haystack.includes(n));
}

/** Pure keyword parser: goal text -> structured intent. Exported for unit tests. */
export function parseGoal(goal: string): ParsedGoal {
  const text = goal.toLowerCase();
  const keywords = text.split(/[^a-z0-9+#]+/).filter((w) => w.length > 2);

  const capabilitySlugs = Object.entries(CAPABILITY_KEYWORDS)
    .filter(([, kws]) => matchAny(text, kws).length > 0)
    .map(([slug]) => slug);

  const categorySlugs = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, kws]) => matchAny(text, kws).length > 0)
    .map(([slug]) => slug);

  const tasks = Object.entries(TASK_KEYWORDS)
    .filter(([, kws]) => matchAny(text, kws).length > 0)
    .map(([task]) => task);

  const aiTypes = (Object.entries(AITYPE_KEYWORDS) as [AiType, string[]][])
    .filter(([, kws]) => kws.length > 0 && matchAny(text, kws).length > 0)
    .map(([t]) => t);

  return { keywords, capabilitySlugs, categorySlugs, tasks, aiTypes };
}

/* ------------------------------------------------------------------ */
/* Candidate fetch                                                     */
/* ------------------------------------------------------------------ */

interface WebsiteCandidate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  beginnerFriendly: boolean;
  categories: { slug: string; name: string }[];
  capabilities: string[]; // capability slugs via linked models
  modelTypes: AiType[];
  planKinds: string[];
  access: {
    accountRequired: boolean;
    creditCardRequired: boolean;
    paymentRequired: boolean;
  } | null;
  apiAvailable: boolean | null;
  regionBlocked: boolean;
}

interface ModelCandidate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modelType: AiType;
  apiAvailable: boolean;
  isOpenSource: boolean;
  categories: { slug: string; name: string }[];
  capabilities: { slug: string; name: string }[];
  websiteNames: string[];
}

async function latestVerification(
  entityType: "website" | "model",
  entityId: string,
): Promise<{ status: VerificationStatus; lastChecked: string | null }> {
  const { rows } = await query(
    `SELECT status, verified_at FROM verification_records
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY verified_at DESC NULLS LAST, created_at DESC LIMIT 1`,
    [entityType, entityId],
  );
  if (rows.length === 0) return { status: "unverified", lastChecked: null };
  const r = rows[0];
  return {
    status: r.status as VerificationStatus,
    lastChecked: r.verified_at ? new Date(String(r.verified_at)).toISOString() : null,
  };
}

async function fetchWebsiteCandidates(regionCode?: string): Promise<WebsiteCandidate[]> {
  const { rows } = await query(
    `SELECT id, name, slug, tagline, description, beginner_friendly
       FROM ai_websites WHERE deleted_at IS NULL`,
  );
  const out: WebsiteCandidate[] = [];
  for (const w of rows) {
    const id = String(w.id);
    const [cats, mods, plans, access, api, regions] = await Promise.all([
      query(
        `SELECT c.slug, c.name FROM categories c
          JOIN website_categories wc ON wc.category_id = c.id
         WHERE wc.website_id = $1 AND c.deleted_at IS NULL`,
        [id],
      ),
      query(
        `SELECT m.id, m.model_type FROM ai_models m
          JOIN website_models wm ON wm.model_id = m.id
         WHERE wm.website_id = $1 AND m.deleted_at IS NULL`,
        [id],
      ),
      query(`SELECT kind FROM plans WHERE website_id = $1 AND is_current = true`, [id]),
      query(`SELECT account_required, credit_card_required, payment_required FROM access_requirements WHERE website_id = $1`, [id]),
      query(`SELECT has_api FROM api_access WHERE website_id = $1`, [id]),
      regionCode
        ? query(
            `SELECT available FROM regional_availability WHERE website_id = $1 AND country_code = $2`,
            [id, regionCode.toUpperCase()],
          )
        : Promise.resolve({ rows: [] as Record<string, unknown>[], rowCount: 0 }),
    ]);
    const modelIds = mods.rows.map((m) => String(m.id));
    let capabilities: string[] = [];
    if (modelIds.length > 0) {
      const cap = await query(
        `SELECT DISTINCT c.slug FROM capabilities c
          JOIN model_capabilities mc ON mc.capability_id = c.id
         WHERE mc.model_id = ANY($1::uuid[])`,
        [modelIds],
      );
      capabilities = cap.rows.map((c) => String(c.slug));
    }
    const acc = access.rows[0];
    out.push({
      id,
      name: String(w.name),
      slug: String(w.slug),
      tagline: w.tagline as string | null,
      description: w.description as string | null,
      beginnerFriendly: Boolean(w.beginner_friendly),
      categories: cats.rows.map((c) => ({ slug: String(c.slug), name: String(c.name) })),
      capabilities,
      modelTypes: mods.rows.map((m) => m.model_type as AiType),
      planKinds: plans.rows.map((p) => String(p.kind)),
      access: acc
        ? {
            accountRequired: Boolean(acc.account_required),
            creditCardRequired: Boolean(acc.credit_card_required),
            paymentRequired: Boolean(acc.payment_required),
          }
        : null,
      apiAvailable: api.rows[0] ? (api.rows[0].has_api as boolean | null) : null,
      regionBlocked: regions.rows.length > 0 && regions.rows[0].available === false,
    });
  }
  return out;
}

async function fetchModelCandidates(): Promise<ModelCandidate[]> {
  const { rows } = await query(
    `SELECT id, name, slug, description, model_type, api_available, is_open_source
       FROM ai_models WHERE deleted_at IS NULL`,
  );
  const out: ModelCandidate[] = [];
  for (const m of rows) {
    const id = String(m.id);
    const [cats, caps, sites] = await Promise.all([
      query(
        `SELECT c.slug, c.name FROM categories c
          JOIN model_categories mc ON mc.category_id = c.id
         WHERE mc.model_id = $1 AND c.deleted_at IS NULL`,
        [id],
      ),
      query(
        `SELECT c.slug, c.name FROM capabilities c
          JOIN model_capabilities mc ON mc.capability_id = c.id
         WHERE mc.model_id = $1`,
        [id],
      ),
      query(
        `SELECT w.name FROM ai_websites w
          JOIN website_models wm ON wm.website_id = w.id
         WHERE wm.model_id = $1 AND w.deleted_at IS NULL`,
        [id],
      ),
    ]);
    out.push({
      id,
      name: String(m.name),
      slug: String(m.slug),
      description: m.description as string | null,
      modelType: m.model_type as AiType,
      apiAvailable: Boolean(m.api_available),
      isOpenSource: Boolean(m.is_open_source),
      categories: cats.rows.map((c) => ({ slug: String(c.slug), name: String(c.name) })),
      capabilities: caps.rows.map((c) => ({ slug: String(c.slug), name: String(c.name) })),
      websiteNames: sites.rows.map((s) => String(s.name)),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

const FREE_PLAN_KINDS = new Set(["free", "free_trial", "freemium"]);

function scoreWebsite(w: WebsiteCandidate, parsed: ParsedGoal, c: RecommendConstraints): { score: number; reasons: string[] } | null {
  // Hard constraint filters
  if (c.noCreditCard && w.access?.creditCardRequired) return null;
  if (c.noLogin && w.access?.accountRequired) return null;
  if (c.noPayment) {
    if (w.access?.paymentRequired) return null;
    if (w.planKinds.length > 0 && !w.planKinds.some((k) => FREE_PLAN_KINDS.has(k))) return null;
  }
  if (c.apiRequired && w.apiAvailable === false) return null;
  if (c.regionCode && w.regionBlocked) return null;
  if (c.categories && c.categories.length > 0) {
    const wanted = c.categories.map((s) => s.toLowerCase());
    const have = w.categories.map((x) => x.slug.toLowerCase());
    if (!wanted.some((s) => have.includes(s))) return null;
  }

  let score = 0;
  const reasons: string[] = [];
  const hay = `${w.name} ${w.tagline ?? ""} ${w.description ?? ""}`.toLowerCase();

  const capHits = parsed.capabilitySlugs.filter((s) => w.capabilities.includes(s));
  if (capHits.length > 0) {
    score += 4 * capHits.length;
    reasons.push(`Matches your need for ${capHits.join(", ").replace(/-/g, " ")}`);
  }
  const catHits = parsed.categorySlugs.filter((s) =>
    w.categories.some((x) => x.slug === s || x.name.toLowerCase().includes(s)),
  );
  if (catHits.length > 0) {
    score += 3 * catHits.length;
    reasons.push(`In categories you asked about: ${catHits.join(", ")}`);
  }
  const typeHits = parsed.aiTypes.filter((t) => w.modelTypes.includes(t));
  if (typeHits.length > 0) {
    score += 2 * typeHits.length;
    reasons.push(`Offers ${typeHits.join(", ")} AI`);
  }
  const kwHits = parsed.keywords.filter((k) => k.length > 3 && hay.includes(k));
  if (kwHits.length > 0) {
    score += Math.min(kwHits.length, 5);
    reasons.push(`Description matches: ${kwHits.slice(0, 4).join(", ")}`);
  }

  const hasFree = w.planKinds.some((k) => FREE_PLAN_KINDS.has(k));
  if (c.preferFree || c.noPayment) {
    if (hasFree) {
      score += 3;
      reasons.push("Free plan available");
    }
  } else if (hasFree) {
    score += 1;
    reasons.push("Free plan available");
  }
  if (c.noCreditCard && w.access && !w.access.creditCardRequired) {
    score += 2;
    reasons.push("No credit card required to start");
  }
  if (c.beginnerFriendly && w.beginnerFriendly) {
    score += 2;
    reasons.push("Beginner-friendly");
  } else if (w.beginnerFriendly && parsed.keywords.some((k) => ["beginner", "easy", "simple"].includes(k))) {
    score += 2;
    reasons.push("Beginner-friendly");
  }
  if (c.apiRequired && w.apiAvailable) {
    score += 2;
    reasons.push("API available");
  }
  return { score, reasons };
}

function scoreModel(m: ModelCandidate, parsed: ParsedGoal, c: RecommendConstraints): { score: number; reasons: string[] } | null {
  if (c.apiRequired && !m.apiAvailable) return null;
  if (c.categories && c.categories.length > 0) {
    const wanted = c.categories.map((s) => s.toLowerCase());
    const have = m.categories.map((x) => x.slug.toLowerCase());
    if (!wanted.some((s) => have.includes(s))) return null;
  }

  let score = 0;
  const reasons: string[] = [];
  const hay = `${m.name} ${m.description ?? ""}`.toLowerCase();

  const capHits = parsed.capabilitySlugs.filter((s) => m.capabilities.some((x) => x.slug === s));
  if (capHits.length > 0) {
    score += 4 * capHits.length;
    const names = m.capabilities.filter((x) => capHits.includes(x.slug)).map((x) => x.name);
    reasons.push(`Can do: ${names.join(", ")}`);
  }
  const catHits = parsed.categorySlugs.filter((s) =>
    m.categories.some((x) => x.slug === s || x.name.toLowerCase().includes(s)),
  );
  if (catHits.length > 0) {
    score += 3 * catHits.length;
    reasons.push(`In categories you asked about: ${catHits.join(", ")}`);
  }
  if (parsed.aiTypes.includes(m.modelType)) {
    score += 3;
    reasons.push(`Type: ${m.modelType} model`);
  }
  const kwHits = parsed.keywords.filter((k) => k.length > 3 && hay.includes(k));
  if (kwHits.length > 0) {
    score += Math.min(kwHits.length, 5);
    reasons.push(`Description matches: ${kwHits.slice(0, 4).join(", ")}`);
  }
  if (m.apiAvailable) {
    score += 1;
    reasons.push("API available");
  }
  if (m.isOpenSource) {
    score += 1;
    reasons.push("Open source");
  }
  if (m.websiteNames.length > 0) {
    reasons.push(`Available via: ${m.websiteNames.slice(0, 3).join(", ")}`);
  }
  return { score, reasons };
}

/** Main entry: deterministic recommendations for a goal + constraints. */
export async function recommend(req: RecommendRequest): Promise<RecommendResponse> {
  const parsed = parseGoal(req.goal);
  const constraints: RecommendConstraints = req.constraints ?? {};

  const [websites, models] = await Promise.all([
    fetchWebsiteCandidates(constraints.regionCode),
    fetchModelCandidates(),
  ]);

  const items: RecommendationItem[] = [];

  for (const w of websites) {
    const s = scoreWebsite(w, parsed, constraints);
    if (!s || s.score <= 0) continue;
    const verification = await latestVerification("website", w.id);
    const reasons = [...s.reasons];
    if (verification.status === "verified") reasons.push("Verified by our team");
    else if (verification.status === "partially_verified") reasons.push("Partially verified");
    items.push({
      kind: "website",
      id: w.id,
      name: w.name,
      slug: w.slug,
      score: s.score,
      reasons,
      verification,
    });
  }
  for (const m of models) {
    const s = scoreModel(m, parsed, constraints);
    if (!s || s.score <= 0) continue;
    const verification = await latestVerification("model", m.id);
    const reasons = [...s.reasons];
    if (verification.status === "verified") reasons.push("Verified by our team");
    else if (verification.status === "partially_verified") reasons.push("Partially verified");
    items.push({
      kind: "model",
      id: m.id,
      name: m.name,
      slug: m.slug,
      score: s.score,
      reasons,
      verification,
    });
  }

  items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    items: items.slice(0, 10),
    parsedGoal: parsed,
    totalCandidates: websites.length + models.length,
  };
}
