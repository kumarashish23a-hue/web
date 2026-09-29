import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  compareSchema,
  paginationSchema,
  recommendSchema,
  searchSchema,
  slugParamSchema,
} from "ai-discover-shared";
import { query } from "../db.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errors.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { camelRow, camelRows } from "../utils/case.js";
import { pp, qp } from "../utils/query.js";
import { createAIProvider } from "../services/ai/AIProvider.js";
import {
  getVerificationSummary,
  modelWebsites,
  paginationMeta,
  serializeModel,
  serializeWebsite,
  websiteCategories,
  websiteModels,
} from "./serializers.js";

export const publicRouter = Router();

const recommendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests, try again later" } },
});

/* ------------------------------- websites ------------------------------ */

publicRouter.get(
  "/websites",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q, category } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      category?: string;
    };
    const where: string[] = ["w.deleted_at IS NULL"];
    const params: unknown[] = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(w.name ILIKE $${params.length} OR w.tagline ILIKE $${params.length} OR w.description ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category.toLowerCase());
      where.push(`EXISTS (SELECT 1 FROM website_categories wc JOIN categories c ON c.id = wc.category_id
        WHERE wc.website_id = w.id AND (c.slug = $${params.length} OR lower(c.name) = $${params.length}) AND c.deleted_at IS NULL)`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM ai_websites w ${whereSql}`, params)).rows[0].n);
    const { rows } = await query(
      `SELECT w.* FROM ai_websites w ${whereSql} ORDER BY w.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    const data = [];
    for (const row of rows) data.push(await serializeWebsite(row));
    res.json({ data, meta: paginationMeta(page, limit, total) });
  }),
);

publicRouter.get(
  "/websites/:slug",
  validate(slugParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT * FROM ai_websites WHERE slug = $1 AND deleted_at IS NULL",
      [pp(req.params, "slug")],
    );
    if (rows.length === 0) throw notFound("Website not found");
    res.json({ data: await serializeWebsite(rows[0], { detail: true }) });
  }),
);

/* -------------------------------- models ------------------------------- */

publicRouter.get(
  "/models",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q, category } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      category?: string;
    };
    const where: string[] = ["m.deleted_at IS NULL"];
    const params: unknown[] = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(m.name ILIKE $${params.length} OR m.description ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category.toLowerCase());
      where.push(`EXISTS (SELECT 1 FROM model_categories mc JOIN categories c ON c.id = mc.category_id
        WHERE mc.model_id = m.id AND (c.slug = $${params.length} OR lower(c.name) = $${params.length}) AND c.deleted_at IS NULL)`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM ai_models m ${whereSql}`, params)).rows[0].n);
    const { rows } = await query(
      `SELECT m.* FROM ai_models m ${whereSql} ORDER BY m.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    const data = [];
    for (const row of rows) data.push(await serializeModel(row));
    res.json({ data, meta: paginationMeta(page, limit, total) });
  }),
);

publicRouter.get(
  "/models/:slug",
  validate(slugParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT * FROM ai_models WHERE slug = $1 AND deleted_at IS NULL",
      [pp(req.params, "slug")],
    );
    if (rows.length === 0) throw notFound("Model not found");
    res.json({ data: await serializeModel(rows[0], { availability: true }) });
  }),
);

/* ------------------------------ categories ----------------------------- */

publicRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT c.*, 
        (SELECT COUNT(*)::int FROM website_categories wc JOIN ai_websites w ON w.id = wc.website_id WHERE wc.category_id = c.id AND w.deleted_at IS NULL) AS website_count,
        (SELECT COUNT(*)::int FROM model_categories mc JOIN ai_models m ON m.id = mc.model_id WHERE mc.category_id = c.id AND m.deleted_at IS NULL) AS model_count
       FROM categories c WHERE c.deleted_at IS NULL ORDER BY c.sort_order NULLS LAST, c.name`,
    );
    res.json({ data: camelRows(rows) });
  }),
);

publicRouter.get(
  "/categories/:slug",
  validate(slugParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT * FROM categories WHERE slug = $1 AND deleted_at IS NULL",
      [pp(req.params, "slug")],
    );
    if (rows.length === 0) throw notFound("Category not found");
    const category = camelRow(rows[0]);
    const catId = String(rows[0].id);
    const [ws, ms] = await Promise.all([
      query(
        `SELECT w.* FROM ai_websites w JOIN website_categories wc ON wc.website_id = w.id
          WHERE wc.category_id = $1 AND w.deleted_at IS NULL ORDER BY w.name`,
        [catId],
      ),
      query(
        `SELECT m.* FROM ai_models m JOIN model_categories mc ON mc.model_id = m.id
          WHERE mc.category_id = $1 AND m.deleted_at IS NULL ORDER BY m.name`,
        [catId],
      ),
    ]);
    const websites = [];
    for (const w of ws.rows) websites.push(await serializeWebsite(w));
    const models = [];
    for (const m of ms.rows) models.push(await serializeModel(m));
    res.json({ data: { category, websites, models } });
  }),
);

/* -------------------------------- search ------------------------------- */

publicRouter.get(
  "/search",
  optionalAuth,
  validate(searchSchema, "query"),
  asyncHandler(async (req, res) => {
    const { q, type, page, limit } = req.query as unknown as {
      q: string;
      type: string;
      page: number;
      limit: number;
    };
    const like = `%${q}%`;
    const result: Record<string, unknown> = {};
    let total = 0;

    if (type === "all" || type === "website") {
      const { rows } = await query(
        `SELECT * FROM ai_websites WHERE deleted_at IS NULL
          AND (name ILIKE $1 OR tagline ILIKE $1 OR description ILIKE $1)
         ORDER BY name LIMIT $2 OFFSET $3`,
        [like, limit, (page - 1) * limit],
      );
      const items = [];
      for (const r of rows) items.push(await serializeWebsite(r));
      result.websites = items;
      total += items.length;
    }
    if (type === "all" || type === "model") {
      const { rows } = await query(
        `SELECT * FROM ai_models WHERE deleted_at IS NULL
          AND (name ILIKE $1 OR description ILIKE $1)
         ORDER BY name LIMIT $2 OFFSET $3`,
        [like, limit, (page - 1) * limit],
      );
      const items = [];
      for (const r of rows) items.push(await serializeModel(r));
      result.models = items;
      total += items.length;
    }
    if (type === "all" || type === "category") {
      const { rows } = await query(
        `SELECT * FROM categories WHERE deleted_at IS NULL
          AND (name ILIKE $1 OR description ILIKE $1)
         ORDER BY name LIMIT $2 OFFSET $3`,
        [like, limit, (page - 1) * limit],
      );
      result.categories = camelRows(rows);
      total += rows.length;
    }
    if (type === "all" || type === "capability") {
      const { rows } = await query(
        `SELECT * FROM capabilities WHERE name ILIKE $1 OR description ILIKE $1
         ORDER BY name LIMIT $2 OFFSET $3`,
        [like, limit, (page - 1) * limit],
      );
      result.capabilities = camelRows(rows);
      total += rows.length;
    }

    // Log non-sensitive search history for signed-in users.
    if (req.user) {
      await query("INSERT INTO search_history (user_id, query) VALUES ($1, $2)", [
        req.user.id,
        q.slice(0, 200),
      ]).catch(() => undefined);
    }

    res.json({ data: result, meta: paginationMeta(page, limit, total) });
  }),
);

/* -------------------------------- compare ------------------------------ */

function fmtValue(v: unknown): string | string[] | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length > 0 ? v.map(String) : null;
  return String(v);
}

async function websiteCompareRows(id: string): Promise<[string, unknown][]> {
  const { rows } = await query("SELECT * FROM ai_websites WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (rows.length === 0) throw notFound("Website not found");
  const w = rows[0];
  const [cats, models, plans, access, api, verification] = await Promise.all([
    websiteCategories(id).then((c) => c.map((x) => x.name)),
    websiteModels(id).then((m) => m.map((x) => x.name)),
    query("SELECT name, kind, price_amount, price_currency, price_per FROM plans WHERE website_id = $1 AND is_current = true", [id]).then(
      (r) => r.rows.map((p) => `${p.name} (${p.kind}${p.price_amount ? `, ${p.price_amount} ${p.price_currency ?? ""}` : ""})`),
    ),
    query("SELECT credit_card_required, payment_required, account_required FROM access_requirements WHERE website_id = $1", [id]).then((r) => r.rows[0]),
    query("SELECT has_api, free_tier FROM api_access WHERE website_id = $1", [id]).then((r) => r.rows[0]),
    getVerificationSummary("website", id),
  ]);
  return [
    ["Name", w.name],
    ["Tagline", w.tagline],
    ["Description", w.description],
    ["Official URL", w.official_url],
    ["Open source", w.is_open_source],
    ["Beginner friendly", w.beginner_friendly],
    ["Categories", cats],
    ["Models", models],
    ["Plans", plans],
    ["Requires credit card", access ? access.credit_card_required : null],
    ["Requires payment", access ? access.payment_required : null],
    ["Account required", access ? access.account_required : null],
    ["API available", api ? api.has_api : null],
    ["API free tier", api ? api.free_tier : null],
    ["Verification status", verification ? verification.status : "unverified"],
  ];
}

async function modelCompareRows(id: string): Promise<[string, unknown][]> {
  const { rows } = await query("SELECT * FROM ai_models WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (rows.length === 0) throw notFound("Model not found");
  const m = rows[0];
  const [provider, cats, caps, sites, verification] = await Promise.all([
    m.provider_id
      ? query("SELECT name FROM providers WHERE id = $1", [m.provider_id]).then((r) => r.rows[0]?.name ?? null)
      : Promise.resolve(null),
    query(
      `SELECT c.name FROM categories c JOIN model_categories mc ON mc.category_id = c.id WHERE mc.model_id = $1 AND c.deleted_at IS NULL`,
      [id],
    ).then((r) => r.rows.map((x) => String(x.name))),
    query(
      `SELECT c.name FROM capabilities c JOIN model_capabilities mc ON mc.capability_id = c.id WHERE mc.model_id = $1`,
      [id],
    ).then((r) => r.rows.map((x) => String(x.name))),
    modelWebsites(id).then((w) => w.map((x) => x.name)),
    getVerificationSummary("model", id),
  ]);
  return [
    ["Name", m.name],
    ["Description", m.description],
    ["Type", m.model_type],
    ["Provider", provider],
    ["Open source", m.is_open_source],
    ["License", m.license],
    ["Context window (tokens)", m.context_window_tokens],
    ["Input modalities", m.input_modalities],
    ["Output modalities", m.output_modalities],
    ["API available", m.api_available],
    ["Categories", cats],
    ["Capabilities", caps],
    ["Available via", sites],
    ["Verification status", verification ? verification.status : "unverified"],
  ];
}

publicRouter.get(
  "/compare",
  validate(compareSchema, "query"),
  asyncHandler(async (req, res) => {
    const { type, ids } = req.query as unknown as { type: "website" | "model"; ids: string[] };
    if (ids.length < 2) throw badRequest("Provide 2–4 ids to compare", "VALIDATION_ERROR");
    const perItem = await Promise.all(
      ids.map((id) => (type === "website" ? websiteCompareRows(id) : modelCompareRows(id))),
    );
    // Build side-by-side rows dynamically: union of labels in first-seen order.
    const labels: string[] = [];
    for (const rows of perItem) {
      for (const [label] of rows) if (!labels.includes(label)) labels.push(label);
    }
    const table = labels.map((label) => ({
      label,
      values: perItem.map((rows) => {
        const found = rows.find(([l]) => l === label);
        return found ? fmtValue(found[1]) : null;
      }),
    }));
    const items = await Promise.all(
      ids.map(async (id) => {
        const table = type === "website" ? "ai_websites" : "ai_models";
        const { rows } = await query(`SELECT id, name, slug FROM ${table} WHERE id = $1`, [id]);
        const r = rows[0] as { id: unknown; name: unknown; slug: unknown } | undefined;
        return { id: String(id), name: r ? String(r.name) : "?", slug: r ? String(r.slug) : "" };
      }),
    );
    res.json({ data: { type, items, rows: table } });
  }),
);

/* ------------------------------- recommend ----------------------------- */

publicRouter.post(
  "/recommend",
  recommendLimiter,
  optionalAuth,
  validate(recommendSchema),
  asyncHandler(async (req, res) => {
    const provider = createAIProvider({ useLlm: req.body.useLlm === true });
    const result = await provider.generateRecommendations({
      goal: req.body.goal,
      constraints: req.body.constraints,
    });
    res.json({ data: result });
  }),
);

/* ------------------------- pricing / access lookups -------------------- */

async function resolveWebsite(ref: string): Promise<Record<string, unknown>> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
  const { rows } = await query(
    `SELECT * FROM ai_websites WHERE ${isUuid ? "id = $1" : "slug = $1"} AND deleted_at IS NULL`,
    [ref],
  );
  if (rows.length === 0) throw notFound("Website not found");
  return rows[0];
}

publicRouter.get(
  "/pricing",
  asyncHandler(async (req, res) => {
    const website = qp(req.query, "website");
    if (!website) throw badRequest("Query param 'website' (slug or id) is required");
    const w = await resolveWebsite(website);
    const { rows } = await query(
      "SELECT * FROM plans WHERE website_id = $1 ORDER BY is_current DESC, name",
      [w.id],
    );
    const plans = [];
    for (const p of rows) {
      const limits = await query("SELECT * FROM plan_limits WHERE plan_id = $1", [p.id]);
      const verification = await getVerificationSummary("plan", String(p.id));
      plans.push({ ...camelRow(p), limits: camelRows(limits.rows), verification });
    }
    res.json({ data: { website: { id: String(w.id), name: String(w.name), slug: String(w.slug) }, plans } });
  }),
);

publicRouter.get(
  "/access",
  asyncHandler(async (req, res) => {
    const website = qp(req.query, "website");
    if (!website) throw badRequest("Query param 'website' (slug or id) is required");
    const w = await resolveWebsite(website);
    const id = String(w.id);
    const [reqs, methods, cancel, api, regions] = await Promise.all([
      query("SELECT * FROM access_requirements WHERE website_id = $1", [id]),
      query(
        `SELECT pm.id, pm.code, pm.label, wpm.notes FROM payment_methods pm
          JOIN website_payment_methods wpm ON wpm.payment_method_id = pm.id
         WHERE wpm.website_id = $1`,
        [id],
      ),
      query("SELECT * FROM cancellation_policies WHERE website_id = $1", [id]),
      query("SELECT * FROM api_access WHERE website_id = $1", [id]),
      query("SELECT * FROM regional_availability WHERE website_id = $1 ORDER BY country_code", [id]),
    ]);
    res.json({
      data: {
        website: { id, name: String(w.name), slug: String(w.slug) },
        requirements: reqs.rows[0] ? camelRow(reqs.rows[0]) : null,
        paymentMethods: camelRows(methods.rows),
        cancellation: cancel.rows[0] ? camelRow(cancel.rows[0]) : null,
        apiAccess: api.rows[0] ? camelRow(api.rows[0]) : null,
        regions: camelRows(regions.rows),
      },
    });
  }),
);

publicRouter.get(
  "/sources",
  asyncHandler(async (req, res) => {
    const entityType = qp(req.query, "entityType");
    const entityId = qp(req.query, "entityId");
    if (!entityType || !entityId) throw badRequest("Query params 'entityType' and 'entityId' are required");
    const { rows } = await query(
      `SELECT DISTINCT s.* FROM sources s
        JOIN verification_records vr ON vr.source_id = s.id
       WHERE vr.entity_type = $1 AND vr.entity_id = $2 ORDER BY s.created_at DESC`,
      [entityType, entityId],
    );
    res.json({ data: camelRows(rows) });
  }),
);

publicRouter.get(
  "/verification",
  asyncHandler(async (req, res) => {
    const entityType = qp(req.query, "entityType");
    const entityId = qp(req.query, "entityId");
    if (!entityType || !entityId) throw badRequest("Query params 'entityType' and 'entityId' are required");
    const { rows } = await query(
      `SELECT vr.*, s.url AS source_url, s.page_title AS source_title
         FROM verification_records vr LEFT JOIN sources s ON s.id = vr.source_id
        WHERE vr.entity_type = $1 AND vr.entity_id = $2
        ORDER BY vr.verified_at DESC NULLS LAST, vr.created_at DESC`,
      [entityType, entityId],
    );
    res.json({ data: camelRows(rows) });
  }),
);
