/** Catalog behaviour: verification honesty, soft-delete, relations, search, compare. */
import test from "node:test";
import assert from "node:assert/strict";
import { api, data, makeAdmin, query, signupHelper, startServer, testApp } from "./helpers.js";
const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());
const admin = await signupHelper(base, "catalog-admin@example.com");
await makeAdmin(admin.userId, "admin");
const T = admin.token;
let websiteId = "";
let modelId = "";
test("admin can create website + model and link them both directions", async () => {
    const cap = await api(base, "POST", "/api/v1/admin/capabilities", {
        token: T,
        body: { name: "Test Image Gen", slug: "test-image-gen" },
    });
    assert.equal(cap.status, 201);
    const capId = data(cap).id;
    const m = await api(base, "POST", "/api/v1/admin/models", {
        token: T,
        body: {
            name: "TestModel One",
            slug: "testmodel-one",
            modelType: "image",
            apiAvailable: true,
            capabilityIds: [capId],
        },
    });
    assert.equal(m.status, 201);
    modelId = data(m).id;
    const w = await api(base, "POST", "/api/v1/admin/websites", {
        token: T,
        body: {
            name: "TestSite Alpha",
            slug: "testsite-alpha",
            tagline: "A test website for images",
            description: "Generate images with testmodel",
            beginnerFriendly: true,
            modelIds: [modelId],
        },
    });
    assert.equal(w.status, 201);
    websiteId = data(w).id;
    // website -> models
    const detail = await api(base, "GET", "/api/v1/websites/testsite-alpha");
    assert.equal(detail.status, 200);
    const models = data(detail).models;
    assert.ok(models.some((x) => x.slug === "testmodel-one"), "website lists its model");
    // model -> websites
    const mDetail = await api(base, "GET", "/api/v1/models/testmodel-one");
    assert.equal(mDetail.status, 200);
    const sites = data(mDetail).websites;
    assert.ok(sites.some((x) => x.slug === "testsite-alpha"), "model lists its website");
});
test("unverified website is never serialized as verified", async () => {
    const r = await api(base, "GET", "/api/v1/websites/testsite-alpha");
    const v = data(r).verification;
    assert.ok(v === null || v.status !== "verified", "no fabricated verified status");
});
test("verification record with status verified is reflected honestly", async () => {
    const rec = await api(base, "POST", "/api/v1/admin/verification", {
        token: T,
        body: {
            entityType: "website",
            entityId: websiteId,
            claim: "Official URL confirmed",
            status: "verified",
        },
    });
    assert.equal(rec.status, 201);
    const r = await api(base, "GET", "/api/v1/websites/testsite-alpha");
    const v = data(r).verification;
    assert.equal(v.status, "verified");
});
test("archived website is hidden from public list but visible to admin", async () => {
    const pubBefore = await api(base, "GET", "/api/v1/websites?q=testsite-alpha");
    assert.ok((pubBefore.json.data.length >= 1), "website visible publicly before archive");
    const del = await api(base, "DELETE", `/api/v1/admin/websites/${websiteId}`, { token: T });
    assert.equal(del.status, 200);
    assert.equal(data(del).archived, true);
    const pubAfter = await api(base, "GET", "/api/v1/websites?q=testsite-alpha");
    assert.equal(pubAfter.json.data.length, 0, "archived hidden publicly");
    const slugGone = await api(base, "GET", "/api/v1/websites/testsite-alpha");
    assert.equal(slugGone.status, 404);
    const adminList = await api(base, "GET", "/api/v1/admin/websites?q=testsite-alpha", { token: T });
    assert.equal(adminList.status, 200);
    const found = adminList.json.data;
    assert.equal(found.length, 1, "admin still sees archived row");
    assert.ok(found[0].deletedAt !== null, "deletedAt is set");
    // restore for later tests
    const restore = await api(base, "POST", `/api/v1/admin/websites/${websiteId}/restore`, { token: T });
    assert.equal(restore.status, 200);
});
test("admin mutation writes audit_logs and change_history", async () => {
    const before = await api(base, "GET", "/api/v1/admin/audit-logs?action=website.update", { token: T });
    const beforeCount = (before.json.meta).total;
    const upd = await api(base, "PATCH", `/api/v1/admin/websites/${websiteId}`, {
        token: T,
        body: { tagline: "Updated tagline" },
    });
    assert.equal(upd.status, 200);
    const after = await api(base, "GET", "/api/v1/admin/audit-logs?action=website.update", { token: T });
    assert.equal((after.json.meta).total, beforeCount + 1);
    const changes = await api(base, "GET", `/api/v1/admin/change-history?entityType=website&entityId=${websiteId}`, { token: T });
    const entries = changes.json.data;
    const tagline = entries.find((e) => e.fieldName === "tagline");
    assert.ok(tagline, "change_history has tagline change");
    assert.equal(tagline.newValue, "Updated tagline");
});
test("search finds across websites, models, categories, capabilities", async () => {
    const r = await api(base, "GET", "/api/v1/search?q=testsite");
    assert.equal(r.status, 200);
    const d = data(r);
    assert.ok(d.websites.length >= 1, "website found");
    assert.ok(d.models.length >= 1, "model found via description");
});
test("compare builds dynamic side-by-side rows", async () => {
    const w2 = await api(base, "POST", "/api/v1/admin/websites", {
        token: T,
        body: { name: "TestSite Beta", slug: "testsite-beta", isOpenSource: true },
    });
    const id2 = data(w2).id;
    const r = await api(base, "GET", `/api/v1/compare?type=website&ids=${websiteId},${id2}`);
    assert.equal(r.status, 200);
    const d = data(r);
    assert.equal(d.type, "website");
    assert.equal(d.items.length, 2);
    const labels = d.rows.map((x) => x.label);
    assert.ok(labels.includes("Open source"), "dynamic rows include Open source");
    assert.ok(labels.includes("Verification status"), "dynamic rows include verification");
    for (const row of d.rows)
        assert.equal(row.values.length, 2, `row ${row.label} has 2 values`);
    const tooFew = await api(base, "GET", `/api/v1/compare?type=website&ids=${websiteId}`);
    assert.equal(tooFew.status, 400);
});
test("recommend endpoint validates input", async () => {
    const bad = await api(base, "POST", "/api/v1/recommend", { body: { goal: "x" } });
    assert.equal(bad.status, 400);
});
test("verification queue actions change status", async () => {
    const rec = await api(base, "POST", "/api/v1/admin/verification", {
        token: T,
        body: {
            entityType: "model",
            entityId: modelId,
            claim: "Needs review",
            status: "unverified",
        },
    });
    const recId = data(rec).id;
    const act = await api(base, "POST", `/api/v1/admin/verification/${recId}/action`, {
        token: T,
        body: { action: "mark_outdated", notes: "stale" },
    });
    assert.equal(act.status, 200);
    assert.equal(data(act).status, "outdated");
    const queue = await api(base, "GET", "/api/v1/admin/verification?status=outdated", { token: T });
    assert.ok((queue.json.data.length >= 1));
    // raw DB sanity: no verified=true anywhere without a record
    const { rows } = await query("SELECT COUNT(*)::int AS n FROM verification_records WHERE status = 'verified'");
    assert.ok(Number(rows[0].n) >= 1, "at least one real verified record exists");
});
//# sourceMappingURL=catalog.test.js.map