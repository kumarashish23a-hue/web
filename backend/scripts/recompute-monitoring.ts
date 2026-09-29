/**
 * Recompute monitoring staleness for all websites.
 *
 * SAFE BY DESIGN: pure date arithmetic on `ai_websites.last_checked_at`.
 * No HTTP requests, no scraping, no crawling. Only escalates staleness
 * (current -> due_for_check -> outdated based on check age); never asserts
 * freshness. See src/services/monitoring.ts.
 *
 * Usage:
 *   npm run monitoring:recompute
 *   MONITORING_DUE_DAYS=14 MONITORING_OUTDATED_DAYS=60 npm run monitoring:recompute
 *
 * Prints a JSON summary: { dueDays, outdatedDays, markedDueForCheck, markedOutdated }.
 */
import { closeDb, initDb } from "../src/db.js";
import { recomputeMonitoringStatus } from "../src/services/monitoring.js";

const dueDays = Number(process.env.MONITORING_DUE_DAYS ?? 30);
const outdatedDays = Number(process.env.MONITORING_OUTDATED_DAYS ?? 90);

await initDb();
const result = await recomputeMonitoringStatus({ dueDays, outdatedDays });
console.log(JSON.stringify(result, null, 2));
await closeDb();
