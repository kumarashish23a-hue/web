#!/usr/bin/env node
/**
 * verify-api.mjs — smoke test for the backend API.
 *
 * Boots the built backend with DB_ADAPTER=pglite on an ephemeral port and runs
 * a smoke sequence:
 *   health -> seed-less public empty lists -> signup -> login -> me ->
 *   admin 403 for a normal user -> 401 unauthenticated -> zod 400 -> 404 envelope.
 * Prints PASS/FAIL per check and exits non-zero on any failure.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(repoRoot, "backend");
const entry = path.join(backendDir, "dist", "src", "index.js");

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

async function main() {
  if (!existsSync(entry)) {
    console.log("backend dist missing — building…");
    const r = spawnSync("npm", ["run", "build"], { cwd: backendDir, stdio: "inherit" });
    if (r.status !== 0 || !existsSync(entry)) {
      console.log("FAIL  backend build failed");
      process.exit(1);
    }
  }

  const port = await freePort();
  const child = spawn("node", [entry], {
    cwd: backendDir,
    env: {
      ...process.env,
      DB_ADAPTER: "pglite",
      PORT: String(port),
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: "verify-api-access",
      JWT_REFRESH_SECRET: "verify-api-refresh",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (d) => process.stderr.write(`[backend] ${d}`));

  const base = `http://127.0.0.1:${port}/api/v1`;
  async function req(method, p, { body, token } = {}) {
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${p}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    try {
      json = await res.json();
    } catch { /* ignore */ }
    return { status: res.status, json };
  }

  // wait for boot
  let up = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await req("GET", "/health");
      if (r.status === 200) {
        up = true;
        break;
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  check("backend boots on ephemeral port", up);
  if (!up) {
    child.kill();
    process.exit(1);
  }

  const health = await req("GET", "/health");
  check("GET /health -> 200 {status:ok}", health.status === 200 && health.json?.data?.status === "ok");

  const websites = await req("GET", "/websites");
  check(
    "seed-less GET /websites -> empty list",
    websites.status === 200 && Array.isArray(websites.json?.data) && websites.json.data.length === 0,
    `status=${websites.status}`,
  );

  const models = await req("GET", "/models");
  check("seed-less GET /models -> empty list", models.status === 200 && models.json?.data?.length === 0);

  const categories = await req("GET", "/categories");
  check("seed-less GET /categories -> empty list", categories.status === 200 && categories.json?.data?.length === 0);

  const signup = await req("POST", "/auth/signup", {
    body: { email: "smoke@example.com", password: "password123" },
  });
  check("POST /auth/signup -> 201", signup.status === 201, `status=${signup.status}`);
  const token = signup.json?.data?.accessToken;

  const login = await req("POST", "/auth/login", {
    body: { email: "smoke@example.com", password: "password123" },
  });
  check("POST /auth/login -> 200 + token", login.status === 200 && !!login.json?.data?.accessToken);

  const me = await req("GET", "/auth/me", { token });
  check(
    "GET /auth/me -> 200 correct user",
    me.status === 200 && me.json?.data?.user?.email === "smoke@example.com",
  );

  const adminDash = await req("GET", "/admin/dashboard", { token });
  check(
    "normal user GET /admin/dashboard -> 403",
    adminDash.status === 403 && adminDash.json?.error?.code === "FORBIDDEN",
    `status=${adminDash.status}`,
  );

  const adminNoAuth = await req("GET", "/admin/websites");
  check("unauthenticated GET /admin/websites -> 401", adminNoAuth.status === 401);

  const badRecommend = await req("POST", "/recommend", { body: { goal: "x" } });
  check(
    "POST /recommend with bad input -> 400 validation envelope",
    badRecommend.status === 400 && badRecommend.json?.error?.code === "VALIDATION_ERROR",
  );

  const missing = await req("GET", "/websites/no-such-site");
  check(
    "GET /websites/:slug unknown -> 404 envelope",
    missing.status === 404 && missing.json?.error?.code === "NOT_FOUND",
  );

  child.kill();
  await new Promise((r) => setTimeout(r, 500));

  console.log(failures === 0 ? "\nverify-api: ALL PASS" : `\nverify-api: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("verify-api crashed:", err);
  process.exit(1);
});
