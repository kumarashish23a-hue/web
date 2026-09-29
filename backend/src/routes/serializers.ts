/** Serializers: DB rows (snake_case) -> API shapes (camelCase). */
import type {
  Capability,
  Category,
  Model,
  ModelAvailability,
  ModelLite,
  Provider,
  VerificationStatus,
  VerificationSummary,
  Website,
  WebsiteLite,
} from "ai-discover-shared";
import { query } from "../db.js";
import { camelRow, camelRows } from "../utils/case.js";

/** Latest verification record for an entity. Never invents 'verified'. */
export async function getVerificationSummary(
  entityType: "website" | "model" | "plan",
  entityId: string,
): Promise<VerificationSummary | null> {
  const { rows } = await query(
    `SELECT status, verified_at, claim FROM verification_records
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY verified_at DESC NULLS LAST, created_at DESC LIMIT 1`,
    [entityType, entityId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    status: r.status as VerificationStatus,
    lastChecked: r.verified_at ? new Date(String(r.verified_at)).toISOString() : null,
    claim: (r.claim as string) ?? null,
  };
}

export async function websiteCategories(websiteId: string): Promise<Category[]> {
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order, c.created_at, c.updated_at
       FROM categories c JOIN website_categories wc ON wc.category_id = c.id
      WHERE wc.website_id = $1 AND c.deleted_at IS NULL ORDER BY c.sort_order NULLS LAST, c.name`,
    [websiteId],
  );
  return camelRows<Category>(rows);
}

export async function websiteModels(websiteId: string): Promise<ModelLite[]> {
  const { rows } = await query(
    `SELECT m.id, m.name, m.slug, m.model_type, m.api_available
       FROM ai_models m JOIN website_models wm ON wm.model_id = m.id
      WHERE wm.website_id = $1 AND m.deleted_at IS NULL ORDER BY m.name`,
    [websiteId],
  );
  return camelRows<ModelLite>(rows);
}

export async function modelWebsites(modelId: string): Promise<WebsiteLite[]> {
  const { rows } = await query(
    `SELECT w.id, w.name, w.slug, w.official_url
       FROM ai_websites w JOIN website_models wm ON wm.website_id = w.id
      WHERE wm.model_id = $1 AND w.deleted_at IS NULL ORDER BY w.name`,
    [modelId],
  );
  return camelRows<WebsiteLite>(rows);
}

export async function serializeWebsite(
  row: Record<string, unknown>,
  opts: { detail?: boolean } = {},
): Promise<Website> {
  const id = String(row.id);
  const base = camelRow<Omit<Website, "categories" | "models" | "verification">>(row);
  const [categories, models, verification] = await Promise.all([
    websiteCategories(id),
    opts.detail ? websiteModels(id) : Promise.resolve([] as ModelLite[]),
    getVerificationSummary("website", id),
  ]);
  return { ...base, categories, models, verification };
}

export async function serializeModel(
  row: Record<string, unknown>,
  opts: { availability?: boolean } = {},
): Promise<Model> {
  const id = String(row.id);
  const base = camelRow<Omit<Model, "provider" | "categories" | "capabilities" | "websites" | "availability" | "verification">>(row);
  const [cats, caps, websites, verification, provider, availability] = await Promise.all([
    query(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order, c.created_at, c.updated_at
         FROM categories c JOIN model_categories mc ON mc.category_id = c.id
        WHERE mc.model_id = $1 AND c.deleted_at IS NULL ORDER BY c.name`,
      [id],
    ).then((r) => camelRows<Category>(r.rows)),
    query(
      `SELECT c.id, c.name, c.slug, c.description, c.created_at
         FROM capabilities c JOIN model_capabilities mc ON mc.capability_id = c.id
        WHERE mc.model_id = $1 ORDER BY c.name`,
      [id],
    ).then((r) => camelRows<Capability>(r.rows)),
    modelWebsites(id),
    getVerificationSummary("model", id),
    row.provider_id
      ? query(
          `SELECT id, name, slug, website_url, description, created_at, updated_at
             FROM providers WHERE id = $1 AND deleted_at IS NULL`,
          [row.provider_id],
        ).then((r) => (r.rows.length > 0 ? camelRow<Provider>(r.rows[0]) : null))
      : Promise.resolve(null),
    opts.availability ? modelAvailability(id) : Promise.resolve(undefined),
  ]);
  return { ...base, provider, categories: cats, capabilities: caps, websites, availability, verification };
}

/**
 * "Where can I use this model?" — one entry per website hosting the model,
 * with access status, card requirement, free-tier limits summary, and region
 * coverage. Facts only; nothing is invented.
 */
export async function modelAvailability(modelId: string): Promise<ModelAvailability[]> {
  const { rows } = await query(
    `SELECT w.id AS website_id, w.name AS website_name, w.slug AS website_slug,
            w.logo_url AS website_logo_url, wm.access_status, wm.notes,
            ar.credit_card_required
       FROM website_models wm
       JOIN ai_websites w ON w.id = wm.website_id
       LEFT JOIN access_requirements ar ON ar.website_id = w.id
      WHERE wm.model_id = $1 AND w.deleted_at IS NULL
      ORDER BY w.name`,
    [modelId],
  );
  const out: ModelAvailability[] = [];
  for (const r of rows) {
    const wid = String(r.website_id);
    const [limits, regions] = await Promise.all([
      query(
        `SELECT pl.limit_kind, pl.limit_value, pl.limit_unit
           FROM plan_limits pl JOIN plans p ON p.id = pl.plan_id
          WHERE p.website_id = $1 AND p.is_current = true
          ORDER BY pl.limit_kind LIMIT 8`,
        [wid],
      ),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE available)::int AS available_ct
           FROM regional_availability WHERE website_id = $1`,
        [wid],
      ),
    ]);
    const limitsSummary =
      limits.rows.length > 0
        ? limits.rows
            .map((l) =>
              [l.limit_value ?? "?", String(l.limit_kind).replace(/_/g, " "), l.limit_unit ?? ""]
                .join(" ")
                .trim(),
            )
            .join("; ")
        : null;
    const rc = regions.rows[0] as { total: number; available_ct: number } | undefined;
    const regionNotes =
      rc && rc.total > 0 ? `Available in ${rc.available_ct} of ${rc.total} tracked regions` : null;
    out.push({
      website: {
        id: wid,
        name: String(r.website_name),
        slug: String(r.website_slug),
        logoUrl: r.website_logo_url ? String(r.website_logo_url) : null,
      },
      accessStatus: r.access_status ? String(r.access_status) : null,
      notes: r.notes ? String(r.notes) : null,
      limitsSummary,
      cardRequired: r.credit_card_required === null || r.credit_card_required === undefined ? null : Boolean(r.credit_card_required),
      regionNotes,
    });
  }
  return out;
}

export function paginationMeta(page: number, limit: number, total: number): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
