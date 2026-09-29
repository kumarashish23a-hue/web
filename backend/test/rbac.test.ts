/** RBAC: role gates on /admin/* endpoints. */
import test from "node:test";
import assert from "node:assert/strict";
import { api, makeAdmin, signupHelper, startServer, testApp } from "./helpers.js";

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

const plain = await signupHelper(base, "plain@example.com");
const editor = await signupHelper(base, "ed@example.com");
await makeAdmin(editor.userId, "editor");
const verifier = await signupHelper(base, "ver@example.com");
await makeAdmin(verifier.userId, "verifier");
const superAdmin = await signupHelper(base, "root@example.com");
await makeAdmin(superAdmin.userId, "super_admin");

test("non-admin gets 403 on every /admin/* route", async () => {
  for (const [method, path] of [
    ["GET", "/api/v1/admin/dashboard"],
    ["GET", "/api/v1/admin/websites"],
    ["POST", "/api/v1/admin/websites"],
    ["GET", "/api/v1/admin/verification"],
    ["GET", "/api/v1/admin/audit-logs"],
    ["GET", "/api/v1/admin/admin-users"],
  ] as const) {
    const r = await api(base, method, path, { token: plain.token });
    assert.equal(r.status, 403, `${method} ${path} should be 403`);
    assert.equal((r.json as { error: { code: string } }).error.code, "FORBIDDEN");
  }
});

test("unauthenticated admin access is 401", async () => {
  const r = await api(base, "GET", "/api/v1/admin/dashboard");
  assert.equal(r.status, 401);
});

test("editor can manage content but cannot touch admin_users (403)", async () => {
  const create = await api(base, "POST", "/api/v1/admin/categories", {
    token: editor.token,
    body: { name: "Editor Cat", slug: "editor-cat" },
  });
  assert.equal(create.status, 201);

  const g = await api(base, "GET", "/api/v1/admin/admin-users", { token: editor.token });
  assert.equal(g.status, 403, "editor GET /admin/admin-users should be 403");
  const p2 = await api(base, "POST", "/api/v1/admin/admin-users", {
    token: editor.token,
    body: { userId: plain.userId, role: "editor" },
  });
  assert.equal(p2.status, 403, "editor POST /admin/admin-users should be 403");
});

test("verifier can use the verification queue but cannot create websites", async () => {
  const q = await api(base, "GET", "/api/v1/admin/verification", { token: verifier.token });
  assert.equal(q.status, 200);

  const w = await api(base, "POST", "/api/v1/admin/websites", {
    token: verifier.token,
    body: { name: "Nope", slug: "nope" },
  });
  assert.equal(w.status, 403);
});

test("super_admin can manage admin_users", async () => {
  const list = await api(base, "GET", "/api/v1/admin/admin-users", { token: superAdmin.token });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray((list.json as { data: unknown[] }).data));

  const add = await api(base, "POST", "/api/v1/admin/admin-users", {
    token: superAdmin.token,
    body: { userId: plain.userId, role: "verifier" },
  });
  assert.equal(add.status, 201);

  const dup = await api(base, "POST", "/api/v1/admin/admin-users", {
    token: superAdmin.token,
    body: { userId: plain.userId, role: "editor" },
  });
  assert.equal(dup.status, 409);
});

test("cannot demote or remove the last super_admin", async () => {
  const list = await api(base, "GET", "/api/v1/admin/admin-users", { token: superAdmin.token });
  const admins = (list.json as { data: { id: string; role: string; userId: string }[] }).data;
  const mine = admins.find((a) => a.userId === superAdmin.userId)!;

  const demote = await api(base, "PATCH", `/api/v1/admin/admin-users/${mine.id}`, {
    token: superAdmin.token,
    body: { role: "editor" },
  });
  assert.equal(demote.status, 403);

  const remove = await api(base, "DELETE", `/api/v1/admin/admin-users/${mine.id}`, {
    token: superAdmin.token,
  });
  assert.equal(remove.status, 403);
});
