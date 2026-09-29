import { Router } from "express";
import type { Request } from "express";
import {
  accessRequirementSchema,
  adminUserCreateSchema,
  adminUserUpdateSchema,
  apiAccessSchema,
  cancellationPolicySchema,
  capabilityCreateSchema,
  capabilityUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  discoveryCandidateUpdateSchema,
  discoverySourceCreateSchema,
  discoverySourceUpdateSchema,
  modelCreateSchema,
  modelUpdateSchema,
  monitoringCheckCreateSchema,
  paginationSchema,
  PAYMENT_METHOD_CODES,
  planCreateSchema,
  planLimitCreateSchema,
  planUpdateSchema,
  providerCreateSchema,
  providerUpdateSchema,
  regionalAvailabilitySchema,
  sourceCreateSchema,
  submissionReviewSchema,
  verificationQueueActionSchema,
  verificationRecordCreateSchema,
  websiteCreateSchema,
  websiteUpdateSchema,
  type AdminRole,
} from "ai-discover-shared";
import type { ZodTypeAny } from "zod";
import { query } from "../db.js";
import { z } from "zod";
import { asyncHandler, badRequest, conflict, forbidden, notFound } from "../middleware/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { camelRow, camelRows } from "../utils/case.js";
import { pp, qp } from "../utils/query.js";
import { recordFieldChanges, writeAuditLog } from "../utils/audit.js";
import { paginationMeta } from "./serializers.js";

export const adminRouter = Router();

const CONTENT_ROLES: AdminRole[] = ["editor", "admin", "super_admin"];
const VERIFY_ROLES: AdminRole[] = ["verifier", "editor", "admin", "super_admin"];
const ADMIN_ROLES: AdminRole[] = ["admin", "super_admin"];
const SUPER_ROLES: AdminRole[] = ["super_admin"];

const gate = (...roles: AdminRole[]) => [requireAuth, requireRole(...roles)];

const withWebsiteId = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ websiteId: z.string().uuid(), ...shape });

async function audit(
  req: Request,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  await writeAuditLog({
    adminUserId: req.adminUserId!,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    oldValue,
    newValue,
    ip: req.ip ?? null,
  });
}

function pageParams(req: Request): { page: number; limit: number } {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20));
  return { page, limit };
}

/* ------------------------------ dashboard ------------------------------ */

adminRouter.get(
  "/dashboard",
  ...gate(...ADMIN_ROLES),
  asyncHandler(async (_req, res) => {
    const counts = await Promise.all([
      query("SELECT COUNT(*)::int AS n FROM ai_websites WHERE deleted_at IS NULL"),
      query("SELECT COUNT(*)::int AS n FROM ai_models WHERE deleted_at IS NULL"),
      query("SELECT COUNT(*)::int AS n FROM categories WHERE deleted_at IS NULL"),
      query("SELECT COUNT(*)::int AS n FROM users"),
      query("SELECT COUNT(*)::int AS n FROM submissions WHERE status = 'pending_review'"),
      query(
        "SELECT COUNT(*)::int AS n FROM verification_records WHERE status IN ('unverified','partially_verified','outdated')",
      ),
      query("SELECT COUNT(*)::int AS n FROM admin_users"),
    ]);
    const recentAudit = await query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10",
    );
    const [websites, models, categories, users, pendingSubmissions, pendingVerification, adminUsers] =
      counts.map((r) => Number(r.rows[0].n));
    res.json({
      data: {
        websites,
        models,
        categories,
        users,
        pendingSubmissions,
        pendingVerification,
        adminUsers,
        recentAudit: camelRows(recentAudit.rows),
      },
    });
  }),
);

/* --------------------------- generic CRUD helper ------------------------ */

interface CrudOptions {
  path: string;
  table: string;
  entityType: string;
  select: string;
  orderBy: string;
  /** [camelCase body key, snake_case column] */
  fields: [string, string][];
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  roles?: AdminRole[];
  softDelete?: boolean;
  /** extra WHERE builder for list: returns { clause, params } */
  listFilter?: (q: Request["query"]) => { clause: string; params: unknown[] };
  uniqueOn?: [string, string][]; // fields to conflict-check on create
}

function registerCrud(router: Router, opts: CrudOptions): void {
  const roles = opts.roles ?? CONTENT_ROLES;
  const base = `/${opts.path}`;

  router.get(
    base,
    ...gate(...roles),
    asyncHandler(async (req, res) => {
      const { page, limit } = pageParams(req);
      const filter = opts.listFilter?.(req.query) ?? { clause: "", params: [] };
      const where = filter.clause ? `WHERE ${filter.clause}` : "";
      const total = Number(
        (await query(`SELECT COUNT(*)::int AS n FROM ${opts.table} ${where}`, filter.params)).rows[0].n,
      );
      const { rows } = await query(
        `SELECT ${opts.select} FROM ${opts.table} ${where} ORDER BY ${opts.orderBy} LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}`,
        [...filter.params, limit, (page - 1) * limit],
      );
      res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
    }),
  );

  router.get(
    `${base}/:id`,
    ...gate(...roles),
    asyncHandler(async (req, res) => {
      const { rows } = await query(`SELECT ${opts.select} FROM ${opts.table} WHERE id = $1`, [pp(req.params, "id")]);
      if (rows.length === 0) throw notFound(`${opts.entityType} not found`);
      res.json({ data: camelRow(rows[0]) });
    }),
  );

  router.post(
    base,
    ...gate(...roles),
    validate(opts.createSchema),
    asyncHandler(async (req, res) => {
      if (opts.uniqueOn) {
        for (const [camel, snake] of opts.uniqueOn) {
          const v = req.body[camel];
          if (v !== undefined && v !== null) {
            const existing = await query(`SELECT id FROM ${opts.table} WHERE ${snake} = $1`, [v]);
            if (existing.rows.length > 0) throw conflict(`${opts.entityType} with this ${camel} already exists`, "DUPLICATE");
          }
        }
      }
      const cols: string[] = [];
      const vals: unknown[] = [];
      for (const [camel, snake] of opts.fields) {
        if (req.body[camel] !== undefined) {
          cols.push(snake);
          vals.push(req.body[camel]);
        }
      }
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await query(
        `INSERT INTO ${opts.table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING ${opts.select}`,
        vals,
      );
      const created = rows[0];
      await audit(req, `${opts.entityType}.create`, opts.entityType, String(created.id), null, camelRow(created));
      res.status(201).json({ data: camelRow(created) });
    }),
  );

  router.patch(
    `${base}/:id`,
    ...gate(...roles),
    validate(opts.updateSchema),
    asyncHandler(async (req, res) => {
      const old = await query(`SELECT * FROM ${opts.table} WHERE id = $1`, [pp(req.params, "id")]);
      if (old.rows.length === 0) throw notFound(`${opts.entityType} not found`);
      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const [camel, snake] of opts.fields) {
        if (req.body[camel] !== undefined) {
          vals.push(req.body[camel]);
          sets.push(`${snake} = $${vals.length + 1}`);
        }
      }
      if (sets.length === 0) throw badRequest("Nothing to update");
      const { rows } = await query(
        `UPDATE ${opts.table} SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING ${opts.select}`,
        [pp(req.params, "id"), ...vals],
      );
      const updated = rows[0];
      await recordFieldChanges(opts.entityType, String(updated.id), old.rows[0], updated, req.adminUserId);
      await audit(req, `${opts.entityType}.update`, opts.entityType, String(updated.id), camelRow(old.rows[0]), camelRow(updated));
      res.json({ data: camelRow(updated) });
    }),
  );

  router.delete(
    `${base}/:id`,
    ...gate(...roles),
    asyncHandler(async (req, res) => {
      const old = await query(`SELECT * FROM ${opts.table} WHERE id = $1`, [pp(req.params, "id")]);
      if (old.rows.length === 0) throw notFound(`${opts.entityType} not found`);
      if (opts.softDelete) {
        await query(`UPDATE ${opts.table} SET deleted_at = now() WHERE id = $1`, [pp(req.params, "id")]);
        await audit(req, `${opts.entityType}.archive`, opts.entityType, pp(req.params, "id"), { deletedAt: null }, { deletedAt: new Date().toISOString() });
        res.json({ data: { ok: true, archived: true } });
      } else {
        await query(`DELETE FROM ${opts.table} WHERE id = $1`, [pp(req.params, "id")]);
        await audit(req, `${opts.entityType}.delete`, opts.entityType, pp(req.params, "id"), camelRow(old.rows[0]), null);
        res.json({ data: { ok: true } });
      }
    }),
  );
}

/* --------------------- providers / categories / capabilities ------------ */

registerCrud(adminRouter, {
  path: "providers",
  table: "providers",
  entityType: "provider",
  select: "*",
  orderBy: "name",
  fields: [["name", "name"], ["slug", "slug"], ["websiteUrl", "website_url"], ["description", "description"]],
  createSchema: providerCreateSchema,
  updateSchema: providerUpdateSchema,
  softDelete: true,
  uniqueOn: [["slug", "slug"]],
});

registerCrud(adminRouter, {
  path: "categories",
  table: "categories",
  entityType: "category",
  select: "*",
  orderBy: "sort_order NULLS LAST, name",
  fields: [["name", "name"], ["slug", "slug"], ["description", "description"], ["icon", "icon"], ["sortOrder", "sort_order"]],
  createSchema: categoryCreateSchema,
  updateSchema: categoryUpdateSchema,
  softDelete: true,
  uniqueOn: [["slug", "slug"]],
});

registerCrud(adminRouter, {
  path: "capabilities",
  table: "capabilities",
  entityType: "capability",
  select: "*",
  orderBy: "name",
  fields: [["name", "name"], ["slug", "slug"], ["description", "description"]],
  createSchema: capabilityCreateSchema,
  updateSchema: capabilityUpdateSchema,
  uniqueOn: [["slug", "slug"]],
});

/* -------------------------------- sources ------------------------------ */

registerCrud(adminRouter, {
  path: "sources",
  table: "sources",
  entityType: "source",
  select: "*",
  orderBy: "created_at DESC",
  fields: [["sourceType", "source_type"], ["url", "url"], ["pageTitle", "page_title"], ["retrievedAt", "retrieved_at"], ["notes", "notes"]],
  createSchema: sourceCreateSchema,
  updateSchema: sourceCreateSchema.partial(),
});

/* --------------------- websites (with relations) ----------------------- */

const WEBSITE_FIELDS: [string, string][] = [
  ["name", "name"],
  ["slug", "slug"],
  ["tagline", "tagline"],
  ["description", "description"],
  ["officialUrl", "official_url"],
  ["logoUrl", "logo_url"],
  ["isOpenSource", "is_open_source"],
  ["beginnerFriendly", "beginner_friendly"],
];

async function syncWebsiteRelations(id: string, categoryIds?: string[], modelIds?: string[]): Promise<void> {
  if (categoryIds !== undefined) {
    await query("DELETE FROM website_categories WHERE website_id = $1", [id]);
    for (const cid of categoryIds) {
      await query("INSERT INTO website_categories (website_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, cid]);
    }
  }
  if (modelIds !== undefined) {
    await query("DELETE FROM website_models WHERE website_id = $1", [id]);
    for (const mid of modelIds) {
      await query("INSERT INTO website_models (website_id, model_id) VALUES ($1, $2) ON CONFLICT (website_id, model_id) DO NOTHING", [id, mid]);
    }
  }
}

adminRouter.get(
  "/websites",
  ...gate(...CONTENT_ROLES),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    const params: unknown[] = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE (name ILIKE $1 OR slug ILIKE $1)`;
    }
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM ai_websites ${where}`, params)).rows[0].n);
    const { rows } = await query(
      `SELECT * FROM ai_websites ${where} ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.get(
  "/websites/:id",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM ai_websites WHERE id = $1", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("website not found");
    res.json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.post(
  "/websites",
  ...gate(...CONTENT_ROLES),
  validate(websiteCreateSchema),
  asyncHandler(async (req, res) => {
    const dup = await query("SELECT id FROM ai_websites WHERE slug = $1", [req.body.slug]);
    if (dup.rows.length > 0) throw conflict("Website with this slug already exists", "DUPLICATE");
    const cols: string[] = [];
    const vals: unknown[] = [];
    for (const [camel, snake] of WEBSITE_FIELDS) {
      if (req.body[camel] !== undefined) {
        cols.push(snake);
        vals.push(req.body[camel]);
      }
    }
    const { rows } = await query(
      `INSERT INTO ai_websites (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      vals,
    );
    const id = String(rows[0].id);
    await syncWebsiteRelations(id, req.body.categoryIds, req.body.modelIds);
    await audit(req, "website.create", "website", id, null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.patch(
  "/websites/:id",
  ...gate(...CONTENT_ROLES),
  validate(websiteUpdateSchema),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM ai_websites WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("website not found");
    if (req.body.slug) {
      const dup = await query("SELECT id FROM ai_websites WHERE slug = $1 AND id <> $2", [req.body.slug, pp(req.params, "id")]);
      if (dup.rows.length > 0) throw conflict("Website with this slug already exists", "DUPLICATE");
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [camel, snake] of WEBSITE_FIELDS) {
      if (req.body[camel] !== undefined) {
        vals.push(req.body[camel]);
        sets.push(`${snake} = $${vals.length + 1}`);
      }
    }
    let updated = old.rows[0];
    if (sets.length > 0) {
      const r = await query(
        `UPDATE ai_websites SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
        [pp(req.params, "id"), ...vals],
      );
      updated = r.rows[0];
    }
    await syncWebsiteRelations(pp(req.params, "id"), req.body.categoryIds, req.body.modelIds);
    await recordFieldChanges("website", pp(req.params, "id"), old.rows[0], updated, req.adminUserId);
    await audit(req, "website.update", "website", pp(req.params, "id"), camelRow(old.rows[0]), camelRow(updated));
    res.json({ data: camelRow(updated) });
  }),
);

adminRouter.delete(
  "/websites/:id",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM ai_websites WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("website not found");
    await query("UPDATE ai_websites SET deleted_at = now() WHERE id = $1", [pp(req.params, "id")]);
    await audit(req, "website.archive", "website", pp(req.params, "id"), { deletedAt: null }, { deletedAt: new Date().toISOString() });
    res.json({ data: { ok: true, archived: true } });
  }),
);

adminRouter.post(
  "/websites/:id/restore",
  ...gate(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { rows } = await query("UPDATE ai_websites SET deleted_at = NULL WHERE id = $1 RETURNING *", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("website not found");
    await audit(req, "website.restore", "website", pp(req.params, "id"), { deletedAt: "set" }, { deletedAt: null });
    res.json({ data: camelRow(rows[0]) });
  }),
);

/* ----------------------- models (with relations) ----------------------- */

const MODEL_FIELDS: [string, string][] = [
  ["name", "name"],
  ["slug", "slug"],
  ["description", "description"],
  ["providerId", "provider_id"],
  ["modelType", "model_type"],
  ["isOpenSource", "is_open_source"],
  ["license", "license"],
  ["contextWindowTokens", "context_window_tokens"],
  ["inputModalities", "input_modalities"],
  ["outputModalities", "output_modalities"],
  ["apiAvailable", "api_available"],
];

async function syncModelRelations(id: string, categoryIds?: string[], capabilityIds?: string[]): Promise<void> {
  if (categoryIds !== undefined) {
    await query("DELETE FROM model_categories WHERE model_id = $1", [id]);
    for (const cid of categoryIds) {
      await query("INSERT INTO model_categories (model_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, cid]);
    }
  }
  if (capabilityIds !== undefined) {
    await query("DELETE FROM model_capabilities WHERE model_id = $1", [id]);
    for (const cid of capabilityIds) {
      await query("INSERT INTO model_capabilities (model_id, capability_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, cid]);
    }
  }
}

adminRouter.get(
  "/models",
  ...gate(...CONTENT_ROLES),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    const params: unknown[] = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE (name ILIKE $1 OR slug ILIKE $1)`;
    }
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM ai_models ${where}`, params)).rows[0].n);
    const { rows } = await query(
      `SELECT * FROM ai_models ${where} ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.get(
  "/models/:id",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM ai_models WHERE id = $1", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("model not found");
    res.json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.post(
  "/models",
  ...gate(...CONTENT_ROLES),
  validate(modelCreateSchema),
  asyncHandler(async (req, res) => {
    const dup = await query("SELECT id FROM ai_models WHERE slug = $1", [req.body.slug]);
    if (dup.rows.length > 0) throw conflict("Model with this slug already exists", "DUPLICATE");
    const cols: string[] = [];
    const vals: unknown[] = [];
    for (const [camel, snake] of MODEL_FIELDS) {
      if (req.body[camel] !== undefined) {
        cols.push(snake);
        vals.push(req.body[camel]);
      }
    }
    const { rows } = await query(
      `INSERT INTO ai_models (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      vals,
    );
    const id = String(rows[0].id);
    await syncModelRelations(id, req.body.categoryIds, req.body.capabilityIds);
    await audit(req, "model.create", "model", id, null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.patch(
  "/models/:id",
  ...gate(...CONTENT_ROLES),
  validate(modelUpdateSchema),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM ai_models WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("model not found");
    if (req.body.slug) {
      const dup = await query("SELECT id FROM ai_models WHERE slug = $1 AND id <> $2", [req.body.slug, pp(req.params, "id")]);
      if (dup.rows.length > 0) throw conflict("Model with this slug already exists", "DUPLICATE");
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [camel, snake] of MODEL_FIELDS) {
      if (req.body[camel] !== undefined) {
        vals.push(req.body[camel]);
        sets.push(`${snake} = $${vals.length + 1}`);
      }
    }
    let updated = old.rows[0];
    if (sets.length > 0) {
      const r = await query(
        `UPDATE ai_models SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
        [pp(req.params, "id"), ...vals],
      );
      updated = r.rows[0];
    }
    await syncModelRelations(pp(req.params, "id"), req.body.categoryIds, req.body.capabilityIds);
    await recordFieldChanges("model", pp(req.params, "id"), old.rows[0], updated, req.adminUserId);
    await audit(req, "model.update", "model", pp(req.params, "id"), camelRow(old.rows[0]), camelRow(updated));
    res.json({ data: camelRow(updated) });
  }),
);

adminRouter.delete(
  "/models/:id",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM ai_models WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("model not found");
    await query("UPDATE ai_models SET deleted_at = now() WHERE id = $1", [pp(req.params, "id")]);
    await audit(req, "model.archive", "model", pp(req.params, "id"), { deletedAt: null }, { deletedAt: new Date().toISOString() });
    res.json({ data: { ok: true, archived: true } });
  }),
);

adminRouter.post(
  "/models/:id/restore",
  ...gate(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { rows } = await query("UPDATE ai_models SET deleted_at = NULL WHERE id = $1 RETURNING *", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("model not found");
    await audit(req, "model.restore", "model", pp(req.params, "id"), { deletedAt: "set" }, { deletedAt: null });
    res.json({ data: camelRow(rows[0]) });
  }),
);

/* ------------------------- plans & plan limits ------------------------- */

registerCrud(adminRouter, {
  path: "plans",
  table: "plans",
  entityType: "plan",
  select: "*",
  orderBy: "name",
  fields: [
    ["websiteId", "website_id"], ["name", "name"], ["kind", "kind"], ["billingCycle", "billing_cycle"],
    ["priceAmount", "price_amount"], ["priceCurrency", "price_currency"], ["pricePer", "price_per"],
    ["isCurrent", "is_current"],
  ],
  createSchema: planCreateSchema,
  updateSchema: planUpdateSchema,
  listFilter: (q) => {
    if (q.websiteId) return { clause: "website_id = $1", params: [q.websiteId] };
    return { clause: "", params: [] };
  },
});

registerCrud(adminRouter, {
  path: "plan-limits",
  table: "plan_limits",
  entityType: "plan_limit",
  select: "*",
  orderBy: "created_at",
  fields: [["planId", "plan_id"], ["limitKind", "limit_kind"], ["limitValue", "limit_value"], ["limitUnit", "limit_unit"], ["description", "description"]],
  createSchema: planLimitCreateSchema,
  updateSchema: z.object({
    limitKind: z.string().min(1).max(120).optional(),
    limitValue: z.number().nonnegative().nullable().optional(),
    limitUnit: z.string().max(60).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
  }),
  listFilter: (q) => {
    if (q.planId) return { clause: "plan_id = $1", params: [q.planId] };
    return { clause: "", params: [] };
  },
});

/* ------------------- access requirements (upsert) ----------------------- */

const ACCESS_FIELDS: [string, string][] = [
  ["accountRequired", "account_required"], ["emailVerification", "email_verification"],
  ["phoneVerification", "phone_verification"], ["creditCardRequired", "credit_card_required"],
  ["debitCardRequired", "debit_card_required"], ["paymentMethodRequired", "payment_method_required"],
  ["paymentRequired", "payment_required"], ["minimumAge", "minimum_age"], ["notes", "notes"],
];

async function upsertSingleRow(
  req: Request,
  table: string,
  entityType: string,
  websiteId: string,
  fields: [string, string][],
  schemaName: string,
): Promise<Record<string, unknown>> {
  const old = await query(`SELECT * FROM ${table} WHERE website_id = $1`, [websiteId]);
  const cols: string[] = [];
  const vals: unknown[] = [websiteId];
  for (const [camel, snake] of fields) {
    if (req.body[camel] !== undefined) {
      cols.push(snake);
      vals.push(req.body[camel]);
    }
  }
  if (old.rows.length === 0) {
    if (cols.length === 0) throw badRequest("Nothing to save");
    const placeholders = cols.map((_, i) => `$${i + 2}`).join(", ");
    const { rows } = await query(
      `INSERT INTO ${table} (website_id, ${cols.join(", ")}) VALUES ($1, ${placeholders}) RETURNING *`,
      vals,
    );
    await audit(req, `${entityType}.create`, entityType, String(rows[0].id), null, camelRow(rows[0]));
    return rows[0];
  }
  if (cols.length === 0) return old.rows[0];
  const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const { rows } = await query(
    `UPDATE ${table} SET ${sets}, updated_at = now() WHERE website_id = $1 RETURNING *`,
    vals,
  );
  await recordFieldChanges(entityType, String(rows[0].id), old.rows[0], rows[0], req.adminUserId);
  await audit(req, `${entityType}.update`, entityType, String(rows[0].id), camelRow(old.rows[0]), camelRow(rows[0]));
  return rows[0];
}

adminRouter.get(
  "/access-requirements",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const websiteId = qp(req.query, "websiteId");
    if (!websiteId) throw badRequest("Query param 'websiteId' is required");
    const { rows } = await query("SELECT * FROM access_requirements WHERE website_id = $1", [websiteId]);
    res.json({ data: rows.length > 0 ? camelRow(rows[0]) : null });
  }),
);

adminRouter.put(
  "/access-requirements",
  ...gate(...CONTENT_ROLES),
  validate(withWebsiteId(accessRequirementSchema.shape)),
  asyncHandler(async (req, res) => {
    const websiteId = req.body.websiteId as string | undefined;
    if (!websiteId) throw badRequest("'websiteId' is required");
    const row = await upsertSingleRow(req, "access_requirements", "access_requirement", websiteId, ACCESS_FIELDS, "access");
    res.json({ data: camelRow(row) });
  }),
);

/* ---------------------- cancellation (upsert) --------------------------- */

const CANCELLATION_FIELDS: [string, string][] = [
  ["canCancel", "can_cancel"], ["method", "method"], ["timing", "timing"],
  ["autoRenewal", "auto_renewal"], ["accessAfterCancel", "access_after_cancel"],
  ["refundInfo", "refund_info"], ["sourceUrl", "source_url"],
];

adminRouter.get(
  "/cancellation",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const websiteId = qp(req.query, "websiteId");
    if (!websiteId) throw badRequest("Query param 'websiteId' is required");
    const { rows } = await query("SELECT * FROM cancellation_policies WHERE website_id = $1", [websiteId]);
    res.json({ data: rows.length > 0 ? camelRow(rows[0]) : null });
  }),
);

adminRouter.put(
  "/cancellation",
  ...gate(...CONTENT_ROLES),
  validate(withWebsiteId(cancellationPolicySchema.shape)),
  asyncHandler(async (req, res) => {
    const websiteId = req.body.websiteId as string | undefined;
    if (!websiteId) throw badRequest("'websiteId' is required");
    const row = await upsertSingleRow(req, "cancellation_policies", "cancellation_policy", websiteId, CANCELLATION_FIELDS, "cancellation");
    res.json({ data: camelRow(row) });
  }),
);

/* ------------------------ api access (upsert) --------------------------- */

const API_ACCESS_FIELDS: [string, string][] = [
  ["hasApi", "has_api"], ["freeTier", "free_tier"], ["pricingText", "pricing_text"],
  ["rateLimitsText", "rate_limits_text"], ["docsUrl", "docs_url"],
];

adminRouter.get(
  "/api-access",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const websiteId = qp(req.query, "websiteId");
    if (!websiteId) throw badRequest("Query param 'websiteId' is required");
    const { rows } = await query("SELECT * FROM api_access WHERE website_id = $1", [websiteId]);
    res.json({ data: rows.length > 0 ? camelRow(rows[0]) : null });
  }),
);

adminRouter.put(
  "/api-access",
  ...gate(...CONTENT_ROLES),
  validate(withWebsiteId(apiAccessSchema.shape)),
  asyncHandler(async (req, res) => {
    const websiteId = req.body.websiteId as string | undefined;
    if (!websiteId) throw badRequest("'websiteId' is required");
    const row = await upsertSingleRow(req, "api_access", "api_access", websiteId, API_ACCESS_FIELDS, "api-access");
    res.json({ data: camelRow(row) });
  }),
);

/* -------------------------------- regions ------------------------------ */

adminRouter.get(
  "/regions",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const websiteId = qp(req.query, "websiteId");
    if (!websiteId) throw badRequest("Query param 'websiteId' is required");
    const { rows } = await query("SELECT * FROM regional_availability WHERE website_id = $1 ORDER BY country_code", [websiteId]);
    res.json({ data: camelRows(rows) });
  }),
);

adminRouter.post(
  "/regions",
  ...gate(...CONTENT_ROLES),
  validate(withWebsiteId(regionalAvailabilitySchema.shape)),
  asyncHandler(async (req, res) => {
    const websiteId = req.body.websiteId as string | undefined;
    if (!websiteId) throw badRequest("'websiteId' is required");
    const { rows } = await query(
      `INSERT INTO regional_availability (website_id, country_code, available, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (website_id, country_code) DO UPDATE SET available = EXCLUDED.available, notes = EXCLUDED.notes
       RETURNING *`,
      [websiteId, String(req.body.countryCode).toUpperCase(), req.body.available, req.body.notes ?? null],
    );
    await audit(req, "regional_availability.upsert", "regional_availability", String(rows[0].id), null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.delete(
  "/regions/:id",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM regional_availability WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("regional_availability not found");
    await query("DELETE FROM regional_availability WHERE id = $1", [pp(req.params, "id")]);
    await audit(req, "regional_availability.delete", "regional_availability", pp(req.params, "id"), camelRow(old.rows[0]), null);
    res.json({ data: { ok: true } });
  }),
);

/* --------------------- payment methods & website links ------------------ */

registerCrud(adminRouter, {
  path: "payment-methods",
  table: "payment_methods",
  entityType: "payment_method",
  select: "*",
  orderBy: "label",
  fields: [["code", "code"], ["label", "label"]],
  createSchema: z.object({
    code: z.enum(PAYMENT_METHOD_CODES),
    label: z.string().min(1).max(200),
  }),
  updateSchema: z.object({ label: z.string().min(1).max(200) }),
});

adminRouter.get(
  "/websites/:id/payment-methods",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT pm.id, pm.code, pm.label, wpm.notes FROM payment_methods pm
        JOIN website_payment_methods wpm ON wpm.payment_method_id = pm.id
       WHERE wpm.website_id = $1 ORDER BY pm.label`,
      [pp(req.params, "id")],
    );
    res.json({ data: camelRows(rows) });
  }),
);

adminRouter.post(
  "/websites/:id/payment-methods",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { paymentMethodId, notes } = req.body as { paymentMethodId?: string; notes?: string };
    if (!paymentMethodId) throw badRequest("'paymentMethodId' is required");
    await query(
      `INSERT INTO website_payment_methods (website_id, payment_method_id, notes)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [pp(req.params, "id"), paymentMethodId, notes ?? null],
    );
    await audit(req, "website_payment_method.link", "website", pp(req.params, "id"), null, { paymentMethodId, notes });
    res.status(201).json({ data: { ok: true } });
  }),
);

adminRouter.delete(
  "/websites/:id/payment-methods/:pmId",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    await query("DELETE FROM website_payment_methods WHERE website_id = $1 AND payment_method_id = $2", [
      pp(req.params, "id"),
      pp(req.params, "pmId"),
    ]);
    await audit(req, "website_payment_method.unlink", "website", pp(req.params, "id"), { paymentMethodId: pp(req.params, "pmId") }, null);
    res.json({ data: { ok: true } });
  }),
);

/* --------------------------- verification queue ------------------------ */

adminRouter.get(
  "/verification",
  ...gate(...VERIFY_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const status = qp(req.query, "status");
    const entityType = qp(req.query, "entityType");
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      clauses.push(`vr.status = $${params.length}`);
    } else {
      clauses.push(`vr.status IN ('unverified','partially_verified','outdated')`);
    }
    if (entityType) {
      params.push(entityType);
      clauses.push(`vr.entity_type = $${params.length}`);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM verification_records vr ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT vr.*, s.url AS source_url FROM verification_records vr
        LEFT JOIN sources s ON s.id = vr.source_id
        ${where} ORDER BY vr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.post(
  "/verification",
  ...gate(...VERIFY_ROLES),
  validate(verificationRecordCreateSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO verification_records (entity_type, entity_id, claim, status, source_id, verified_by_admin, verified_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        b.entityType, b.entityId, b.claim, b.status, b.sourceId ?? null,
        b.status === "verified" ? req.adminUserId! : null,
        b.status === "verified" ? new Date().toISOString() : null,
        b.notes ?? null,
      ],
    );
    await audit(req, "verification_record.create", b.entityType, b.entityId, null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.post(
  "/verification/:id/action",
  ...gate(...VERIFY_ROLES),
  validate(verificationQueueActionSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM verification_records WHERE id = $1", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("verification record not found");
    const old = rows[0];
    const action = req.body.action as string;
    let status = String(old.status);
    if (action === "approve") status = "verified";
    else if (action === "reject") status = "disputed";
    else if (action === "mark_outdated") status = "outdated";
    // request_review: keep status, record the review request in notes.
    const notes = req.body.notes
      ? `${String(old.notes ?? "")}\n[${action} by ${req.adminUserId}]: ${req.body.notes}`.trim()
      : old.notes;
    const updated = await query(
      `UPDATE verification_records
          SET status = $2::verification_status, notes = $3, verified_by_admin = $4,
              verified_at = CASE WHEN $2::verification_status = 'verified' THEN now() ELSE verified_at END,
              updated_at = now()
        WHERE id = $1 RETURNING *`,
      [pp(req.params, "id"), status, notes, req.adminUserId],
    );
    await recordFieldChanges("verification_record", pp(req.params, "id"), old, updated.rows[0], req.adminUserId);
    await audit(req, `verification_record.${action}`, String(old.entity_type), String(old.entity_id), camelRow(old), camelRow(updated.rows[0]));
    res.json({ data: camelRow(updated.rows[0]) });
  }),
);

adminRouter.get(
  "/change-history",
  ...gate(...VERIFY_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const entityType = qp(req.query, "entityType");
    const entityId = qp(req.query, "entityId");
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (entityType) {
      params.push(entityType);
      clauses.push(`entity_type = $${params.length}`);
    }
    if (entityId) {
      params.push(entityId);
      clauses.push(`entity_id = $${params.length}`);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM change_history ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT * FROM change_history ${where} ORDER BY changed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

/* --------------------- monitoring checks (foundation) ------------------- */
/* No automated checker runs — these endpoints only store manual checks.    */

adminRouter.get(
  "/monitoring",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const websiteId = qp(req.query, "websiteId");
    const params: unknown[] = [];
    const where = websiteId ? "WHERE website_id = $1" : "";
    if (websiteId) params.push(websiteId);
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM monitoring_checks ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT * FROM monitoring_checks ${where} ORDER BY checked_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.post(
  "/monitoring",
  ...gate(...CONTENT_ROLES),
  validate(monitoringCheckCreateSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO monitoring_checks (website_id, checked_at, status, findings)
       VALUES ($1, now(), $2, $3) RETURNING *`,
      [b.websiteId, b.status, b.findings ?? null],
    );
    await audit(req, "monitoring_check.create", "website", b.websiteId, null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

/* --------------------- discovery sources (foundation) ------------------- */
/* No automated scraping/crawling exists — candidates are reviewed manually. */

registerCrud(adminRouter, {
  path: "discovery-sources",
  table: "discovery_sources",
  entityType: "discovery_source",
  select: "*",
  orderBy: "name",
  fields: [["name", "name"], ["kind", "kind"], ["config", "config"], ["enabled", "enabled"]],
  createSchema: discoverySourceCreateSchema.extend({
    config: discoverySourceCreateSchema.shape.config.transform((v) =>
      v === undefined || v === null ? null : JSON.stringify(v),
    ),
  }) as unknown as ZodTypeAny,
  updateSchema: discoverySourceUpdateSchema.extend({
    config: discoverySourceUpdateSchema.shape.config.transform((v) =>
      v === undefined || v === null ? null : JSON.stringify(v),
    ),
  }) as unknown as ZodTypeAny,
  roles: ADMIN_ROLES,
});

adminRouter.get(
  "/discovery-candidates",
  ...gate(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const status = qp(req.query, "status");
    const params: unknown[] = [];
    const where = status ? "WHERE status = $1" : "";
    if (status) params.push(status);
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM discovery_candidates ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT * FROM discovery_candidates ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.patch(
  "/discovery-candidates/:id",
  ...gate(...ADMIN_ROLES),
  validate(discoveryCandidateUpdateSchema),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM discovery_candidates WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("discovery candidate not found");
    const { rows } = await query(
      "UPDATE discovery_candidates SET status = $2 WHERE id = $1 RETURNING *",
      [pp(req.params, "id"), req.body.status],
    );
    await audit(req, "discovery_candidate.update", "discovery_candidate", pp(req.params, "id"), camelRow(old.rows[0]), camelRow(rows[0]));
    res.json({ data: camelRow(rows[0]) });
  }),
);

/* ---------------------------- submissions review ------------------------ */

adminRouter.get(
  "/submissions",
  ...gate(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const status = qp(req.query, "status");
    const params: unknown[] = [];
    const where = status ? "WHERE status = $1" : "";
    if (status) params.push(status);
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM submissions ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

adminRouter.post(
  "/submissions/:id/review",
  ...gate(...CONTENT_ROLES),
  validate(submissionReviewSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM submissions WHERE id = $1", [pp(req.params, "id")]);
    if (rows.length === 0) throw notFound("submission not found");
    const old = rows[0];
    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      needs_info: "needs_info",
    };
    const updated = await query(
      `UPDATE submissions SET status = $2, reviewed_by_admin = $3, reviewed_at = now(),
        review_notes = $4, updated_at = now() WHERE id = $1 RETURNING *`,
      [pp(req.params, "id"), statusMap[req.body.action], req.adminUserId, req.body.reviewNotes ?? null],
    );
    await recordFieldChanges("submission", pp(req.params, "id"), old, updated.rows[0], req.adminUserId);
    await audit(req, `submission.${req.body.action}`, "submission", pp(req.params, "id"), camelRow(old), camelRow(updated.rows[0]));
    res.json({ data: camelRow(updated.rows[0]) });
  }),
);

/* --------------------------------- users -------------------------------- */

adminRouter.get(
  "/users",
  ...gate(...ADMIN_ROLES),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    const params: unknown[] = [];
    const where = q ? "WHERE u.email ILIKE $1" : "";
    if (q) params.push(`%${q}%`);
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM users u ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT u.id, u.email, u.email_verified, u.created_at, p.display_name, au.role AS admin_role
         FROM users u LEFT JOIN profiles p ON p.id = u.id LEFT JOIN admin_users au ON au.user_id = u.id
        ${where} ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);

/* ------------------------- admin users (super only) ---------------------- */

adminRouter.get(
  "/admin-users",
  ...gate(...SUPER_ROLES),
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT au.*, u.email FROM admin_users au JOIN users u ON u.id = au.user_id ORDER BY au.created_at`,
    );
    res.json({ data: camelRows(rows) });
  }),
);

adminRouter.post(
  "/admin-users",
  ...gate(...SUPER_ROLES),
  validate(adminUserCreateSchema),
  asyncHandler(async (req, res) => {
    const user = await query("SELECT id FROM users WHERE id = $1", [req.body.userId]);
    if (user.rows.length === 0) throw notFound("user not found");
    const dup = await query("SELECT id FROM admin_users WHERE user_id = $1", [req.body.userId]);
    if (dup.rows.length > 0) throw conflict("User is already an admin", "DUPLICATE");
    const { rows } = await query(
      "INSERT INTO admin_users (user_id, role, created_by_admin) VALUES ($1, $2, $3) RETURNING *",
      [req.body.userId, req.body.role, req.adminUserId],
    );
    await audit(req, "admin_user.create", "admin_user", String(rows[0].id), null, camelRow(rows[0]));
    res.status(201).json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.patch(
  "/admin-users/:id",
  ...gate(...SUPER_ROLES),
  validate(adminUserUpdateSchema),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM admin_users WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("admin user not found");
    // Never leave the system without a super_admin.
    if (old.rows[0].role === "super_admin" && req.body.role !== "super_admin") {
      const remaining = await query(
        "SELECT COUNT(*)::int AS n FROM admin_users WHERE role = 'super_admin' AND id <> $1",
        [pp(req.params, "id")],
      );
      if (Number(remaining.rows[0].n) === 0) {
        throw forbidden("Cannot demote the last super_admin");
      }
    }
    const { rows } = await query("UPDATE admin_users SET role = $2 WHERE id = $1 RETURNING *", [
      pp(req.params, "id"),
      req.body.role,
    ]);
    await audit(req, "admin_user.update", "admin_user", pp(req.params, "id"), camelRow(old.rows[0]), camelRow(rows[0]));
    res.json({ data: camelRow(rows[0]) });
  }),
);

adminRouter.delete(
  "/admin-users/:id",
  ...gate(...SUPER_ROLES),
  asyncHandler(async (req, res) => {
    const old = await query("SELECT * FROM admin_users WHERE id = $1", [pp(req.params, "id")]);
    if (old.rows.length === 0) throw notFound("admin user not found");
    if (old.rows[0].role === "super_admin") {
      const remaining = await query(
        "SELECT COUNT(*)::int AS n FROM admin_users WHERE role = 'super_admin' AND id <> $1",
        [pp(req.params, "id")],
      );
      if (Number(remaining.rows[0].n) === 0) {
        throw forbidden("Cannot remove the last super_admin");
      }
    }
    await query("DELETE FROM admin_users WHERE id = $1", [pp(req.params, "id")]);
    await audit(req, "admin_user.delete", "admin_user", pp(req.params, "id"), camelRow(old.rows[0]), null);
    res.json({ data: { ok: true } });
  }),
);

/* ------------------------------- audit logs ----------------------------- */

adminRouter.get(
  "/audit-logs",
  ...gate(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit } = pageParams(req);
    const action = qp(req.query, "action");
    const entityType = qp(req.query, "entityType");
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (action) {
      params.push(action);
      clauses.push(`action = $${params.length}`);
    }
    if (entityType) {
      params.push(entityType);
      clauses.push(`entity_type = $${params.length}`);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = Number(
      (await query(`SELECT COUNT(*)::int AS n FROM audit_logs ${where}`, params)).rows[0].n,
    );
    const { rows } = await query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ data: camelRows(rows), meta: paginationMeta(page, limit, total) });
  }),
);
