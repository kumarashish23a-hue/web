/**
 * Typed fetch client for /api/v1.
 *
 * Envelope: success `{ data, meta? }`, error `{ error: { code, message } }`.
 * Auth: Bearer access token (kept in memory, localStorage as fallback so a
 * page reload keeps the session), refresh via httpOnly cookie.
 *
 * ASSUMPTION: POST /api/v1/auth/refresh exchanges the httpOnly refresh cookie
 * for a new access token and responds `{ data: { accessToken } }`. The CONTRACT
 * pins the cookie mechanism but not the endpoint name; if the backend names it
 * differently, update REFRESH_PATH. A 404/failed refresh is treated as logged out.
 */
import type {
  AccessRequirements,
  AdminRole,
  AdminUserRow,
  AiModel,
  ApiAccessInfo,
  ApiErrorBody,
  ApiSuccess,
  AuditLog,
  AuthUser,
  CancellationPolicy,
  Category,
  ChangeItem,
  CompareResult,
  DashboardStats,
  FavoriteItem,
  ModelDetail,
  PageMeta,
  PaymentMethod,
  Plan,
  PlatformUserRow,
  RecommendConstraints,
  RecommendItem,
  RecommendResponse,
  RecomputeMonitoringResult,
  RegionalAvailability,
  SavedStack,
  SearchHistoryItem,
  SearchResults,
  SourceRecord,
  StackItem,
  Submission,
  SubmissionKind,
  SubmissionStatus,
  UserPreferences,
  VerificationRecordItem,
  Website,
  WebsiteModelEntry,
} from '../types';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';
const REFRESH_PATH = '/auth/refresh';

const TOKEN_KEY = 'ai_discover_access_token';

let accessToken: string | null = null;
try {
  accessToken = window.localStorage.getItem(TOKEN_KEY);
} catch {
  accessToken = null;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — memory token still works for this session */
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<ApiSuccess<T>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the API server.', 0);
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    // Try a silent refresh via the httpOnly cookie, then retry once.
    try {
      const r = await fetch(`${API_BASE}${REFRESH_PATH}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (r.ok) {
        const body = (await r.json().catch(() => null)) as {
          data?: { accessToken?: string };
        } | null;
        const next = body?.data?.accessToken;
        if (next) {
          setAccessToken(next);
          return request<T>(path, init, true);
        }
      }
    } catch {
      /* fall through to logout below */
    }
    setAccessToken(null);
  }

  const body = (await res.json().catch(() => null)) as
    | (ApiSuccess<T> & Partial<ApiErrorBody>)
    | null;

  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? 'REQUEST_FAILED',
      err?.message ?? `Request failed (HTTP ${res.status}).`,
      res.status,
    );
  }
  return { data: (body as ApiSuccess<T>).data, meta: (body as ApiSuccess<T>).meta };
}

const get = <T>(path: string, params?: Record<string, unknown>) =>
  request<T>(`${path}${toQuery(params)}`);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  adminRole?: AdminRole | null;
}

export const authApi = {
  signup: (email: string, password: string, displayName?: string) =>
    post<AuthPayload>('/auth/signup', { email, password, displayName }),
  login: (email: string, password: string) =>
    post<AuthPayload>('/auth/login', { email, password }),
  logout: () => post<void>('/auth/logout'),
  me: () => get<{ user: AuthUser; adminRole: AdminRole | null }>('/auth/me'),
  requestPasswordReset: (email: string) =>
    post<void>('/auth/request-password-reset', { email }),
  resetPassword: (token: string, password: string) =>
    post<void>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) =>
    post<{ user: AuthUser }>('/auth/verify-email', { token }),
};

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------

export interface ListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  [key: string]: string | number | boolean | undefined;
}

export const websitesApi = {
  list: (params?: ListParams) => get<Website[]>('/websites', params),
  get: (slug: string) => get<WebsiteDetail>('/websites/' + slug),
};

export interface WebsiteDetail extends Website {
  models: WebsiteModelEntry[];
}

export const modelsApi = {
  list: (params?: ListParams) => get<AiModel[]>('/models', params),
  get: (slug: string) => get<ModelDetail>('/models/' + slug),
};

export const categoriesApi = {
  list: () => get<Category[]>('/categories'),
  get: (slug: string) =>
    get<{ category: Category; websites: Website[]; models: AiModel[] }>(
      '/categories/' + slug,
    ),
};

export const pricingApi = {
  /** Returns `{ data: { website: { id, name, slug }, plans: Plan[] } }`. */
  byWebsite: (website: string) =>
    get<{ website: { id: string; name: string; slug: string }; plans: Plan[] }>(
      '/pricing',
      { website },
    ),
};

export interface WebsiteAccessInfo {
  website: { id: string; name: string; slug: string };
  requirements: AccessRequirements | null;
  paymentMethods: PaymentMethod[];
  cancellation: CancellationPolicy | null;
  apiAccess: ApiAccessInfo | null;
  regions: RegionalAvailability[];
}

export const accessApi = {
  /** Returns the access bundle in one object (see WebsiteAccessInfo). */
  byWebsite: (website: string) => get<WebsiteAccessInfo>('/access', { website }),
};

export const sourcesApi = {
  /** GET /sources?entityType=website&entityId=<uuid> */
  list: (entityType: string, entityId: string) =>
    get<SourceRecord[]>('/sources', { entityType, entityId }),
};

export const verificationApi = {
  /** GET /verification?entityType=website&entityId=<uuid> */
  list: (entityType: string, entityId: string) =>
    get<VerificationRecordItem[]>('/verification', { entityType, entityId }),
  /** Admin-only change history: GET /admin/change-history?entityType=&entityId= */
  changes: (entityType: string, entityId: string) =>
    get<ChangeItem[]>('/admin/change-history', { entityType, entityId }),
};

// ---------------------------------------------------------------------------
// Search / compare / recommend
// ---------------------------------------------------------------------------

export const searchApi = {
  /** ASSUMPTION: returns `{ data: { websites, models } }` plus pagination meta. */
  query: (params: Record<string, unknown>) =>
    get<SearchResults>('/search', params),
};

export const compareApi = {
  /** Returns `{ data: { type, items: [{ id, name, slug }], rows: [{ label, values }] } }`
   *  — the table is generated from API data, so the frontend never hard-codes attributes. */
  get: (type: 'website' | 'model', ids: string[]) =>
    get<CompareResult>('/compare', { type, ids: ids.join(',') }),
};

export const recommendApi = {
  /** Returns `{ data: { items, parsedGoal, totalCandidates } }` — ranked items with reasons[]. */
  get: (goal: string, constraints?: RecommendConstraints) =>
    post<RecommendResponse>('/recommend', { goal, constraints }),
};

// ---------------------------------------------------------------------------
// User (auth required)
// ---------------------------------------------------------------------------

export const favoritesApi = {
  list: () => get<FavoriteItem[]>('/favorites'),
  add: (kind: 'website' | 'model' | 'stack', id: string) =>
    post<FavoriteItem>('/favorites', { kind, [`${kind}Id`]: id }),
  remove: (favoriteId: string) => del<void>(`/favorites/${favoriteId}`),
};

export const stacksApi = {
  list: () => get<SavedStack[]>('/stacks'),
  get: (id: string) =>
    get<{ stack: SavedStack; items: StackItem[] }>(`/stacks/${id}`),
  create: (title: string, goalText: string) =>
    post<SavedStack>('/stacks', { title, goalText }),
  remove: (id: string) => del<void>(`/stacks/${id}`),
  /** Save a recommendation result as a named stack. */
  saveRecommendation: (title: string, goalText: string, items: RecommendItem[]) =>
    post<SavedStack>('/stacks', { title, goalText, items }),
};

export const profileApi = {
  getPreferences: () => get<UserPreferences>('/preferences'),
  updatePreferences: (prefs: Partial<UserPreferences>) =>
    put<UserPreferences>('/preferences', prefs),
  getSearchHistory: () => get<SearchHistoryItem[]>('/search-history'),
};

export const submissionsApi = {
  create: (kind: SubmissionKind, payload: Record<string, unknown>, sourceUrl?: string) =>
    post<Submission>('/submissions', { kind, payload, sourceUrl }),
  mine: () => get<Submission[]>('/submissions'),
};

// ---------------------------------------------------------------------------
// Admin (role-gated server-side; UI only mirrors roles, never enforces)
// ---------------------------------------------------------------------------

function adminPath(p: string): string {
  return `/admin${p}`;
}

export const adminApi = {
  dashboard: () => get<DashboardStats>(adminPath('/dashboard')),

  // --- generic CRUD ---
  list: <T>(resource: string, params?: Record<string, unknown>) =>
    get<T[]>(adminPath(`/${resource}`), params),
  get: <T>(resource: string, id: string) =>
    get<T>(adminPath(`/${resource}/${id}`)),
  create: <T>(resource: string, body: unknown) =>
    post<T>(adminPath(`/${resource}`), body),
  update: <T>(resource: string, id: string, body: unknown) =>
    patch<T>(adminPath(`/${resource}/${id}`), body),
  remove: (resource: string, id: string) =>
    del<void>(adminPath(`/${resource}/${id}`)),
  /** Archive (soft delete) — backend sets deleted_at. */
  archive: (resource: string, id: string) =>
    patch<void>(adminPath(`/${resource}/${id}`), { deleted_at: new Date().toISOString() }),

  // --- verification queue ---
  verificationQueue: (status?: string) =>
    get<VerificationRecordItem[]>(adminPath('/verification'), { status }),
  verificationAction: (id: string, action: 'approve' | 'reject' | 'request_info' | 'mark_outdated', notes?: string) =>
    patch<VerificationRecordItem>(adminPath(`/verification/${id}`), { action, notes }),

  // --- monitoring (date-based staleness only — no fetching/scraping) ---
  recomputeMonitoring: () =>
    post<RecomputeMonitoringResult>(adminPath('/monitoring/recompute'), {}),

  // --- submissions review ---
  submissions: (status?: string) =>
    get<Submission[]>(adminPath('/submissions'), { status }),
  reviewSubmission: (id: string, status: SubmissionStatus, reviewNotes?: string) =>
    patch<Submission>(adminPath(`/submissions/${id}`), { status, reviewNotes }),

  // --- users & roles ---
  users: (params?: Record<string, unknown>) =>
    get<PlatformUserRow[]>(adminPath('/users'), params),
  setUserRole: (userId: string, role: AdminRole | null) =>
    patch<AdminUserRow>(adminPath(`/users/${userId}/role`), { role }),

  // --- audit ---
  auditLogs: (params?: Record<string, unknown>) =>
    get<AuditLog[]>(adminPath('/audit'), params),

  // --- plans & limits ---
  plansByWebsite: (websiteId: string) =>
    get<Plan[]>(adminPath('/plans'), { websiteId }),
};

export type { PageMeta };
