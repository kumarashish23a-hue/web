import type {
  AiModel,
  Category,
  Plan,
  VerificationRecordItem,
  Website,
} from '../types';

/**
 * SEO metadata helpers.
 *
 * HONESTY CONTRACT (see task §38): the words "free", "free tier", "no card",
 * etc. must never appear in page metadata unless the page's data includes a
 * verification_records-backed free-tier claim. The gates below encode that:
 *
 * - `hasVerifiedFreePlan` — true only when a free-kind plan (free /
 *   free_trial / freemium) carries a verification summary of 'verified' or
 *   'partially_verified' (i.e. a real verification_records row exists for the
 *   plan). Unverified / outdated / disputed / missing verification never pass.
 * - `hasVerifiedFreeClaim` — true only when the model's verification timeline
 *   contains a verified/partially-verified record whose claim text mentions
 *   free access. Negated claims ("no free tier", "not free") never pass.
 *
 * When in doubt the meta builders fall back to neutral wording like
 * "pricing & access details" / "availability & access info".
 */

/** Public site name used in <title> suffixes and OG tags. */
export const SITE_NAME = 'AI Discovery';

/** Default document title (the " | AI Discovery" template suffix is applied by DefaultSeo). */
export const DEFAULT_TITLE = 'Find the right AI for your goal';

export const DEFAULT_DESCRIPTION =
  'AI Discovery helps you find the right AI website or model for your goal — compare plans, pricing, access requirements, and verification status, checked against official sources.';

/** verification_records statuses that count as record-backed. */
const BACKED_STATUSES = new Set(['verified', 'partially_verified']);

/** Plan kinds that represent free access (matches the "Free access" section on website pages). */
const FREE_PLAN_KINDS = new Set(['free', 'free_trial', 'freemium']);

function isBacked(status: string | null | undefined): boolean {
  return status != null && BACKED_STATUSES.has(status);
}

/**
 * Website pages: may the metadata claim free-tier access? Only when at least
 * one free-kind plan has a verification_records-backed status.
 */
export function hasVerifiedFreePlan(plans: Plan[]): boolean {
  return plans.some(
    (p) => FREE_PLAN_KINDS.has(p.kind) && isBacked(p.verification?.status),
  );
}

const FREE_MENTION = /\bfree([-\s]?(tier|trial|plan|access|version|account))?\b/i;
const NEGATED_FREE = /\b(no|not|without|never|lacks?|n't)\b[^.!?]{0,80}\bfree\b/i;

/**
 * Model pages: may the metadata claim free-tier access? Only when the model's
 * verification timeline has a verified/partially-verified record whose claim
 * mentions free access (negated claims like "no free tier" never pass).
 */
export function hasVerifiedFreeClaim(timeline: VerificationRecordItem[]): boolean {
  return timeline.some(
    (t) =>
      isBacked(t.status) &&
      FREE_MENTION.test(t.claim) &&
      !NEGATED_FREE.test(t.claim),
  );
}

/** Collapse whitespace and clamp to a meta-description-friendly length. */
export function truncate(text: string, max = 155): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export interface PageMeta {
  title: string;
  description: string;
  /** When true the page should not be indexed (demo/fictional or private pages). */
  noindex?: boolean;
}

/** Metadata for websites/:slug. `plans` is the pricing list loaded for the page. */
export function websiteMeta(website: Website, plans: Plan[]): PageMeta {
  if (website.isDemo) {
    return {
      title: `${website.name} — demo listing`,
      description: `Demo listing: "${website.name}" is fictional sample data for evaluation. Pricing and limits shown are not real.`,
      noindex: true,
    };
  }
  const freeOk = hasVerifiedFreePlan(plans);
  const lead =
    website.tagline ?? website.description ?? `${website.name} is an AI website.`;
  const title = freeOk
    ? `${website.name} — free tier, pricing & access details`
    : `${website.name} — pricing, plans & access details`;
  const description = freeOk
    ? `${website.name}: ${lead} Free-tier, plan and pricing details recorded from official sources, plus access requirements and API info.`
    : `${website.name}: ${lead} Pricing plans, access requirements, API details and regional availability.`;
  return { title, description: truncate(description) };
}

/** Metadata for models/:slug. `timeline` is the model's verification records. */
export function modelMeta(
  model: AiModel,
  timeline: VerificationRecordItem[],
): PageMeta {
  const provider = model.provider?.name ?? 'an AI provider';
  if (model.isDemo) {
    return {
      title: `${model.name} — demo listing`,
      description: `Demo listing: "${model.name}" is a fictional AI model for evaluation. Details shown are not real.`,
      noindex: true,
    };
  }
  const freeOk = hasVerifiedFreeClaim(timeline);
  const title = freeOk
    ? `Where to use ${model.name} — free tier availability & access info`
    : `Where to use ${model.name} — availability & access info`;
  const description = freeOk
    ? `${model.name} by ${provider}. Where you can use it, with free-tier availability recorded from official sources, plus access requirements, limits and regional notes.`
    : `${model.name} by ${provider}. Where you can use it: platforms, access requirements, limits and regional notes.`;
  return { title, description: truncate(description) };
}

/** Metadata for categories/:slug. */
export function categoryMeta(
  category: Category,
  websiteCount: number,
  modelCount: number,
): PageMeta {
  const lead =
    category.description ?? `AI tools and models in the ${category.name} category.`;
  return {
    title: `${category.name} — AI tools & models`,
    description: truncate(
      `${lead} Compare ${websiteCount} ${websiteCount === 1 ? 'website' : 'websites'} and ${modelCount} ${modelCount === 1 ? 'model' : 'models'}: pricing, access requirements and verification details.`,
    ),
  };
}
