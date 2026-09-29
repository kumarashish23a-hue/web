/** Staleness recomputation: escalates check-due dates, never asserts freshness.
 *
 * NOTE (node:test footgun): the runner begins executing tests as soon as the
 * first top-level test() call is registered, so EVERY async setup statement
 * below — app boot, account creation, fixture rows — runs BEFORE the first
 * test() definition. Setup placed after a test() may race with or never reach
 * the running tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { api, makeAdmin, query, signupHelper, startServer, testApp } from "./helpers.js";
import { recomputeMonitoringStatus } from "../src/services/monitoring.js";

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

const plain = await signupHelper(base, "mplain@example.com");
const verifier = await signupHelper(base, "mverifier@example.com");
await makeAdmin(verifier.userId, "verifier");
const superAdmin = await signupHelper(base, "mroot@example.com");
await makeAdmin(superAdmin.userId, "super_admin");

/** Insert a website fixture; daysAgo = age of last_checked_at, null = never checked. */
async function addWebsite(
  slug: string,
  status: string,
  daysAgo: number | null,
  deleted = false,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO ai_websites (name, slug, monitoring_status, last_checked_at, deleted_at)
     VALUES ($1, $2, $3::monitoring_status,
             CASE WHEN $4::int IS NULL THEN NULL ELSE now() - ($4 || ' days')::interval END,
             CASE WHEN $5 THEN now() END)
     RETURNING id`,
    [slug, slug, status, daysAgo, deleted],
  );
  return String(rows[0].id);
}

async function statusOf(id: string): Promise<string | null> {
  const { rows } = await query("SELECT monitoring_status AS s FROM ai_websites WHERE id = $1", [id]);
  return rows.length ? String(rows[0].s) : null;
}

const ids = {
  curFresh: await addWebsite("mon-cur-fresh", "current", 10), // stays current
  curDue: await addWebsite("mon-cur-due", "current", 45), // -> due_for_check
  curOld: await addWebsite("mon-cur-old", "current", 100), // -> outdated
  dueMid: await addWebsite("mon-due-mid", "due_for_check", 45), // stays due_for_check
  dueOld: await addWebsite("mon-due-old", "due_for_check", 100), // -> outdated
  outFresh: await addWebsite("mon-out-fresh", "outdated", 5), // never downgraded
  reviewing: await addWebsite("mon-reviewing", "under_review", 200), // never touched
  changed: await addWebsite("mon-changed", "changed", 200), // never touched
  never: await addWebsite("mon-never", "current", null), // NULL last_checked_at: untouched
  gone: await addWebsite("mon-gone", "current", 200, true), // soft-deleted: untouched
};

test("service escalates by age and never upgrades freshness", async () => {
  const result = await recomputeMonitoringStatus();
  assert.equal(result.dueDays, 30);
  assert.equal(result.outdatedDays, 90);
  assert.equal(result.markedDueForCheck, 2); // cur-due, cur-old (first pass)
  assert.equal(result.markedOutdated, 2); // cur-old, due-old

  assert.equal(await statusOf(ids.curFresh), "current", "fresh 'current' stays current");
  assert.equal(await statusOf(ids.curDue), "due_for_check", ">30d current -> due_for_check");
  assert.equal(await statusOf(ids.curOld), "outdated", ">90d current -> outdated");
  assert.equal(await statusOf(ids.dueMid), "due_for_check", "due_for_check stays due_for_check");
  assert.equal(await statusOf(ids.dueOld), "outdated", ">90d due_for_check -> outdated");
  assert.equal(await statusOf(ids.outFresh), "outdated", "outdated is never downgraded");
  assert.equal(await statusOf(ids.reviewing), "under_review", "under_review never touched");
  assert.equal(await statusOf(ids.changed), "changed", "changed never touched");
  assert.equal(await statusOf(ids.never), "current", "NULL last_checked_at untouched");
  assert.equal(await statusOf(ids.gone), "current", "soft-deleted rows untouched");
});

test("second recompute is idempotent — nothing left to escalate", async () => {
  const result = await recomputeMonitoringStatus();
  assert.equal(result.markedDueForCheck, 0);
  assert.equal(result.markedOutdated, 0);
});

test("service rejects invalid thresholds", async () => {
  await assert.rejects(() => recomputeMonitoringStatus({ dueDays: 0 }), /dueDays/);
  await assert.rejects(() => recomputeMonitoringStatus({ dueDays: 90, outdatedDays: 90 }), /outdatedDays/);
  await assert.rejects(() => recomputeMonitoringStatus({ dueDays: 100, outdatedDays: 50 }), /outdatedDays/);
});

test("POST /admin/monitoring/recompute is role-gated", async () => {
  const noAuth = await api(base, "POST", "/api/v1/admin/monitoring/recompute");
  assert.equal(noAuth.status, 401);

  const denied = await api(base, "POST", "/api/v1/admin/monitoring/recompute", { token: plain.token });
  assert.equal(denied.status, 403);
});

test("verifier can trigger recompute via the endpoint; response is the result", async () => {
  const r = await api(base, "POST", "/api/v1/admin/monitoring/recompute", { token: verifier.token });
  assert.equal(r.status, 200);
  const d = r.json as { data: { dueDays: number; outdatedDays: number; markedDueForCheck: number; markedOutdated: number } };
  assert.equal(d.data.dueDays, 30);
  assert.equal(d.data.outdatedDays, 90);
  assert.equal(typeof d.data.markedDueForCheck, "number");
  assert.equal(typeof d.data.markedOutdated, "number");
});

test("dashboard exposes monitoring status counts", async () => {
  const r = await api(base, "GET", "/api/v1/admin/dashboard", { token: superAdmin.token });
  assert.equal(r.status, 200);
  const d = r.json as { data: Record<string, unknown> };
  assert.equal(typeof d.data.dueForCheckWebsites, "number");
  assert.equal(typeof d.data.outdatedWebsites, "number");
  assert.ok(d.data.monitoringCounts && typeof d.data.monitoringCounts === "object");
});
