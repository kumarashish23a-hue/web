/**
 * Email sending: verification + password-reset content, and the
 * unconfigured-SMTP fallback in dev vs production (mocked transport —
 * no real emails, no network).
 *
 * NOTE: with node:test, top-level test() registrations start running as soon
 * as the module's first top-level await yields. Therefore ALL async setup
 * (testApp, startServer, transport injection) MUST come before the first
 * test() definition in this file, or tests will race the setup.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config.js";
import {
  __setMailTransport,
  passwordResetLink,
  sendPasswordResetEmail,
  sendVerificationEmail,
  verificationLink,
} from "../src/services/mail.js";
import { ApiError } from "../src/middleware/errors.js";
import { api, data, startServer, testApp } from "./helpers.js";

/* ------------------------- async setup first ------------------------- */

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

interface SentMail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sent: SentMail[] = [];
__setMailTransport({
  async sendMail(opts: unknown): Promise<unknown> {
    const o = opts as Record<string, unknown>;
    sent.push({
      from: String(o.from),
      to: String(o.to),
      subject: String(o.subject),
      text: String(o.text),
      html: String(o.html),
    });
    return { messageId: "test-message-id" };
  },
});

// SMTP env is unset here so "unconfigured" tests reflect reality; keep a copy
// of anything that was set (e.g. by the shell) and restore it afterwards.
const savedSmtpEnv: Record<string, string | undefined> = {};
for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
  savedSmtpEnv[k] = process.env[k];
  delete process.env[k];
}
const savedNodeEnv = config.nodeEnv;
test.after(() => {
  for (const [k, v] of Object.entries(savedSmtpEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  config.nodeEnv = savedNodeEnv;
  __setMailTransport(null);
});

function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
  return {
    logs,
    errors,
    restore() {
      console.log = origLog;
      console.error = origError;
    },
  };
}

function assertPlainEmail(mail: SentMail, link: string) {
  assert.equal(mail.to, "user@example.com");
  assert.ok(mail.text.includes(link), "plain-text body contains the link");
  assert.ok(mail.html.includes(link), "HTML body contains the link");
  assert.ok(!/<img\b/i.test(mail.html), "no tracking pixels or external images in HTML");
}

/* ------------------------------ tests ------------------------------ */

test("verification email content contains the token link", async () => {
  sent.length = 0;
  const token = "deadbeef-verify-token-123";
  const link = verificationLink(token);
  assert.ok(link.includes(encodeURIComponent(token)), "link carries the token");
  await sendVerificationEmail("user@example.com", link);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "Verify your email");
  assertPlainEmail(sent[0], link);
});

test("password-reset email content contains the token link", async () => {
  sent.length = 0;
  const token = "cafef00d-reset-token-456";
  const link = passwordResetLink(token);
  assert.ok(link.includes(encodeURIComponent(token)), "link carries the token");
  await sendPasswordResetEmail("user@example.com", link);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "Reset your password");
  assertPlainEmail(sent[0], link);
});

test("signup sends a verification email whose link contains the returned token", async () => {
  sent.length = 0;
  const r = await api(base, "POST", "/api/v1/auth/signup", {
    body: { email: "mailer@example.com", password: "password123" },
  });
  assert.equal(r.status, 201);
  const token = (data(r) as { verificationToken?: string }).verificationToken;
  assert.ok(token, "dev still returns the verification token for testability");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "mailer@example.com");
  assert.ok(sent[0].text.includes(encodeURIComponent(token)), "email link contains the token");
});

test("request-password-reset sends a reset email whose link contains the token", async () => {
  await api(base, "POST", "/api/v1/auth/signup", {
    body: { email: "resetme@example.com", password: "password123" },
  });
  sent.length = 0;
  const r = await api(base, "POST", "/api/v1/auth/request-password-reset", {
    body: { email: "resetme@example.com" },
  });
  assert.equal(r.status, 200);
  const token = (data(r) as { resetToken?: string }).resetToken;
  assert.ok(token, "dev still returns the reset token for testability");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "resetme@example.com");
  assert.ok(sent[0].text.includes(encodeURIComponent(token)), "email link contains the token");
});

test("request-password-reset to an unknown email stays silent and sends nothing", async () => {
  sent.length = 0;
  const r = await api(base, "POST", "/api/v1/auth/request-password-reset", {
    body: { email: "nobody-here@example.com" },
  });
  assert.equal(r.status, 200);
  assert.equal((data(r) as { resetToken?: string }).resetToken ?? null, null);
  assert.equal(sent.length, 0, "no email for an unknown address");
});

test("unconfigured SMTP outside production logs the link to the console", async () => {
  __setMailTransport(null); // no override: true "unconfigured" path
  const cap = captureConsole();
  try {
    const token = "tok-dev-console-789";
    await sendVerificationEmail("dev@example.com", verificationLink(token));
    assert.ok(
      cap.logs.some((l) => l.includes(encodeURIComponent(token))),
      "dev console output contains the link",
    );
    assert.equal(cap.errors.length, 0, "no error logged in dev");
  } finally {
    cap.restore();
  }
});

test("unconfigured SMTP in production fails generically and never exposes the token", async () => {
  __setMailTransport(null);
  config.nodeEnv = "production";
  const cap = captureConsole();
  try {
    const token = "tok-prod-secret-000";
    await assert.rejects(
      () => sendPasswordResetEmail("prod@example.com", passwordResetLink(token)),
      (err: unknown) => {
        assert.ok(err instanceof ApiError, "generic ApiError, not a raw transport error");
        assert.equal(err.status, 503);
        assert.equal(err.code, "EMAIL_UNAVAILABLE");
        assert.ok(
          !err.message.includes(token),
          "client-facing message must not contain the token",
        );
        return true;
      },
    );
    const combined = cap.logs.join("\n") + "\n" + cap.errors.join("\n");
    assert.ok(cap.errors.length > 0, "server-side error logged");
    assert.ok(!combined.includes(token), "token never appears in production logs");
  } finally {
    cap.restore();
    config.nodeEnv = savedNodeEnv;
  }
});
