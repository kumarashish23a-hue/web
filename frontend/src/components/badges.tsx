import type { VerificationStatus, WebsiteModelAccess } from '../types';

/**
 * Data-status badges. Status is ALWAYS conveyed with a text label —
 * never color alone (CONTRACT requirement).
 */

const VERIFICATION_META: Record<VerificationStatus, { label: string; className: string }> = {
  verified: { label: 'VERIFIED', className: 'badge-verified' },
  partially_verified: { label: 'PARTIALLY VERIFIED', className: 'badge-partial' },
  unverified: { label: 'UNVERIFIED', className: 'badge-unverified' },
  outdated: { label: 'OUTDATED', className: 'badge-outdated' },
  disputed: { label: 'DISPUTED', className: 'badge-disputed' },
};

export function VerificationBadge({
  status,
  lastChecked,
}: {
  status: VerificationStatus | null | undefined;
  lastChecked?: string | null;
}) {
  if (!status) {
    return <span className="badge badge-unverified">UNVERIFIED</span>;
  }
  const meta = VERIFICATION_META[status];
  const title = lastChecked
    ? `Last checked ${new Date(lastChecked).toLocaleDateString()}`
    : undefined;
  return (
    <span className={`badge ${meta.className}`} title={title}>
      {meta.label}
    </span>
  );
}

const ACCESS_META: Record<WebsiteModelAccess, { label: string; className: string }> = {
  free: { label: 'FREE', className: 'badge-verified' },
  free_tier: { label: 'FREE TIER', className: 'badge-verified' },
  free_trial: { label: 'FREE TRIAL', className: 'badge-partial' },
  paid: { label: 'PAID', className: 'badge-outdated' },
  unavailable: { label: 'UNAVAILABLE', className: 'badge-outdated' },
};

export function AccessBadge({ status }: { status: WebsiteModelAccess }) {
  const meta = ACCESS_META[status] ?? { label: status.toUpperCase(), className: 'badge-unverified' };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

/** "FREE" marker for free plans / no-cost access. Always text + style. */
export function FreeBadge({ label = 'FREE' }: { label?: string }) {
  return <span className="badge badge-verified">{label}</span>;
}

/** Marks demo/seed rows so fictional data is never mistaken for real data. */
export function DemoBadge() {
  return (
    <span className="badge badge-demo" title="Demo data — fictional, for evaluation only">
      DEMO
    </span>
  );
}
