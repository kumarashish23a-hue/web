import { Link } from 'react-router-dom';
import type { CompareResult } from '../types';

/**
 * Renders a side-by-side comparison generated entirely from API data
 * (`GET /compare` returns `{ type, items, rows }`). The frontend never
 * hard-codes which attributes are compared.
 */
function fmtCell(v: string | string[] | null): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
  return v;
}

export function ComparisonTable({ result }: { result: CompareResult }) {
  const base = result.type === 'website' ? '/websites' : '/models';

  return (
    <div className="table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col" className="compare-label-col">
              Attribute
            </th>
            {result.items.map((c) => (
              <th key={c.id} scope="col">
                <Link to={`${base}/${c.slug}`} className="compare-name">
                  {c.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="compare-label-col">
                {row.label}
              </th>
              {row.values.map((v, i) => (
                <td key={result.items[i]?.id ?? i}>{fmtCell(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
