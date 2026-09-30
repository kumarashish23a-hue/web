import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  favoriteCreateSchema,
  paginationSchema,
  preferencesSchema,
  profileUpdateSchema,
  stackCreateSchema,
  stackItemCreateSchema,
  submissionCreateSchema,
  uuidParamSchema,
} from "ai-discover-shared";
import { query } from "../db.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { camelRow, camelRows } from "../utils/case.js";
import { pp } from "../utils/query.js";
import { paginationMeta } from "./serializers.js";

export const userRouter = Router();
userRouter.use(requireAuth);

const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many submissions, try again later" } },
});

/* ------------------------------- favorites ----------------------------- */

userRouter.get(
  "/favorites",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const total = Number(
      (await query("SELECT COUNT(*)::int AS n FROM user_favorites WHERE user_id = $1", [req.user!.id])).rows[0].n,
    );
    const { rows } = await query(
      `SELECT uf.id, uf.user_id, uf.kind, uf.website_id, uf.model_id, uf.stack_id, uf.created_at,
              w.id AS w_id, w.name AS w_name, w.slug AS w_slug, w.tagline AS w_tagline, w.logo_url AS w_logo_url,
              m.id AS m_id, m.name AS m_name, m.slug AS m_slug,
              s.id AS s_id, s.title AS s_title
         FROM user_favorites uf
    LEFT JOIN ai_websites w ON w.id = uf.website_id AND w.deleted_at IS NULL
    LEFT JOIN ai_models m ON m.id = uf.model_id AND m.deleted_at IS NULL
    LEFT JOIN saved_stacks s ON s.id = uf.stack_id
        WHERE uf.user_id = $1 ORDER BY uf.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, (page - 1) * limit],
    );
    const data = rows.map((r) => {
      const fav = camelRow({
        id: r.id,
        user_id: r.user_id,
        kind: r.kind,
        website_id: r.website_id,
        model_id: r.model_id,
        stack_id: r.stack_id,
        created_at: r.created_at,
      });
      return {
        ...fav,
        website: r.w_id
          ? { id: String(r.w_id), name: String(r.w_name), slug: String(r.w_slug), tagline: r.w_tagline, logoUrl: r.w_logo_url }
          : null,
        model: r.m_id ? { id: String(r.m_id), name: String(r.m_name), slug: String(r.m_slug) } : null,
        stack: r.s_id ? { id: String(r.s_id), title: String(r.s_title) } : null,
      };
    });
    res.json({ data, meta: paginationMeta(page, limit, total) });
  }),
);

userRouter.post(
  "/favorites",
  validate(favoriteCreateSchema),
  asyncHandler(async (req, res) => {
    const { kind, websiteId, modelId, stackId } = req.body;
    const targetCount = [websiteId, modelId, stackId].filter(Boolean).length;
    if (targetCount !== 1) throw badRequest("Exactly one of websiteId, modelId, stackId is required");
    if (kind === "website" && !websiteId) throw badRequest("websiteId required for kind=website");
    if (kind === "model" && !modelId) throw badRequest("modelId required for kind=model");
    if (kind === "stack" && !stackId) throw badRequest("stackId required for kind=stack");
    // Verify the target exists and belongs to the user where applicable.
    if (websiteId) {
      const w = await query("SELECT id FROM ai_websites WHERE id = $1 AND deleted_at IS NULL", [websiteId]);
      if (w.rows.length === 0) throw notFound("Website not found");
    }
    if (modelId) {
      const m = await query("SELECT id FROM ai_models WHERE id = $1 AND deleted_at IS NULL", [modelId]);
      if (m.rows.length === 0) throw notFound("Model not found");
    }
    if (stackId) {
      const s = await query("SELECT id FROM saved_stacks WHERE id = $1 AND user_id = $2", [stackId, req.user!.id]);
      if (s.rows.length === 0) throw notFound("Stack not found");
    }
    // Idempotent: return the existing favorite if one already matches
    // (NULLs never conflict in the UNIQUE constraint, so check explicitly).
    const existing = await query(
      `SELECT * FROM user_favorites WHERE user_id = $1 AND kind = $2
        AND COALESCE(website_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')::uuid
        AND COALESCE(model_id, '00000000-0000-0000-0000-000000000000') = COALESCE($4, '00000000-0000-0000-0000-000000000000')::uuid
        AND COALESCE(stack_id, '00000000-0000-0000-0000-000000000000') = COALESCE($5, '00000000-0000-0000-0000-000000000000')::uuid`,
      [req.user!.id, kind, websiteId ?? null, modelId ?? null, stackId ?? null],
    );
    if (existing.rows.length > 0) {
      res.json({ data: camelRow(existing.rows[0]) });
      return;
    }
    const { rows } = await query(
      `INSERT INTO user_favorites (user_id, kind, website_id, model_id, stack_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.id, kind, websiteId ?? null, modelId ?? null, stackId ?? null],
    );
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

userRouter.delete(
  "/favorites/:id",
  validate(uuidParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { rows } = await query("DELETE FROM user_favorites WHERE id = $1 AND user_id = $2 RETURNING id", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    if (rows.length === 0) throw notFound("Favorite not found");
    res.json({ data: { ok: true } });
  }),
);

/* -------------------------------- stacks ------------------------------- */

async function serializeStack(stackId: string, userId: string) {
  const { rows } = await query("SELECT * FROM saved_stacks WHERE id = $1 AND user_id = $2", [stackId, userId]);
  if (rows.length === 0) throw notFound("Stack not found");
  const items = await query("SELECT * FROM stack_items WHERE stack_id = $1 ORDER BY position", [stackId]);
  return { ...camelRow(rows[0]), items: camelRows(items.rows) };
}

userRouter.get(
  "/stacks",
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM saved_stacks WHERE user_id = $1 ORDER BY updated_at DESC", [
      req.user!.id,
    ]);
    const data = [];
    for (const r of rows) data.push(await serializeStack(String(r.id), req.user!.id));
    res.json({ data });
  }),
);

userRouter.post(
  "/stacks",
  validate(stackCreateSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "INSERT INTO saved_stacks (user_id, title, goal_text) VALUES ($1, $2, $3) RETURNING *",
      [req.user!.id, req.body.title, req.body.goalText ?? null],
    );
    const stackId = String(rows[0].id);
    // Persist any items sent with the create call (e.g. saving a recommendation
    // as a stack). Positions follow the array order; referenced entities must exist.
    const items = (req.body.items ?? []) as {
      requirementLabel?: string;
      websiteId?: string | null;
      modelId?: string | null;
      reason?: string;
      freeStatus?: string;
      requirementsSummary?: string;
      limitsSummary?: string;
      confidence?: string;
      verificationStatus?: string;
    }[];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.websiteId) {
        const w = await query("SELECT id FROM ai_websites WHERE id = $1 AND deleted_at IS NULL", [it.websiteId]);
        if (w.rows.length === 0) throw notFound("Website not found");
      }
      if (it.modelId) {
        const m = await query("SELECT id FROM ai_models WHERE id = $1 AND deleted_at IS NULL", [it.modelId]);
        if (m.rows.length === 0) throw notFound("Model not found");
      }
      await query(
        `INSERT INTO stack_items (stack_id, position, requirement_label, website_id, model_id,
          reason, free_status, requirements_summary, limits_summary, confidence, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::verification_status)`,
        [
          stackId,
          i,
          it.requirementLabel ?? null,
          it.websiteId ?? null,
          it.modelId ?? null,
          it.reason ?? null,
          it.freeStatus ?? null,
          it.requirementsSummary ?? null,
          it.limitsSummary ?? null,
          it.confidence ?? null,
          it.verificationStatus ?? null,
        ],
      );
    }
    res.status(201).json({ data: await serializeStack(stackId, req.user!.id) });
  }),
);

userRouter.get(
  "/stacks/:id",
  validate(uuidParamSchema, "params"),
  asyncHandler(async (req, res) => {
    res.json({ data: await serializeStack(pp(req.params, "id"), req.user!.id) });
  }),
);

const stackUpdateSchema = stackCreateSchema.partial();

userRouter.patch(
  "/stacks/:id",
  validate(uuidParamSchema, "params"),
  validate(stackUpdateSchema),
  asyncHandler(async (req, res) => {
    const allowed: Record<string, unknown> = {};
    if (req.body.title !== undefined) allowed.title = req.body.title;
    if (req.body.goalText !== undefined) allowed.goal_text = req.body.goalText;
    if (Object.keys(allowed).length === 0) throw badRequest("Nothing to update");
    const sets = Object.keys(allowed).map((k, i) => `${k} = $${i + 3}`);
    const { rows } = await query(
      `UPDATE saved_stacks SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
      [pp(req.params, "id"), req.user!.id, ...Object.values(allowed)],
    );
    if (rows.length === 0) throw notFound("Stack not found");
    res.json({ data: await serializeStack(pp(req.params, "id"), req.user!.id) });
  }),
);

userRouter.delete(
  "/stacks/:id",
  validate(uuidParamSchema, "params"),
  asyncHandler(async (req, res) => {
    await query("DELETE FROM stack_items WHERE stack_id IN (SELECT id FROM saved_stacks WHERE id = $1 AND user_id = $2)", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    const { rows } = await query("DELETE FROM saved_stacks WHERE id = $1 AND user_id = $2 RETURNING id", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    if (rows.length === 0) throw notFound("Stack not found");
    res.json({ data: { ok: true } });
  }),
);

userRouter.post(
  "/stacks/:id/items",
  validate(uuidParamSchema, "params"),
  validate(stackItemCreateSchema),
  asyncHandler(async (req, res) => {
    const stack = await query("SELECT id FROM saved_stacks WHERE id = $1 AND user_id = $2", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    if (stack.rows.length === 0) throw notFound("Stack not found");
    const b = req.body;
    // Auto-assign the next position when the caller doesn't specify one, so a
    // missing position never collides with the (stack_id, position) unique key.
    let position = b.position;
    if (position === undefined || position === null) {
      const max = await query("SELECT COALESCE(MAX(position), -1)::int AS m FROM stack_items WHERE stack_id = $1", [
        pp(req.params, "id"),
      ]);
      position = Number(max.rows[0].m) + 1;
    }
    const { rows } = await query(
      `INSERT INTO stack_items (stack_id, position, requirement_label, website_id, model_id, reason,
        free_status, requirements_summary, limits_summary, confidence, verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        pp(req.params, "id"),
        position,
        b.requirementLabel ?? null,
        b.websiteId ?? null,
        b.modelId ?? null,
        b.reason ?? null,
        b.freeStatus ?? null,
        b.requirementsSummary ?? null,
        b.limitsSummary ?? null,
        b.confidence ?? null,
        b.verificationStatus ?? null,
      ],
    );
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

userRouter.patch(
  "/stacks/:id/items/:itemId",
  validate(stackItemCreateSchema.partial()),
  asyncHandler(async (req, res) => {
    const stack = await query("SELECT id FROM saved_stacks WHERE id = $1 AND user_id = $2", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    if (stack.rows.length === 0) throw notFound("Stack not found");
    const map: Record<string, string> = {
      position: "position",
      requirementLabel: "requirement_label",
      websiteId: "website_id",
      modelId: "model_id",
      reason: "reason",
      freeStatus: "free_status",
      requirementsSummary: "requirements_summary",
      limitsSummary: "limits_summary",
      confidence: "confidence",
      verificationStatus: "verification_status",
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [camel, snake] of Object.entries(map)) {
      if (req.body[camel] !== undefined) {
        vals.push(req.body[camel]);
        sets.push(`${snake} = $${vals.length + 2}`);
      }
    }
    if (sets.length === 0) throw badRequest("Nothing to update");
    const { rows } = await query(
      `UPDATE stack_items SET ${sets.join(", ")} WHERE id = $1 AND stack_id = $2 RETURNING *`,
      [pp(req.params, "itemId"), pp(req.params, "id"), ...vals],
    );
    if (rows.length === 0) throw notFound("Stack item not found");
    res.json({ data: camelRow(rows[0]) });
  }),
);

userRouter.delete(
  "/stacks/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const stack = await query("SELECT id FROM saved_stacks WHERE id = $1 AND user_id = $2", [
      pp(req.params, "id"),
      req.user!.id,
    ]);
    if (stack.rows.length === 0) throw notFound("Stack not found");
    const { rows } = await query("DELETE FROM stack_items WHERE id = $1 AND stack_id = $2 RETURNING id", [
      pp(req.params, "itemId"),
      pp(req.params, "id"),
    ]);
    if (rows.length === 0) throw notFound("Stack item not found");
    res.json({ data: { ok: true } });
  }),
);

/* ------------------------------ profile -------------------------------- */

userRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT u.id, u.email, u.email_verified, u.created_at, u.updated_at, p.display_name
         FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1`,
      [req.user!.id],
    );
    res.json({ data: camelRow(rows[0]) });
  }),
);

userRouter.patch(
  "/profile",
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    if (req.body.displayName !== undefined) {
      await query(
        `INSERT INTO profiles (id, display_name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()`,
        [req.user!.id, req.body.displayName],
      );
    }
    const { rows } = await query(
      `SELECT u.id, u.email, u.email_verified, u.created_at, u.updated_at, p.display_name
         FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1`,
      [req.user!.id],
    );
    res.json({ data: camelRow(rows[0]) });
  }),
);

/* ----------------------------- preferences ----------------------------- */

const DEFAULT_PREFS = {
  preferFree: false,
  noCreditCard: false,
  noPayment: false,
  beginnerFriendly: false,
  apiRequired: false,
  regionCode: null,
};

userRouter.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM user_preferences WHERE user_id = $1", [req.user!.id]);
    res.json({ data: rows.length > 0 ? camelRow(rows[0]) : { userId: req.user!.id, ...DEFAULT_PREFS } });
  }),
);

userRouter.put(
  "/preferences",
  validate(preferencesSchema),
  asyncHandler(async (req, res) => {
    const map: Record<string, string> = {
      preferFree: "prefer_free",
      noCreditCard: "no_credit_card",
      noPayment: "no_payment",
      beginnerFriendly: "beginner_friendly",
      apiRequired: "api_required",
      regionCode: "region_code",
    };
    const cols: string[] = [];
    const vals: unknown[] = [req.user!.id];
    for (const [camel, snake] of Object.entries(map)) {
      if (req.body[camel] !== undefined) {
        cols.push(snake);
        vals.push(req.body[camel]);
      }
    }
    if (cols.length > 0) {
      const placeholders = cols.map((_, i) => `$${i + 2}`).join(", ");
      const updates = cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");
      await query(
        `INSERT INTO user_preferences (user_id, ${cols.join(", ")}) VALUES ($1, ${placeholders})
         ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = now()`,
        vals,
      );
    }
    const { rows } = await query("SELECT * FROM user_preferences WHERE user_id = $1", [req.user!.id]);
    res.json({ data: camelRow(rows[0]) });
  }),
);

/* ----------------------------- submissions ----------------------------- */

userRouter.post(
  "/submissions",
  submissionLimiter,
  validate(submissionCreateSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `INSERT INTO submissions (user_id, kind, payload, source_url)
       VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
      [req.user!.id, req.body.kind, JSON.stringify(req.body.payload), req.body.sourceUrl ?? null],
    );
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

userRouter.get(
  "/submissions",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const total = Number(
      (await query("SELECT COUNT(*)::int AS n FROM submissions WHERE user_id = $1", [req.user!.id])).rows[0].n,
    );
    const { rows } = await query(
      "SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [req.user!.id, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

/* ---------------------------- search history --------------------------- */

userRouter.get(
  "/search-history",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const total = Number(
      (await query("SELECT COUNT(*)::int AS n FROM search_history WHERE user_id = $1", [req.user!.id])).rows[0].n,
    );
    const { rows } = await query(
      "SELECT id, user_id, query, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [req.user!.id, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

userRouter.delete(
  "/search-history",
  asyncHandler(async (req, res) => {
    await query("DELETE FROM search_history WHERE user_id = $1", [req.user!.id]);
    res.json({ data: { ok: true } });
  }),
);
