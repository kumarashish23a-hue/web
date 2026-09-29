/**
 * Local API type definitions for the frontend.
 *
 * Mirrors the BUILD CONTRACT (monorepo root CONTRACT.md): SQL is snake_case,
 * API JSON is camelCase. When the `ai-discover-shared` package gains its
 * generated types, these local definitions should be replaced by imports
 * from 'ai-discover-shared'.
 *
 * Backend shapes (verified against the Express implementation):
 *  - List/detail payloads aggregate verification as
 *    `verification: { status, lastChecked } | null`.
 *  - GET /models/:slug includes `availability` (per-website free/limits/card/region).
 *  - GET /compare returns { type, items: [{ id, name, slug }], rows: [{ label, values }] }.
 *  - GET /search returns { websites, models, categories, capabilities }.
 *  - GET /auth/me returns { user, adminRole }.
 *  - GET /categories/:slug returns { category, websites, models }.
 *  - POST /recommend returns { items, parsedGoal, totalCandidates }.
 *  - GET /pricing?website=<slug> returns { website: { id, name, slug }, plans }.
 *  - GET /access?website=<slug> returns { website, requirements, paymentMethods, cancellation, apiAccess, regions }.
 *  - GET /sources?entityType=&entityId= and GET /verification?entityType=&entityId=.
 *  - GET /admin/change-history?entityType=&entityId= (admin only).
 */

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Backend may flag demo datasets here; frontend shows a demo banner. */
  demo?: boolean;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'outdated'
  | 'disputed';

export type MonitoringStatus =
  | 'current'
  | 'due_for_check'
  | 'outdated'
  | 'changed'
  | 'under_review';

export type PlanKind =
  | 'free'
  | 'free_trial'
  | 'freemium'
  | 'paid'
  | 'usage_based'
  | 'subscription'
  | 'api_only';

export type BillingCycle = 'monthly' | 'yearly' | 'one_time' | 'usage' | 'none';

export type AiType =
  | 'chat'
  | 'image'
  | 'video'
  | 'audio'
  | 'music'
  | 'voice'
  | 'stt'
  | 'embedding'
  | 'code'
  | 'agent'
  | 'multimodal'
  | 'other';

export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'verifier';

export type SubmissionKind =
  | 'website'
  | 'model'
  | 'pricing'
  | 'free_access'
  | 'correction';

export type SubmissionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'needs_info';

export type WebsiteModelAccess =
  | 'free'
  | 'free_tier'
  | 'free_trial'
  | 'paid'
  | 'unavailable';

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

/** Aggregated verification info attached to public entities. */
export interface EntityVerification {
  status: VerificationStatus | null;
  lastChecked: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  websiteCount?: number;
  modelCount?: number;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  description?: string | null;
}

export interface Capability {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Website {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  officialUrl?: string | null;
  logoUrl?: string | null;
  isOpenSource: boolean;
  beginnerFriendly: boolean;
  monitoringStatus?: MonitoringStatus | null;
  lastCheckedAt?: string | null;
  isDemo: boolean;
  verification?: EntityVerification | null;
  categories?: Category[];
  /** Free-access summary for cards ("Free plan", "Free trial", "Paid only"). */
  freeAccessSummary?: string | null;
  createdAt?: string;
}

export interface AiModel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  modelType: AiType;
  isOpenSource: boolean;
  license?: string | null;
  contextWindowTokens?: number | null;
  inputModalities?: string[];
  outputModalities?: string[];
  apiAvailable: boolean;
  isDemo: boolean;
  verification?: EntityVerification | null;
  provider?: Provider | null;
  categories?: Category[];
  capabilities?: Capability[];
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------------

export interface PlanLimit {
  id: string;
  limitKind: string;
  limitValue: number | null;
  limitUnit: string | null;
  description: string | null;
}

export interface Plan {
  id: string;
  websiteId: string;
  websiteName?: string;
  websiteSlug?: string;
  name: string;
  kind: PlanKind;
  billingCycle: BillingCycle;
  priceAmount: number | null;
  priceCurrency: string | null;
  pricePer: string | null;
  isCurrent: boolean;
  isDemo: boolean;
  limits?: PlanLimit[];
  verification?: EntityVerification | null;
}

export interface AccessRequirements {
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

export interface PaymentMethod {
  code: string;
  label: string;
  notes?: string | null;
}

export interface CancellationPolicy {
  canCancel: boolean;
  method: string | null;
  timing: string | null;
  autoRenewal: boolean;
  accessAfterCancel: string | null;
  refundInfo: string | null;
  sourceUrl: string | null;
}

export interface ApiAccessInfo {
  hasApi: boolean;
  freeTier: boolean;
  pricingText: string | null;
  rateLimitsText: string | null;
  docsUrl: string | null;
}

export interface RegionalAvailability {
  countryCode: string;
  available: boolean;
  notes: string | null;
}

export interface WebsiteModelEntry {
  id: string;
  model: AiModel;
  accessStatus: WebsiteModelAccess;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface SourceRecord {
  id: string;
  sourceType: string;
  url: string;
  pageTitle: string | null;
  retrievedAt: string | null;
  notes: string | null;
}

export interface VerificationRecordItem {
  id: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  claim: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  notes: string | null;
  source?: SourceRecord | null;
}

export interface ChangeItem {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

// ---------------------------------------------------------------------------
// Search / compare / recommend
// ---------------------------------------------------------------------------

export interface SearchResults {
  websites: Website[];
  models: AiModel[];
}

export interface SearchFilters {
  q: string;
  price: 'any' | 'free' | 'paid';
  access: 'any' | 'free' | 'free_tier' | 'free_trial' | 'paid';
  noCard: boolean;
  noPayment: boolean;
  noLogin: boolean;
  category: string; // slug or ''
  region: string; // country code or ''
}

export interface CompareItem {
  id: string;
  name: string;
  slug: string;
}

export interface CompareRow {
  label: string;
  values: (string | string[] | null)[];
}

export interface CompareResult {
  type: 'website' | 'model';
  items: CompareItem[];
  rows: CompareRow[];
}

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

export interface RecommendItem {
  kind: 'website' | 'model';
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  score?: number;
  reasons: string[];
  verification: { status: VerificationStatus | null; lastChecked: string | null };
  isDemo?: boolean;
}

export interface RecommendResponse {
  items: RecommendItem[];
  parsedGoal: {
    keywords: string[];
    capabilitySlugs: string[];
    categorySlugs: string[];
    tasks: string[];
    aiTypes: string[];
  };
  totalCandidates: number;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string | null;
}

export interface UserPreferences {
  preferFree: boolean;
  noCreditCard: boolean;
  noPayment: boolean;
  beginnerFriendly: boolean;
  apiRequired: boolean;
  regionCode: string | null;
}

export interface FavoriteItem {
  id: string;
  kind: 'website' | 'model' | 'stack';
  website?: Website | null;
  model?: AiModel | null;
  stack?: SavedStack | null;
  createdAt: string;
}

export interface SavedStack {
  id: string;
  title: string;
  goalText: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface StackItem {
  id: string;
  position: number;
  requirementLabel: string;
  website?: Website | null;
  model?: AiModel | null;
  reason: string | null;
  freeStatus: string | null;
  requirementsSummary: string | null;
  limitsSummary: string | null;
  confidence: string | null;
  verificationStatus: VerificationStatus | null;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface DashboardStats {
  websites?: number;
  models?: number;
  categories?: number;
  plans?: number;
  providers?: number;
  pendingSubmissions?: number;
  verificationQueue?: number;
  outdatedWebsites?: number;
  users?: number;
  sources?: number;
  [key: string]: number | undefined;
}

export interface RecomputeMonitoringResult {
  dueDays: number;
  outdatedDays: number;
  markedDueForCheck: number;
  markedOutdated: number;
}

export interface AdminUserRow {
  id: string; // admin_users.id
  userId: string;
  email: string;
  displayName?: string | null;
  role: AdminRole;
  createdAt: string;
}

export interface PlatformUserRow {
  id: string;
  email: string;
  displayName?: string | null;
  emailVerified: boolean;
  adminRole?: AdminRole | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  adminEmail?: string | null;
  createdAt: string;
}

export interface ModelAvailability {
  website: Pick<Website, 'id' | 'name' | 'slug' | 'logoUrl'>;
  accessStatus: WebsiteModelAccess;
  notes: string | null;
  limitsSummary?: string | null;
  cardRequired?: boolean | null;
  regionNotes?: string | null;
}

export interface ModelDetail extends AiModel {
  availability: ModelAvailability[];
  sources?: SourceRecord[];
  verificationTimeline?: VerificationRecordItem[];
}
