import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { AdminRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  /** Minimum role to *see* the link. Server enforces access regardless. */
  minRole?: AdminRole;
}

const RANK: Record<AdminRole, number> = {
  verifier: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

const ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/websites', label: 'Websites', minRole: 'editor' },
  { to: '/admin/models', label: 'Models', minRole: 'editor' },
  { to: '/admin/categories', label: 'Categories', minRole: 'editor' },
  { to: '/admin/plans', label: 'Plans', minRole: 'editor' },
  { to: '/admin/pricing', label: 'Pricing', minRole: 'editor' },
  { to: '/admin/submissions', label: 'Submissions', minRole: 'editor' },
  { to: '/admin/verification', label: 'Verification queue', minRole: 'verifier' },
  { to: '/admin/sources', label: 'Sources', minRole: 'editor' },
  { to: '/admin/changes', label: 'Change history' },
  { to: '/admin/users', label: 'Users', minRole: 'admin' },
  { to: '/admin/audit', label: 'Audit log', minRole: 'admin' },
];

export function AdminSidebar() {
  const { adminRole } = useAuth();
  const rank = adminRole ? RANK[adminRole] : 0;

  return (
    <nav className="admin-sidebar" aria-label="Admin">
      {ITEMS.filter((i) => !i.minRole || rank >= RANK[i.minRole]).map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.to === '/admin'}
          className={({ isActive }) =>
            `admin-nav-link${isActive ? ' active' : ''}`
          }
        >
          {i.label}
        </NavLink>
      ))}
      <p className="admin-role-note">
        Role: <strong>{adminRole ?? 'none'}</strong>
        <br />
        <span className="muted">
          Access is enforced by the API — hidden links are a convenience, not security.
        </span>
      </p>
    </nav>
  );
}
