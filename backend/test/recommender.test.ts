/** Recommender: parseGoal unit tests + end-to-end recommend behaviour. */
import test from "node:test";
import assert from "node:assert/strict";
import { parseGoal } from "../src/services/recommender.js";
import { OpenAICompatibleProvider, OpenAIProvider, RuleBasedProvider, createAIProvider } from "../src/services/ai/AIProvider.js";
import { api, data, makeAdmin, query, signupHelper, startServer, testApp } from "./helpers.js";

test("parseGoal maps keywords to capabilities, categories, tasks and ai types", () => {
  const p = parseGoal("I want to generate images and edit photos for my blog");
  assert.ok(p.capabilitySlugs.includes("image-generation"), "image-generation detected");
  assert.ok(p.tasks.includes("image generation"), "task detected");
  assert.ok(p.aiTypes.includes("image"), "ai type detected");
  assert.ok(p.keywords.includes("generate"), "keywords extracted");
});

test("parseGoal detects code and video intents", () => {
  const p = parseGoal("help me write python code and debug my api");
  assert.ok(p.capabilitySlugs.includes("code-generation"));
  assert.ok(p.aiTypes.includes("code"));
  const v = parseGoal("create short videos from text");
  assert.ok(v.capabilitySlugs.includes("video-generation"));
});

test("parseGoal is pure and deterministic", () => {
  const a = parseGoal("summarize research papers about climate");
  const b = parseGoal("summarize research papers about climate");
  assert.deepEqual(a, b);
  assert.ok(a.tasks.includes("summarization") || a.capabilitySlugs.includes("text-generation"));
});

/* ------------------------- end-to-end recommend ------------------------ */

const app = await testApp();
const { base, close } = await startServer(app);
test.after(async () => close());

const admin = await signupHelper(base, "rec-admin@example.com");
await makeAdmin(admin.userId, "admin");
const T = admin.token;

// card-required site
const cardSite = await api(base, "POST", "/api/v1/admin/websites", {
  token: T,
  body: {
    name: "CardSite Pro",
    slug: "cardsite-pro",
    description: "Generate images and videos with AI",
    beginnerFriendly: false,
  },
});
const cardSiteId = (data(cardSite) as { id: string }).id;
await api(base, "PUT", "/api/v1/admin/access-requirements", {
  token: T,
  body: { websiteId: cardSiteId, creditCardRequired: true, accountRequired: true },
});
await api(base, "POST", "/api/v1/admin/plans", {
  token: T,
  body: { websiteId: cardSiteId, name: "Pro", kind: "paid", billingCycle: "monthly", priceAmount: 20, priceCurrency: "USD" },
});

// free, no-card site
const freeSite = await api(base, "POST", "/api/v1/admin/websites", {
  token: T,
  body: {
    name: "FreeDraw",
    slug: "freedraw",
    description: "Free AI image generator, no signup needed for basics",
    beginnerFriendly: true,
  },
});
const freeSiteId = (data(freeSite) as { id: string }).id;
await api(base, "PUT", "/api/v1/admin/access-requirements", {
  token: T,
  body: { websiteId: freeSiteId, creditCardRequired: false, accountRequired: false },
});
await api(base, "POST", "/api/v1/admin/plans", {
  token: T,
  body: { websiteId: freeSiteId, name: "Free", kind: "free", billingCycle: "none" },
});

test("recommend returns ranked items with reasons", async () => {
  const r = await api(base, "POST", "/api/v1/recommend", {
    body: { goal: "I want to generate images for my blog" },
  });
  assert.equal(r.status, 200);
  const d = data(r) as {
    items: { name: string; score: number; reasons: string[]; verification: { status: string } }[];
    parsedGoal: { capabilitySlugs: string[] };
    totalCandidates: number;
  };
  assert.ok(d.items.length >= 2, "both sites recommended");
  assert.ok(d.items.every((i) => i.reasons.length > 0), "every item has reasons");
  assert.ok(d.items.every((i) => typeof i.score === "number"));
  assert.ok(d.parsedGoal.capabilitySlugs.includes("image-generation"));
  // scores sorted desc
  for (let i = 1; i < d.items.length; i++) {
    assert.ok(d.items[i - 1].score >= d.items[i].score, "sorted by score desc");
  }
});

test("recommend respects the noCreditCard constraint", async () => {
  const r = await api(base, "POST", "/api/v1/recommend", {
    body: { goal: "generate images", constraints: { noCreditCard: true } },
  });
  assert.equal(r.status, 200);
  const d = data(r) as { items: { slug: string; reasons: string[] }[] };
  assert.ok(!d.items.some((i) => i.slug === "cardsite-pro"), "card-required site excluded");
  assert.ok(d.items.some((i) => i.slug === "freedraw"), "free site included");
  const free = d.items.find((i) => i.slug === "freedraw")!;
  assert.ok(
    free.reasons.some((x) => x.toLowerCase().includes("credit card")),
    "reason mentions no credit card",
  );
});

test("unverified items are never labelled verified in recommendations", async () => {
  const r = await api(base, "POST", "/api/v1/recommend", {
    body: { goal: "generate images" },
  });
  const d = data(r) as { items: { slug: string; verification: { status: string } }[] };
  const free = d.items.find((i) => i.slug === "freedraw")!;
  assert.equal(free.verification.status, "unverified");

  // add a verified record -> now it may claim verified
  await query(
    `INSERT INTO verification_records (entity_type, entity_id, claim, status, verified_at)
     VALUES ('website', $1, 'checked', 'verified', now())`,
    [freeSiteId],
  );
  const r2 = await api(base, "POST", "/api/v1/recommend", {
    body: { goal: "generate images" },
  });
  const d2 = data(r2) as { items: { slug: string; verification: { status: string }; reasons: string[] }[] };
  const free2 = d2.items.find((i) => i.slug === "freedraw")!;
  assert.equal(free2.verification.status, "verified");
  assert.ok(free2.reasons.some((x) => x.toLowerCase().includes("verified")));
});

test("AI provider factory defaults to rule-based; LLM provider requires config", async () => {
  const p = createAIProvider();
  assert.equal(p.name, "rule-based");
  assert.ok(p instanceof RuleBasedProvider);

  const parsed = await p.analyzeGoal("make music");
  assert.ok(parsed.capabilitySlugs.includes("audio-generation"));

  const req = { goal: "make music" };
  const recs = await p.generateRecommendations(req);
  assert.ok(Array.isArray(recs.items));

  // No env config in tests -> factory falls back to rule-based even when asked for the LLM.
  const fallback = createAIProvider({ useLlm: true });
  assert.ok(fallback instanceof RuleBasedProvider);

  assert.throws(
    () => new OpenAIProvider({}),
    /AI_LLM_BASE_URL/,
    "OpenAIProvider constructor throws without configuration",
  );
  const unconfigured = new OpenAIProvider({
    baseUrl: "https://llm.example.test/v1",
    apiKey: "sk-test",
    model: "test-model",
  });
  assert.ok(unconfigured instanceof OpenAICompatibleProvider);
});
