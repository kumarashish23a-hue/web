import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, ApiError } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';

export function AdminDashboard() {
  const stats = useFetch(() => adminApi.dashboard().then((r) => r.data));
  const { toast } = useToast();
  const [recomputing, setRecomputing] = useState(false);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const r = await adminApi.recomputeMonitoring();
      toast(
        `Monitoring recomputed: ${r.data.markedDueForCheck} due for check, ${r.data.markedOutdated} outdated.`,
        'success',
      );
      stats.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Recompute failed.', 'error');
    } finally {
      setRecomputing(false);
    }
  };

  const cards: { label: string; key: string; to?: string }[] = [
    { label: 'Websites', key: 'websites', to: '/admin/websites' },
    { label: 'Models', key: 'models', to: '/admin/models' },
    { label: 'Categories', key: 'categories', to: '/admin/categories' },
    { label: 'Plans', key: 'plans', to: '/admin/pricing' },
    { label: 'Pending submissions', key: 'pendingSubmissions', to: '/admin/submissions' },
    { label: 'Verification queue', key: 'verificationQueue', to: '/admin/verification' },
    { label: 'Due for check', key: 'dueForCheckWebsites', to: '/admin/verification' },
    { label: 'Outdated websites', key: 'outdatedWebsites', to: '/admin/verification' },
    { label: 'Users', key: 'users', to: '/admin/users' },
    { label: 'Sources', key: 'sources', to: '/admin/sources' },
  ];

  return (
    <>
      <h2>Dashboard</h2>
      {stats.loading && <LoadingState />}
      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}
      {stats.data && (
        <div className="stat-grid">
          {cards.map((c) => {
            const value = stats.data![c.key];
            const body = (
              <>
                <p className="stat-value">{value ?? '—'}</p>
                <p className="stat-label">{c.label}</p>
              </>
            );
            return (
              <Card key={c.key} className="stat-card">
                {c.to ? <Link to={c.to} style={{ color: 'inherit' }}>{body}</Link> : body}
              </Card>
            );
          })}
        </div>
      )}
      {!stats.loading && !stats.error && !stats.data && (
        <EmptyState title="No stats available" />
      )}

      <div className="section">
        <h2>Quick actions</h2>
        <div className="toolbar">
          <Link to="/admin/submissions" className="btn btn-secondary btn-sm">
            Review submissions
          </Link>
          <Link to="/admin/verification" className="btn btn-secondary btn-sm">
            Verification queue
          </Link>
          <Link to="/admin/websites" className="btn btn-secondary btn-sm">
            Add website
          </Link>
          <Link to="/admin/models" className="btn btn-secondary btn-sm">
            Add model
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={recomputing}
            onClick={recompute}
            title="Date-based only: escalates websites whose last check is older than 30/90 days. Never marks anything current."
          >
            {recomputing ? 'Recomputing…' : 'Recompute monitoring status'}
          </button>
        </div>
      </div>
    </>
  );
}
