/** User-scoped data: favorites isolation, stacks, profile, preferences, submissions. */
import test from "node:test";
import assert from "node:assert/strict";
import { api, data, makeAdmin, signupHelper, startServer, testApp } from "./helpers.js";

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

const u1 = await signupHelper(base, "fav1@example.com");
const u2 = await signupHelper(base, "fav2@example.com");
const admin = await signupHelper(base, "user-admin@example.com");
await makeAdmin(admin.userId, "admin");

const w = await api(base, "POST", "/api/v1/admin/websites", {
  token: admin.token,
  body: { name: "FavSite", slug: "favsite" },
});
const websiteId = (data(w) as { id: string }).id;

test("favorites are isolated between users", async () => {
  const add = await api(base, "POST", "/api/v1/favorites", {
    token: u1.token,
    body: { kind: "website", websiteId },
  });
  assert.equal(add.status, 201);

  const list1 = await api(base, "GET", "/api/v1/favorites", { token: u1.token });
  assert.equal(((list1.json as { data: unknown[] }).data.length), 1);

  const list2 = await api(base, "GET", "/api/v1/favorites", { token: u2.token });
  assert.equal(((list2.json as { data: unknown[] }).data.length), 0, "user 2 sees nothing");

  // user 2 cannot delete user 1's favorite
  const favId = (data(add) as { id: string }).id;
  const delOther = await api(base, "DELETE", `/api/v1/favorites/${favId}`, { token: u2.token });
  assert.equal(delOther.status, 404);

  const del = await api(base, "DELETE", `/api/v1/favorites/${favId}`, { token: u1.token });
  assert.equal(del.status, 200);
});

test("favorite requires exactly one valid target", async () => {
  const none = await api(base, "POST", "/api/v1/favorites", {
    token: u1.token,
    body: { kind: "website" },
  });
  assert.equal(none.status, 400);

  const bogus = await api(base, "POST", "/api/v1/favorites", {
    token: u1.token,
    body: { kind: "website", websiteId: "00000000-0000-0000-0000-000000000000" },
  });
  assert.equal(bogus.status, 404);
});

test("stacks CRUD with items, scoped to owner", async () => {
  const created = await api(base, "POST", "/api/v1/stacks", {
    token: u1.token,
    body: { title: "My AI stack", goalText: "make videos" },
  });
  assert.equal(created.status, 201);
  const stackId = (data(created) as { id: string }).id;

  const item = await api(base, "POST", `/api/v1/stacks/${stackId}/items`, {
    token: u1.token,
    body: { position: 0, requirementLabel: "video generation", websiteId, reason: "fits goal" },
  });
  assert.equal(item.status, 201);

  const other = await api(base, "GET", `/api/v1/stacks/${stackId}`, { token: u2.token });
  assert.equal(other.status, 404, "other user cannot read the stack");

  const got = await api(base, "GET", `/api/v1/stacks/${stackId}`, { token: u1.token });
  assert.equal(((data(got) as { items: unknown[] }).items.length), 1);

  const patched = await api(base, "PATCH", `/api/v1/stacks/${stackId}`, {
    token: u1.token,
    body: { title: "Renamed stack" },
  });
  assert.equal((data(patched) as { title: string }).title, "Renamed stack");

  const del = await api(base, "DELETE", `/api/v1/stacks/${stackId}`, { token: u1.token });
  assert.equal(del.status, 200);
});

test("profile and preferences round-trip", async () => {
  const p = await api(base, "PATCH", "/api/v1/profile", {
    token: u1.token,
    body: { displayName: "Fav One" },
  });
  assert.equal((data(p) as { displayName: string }).displayName, "Fav One");

  const prefs = await api(base, "PUT", "/api/v1/preferences", {
    token: u1.token,
    body: { preferFree: true, noCreditCard: true, regionCode: "IN" },
  });
  assert.equal(prefs.status, 200);
  const d = data(prefs) as { preferFree: boolean; noCreditCard: boolean; regionCode: string };
  assert.equal(d.preferFree, true);
  assert.equal(d.noCreditCard, true);
  assert.equal(d.regionCode, "IN");

  const bad = await api(base, "PUT", "/api/v1/preferences", {
    token: u1.token,
    body: { regionCode: "IND" },
  });
  assert.equal(bad.status, 400, "region code must be 2 chars");
});

test("submissions: create + own list, review by admin", async () => {
  const s = await api(base, "POST", "/api/v1/submissions", {
    token: u1.token,
    body: { kind: "website", payload: { name: "NewTool", url: "https://example.com" } },
  });
  assert.equal(s.status, 201);
  assert.equal((data(s) as { status: string }).status, "pending_review");
  const subId = (data(s) as { id: string }).id;

  const mine = await api(base, "GET", "/api/v1/submissions", { token: u1.token });
  assert.equal(((mine.json as { data: unknown[] }).data.length), 1);
  const theirs = await api(base, "GET", "/api/v1/submissions", { token: u2.token });
  assert.equal(((theirs.json as { data: unknown[] }).data.length), 0);

  const review = await api(base, "POST", `/api/v1/admin/submissions/${subId}/review`, {
    token: admin.token,
    body: { action: "needs_info", reviewNotes: "need pricing link" },
  });
  assert.equal(review.status, 200);
  assert.equal((data(review) as { status: string }).status, "needs_info");
});

test("search history is logged for authed searches and clearable", async () => {
  await api(base, "GET", "/api/v1/search?q=favsite", { token: u1.token });
  const h = await api(base, "GET", "/api/v1/search-history", { token: u1.token });
  const entries = (h.json as { data: { query: string }[] }).data;
  assert.ok(entries.some((e) => e.query === "favsite"), "search logged");

  const clear = await api(base, "DELETE", "/api/v1/search-history", { token: u1.token });
  assert.equal(clear.status, 200);
  const h2 = await api(base, "GET", "/api/v1/search-history", { token: u1.token });
  assert.equal(((h2.json as { data: unknown[] }).data.length), 0);
});
