import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatPrice, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { FreeBadge, VerificationBadge } from '../../components/badges';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import type { Plan } from '../../types';

/**
 * /admin/pricing — read-only cross-website pricing overview.
 * Editing happens on /admin/plans (per website).
 */
export function AdminPricing() {
  const plans = useFetch(() => adminApi.list<Plan>('plans', { limit: 200 }).then((r) => r.data));

  return (
    <>
      <div className="section-head">
        <h2>Pricing overview</h2>
        <Link to="/admin/plans" className="btn btn-secondary btn-sm">
          Manage plans per website
        </Link>
      </div>
      <p className="muted">
        All plans across websites. Edit prices and limits from the Plans page.
      </p>

      {plans.loading && <LoadingState />}
      {plans.error && <ErrorState message={plans.error} onRetry={plans.reload} />}
      {plans.data && plans.data.length === 0 && !plans.loading && (
        <EmptyState title="No plans recorded yet" />
      )}
      {plans.data && plans.data.length > 0 && (
        <AdminTable<Plan>
          columns={[
            {
              key: 'website',
              label: 'Website',
              render: (p) =>
                p.websiteSlug ? (
                  <Link to={`/websites/${p.websiteSlug}`}>{p.websiteName ?? '—'}</Link>
                ) : (
                  (p.websiteName ?? '—')
                ),
            },
            { key: 'name', label: 'Plan' },
            {
              key: 'kind',
              label: 'Kind',
              render: (p) =>
                ['free', 'free_trial', 'freemium'].includes(p.kind) ? (
                  <FreeBadge label={p.kind.replace('_', ' ').toUpperCase()} />
                ) : (
                  p.kind.replace('_', ' ')
                ),
            },
            {
              key: 'price',
              label: 'Price',
              render: (p) => formatPrice(p.priceAmount, p.priceCurrency, p.pricePer),
            },
            {
              key: 'verification',
              label: 'Verification',
              render: (p) => (
                <VerificationBadge
                  status={p.verification?.status}
                  lastChecked={p.verification?.lastChecked}
                />
              ),
            },
            {
              key: 'isDemo',
              label: 'Demo',
              render: (p) => (p.isDemo ? 'Yes' : 'No'),
            },
          ]}
          rows={plans.data}
        />
      )}
    </>
  );
}
