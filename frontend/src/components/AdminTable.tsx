import type { ReactNode } from 'react';

export interface AdminColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

/**
 * Generic admin data table. `getValue` falls back to `row[key]` so simple
 * columns need no render function.
 */
export function AdminTable<T extends { id: string }>({
  columns,
  rows,
  rowActions,
  emptyText = 'No records yet',
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  rowActions?: (row: T) => ReactNode;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
            {rowActions && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? '—')}
                </td>
              ))}
              {rowActions && <td className="admin-actions">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
