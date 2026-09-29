import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AdminSidebar } from '../../components/AdminSidebar';
import { PageSeo } from '../../components/Seo';

/**
 * Admin area shell. The role check here is UX only — the API enforces RBAC
 * server-side on every /admin/* endpoint.
 */
export function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <p className="loading-state">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  if (!isAdmin) {
    return (
      <div className="empty-state-block">
        <p className="empty-state-title">Admin access required</p>
        <p className="empty-state-hint">
          Your account does not have an admin role. Contact a workspace admin
          if you need access.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageSeo
        meta={{
          title: 'Admin',
          description: 'AI Discovery content management and verification.',
          noindex: true,
        }}
      />
      <div className="page-head">
        <h1>Admin</h1>
        <p className="muted">
          Content management and verification. Every change is audit-logged.
        </p>
      </div>
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </>
  );
}
