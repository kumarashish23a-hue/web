import { useState } from 'react';
import { adminApi } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import type { ChangeItem } from '../../types';

/** /admin/changes — read-only change history across entities. */
export function AdminChanges() {
  const [entityType, setEntityType] = useState('');
  const list = useFetch(
    () =>
      adminApi
        .list<ChangeItem>('changes', { limit: 100, entityType: entityType || undefined })
        .then((r) => r.data),
    [entityType],
  );

  return (
    <>
      <div className="section-head">
        <h2>Change history</h2>
        <select
          className="select"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          aria-label="Filter by entity type"
        >
          <option value="">All entity types</option>
          {['website', 'model', 'plan', 'plan_limit', 'access_requirement', 'cancellation_policy', 'api_access', 'regional_availability', 'website_model'].map(
            (t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ),
          )}
        </select>
      </div>
      <p className="muted">
        Append-only record of field-level changes. Written by the API whenever
        an admin edits content.
      </p>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !list.loading && (
        <EmptyState title="No changes recorded yet" />
      )}
      {list.data && list.data.length > 0 && (
        <AdminTable<ChangeItem>
          columns={[
            {
              key: 'entity',
              label: 'Entity',
              render: (c) => `${c.entityType} · ${c.entityId.slice(0, 8)}…`,
            },
            { key: 'fieldName', label: 'Field' },
            {
              key: 'oldValue',
              label: 'Old value',
              render: (c) => c.oldValue ?? '—',
            },
            {
              key: 'newValue',
              label: 'New value',
              render: (c) => c.newValue ?? '—',
            },
            {
              key: 'changedAt',
              label: 'Changed at',
              render: (c) => formatDate(c.changedAt),
            },
          ]}
          rows={list.data}
        />
      )}
    </>
  );
}
