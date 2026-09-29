/**
 * OpenAI-compatible LLM provider: parsing, validation, fallback, anti-hallucination.
 *
 * NOTE: with node:test, top-level test() registrations start running as soon
 * as the module's first top-level await yields. Therefore ALL async setup
 * (testApp, seeds, admin, fixtures) MUST come before the first test()
 * definition in this file, or DB-touching tests will race the setup.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractJson,
  mergeLlmReasons,
  OpenAICompatibleProvider,
  validateRanking,
} from "../src/services/ai/openaiCompatible.js";
import { api, data, makeAdmin, query, signupHelper, startServer, testApp } from "./helpers.js";

const TEST_CFG = {
  baseUrl: "https://llm.example.test/v1",
  apiKey: "sk-test-secret-never-logged",
  model: "test-model",
  timeoutMs: 5000,
};

const realFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init: RequestInit) => unknown) {
  globalThis.fetch = (async (url: unknown, init?: unknown) => {
    return handler(String(url), (init ?? {}) as RequestInit);
  }) as typeof fetch;
}

function chatOk(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

function restoreFetch() {
  globalThis.fetch = realFetch;
}

/* ------------------------- async setup first ------------------------- */

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());
test.afterEach(() => restoreFetch());

// Vocabulary rows so slug filtering is genuinely exercised.
await query(
  `INSERT INTO capabilities (name, slug)
     VALUES ('Image Generation', 'image-generation'), ('Code Generation', 'code-generation')
     ON CONFLICT (slug) DO NOTHING`,
);
await query(
  `INSERT INTO categories (name, slug)
     VALUES ('Image', 'image'), ('Code', 'code')
     ON CONFLICT (slug) DO NOTHING`,
);

const admin = await signupHelper(base, "llm-admin@example.com");
await makeAdmin(admin.userId, "super_admin");
const T = admin.token;

const site = await api(base, "POST", "/api/v1/admin/websites", {
  token: T,
  body: {
    name: "LlmDraw",
    slug: "llmdraw",
    description: "Generate images with AI, free tier available",
    beginnerFriendly: true,
  },
});
const siteId = (data(site) as { id: string }).id;

/* ------------------------- pure helpers ------------------------- */

test("extractJson handles plain JSON, fenced JSON, and rejects garbage", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(extractJson('Here you go: {"a":3} done'), { a: 3 });
  assert.throws(() => extractJson("no json here"), /no JSON object/);
});

test("validateRanking drops unknown ids, wrong kinds, and duplicates", () => {
  const candidates = [
    { kind: "website" as const, id: "11111111-1111-4111-8111-111111111111" },
    { kind: "model" as const, id: "22222222-2222-4222-8222-222222222222" },
  ];
  const ranking = [
    { kind: "model" as const, id: "22222222-2222-4222-8222-222222222222", reasons: ["fits"] },
    // hallucinated id — must be dropped
    { kind: "website" as const, id: "99999999-9999-4999-8999-999999999999", reasons: ["fake"] },
    // real id but wrong kind — must be dropped
    { kind: "model" as const, id: "11111111-1111-4111-8111-111111111111", reasons: ["mismatch"] },
    // duplicate of the first — dropped
    { kind: "model" as const, id: "22222222-2222-4222-8222-222222222222", reasons: ["dup"] },
    { kind: "website" as const, id: "11111111-1111-4111-8111-111111111111", reasons: ["ok"] },
  ];
  const out = validateRanking(candidates, ranking);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, "22222222-2222-4222-8222-222222222222");
  assert.equal(out[1].id, "11111111-1111-4111-8111-111111111111");
});

test("mergeLlmReasons merges, caps length, and de-duplicates", () => {
  const merged = mergeLlmReasons(["Free plan available", "No credit card required to start"], [
    "free plan available", // dup (case-insensitive) — dropped
    "Great for quick image drafts",
    "x".repeat(300), // trimmed to 200
    "one", "two", "three", "four", // capped at 6 total
  ]);
  assert.ok(merged.includes("Great for quick image drafts"));
  assert.ok(merged.every((r) => r.length <= 200));
  assert.ok(merged.length <= 6);
  assert.equal(merged.filter((r) => r.toLowerCase() === "free plan available").length, 1);
});

/* ------------------------- analyzeGoal ------------------------- */

const analyzePayload = {
  keywords: ["images", "free"],
  capabilitySlugs: ["image-generation", "definitely-not-a-real-capability"],
  categorySlugs: ["not-a-real-category"],
  tasks: ["image generation"],
  aiTypes: ["image", "bogus-type"],
  constraints: { noCreditCard: true, preferFree: true },
};

test("analyzeGoal parses LLM JSON and filters unknown vocabulary", async () => {
  mockFetch(() => chatOk(JSON.stringify(analyzePayload)));
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const parsed = await p.analyzeGoal("I want free image tools without a credit card");
  assert.ok(parsed.keywords.includes("images"));
  assert.ok(parsed.capabilitySlugs.includes("image-generation"), "known slug survives");
  assert.ok(!parsed.capabilitySlugs.includes("definitely-not-a-real-capability"));
  assert.ok(!parsed.categorySlugs.includes("not-a-real-category"));
  assert.ok(parsed.tasks.includes("image generation"));
  assert.ok(parsed.aiTypes.includes("image"));
  assert.ok(!(parsed.aiTypes as string[]).includes("bogus-type"));
  assert.equal(parsed.inferredConstraints?.noCreditCard, true);
  assert.equal(parsed.inferredConstraints?.preferFree, true);
});

test("analyzeGoal falls back to rule-based on fetch failure", async () => {
  mockFetch(() => {
    throw new Error("network down");
  });
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const parsed = await p.analyzeGoal("generate images for my blog");
  assert.ok(parsed.capabilitySlugs.includes("image-generation"), "rule-based fallback parsed");
  assert.ok(!("inferredConstraints" in parsed) || parsed.inferredConstraints === undefined);
});

test("analyzeGoal falls back to rule-based on invalid LLM JSON", async () => {
  mockFetch(() => chatOk("this is not json at all"));
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const parsed = await p.analyzeGoal("generate images for my blog");
  assert.ok(parsed.capabilitySlugs.includes("image-generation"));
});

test("analyzeGoal falls back to rule-based on HTTP error", async () => {
  mockFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const parsed = await p.analyzeGoal("generate images for my blog");
  assert.ok(parsed.capabilitySlugs.includes("image-generation"));
});

test("extractRequirements merges LLM-inferred and explicit constraints (explicit wins)", async () => {
  mockFetch(() => chatOk(JSON.stringify(analyzePayload)));
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const merged = await p.extractRequirements("free image tools, no credit card", {
    noCreditCard: false, // explicit override
    apiRequired: true,
  });
  assert.equal(merged.noCreditCard, false);
  assert.equal(merged.apiRequired, true);
  assert.equal(merged.preferFree, true); // kept from LLM inference
});

/* ------------------- generateRecommendations (DB) ------------------- */

function routeFetch(url: string, init: RequestInit) {
  const body = JSON.parse(String(init.body)) as {
    messages: { content: string }[];
  };
  const userContent = body.messages[1].content;
  assert.ok(!userContent.includes(TEST_CFG.apiKey), "API key must not appear in request body");
  if (userContent.includes('"candidates"')) {
    // ranking call: include one hallucinated id that must be filtered out
    return chatOk(
      JSON.stringify({
        ranking: [
          {
            kind: "website",
            id: "99999999-9999-4999-8999-999999999999",
            reasons: ["hallucinated pick"],
          },
          { kind: "website", id: siteId, reasons: ["Good match for image work"] },
        ],
      }),
    );
  }
  return chatOk(JSON.stringify(analyzePayload));
}

test("generateRecommendations re-ranks via LLM and drops hallucinated ids", async () => {
  mockFetch(routeFetch);
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const res = await p.generateRecommendations({ goal: "I want free image tools without a credit card" });
  assert.equal(res.engine, "llm");
  assert.equal(res.llmModel, "test-model");
  const ids = res.items.map((i) => i.id);
  assert.ok(!ids.includes("99999999-9999-4999-8999-999999999999"), "hallucinated id filtered");
  assert.ok(ids.includes(siteId), "real candidate kept");
  const item = res.items.find((i) => i.id === siteId)!;
  assert.ok(item.reasons.includes("Good match for image work"), "LLM reason merged");
  // Verification honesty: statuses still come from the DB, never the LLM.
  assert.ok(
    ["verified", "partially_verified", "unverified", "outdated", "disputed"].includes(
      item.verification.status,
    ),
  );
  // Secret hygiene: the response must never contain the API key.
  assert.ok(!JSON.stringify(res).includes(TEST_CFG.apiKey), "API key leaked into response");
});

test("generateRecommendations falls back to rule-based when the LLM fails", async () => {
  mockFetch(() => {
    throw new Error("boom");
  });
  const p = new OpenAICompatibleProvider(TEST_CFG);
  const res = await p.generateRecommendations({ goal: "I want free image tools" });
  assert.equal(res.engine, "rule-based");
  assert.ok(res.items.length > 0, "rule-based fallback still returns items");
  assert.ok(res.items.some((i) => i.id === siteId));
});

test("POST /api/v1/recommend accepts useLlm and falls back cleanly when unconfigured", async () => {
  // No AI_LLM_* env in tests -> factory falls back to rule-based; must not 500.
  const r = await api(base, "POST", "/api/v1/recommend", {
    body: { goal: "I want free image tools", useLlm: true },
  });
  assert.equal(r.status, 200);
  const d = data(r) as { engine: string; items: unknown[] };
  assert.equal(d.engine, "rule-based");
  assert.ok(d.items.length > 0);
});
