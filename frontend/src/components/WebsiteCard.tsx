import { Link } from 'react-router-dom';
import { Card } from './Card';
import { DemoBadge, FreeBadge, VerificationBadge } from './badges';
import type { Website } from '../types';

export function WebsiteCard({ website }: { website: Website }) {
  return (
    <Card className="entity-card">
      <div className="entity-card-top">
        <Link to={`/websites/${website.slug}`} className="entity-card-title">
          {website.name}
        </Link>
        <div className="badge-row">
          {website.isDemo && <DemoBadge />}
          <VerificationBadge
            status={website.verification?.status}
            lastChecked={website.verification?.lastChecked}
          />
        </div>
      </div>
      {website.tagline && <p className="entity-card-tagline">{website.tagline}</p>}
      {website.freeAccessSummary && (
        <p className="entity-card-free">
          <FreeBadge label={website.freeAccessSummary} />
        </p>
      )}
      {website.categories && website.categories.length > 0 && (
        <div className="chip-row">
          {website.categories.slice(0, 3).map((c) => (
            <Link key={c.id} to={`/categories/${c.slug}`} className="chip">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <div className="entity-card-foot">
        {website.beginnerFriendly && <span className="chip chip-soft">Beginner friendly</span>}
        {website.isOpenSource && <span className="chip chip-soft">Open source</span>}
      </div>
    </Card>
  );
}
