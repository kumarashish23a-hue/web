/**
 * Privacy-first product analytics.
 *
 * Fire-and-forget POSTs to /api/v1/analytics/events. Failure-silent by
 * design: analytics must never break UX, so every failure path is swallowed.
 * Only coarse, non-identifying fields are ever sent — never raw query or
 * goal text, PII, or keystrokes. The backend enforces this with a strict
 * meta allowlist; this module mirrors that allowlist in its types.
 */
import { getAccessToken } from './api';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export type AnalyticsEventName =
  | 'search_performed'
  | 'website_viewed'
  | 'model_viewed'
  | 'recommendation_generated'
  | 'compare_used'
  | 'external_website_clicked'
  | 'favorite_added'
  | 'submission_created';

export interface AnalyticsMeta {
  type?: string;
  category?: string;
  categories?: string[];
  resultCount?: number;
  engine?: 'rule-based' | 'llm';
  itemCount?: number;
  kind?: string;
}

export interface TrackOptions {
  entityType?: 'website' | 'model';
  entitySlug?: string;
  entityId?: string;
  meta?: AnalyticsMeta;
}

/**
 * Send one analytics event. Never throws, never awaits — safe to call from
 * any render path or event handler.
 */
export function trackEvent(name: AnalyticsEventName, opts: TrackOptions = {}): void {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    void fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        eventName: name,
        entityType: opts.entityType,
        entitySlug: opts.entitySlug,
        entityId: opts.entityId,
        meta: opts.meta,
      }),
    }).catch(() => {
      /* analytics failures are silent */
    });
  } catch {
    /* analytics must never break UX */
  }
}
