import { Link } from 'react-router-dom';
import type { CompareResult } from '../types';

/**
 * Renders a side-by-side comparison generated entirely from API data
 * (`GET /compare` returns `{ type, columns, rows }`). The frontend never
 * hard-codes which attributes are compared.
 */
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
            {result.columns.map((c) => (
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
                <td key={result.columns[i]?.id ?? i}>{v ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
