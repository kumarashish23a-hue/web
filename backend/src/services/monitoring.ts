/**
 * Staleness-based monitoring status recomputation (§20 monitoring automation).
 *
 * SAFE BY DESIGN: pure date arithmetic on `ai_websites.last_checked_at`.
 * No HTTP fetching, no scraping, no crawling of any kind.
 *
 * Escalation rules:
 *   last_checked_at older than dueDays      → 'due_for_check'  (from 'current' only)
 *   last_checked_at older than outdatedDays → 'outdated'       (from 'current' or 'due_for_check')
 *
 * Never-upgrade guarantee (enforced by the WHERE clauses):
 *   - Nothing is ever marked 'current' (or 'verified') by this job. Freshness
 *     can only be asserted by a human check (POST /admin/monitoring), which
 *     sets last_checked_at to now().
 *   - 'changed' and 'under_review' are never touched — they mean a human is
 *     already on the case.
 *   - 'outdated' is never downgraded back to 'due_for_check' or 'current'.
 *   - Rows with NULL last_checked_at and soft-deleted rows are left alone.
 */
import { query } from "../db.js";

export const MONITORING_DUE_DAYS = 30;
export const MONITORING_OUTDATED_DAYS = 90;

export interface RecomputeOptions {
  dueDays?: number;
  outdatedDays?: number;
}

export interface RecomputeResult {
  dueDays: number;
  outdatedDays: number;
  markedDueForCheck: number;
  markedOutdated: number;
}

export async function recomputeMonitoringStatus(
  opts: RecomputeOptions = {},
): Promise<RecomputeResult> {
  const dueDays = opts.dueDays ?? MONITORING_DUE_DAYS;
  const outdatedDays = opts.outdatedDays ?? MONITORING_OUTDATED_DAYS;
  if (!Number.isFinite(dueDays) || dueDays <= 0) {
    throw new Error(`dueDays must be a positive number (got ${dueDays})`);
  }
  if (!Number.isFinite(outdatedDays) || outdatedDays <= dueDays) {
    throw new Error(
      `outdatedDays must be a positive number greater than dueDays (got ${outdatedDays}, dueDays ${dueDays})`,
    );
  }

  // Escalate 'current' -> 'due_for_check' when the last check is older than dueDays.
  const due = await query(
    `UPDATE ai_websites
     SET monitoring_status = 'due_for_check', updated_at = now()
     WHERE deleted_at IS NULL
       AND last_checked_at IS NOT NULL
       AND monitoring_status = 'current'
       AND last_checked_at <= now() - make_interval(days => $1)
     RETURNING id`,
    [dueDays],
  );

  // Escalate 'current'/'due_for_check' -> 'outdated' when older than outdatedDays.
  // Rows just escalated to 'due_for_check' above can only be picked up here if
  // they are also older than outdatedDays (outdatedDays > dueDays), which is
  // exactly the intended outcome.
  const out = await query(
    `UPDATE ai_websites
     SET monitoring_status = 'outdated', updated_at = now()
     WHERE deleted_at IS NULL
       AND last_checked_at IS NOT NULL
       AND monitoring_status IN ('current', 'due_for_check')
       AND last_checked_at <= now() - make_interval(days => $1)
     RETURNING id`,
    [outdatedDays],
  );

  return {
    dueDays,
    outdatedDays,
    markedDueForCheck: due.rows.length,
    markedOutdated: out.rows.length,
  };
}

/** Per-status counts of non-deleted websites, for the admin dashboard. */
export async function monitoringStatusCounts(): Promise<Record<string, number>> {
  const { rows } = await query(
    `SELECT monitoring_status AS status, COUNT(*)::int AS n
     FROM ai_websites
     WHERE deleted_at IS NULL
     GROUP BY monitoring_status`,
  );
  const counts: Record<string, number> = {};
  for (const r of rows) counts[String(r.status)] = Number(r.n);
  return counts;
}
