/** Auth flow: signup -> login -> me, tokens, validation, password reset. */
import test from "node:test";
import assert from "node:assert/strict";
import { api, data, signupHelper, startServer, testApp } from "./helpers.js";
const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());
test("signup creates a user and returns tokens", async () => {
    const r = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "alice@example.com", password: "password123", displayName: "Alice" },
    });
    assert.equal(r.status, 201);
    const d = data(r);
    assert.equal(d.user.email, "alice@example.com");
    assert.equal(d.user.emailVerified, false);
    assert.ok(d.accessToken.length > 20, "access token issued");
    assert.ok(r.cookie?.includes("refresh_token"), "httpOnly refresh cookie set");
});
test("signup lowercases the email", async () => {
    const r = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "Bob@Example.COM", password: "password123" },
    });
    assert.equal(r.status, 201);
    assert.equal(data(r).user.email, "bob@example.com");
});
test("signup rejects duplicate email with 409", async () => {
    const r = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "alice@example.com", password: "password123" },
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "EMAIL_TAKEN");
});
test("zod rejects bad signup input with 400", async () => {
    const badEmail = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "not-an-email", password: "password123" },
    });
    assert.equal(badEmail.status, 400);
    assert.equal(badEmail.json.error.code, "VALIDATION_ERROR");
    const shortPw = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "x@example.com", password: "short" },
    });
    assert.equal(shortPw.status, 400);
});
test("login verifies password and me returns the user", async () => {
    const bad = await api(base, "POST", "/api/v1/auth/login", {
        body: { email: "alice@example.com", password: "wrongpassword" },
    });
    assert.equal(bad.status, 401);
    const ok = await api(base, "POST", "/api/v1/auth/login", {
        body: { email: "alice@example.com", password: "password123" },
    });
    assert.equal(ok.status, 200);
    const token = data(ok).accessToken;
    const me = await api(base, "GET", "/api/v1/auth/me", { token });
    assert.equal(me.status, 200);
    const meData = data(me);
    assert.equal(meData.user.email, "alice@example.com");
    assert.equal(meData.adminRole, null);
});
test("me without a token is 401", async () => {
    const r = await api(base, "GET", "/api/v1/auth/me");
    assert.equal(r.status, 401);
});
test("refresh cookie issues a new access token; logout clears it", async () => {
    const login = await api(base, "POST", "/api/v1/auth/login", {
        body: { email: "alice@example.com", password: "password123" },
    });
    const cookie = login.cookie;
    assert.ok(cookie.includes("refresh_token"));
    const refreshed = await api(base, "POST", "/api/v1/auth/refresh", { cookie });
    assert.equal(refreshed.status, 200);
    assert.ok(data(refreshed).accessToken.length > 20);
    const logout = await api(base, "POST", "/api/v1/auth/logout", { cookie });
    assert.equal(logout.status, 200);
    assert.ok(logout.cookie?.includes("refresh_token=;") || logout.cookie === "", "cookie cleared");
});
test("verify-email marks the user verified", async () => {
    const s = await signupHelper(base, "carol@example.com");
    // token is returned in non-production (TODO: email delivery)
    const signup = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email: "dave@example.com", password: "password123" },
    });
    void s;
    const token = data(signup).verificationToken;
    assert.ok(token, "verification token returned in test env");
    const bad = await api(base, "POST", "/api/v1/auth/verify-email", { body: { token: "deadbeef" } });
    assert.equal(bad.status, 400);
    const ok = await api(base, "POST", "/api/v1/auth/verify-email", { body: { token } });
    assert.equal(ok.status, 200);
    assert.equal(data(ok).user.emailVerified, true);
});
test("password reset flow works end to end", async () => {
    await signupHelper(base, "erin@example.com");
    const req = await api(base, "POST", "/api/v1/auth/request-password-reset", {
        body: { email: "erin@example.com" },
    });
    assert.equal(req.status, 200);
    const token = data(req).resetToken;
    assert.ok(token, "reset token returned in test env");
    const reset = await api(base, "POST", "/api/v1/auth/reset-password", {
        body: { token, password: "newpassword456" },
    });
    assert.equal(reset.status, 200);
    const login = await api(base, "POST", "/api/v1/auth/login", {
        body: { email: "erin@example.com", password: "newpassword456" },
    });
    assert.equal(login.status, 200);
});
//# sourceMappingURL=auth.test.js.map