/**
 * ai-discover-shared — pure-TS types + zod request schemas shared by
 * frontend and backend. API JSON is always camelCase; the backend maps
 * snake_case DB columns to these shapes at the API boundary.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Enums (mirror the Postgres enum types in the migrations)            */
/* ------------------------------------------------------------------ */

export const VERIFICATION_STATUSES = [
  "verified",
  "partially_verified",
  "unverified",
  "outdated",
  "disputed",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MONITORING_STATUSES = [
  "current",
  "due_for_check",
  "outdated",
  "changed",
  "under_review",
] as const;
export type MonitoringStatus = (typeof MONITORING_STATUSES)[number];

export const ADMIN_ROLES = ["super_admin", "admin", "editor", "verifier"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PLAN_KINDS = [
  "free",
  "free_trial",
  "freemium",
  "paid",
  "usage_based",
  "subscription",
  "api_only",
] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const BILLING_CYCLES = ["monthly", "yearly", "one_time", "usage", "none"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBMISSION_KINDS = ["website", "model", "pricing", "free_access", "correction"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

export const SUBMISSION_STATUSES = ["pending_review", "approved", "rejected", "needs_info"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const FAVORITE_KINDS = ["website", "model", "stack"] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export const SOURCE_TYPES = [
  "official_pricing",
  "official_model_page",
  "official_docs",
  "official_terms",
  "official_billing",
  "official_cancellation",
  "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PAYMENT_METHOD_CODES = [
  "credit_card",
  "debit_card",
  "upi",
  "paypal",
  "bank_transfer",
  "apple_pay",
  "google_pay",
  "other",
] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export const AI_TYPES = [
  "chat",
  "image",
  "video",
  "audio",
  "music",
  "voice",
  "stt",
  "embedding",
  "code",
  "agent",
  "multimodal",
  "other",
] as const;
export type AiType = (typeof AI_TYPES)[number];

export const ENTITY_TYPES = [
  "website",
  "model",
  "plan",
  "plan_limit",
  "access_requirement",
  "cancellation_policy",
  "api_access",
  "regional_availability",
  "website_model",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/* ------------------------------------------------------------------ */
/* API envelope                                                        */
/* ------------------------------------------------------------------ */

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/* Catalog types                                                       */
/* ------------------------------------------------------------------ */

export interface Provider {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Capability {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
}

export interface VerificationSummary {
  status: VerificationStatus;
  lastChecked: string | null;
  claim: string | null;
}

export interface Website {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  officialUrl: string | null;
  logoUrl: string | null;
  isOpenSource: boolean;
  beginnerFriendly: boolean;
  monitoringStatus: MonitoringStatus | null;
  lastCheckedAt: string | null;
  categories: Category[];
  models: ModelLite[];
  verification: VerificationSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelLite {
  id: string;
  name: string;
  slug: string;
  modelType: AiType;
  apiAvailable: boolean;
}

export interface Model {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modelType: AiType;
  isOpenSource: boolean;
  license: string | null;
  contextWindowTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  apiAvailable: boolean;
  provider: Provider | null;
  categories: Category[];
  capabilities: Capability[];
  websites: WebsiteLite[];
  /** Per-website access detail ("where can I use this model"). Opt-in via serializer. */
  availability?: ModelAvailability[];
  verification: VerificationSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of "where can I use this model" for a model detail page. */
export interface ModelAvailability {
  website: { id: string; name: string; slug: string; logoUrl: string | null };
  accessStatus: string | null;
  notes: string | null;
  limitsSummary: string | null;
  cardRequired: boolean | null;
  regionNotes: string | null;
}

export interface WebsiteLite {
  id: string;
  name: string;
  slug: string;
  officialUrl: string | null;
}

export interface Plan {
  id: string;
  websiteId: string;
  name: string;
  kind: PlanKind;
  billingCycle: BillingCycle;
  priceAmount: string | null;
  priceCurrency: string | null;
  pricePer: string | null;
  isCurrent: boolean;
  limits: PlanLimit[];
}

export interface PlanLimit {
  id: string;
  planId: string;
  limitKind: string;
  limitValue: string | null;
  limitUnit: string | null;
  description: string | null;
}

export interface PaymentMethod {
  id: string;
  code: PaymentMethodCode;
  label: string;
}

export interface AccessRequirement {
  id: string;
  websiteId: string;
  accountRequired: boolean;
  emailVerification: boolean;
  phoneVerification: boolean;
  creditCardRequired: boolean;
  debitCardRequired: boolean;
  paymentMethodRequired: boolean;
  paymentRequired: boolean;
  minimumAge: number | null;
  notes: string | null;
}

export interface CancellationPolicy {
  id: string;
  websiteId: string;
  canCancel: boolean | null;
  method: string | null;
  timing: string | null;
  autoRenewal: boolean | null;
  accessAfterCancel: string | null;
  refundInfo: string | null;
  sourceUrl: string | null;
}

export interface ApiAccessInfo {
  id: string;
  websiteId: string;
  hasApi: boolean | null;
  freeTier: boolean | null;
  pricingText: string | null;
  rateLimitsText: string | null;
  docsUrl: string | null;
}

export interface RegionalAvailability {
  id: string;
  websiteId: string;
  countryCode: string;
  available: boolean;
  notes: string | null;
}

export interface Source {
  id: string;
  sourceType: SourceType;
  url: string;
  pageTitle: string | null;
  retrievedAt: string | null;
  notes: string | null;
}

export interface VerificationRecord {
  id: string;
  entityType: EntityType;
  entityId: string;
  claim: string;
  status: VerificationStatus;
  source: Source | null;
  verifiedAt: string | null;
  notes: string | null;
}

/* ------------------------------------------------------------------ */
/* User types                                                          */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  preferFree: boolean;
  noCreditCard: boolean;
  noPayment: boolean;
  beginnerFriendly: boolean;
  apiRequired: boolean;
  regionCode: string | null;
}

export interface Favorite {
  id: string;
  userId: string;
  kind: FavoriteKind;
  websiteId: string | null;
  modelId: string | null;
  stackId: string | null;
  createdAt: string;
}

export interface StackItem {
  id: string;
  stackId: string;
  position: number;
  requirementLabel: string | null;
  websiteId: string | null;
  modelId: string | null;
  reason: string | null;
  freeStatus: string | null;
  requirementsSummary: string | null;
  limitsSummary: string | null;
  confidence: string | null;
  verificationStatus: VerificationStatus | null;
}

export interface SavedStack {
  id: string;
  userId: string;
  title: string;
  goalText: string | null;
  items: StackItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string | null;
  kind: SubmissionKind;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Admin types                                                         */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  email: string | null;
  createdByAdmin: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface MonitoringCheck {
  id: string;
  websiteId: string;
  checkedAt: string;
  status: MonitoringStatus;
  findings: string | null;
}

export interface DiscoverySource {
  id: string;
  name: string;
  kind: string;
  config: Record<string, unknown> | null;
  enabled: boolean;
  createdAt: string;
}

export interface DiscoveryCandidate {
  id: string;
  discoverySourceId: string | null;
  name: string;
  url: string | null;
  raw: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

export interface ChangeHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

/* ------------------------------------------------------------------ */
/* Recommendation engine types                                         */
/* ------------------------------------------------------------------ */

export interface RecommendConstraints {
  preferFree?: boolean;
  noCreditCard?: boolean;
  noPayment?: boolean;
  noLogin?: boolean;
  beginnerFriendly?: boolean;
  apiRequired?: boolean;
  regionCode?: string;
  categories?: string[];
}

export interface RecommendRequest {
  goal: string;
  constraints?: RecommendConstraints;
  /** Opt-in per request: use the LLM goal parser/ranker when configured server-side. */
  useLlm?: boolean;
}

export interface ParsedGoal {
  keywords: string[];
  capabilitySlugs: string[];
  categorySlugs: string[];
  tasks: string[];
  aiTypes: AiType[];
  /** Constraints the LLM inferred from the goal text (present when an LLM parsed the goal). */
  inferredConstraints?: RecommendConstraints;
}

export interface RecommendationItem {
  kind: "website" | "model";
  id: string;
  name: string;
  slug: string;
  score: number;
  reasons: string[];
  verification: { status: VerificationStatus; lastChecked: string | null };
}

export interface RecommendResponse {
  items: RecommendationItem[];
  parsedGoal: ParsedGoal;
  totalCandidates: number;
  /** Which engine produced this response. "llm" means the LLM re-ranked rule-based candidates. */
  engine?: "rule-based" | "llm";
  /** Model identifier used, when engine is "llm". */
  llmModel?: string;
}

/* ------------------------------------------------------------------ */
/* Zod request schemas (used by backend validation middleware and      */
/* optionally by frontend forms)                                       */
/* ------------------------------------------------------------------ */

export const emailSchema = z.string().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16).max(256),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(256),
  password: passwordSchema,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  category: z.string().max(120).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["all", "website", "model", "category", "capability"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const compareSchema = z.object({
  type: z.enum(["website", "model"]),
  ids: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(2).max(4)),
});

export const recommendConstraintsSchema = z.object({
  preferFree: z.boolean().optional(),
  noCreditCard: z.boolean().optional(),
  noPayment: z.boolean().optional(),
  noLogin: z.boolean().optional(),
  beginnerFriendly: z.boolean().optional(),
  apiRequired: z.boolean().optional(),
  regionCode: z.string().length(2).optional(),
  categories: z.array(z.string().max(120)).max(20).optional(),
});

export const recommendSchema = z.object({
  goal: z.string().min(3).max(2000),
  constraints: recommendConstraintsSchema.optional(),
  useLlm: z.boolean().optional(),
});

export const favoriteCreateSchema = z.object({
  kind: z.enum(FAVORITE_KINDS),
  websiteId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  stackId: z.string().uuid().optional(),
});

export const stackCreateSchema = z.object({
  title: z.string().min(1).max(200),
  goalText: z.string().max(2000).optional(),
  /** Optional items saved together with the stack (e.g. "save recommendation as stack"). */
  items: z
    .array(
      z.object({
        requirementLabel: z.string().max(300).optional(),
        websiteId: z.string().uuid().nullable().optional(),
        modelId: z.string().uuid().nullable().optional(),
        reason: z.string().max(2000).optional(),
        freeStatus: z.string().max(120).optional(),
        requirementsSummary: z.string().max(2000).optional(),
        limitsSummary: z.string().max(2000).optional(),
        confidence: z.string().max(120).optional(),
        verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
      }),
    )
    .max(50)
    .optional(),
});

export const stackItemCreateSchema = z.object({
  position: z.number().int().min(0).max(1000).optional(),
  requirementLabel: z.string().max(300).optional(),
  websiteId: z.string().uuid().nullable().optional(),
  modelId: z.string().uuid().nullable().optional(),
  reason: z.string().max(2000).optional(),
  freeStatus: z.string().max(120).optional(),
  requirementsSummary: z.string().max(2000).optional(),
  limitsSummary: z.string().max(2000).optional(),
  confidence: z.string().max(120).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).nullable().optional(),
});

export const preferencesSchema = z.object({
  preferFree: z.boolean().optional(),
  noCreditCard: z.boolean().optional(),
  noPayment: z.boolean().optional(),
  beginnerFriendly: z.boolean().optional(),
  apiRequired: z.boolean().optional(),
  regionCode: z.string().length(2).nullable().optional(),
});

export const submissionCreateSchema = z.object({
  kind: z.enum(SUBMISSION_KINDS),
  payload: z.record(z.string(), z.unknown()),
  sourceUrl: z.string().url().max(2000).nullable().optional(),
});

export const slugParamSchema = z.object({ slug: z.string().min(1).max(200) });
export const uuidParamSchema = z.object({ id: z.string().uuid() });

/* ------------------------------ admin ----------------------------- */

export const adminRoleSchema = z.enum(ADMIN_ROLES);

export const providerCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  websiteUrl: z.string().url().max(2000).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
});
export const providerUpdateSchema = providerCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).nullable().optional(),
  icon: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const capabilityCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).nullable().optional(),
});
export const capabilityUpdateSchema = capabilityCreateSchema.partial();

export const websiteCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(300).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  officialUrl: z.string().url().max(2000).nullable().optional(),
  logoUrl: z.string().url().max(2000).nullable().optional(),
  isOpenSource: z.boolean().optional(),
  beginnerFriendly: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
  modelIds: z.array(z.string().uuid()).max(100).optional(),
});
export const websiteUpdateSchema = websiteCreateSchema.partial();

export const modelCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(10000).nullable().optional(),
  providerId: z.string().uuid().nullable().optional(),
  modelType: z.enum(AI_TYPES).optional(),
  isOpenSource: z.boolean().optional(),
  license: z.string().max(300).nullable().optional(),
  contextWindowTokens: z.number().int().positive().nullable().optional(),
  inputModalities: z.array(z.string().max(60)).max(20).optional(),
  outputModalities: z.array(z.string().max(60)).max(20).optional(),
  apiAvailable: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
  capabilityIds: z.array(z.string().uuid()).max(100).optional(),
});
export const modelUpdateSchema = modelCreateSchema.partial();

export const planCreateSchema = z.object({
  websiteId: z.string().uuid(),
  name: z.string().min(1).max(200),
  kind: z.enum(PLAN_KINDS),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  priceAmount: z.number().nonnegative().nullable().optional(),
  priceCurrency: z.string().length(3).nullable().optional(),
  pricePer: z.string().max(200).nullable().optional(),
  isCurrent: z.boolean().optional(),
});
export const planUpdateSchema = planCreateSchema.partial().omit({ websiteId: true });

export const planLimitCreateSchema = z.object({
  planId: z.string().uuid(),
  limitKind: z.string().min(1).max(120),
  limitValue: z.number().nonnegative().nullable().optional(),
  limitUnit: z.string().max(60).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const accessRequirementSchema = z.object({
  accountRequired: z.boolean().optional(),
  emailVerification: z.boolean().optional(),
  phoneVerification: z.boolean().optional(),
  creditCardRequired: z.boolean().optional(),
  debitCardRequired: z.boolean().optional(),
  paymentMethodRequired: z.boolean().optional(),
  paymentRequired: z.boolean().optional(),
  minimumAge: z.number().int().min(0).max(120).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const cancellationPolicySchema = z.object({
  canCancel: z.boolean().nullable().optional(),
  method: z.string().max(2000).nullable().optional(),
  timing: z.string().max(2000).nullable().optional(),
  autoRenewal: z.boolean().nullable().optional(),
  accessAfterCancel: z.string().max(2000).nullable().optional(),
  refundInfo: z.string().max(2000).nullable().optional(),
  sourceUrl: z.string().url().max(2000).nullable().optional(),
});

export const apiAccessSchema = z.object({
  hasApi: z.boolean().nullable().optional(),
  freeTier: z.boolean().nullable().optional(),
  pricingText: z.string().max(2000).nullable().optional(),
  rateLimitsText: z.string().max(2000).nullable().optional(),
  docsUrl: z.string().url().max(2000).nullable().optional(),
});

export const regionalAvailabilitySchema = z.object({
  countryCode: z.string().length(2),
  available: z.boolean(),
  notes: z.string().max(2000).nullable().optional(),
});

export const sourceCreateSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  url: z.string().url().max(2000),
  pageTitle: z.string().max(500).nullable().optional(),
  retrievedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const verificationRecordCreateSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid(),
  claim: z.string().min(1).max(2000),
  status: z.enum(VERIFICATION_STATUSES),
  sourceId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const verificationQueueActionSchema = z.object({
  action: z.enum(["approve", "reject", "request_review", "mark_outdated"]),
  notes: z.string().max(5000).nullable().optional(),
  sourceId: z.string().uuid().nullable().optional(),
});

export const monitoringCheckCreateSchema = z.object({
  websiteId: z.string().uuid(),
  status: z.enum(MONITORING_STATUSES),
  findings: z.string().max(10000).nullable().optional(),
});

export const discoverySourceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  enabled: z.boolean().optional(),
});
export const discoverySourceUpdateSchema = discoverySourceCreateSchema.partial();

export const discoveryCandidateUpdateSchema = z.object({
  status: z.string().min(1).max(60),
});

export const submissionReviewSchema = z.object({
  action: z.enum(["approve", "reject", "needs_info"]),
  reviewNotes: z.string().max(5000).nullable().optional(),
});

export const adminUserCreateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ADMIN_ROLES),
});
export const adminUserUpdateSchema = z.object({
  role: z.enum(ADMIN_ROLES),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecommendInput = z.infer<typeof recommendSchema>;

/* ------------------------------------------------------------------ */
/* Analytics events                                                    */
/* ------------------------------------------------------------------ */

/**
 * Accepted analytics event names. PRIVACY: events carry only coarse,
 * non-identifying fields — never the user's raw query/goal text, PII,
 * or keystrokes.
 */
export const ANALYTICS_EVENTS = [
  "search_performed",
  "website_viewed",
  "model_viewed",
  "recommendation_generated",
  "compare_used",
  "external_website_clicked",
  "favorite_added",
  "submission_created",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * Coarse-only meta payload. `.strict()` rejects any key not listed here,
 * so new free-text fields (goal text, queries, emails, names, …) can never
 * be stored without an explicit, reviewed schema change.
 */
export const analyticsMetaSchema = z
  .object({
    /** e.g. search/compare: what was searched/compared ("website", "model", "all") */
    type: z.string().max(40).optional(),
    /** Category slug filter active at the time (search only) */
    category: z.string().max(120).optional(),
    /** Category slugs chosen as recommendation constraints (coarse, user-chosen) */
    categories: z.array(z.string().max(120)).max(10).optional(),
    /** Number of results returned */
    resultCount: z.number().int().min(0).max(100_000).optional(),
    /** Which engine produced a recommendation ("rule-based" | "llm") */
    engine: z.enum(["rule-based", "llm"]).optional(),
    /** Number of items compared */
    itemCount: z.number().int().min(0).max(100).optional(),
    /** favorite kind / submission kind ("website" | "model" | "stack" | …) */
    kind: z.string().max(40).optional(),
  })
  .strict();

export const analyticsEventSchema = z.object({
  eventName: z.enum(ANALYTICS_EVENTS),
  entityType: z.enum(["website", "model"]).optional(),
  entitySlug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  entityId: z.string().uuid().optional(),
  meta: analyticsMetaSchema.optional(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
