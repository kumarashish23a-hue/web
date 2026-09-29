import { useState } from 'react';
import { adminApi } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { usePaged } from '../../lib/paged';
import { Pagination } from '../../components/Pagination';
import type { AuditLog } from '../../types';

/** /admin/audit — read-only audit log. */
export function AdminAudit() {
  const [action, setAction] = useState('');
  const list = usePaged<AuditLog>(
    (page, limit) =>
      adminApi.auditLogs({ page, limit, action: action || undefined }),
    [action],
  );
  // Fetch distinct recent actions for the filter (best-effort).
  const recent = useFetch(() => adminApi.auditLogs({ limit: 50 }).then((r) => r.data));
  const actionOptions = Array.from(
    new Set((recent.data ?? []).map((a) => a.action)),
  ).sort();

  return (
    <>
      <div className="section-head">
        <h2>Audit log</h2>
        <select
          className="select"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            list.setPage(1);
          }}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        Every admin action is recorded here with who did it and when.
      </p>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title="No audit entries yet" />
      )}
      {list.items.length > 0 && (
        <AdminTable<AuditLog>
          columns={[
            {
              key: 'createdAt',
              label: 'When',
              render: (a) => formatDate(a.createdAt),
            },
            {
              key: 'adminEmail',
              label: 'Admin',
              render: (a) => a.adminEmail ?? '—',
            },
            { key: 'action', label: 'Action' },
            {
              key: 'entity',
              label: 'Entity',
              render: (a) =>
                a.entityType ? `${a.entityType}${a.entityId ? ` · ${a.entityId.slice(0, 8)}…` : ''}` : '—',
            },
          ]}
          rows={list.items}
        />
      )}
      <Pagination
        page={list.page}
        totalPages={list.meta?.totalPages ?? 1}
        onChange={list.setPage}
      />
    </>
  );
}
