import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';

export function AdminDashboard() {
  const stats = useFetch(() => adminApi.dashboard().then((r) => r.data));

  const cards: { label: string; key: string; to?: string }[] = [
    { label: 'Websites', key: 'websites', to: '/admin/websites' },
    { label: 'Models', key: 'models', to: '/admin/models' },
    { label: 'Categories', key: 'categories', to: '/admin/categories' },
    { label: 'Plans', key: 'plans', to: '/admin/pricing' },
    { label: 'Pending submissions', key: 'pendingSubmissions', to: '/admin/submissions' },
    { label: 'Verification queue', key: 'verificationQueue', to: '/admin/verification' },
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
        </div>
      </div>
    </>
  );
}
