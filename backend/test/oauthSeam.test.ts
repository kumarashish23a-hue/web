/**
 * OAuth seam: findOrCreateUserByEmail — proves the seam exists and password
 * flows are unaffected by the nullable password_hash change.
 *
 * FOOTGUN NOTE: all async setup (testApp, startServer) happens at module scope
 * BEFORE the first top-level test() definition. node:test begins scheduling
 * tests as soon as test() is called, so any setup after the first test() call
 * could race with running tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { api, data, query, closeDb, testApp, startServer } from "./helpers.js";
import {
  findOrCreateUserByEmail,
  signAccessToken,
  signRefreshToken,
} from "../src/services/auth.js";

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

test("seam creates a password-less user on first call", async () => {
  const user = (await findOrCreateUserByEmail("oauth-user@example.com", {
    displayName: "OAuth User",
    emailVerified: true,
  })) as { id: string; email: string; emailVerified: boolean };
  assert.equal(user.email, "oauth-user@example.com");
  assert.equal(user.emailVerified, true);

  const rows = await query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  assert.equal(rows.rows[0].password_hash, null, "OAuth users have no password hash");

  const profile = await query("SELECT display_name FROM profiles WHERE id = $1", [user.id]);
  assert.equal(profile.rows.length, 1, "profile row created");
  const prefs = await query("SELECT user_id FROM user_preferences WHERE user_id = $1", [user.id]);
  assert.equal(prefs.rows.length, 1, "preferences row created");
});

test("seam returns the existing user on repeat call (no duplicates)", async () => {
  const first = (await findOrCreateUserByEmail("oauth-user@example.com")) as { id: string };
  const second = (await findOrCreateUserByEmail("OAuth-User@EXAMPLE.com")) as { id: string };
  assert.equal(second.id, first.id);
  const rows = await query("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", [
    "oauth-user@example.com",
  ]);
  assert.equal(rows.rows[0].n, 1);
});

test("seam user gets working session tokens through the same helpers", async () => {
  const user = (await findOrCreateUserByEmail("oauth-user@example.com")) as { id: string };
  const accessToken = signAccessToken(user.id);
  assert.ok(accessToken.length > 20);
  const refresh = signRefreshToken(user.id);
  assert.ok(refresh.length > 20);
  const me = await api(base, "GET", "/api/v1/auth/me", { token: accessToken });
  assert.equal(me.status, 200);
  assert.equal((data(me) as { user: { id: string } }).user.id, user.id);
});

test("password login is rejected for password-less users (not a crash)", async () => {
  const r = await api(base, "POST", "/api/v1/auth/login", {
    body: { email: "oauth-user@example.com", password: "password123" },
  });
  assert.equal(r.status, 401);
  assert.equal((r.json as { error: { code: string } }).error.code, "INVALID_CREDENTIALS");
});

test("existing password flows still pass: signup -> login -> refresh", async () => {
  const signup = await api(base, "POST", "/api/v1/auth/signup", {
    body: { email: "seam-pw@example.com", password: "password123", displayName: "PW User" },
  });
  assert.equal(signup.status, 201);

  const login = await api(base, "POST", "/api/v1/auth/login", {
    body: { email: "seam-pw@example.com", password: "password123" },
  });
  assert.equal(login.status, 200);
  const d = data(login) as { accessToken: string };
  assert.ok(d.accessToken.length > 20);

  const refresh = await api(base, "POST", "/api/v1/auth/refresh", { cookie: login.cookie ?? undefined });
  assert.equal(refresh.status, 200);

  // password user can still be found through the seam (find path)
  const seam = (await findOrCreateUserByEmail("seam-pw@example.com")) as { id: string };
  assert.equal(seam.id, (data(signup) as { user: { id: string } }).user.id);
});
