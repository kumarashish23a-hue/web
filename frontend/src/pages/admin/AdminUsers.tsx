import { adminApi, ApiError } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { AdminTable } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';
import type { AdminRole, PlatformUserRow } from '../../types';

const ROLES: AdminRole[] = ['super_admin', 'admin', 'editor', 'verifier'];

const RANK: Record<AdminRole, number> = {
  verifier: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * /admin/users — list platform users; assign/revoke admin roles.
 * Only super_admin can assign roles (the API enforces this; the UI just
 * hides the control otherwise).
 */
export function AdminUsers() {
  const { toast } = useToast();
  const { adminRole } = useAuth();
  const list = useFetch(() => adminApi.users({ limit: 100 }).then((r) => r.data));
  const canManageRoles = adminRole === 'super_admin';

  const setRole = async (user: PlatformUserRow, role: AdminRole | null) => {
    const label = role ? `grant “${role}” to ${user.email}` : `revoke admin role from ${user.email}`;
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    try {
      await adminApi.setUserRole(user.id, role);
      toast('Role updated.', 'success');
      list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update role.', 'error');
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>Users</h2>
      </div>
      {!canManageRoles && (
        <p className="muted">
          Role assignment requires the super_admin role. You can view users but
          not change roles.
        </p>
      )}

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !list.loading && (
        <EmptyState title="No users yet" />
      )}
      {list.data && list.data.length > 0 && (
        <AdminTable<PlatformUserRow>
          columns={[
            { key: 'email', label: 'Email' },
            {
              key: 'displayName',
              label: 'Name',
              render: (u) => u.displayName ?? '—',
            },
            {
              key: 'emailVerified',
              label: 'Verified',
              render: (u) => (u.emailVerified ? 'Yes' : 'No'),
            },
            {
              key: 'adminRole',
              label: 'Admin role',
              render: (u) => u.adminRole ?? '—',
            },
            {
              key: 'createdAt',
              label: 'Joined',
              render: (u) => formatDate(u.createdAt),
            },
          ]}
          rows={list.data}
          rowActions={
            canManageRoles
              ? (u) => (
                  <>
                    <select
                      className="select"
                      value={u.adminRole ?? ''}
                      onChange={(e) =>
                        setRole(u, (e.target.value as AdminRole) || null)
                      }
                      aria-label={`Admin role for ${u.email}`}
                      style={{ maxWidth: '10rem' }}
                    >
                      <option value="">No admin role</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r} ({RANK[r]})
                        </option>
                      ))}
                    </select>
                    {u.adminRole && (
                      <Button variant="danger" size="sm" onClick={() => setRole(u, null)}>
                        Revoke
                      </Button>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}
    </>
  );
}
