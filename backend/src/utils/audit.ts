/** Admin audit logging + factual change history. */
import { query } from "../db.js";

interface AuditInput {
  adminUserId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await query(
    `INSERT INTO audit_logs (admin_user_id, action, entity_type, entity_id, old_value, new_value, ip)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      input.adminUserId,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.oldValue === undefined ? null : JSON.stringify(input.oldValue),
      input.newValue === undefined ? null : JSON.stringify(input.newValue),
      input.ip ?? null,
    ],
  );
}

const IGNORED_CHANGE_FIELDS = new Set(["id", "created_at", "updated_at"]);

function stringify(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Record one change_history row per factual field that changed between two
 * DB rows (snake_case keys). Call on every admin update of catalog/commerce
 * data so factual edits are traceable.
 */
export async function recordFieldChanges(
  entityType: string,
  entityId: string,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  changedByAdmin?: string | null,
): Promise<void> {
  const keys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
  for (const key of keys) {
    if (IGNORED_CHANGE_FIELDS.has(key)) continue;
    const oldV = stringify(oldRow[key]);
    const newV = stringify(newRow[key]);
    if (oldV === newV) continue;
    await query(
      `INSERT INTO change_history (entity_type, entity_id, field_name, old_value, new_value, changed_by_admin)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entityType, entityId, key, oldV, newV, changedByAdmin ?? null],
    );
  }
}
