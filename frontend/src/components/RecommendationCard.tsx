import { Link } from 'react-router-dom';
import { Card } from './Card';
import { DemoBadge, VerificationBadge } from './badges';
import { formatDate } from '../lib/hooks';
import type { RecommendItem } from '../types';

export function RecommendationCard({ item }: { item: RecommendItem }) {
  const base = item.kind === 'website' ? '/websites' : '/models';
  return (
    <Card className="recommend-card">
      <div className="entity-card-top">
        <Link to={`${base}/${item.slug}`} className="entity-card-title">
          {item.name}
        </Link>
        <div className="badge-row">
          {item.isDemo && <DemoBadge />}
          <VerificationBadge
            status={item.verification.status}
            lastChecked={item.verification.lastChecked}
          />
        </div>
      </div>
      <p className="recommend-kind">
        {item.kind === 'website' ? 'AI website' : 'AI model'}
        {item.verification.lastChecked && (
          <> · checked {formatDate(item.verification.lastChecked)}</>
        )}
      </p>
      {item.tagline && <p className="entity-card-tagline">{item.tagline}</p>}
      {item.description && (
        <p className="entity-card-desc">{item.description.slice(0, 160)}</p>
      )}
      {item.reasons.length > 0 && (
        <div className="reasons">
          <p className="reasons-title">Why this matches</p>
          <ul>
            {item.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
