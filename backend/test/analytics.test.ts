/**
 * Analytics events: POST /api/v1/analytics/events.
 * Validation (unknown event names rejected), persistence, entity slug
 * resolution, and privacy (strict meta allowlist — no PII, no raw query or
 * goal text can be stored).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { api, data, makeAdmin, signupHelper, startServer, testApp, query } from "./helpers.js";

// NOTE (node:test footgun): all async setup must complete BEFORE the first
// top-level test() definition — once tests start running, any top-level await
// after that point races the suite and causes flaky failures.
const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

const user = await signupHelper(base, "analytics1@example.com");
const admin = await signupHelper(base, "analytics-admin@example.com");
await makeAdmin(admin.userId, "admin");

// A catalog website so slug -> id resolution can be tested.
const w = await api(base, "POST", "/api/v1/admin/websites", {
    token: admin.token,
  body: { name: "AnalyticsSite", slug: "analyticssite" },
});
assert.equal(w.status, 201);
const websiteId = (data(w) as { id: string }).id;
const websiteSlug = (data(w) as { slug: string }).slug;

async function events(): Promise<Record<string, unknown>[]> {
  const { rows } = await query("SELECT * FROM analytics_events ORDER BY created_at");
  return rows as unknown as Record<string, unknown>[];
}

test("rejects unknown event names", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    body: { eventName: "button_hovered" },
  });
  assert.equal(r.status, 400);
  assert.match(JSON.stringify(r.json), /VALIDATION_ERROR/);
  assert.equal((await events()).length, 0);
});

test("rejects events missing the event name", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    body: { meta: { kind: "website" } },
  });
  assert.equal(r.status, 400);
  assert.equal((await events()).length, 0);
});

test("privacy: rejects meta keys that are not allowlisted (goal text, queries, PII)", async () => {
  for (const badMeta of [
    { goal: "I want to build a wedding website" },
    { query: "cheap image generators" },
    { email: "someone@example.com" },
    { name: "Ashish Kumar" },
  ]) {
    const r = await api(base, "POST", "/api/v1/analytics/events", {
      body: { eventName: "search_performed", meta: badMeta },
    });
    assert.equal(r.status, 400, `meta ${JSON.stringify(badMeta)} must be rejected`);
  }
  assert.equal((await events()).length, 0, "no privacy-violating row may be persisted");
});

test("privacy: even a signed-in user cannot sneak free text through nested payloads", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    token: admin.token,
    body: { eventName: "recommendation_generated", meta: { resultCount: 3, notes: "secret plan" } },
  });
  assert.equal(r.status, 400, "unknown meta key 'notes' must be rejected");
});

test("persists a coarse anonymous event (no auth required)", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    body: { eventName: "search_performed", meta: { type: "all", resultCount: 12 } },
  });
  assert.equal(r.status, 201);
  const id = (r.json as { data: { id: string } }).data.id;
  assert.ok(id);

  const rows = await events();
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.event_type, "search_performed");
  assert.equal(row.user_id, null, "anonymous event must have NULL user_id");
  assert.equal(row.entity_type, null);
  assert.deepEqual(row.meta, { type: "all", resultCount: 12 });
});

test("links the event to the signed-in user", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    token: user.token,
    body: { eventName: "compare_used", meta: { type: "website", itemCount: 2 } },
  });
  assert.equal(r.status, 201);
  const { rows } = await query(
    "SELECT * FROM analytics_events WHERE event_type = $1",
    ["compare_used"],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, user.userId);
});

test("resolves entitySlug to the catalog uuid and stores entity_id", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    body: {
      eventName: "website_viewed",
      entityType: "website",
      entitySlug: websiteSlug,
    },
  });
  assert.equal(r.status, 201);
  const { rows } = await query(
    "SELECT * FROM analytics_events WHERE event_type = $1",
    ["website_viewed"],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entity_type, "website");
  assert.equal(rows[0].entity_id, websiteId);
});

test("accepts an explicit entityId and a full coarse payload", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    token: admin.token,
    body: {
      eventName: "recommendation_generated",
      entityType: "model",
      entityId: websiteId,
      meta: { engine: "llm", resultCount: 5, categories: ["chat", "code"] },
    },
  });
  assert.equal(r.status, 201);
  const { rows } = await query(
    "SELECT * FROM analytics_events WHERE event_type = $1",
    ["recommendation_generated"],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entity_type, "model");
  assert.equal(rows[0].entity_id, websiteId);
  assert.deepEqual(rows[0].meta, { engine: "llm", resultCount: 5, categories: ["chat", "code"] });
});

test("unknown slug leaves entity_id NULL but still stores the event", async () => {
  const r = await api(base, "POST", "/api/v1/analytics/events", {
    body: {
      eventName: "website_viewed",
      entityType: "website",
      entitySlug: "no-such-site",
    },
  });
  assert.equal(r.status, 201);
  const { rows } = await query(
    "SELECT * FROM analytics_events WHERE event_type = $1 ORDER BY created_at DESC LIMIT 1",
    ["website_viewed"],
  );
  assert.equal(rows[0].entity_id, null);
});

test("rejects malformed values (bad uuid, out-of-range counts)", async () => {
  const badUuid = await api(base, "POST", "/api/v1/analytics/events", {
    body: { eventName: "model_viewed", entityType: "model", entityId: "not-a-uuid" },
  });
  assert.equal(badUuid.status, 400);

  const badCount = await api(base, "POST", "/api/v1/analytics/events", {
    body: { eventName: "search_performed", meta: { resultCount: -3 } },
  });
  assert.equal(badCount.status, 400);
});

test("the endpoint never leaks PII-shaped data: DB rows contain only coarse fields", async () => {
  // Every row inserted by this suite must survive this shape check.
  const { rows } = await query("SELECT event_type, entity_type, meta FROM analytics_events");
  for (const row of rows) {
    const meta = row.meta as Record<string, unknown> | null;
    if (!meta) continue;
    for (const key of Object.keys(meta)) {
      assert.ok(
        ["type", "category", "categories", "resultCount", "engine", "itemCount", "kind"].includes(key),
        `unexpected meta key '${key}' on ${row.event_type} — schema drift?`,
      );
    }
    assert.ok(
      !(row.entity_type as string | null) || ["website", "model"].includes(row.entity_type as string),
      "entity_type must be a catalog kind",
    );
  }
});
