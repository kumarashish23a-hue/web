import { Link } from 'react-router-dom';
import { Card } from './Card';
import { DemoBadge, VerificationBadge } from './badges';
import type { AiModel } from '../types';

export function ModelCard({ model }: { model: AiModel }) {
  return (
    <Card className="entity-card">
      <div className="entity-card-top">
        <Link to={`/models/${model.slug}`} className="entity-card-title">
          {model.name}
        </Link>
        <div className="badge-row">
          {model.isDemo && <DemoBadge />}
          <VerificationBadge
            status={model.verification?.status}
            lastChecked={model.verification?.lastChecked}
          />
        </div>
      </div>
      <p className="entity-card-meta">
        {model.provider?.name ?? 'Unknown provider'}
        {' · '}
        <span className="chip chip-soft">{model.modelType}</span>
        {model.isOpenSource && <span className="chip chip-soft">Open source</span>}
        {model.apiAvailable && <span className="chip chip-soft">API available</span>}
      </p>
      {model.description && (
        <p className="entity-card-desc">{model.description.slice(0, 140)}</p>
      )}
      {model.capabilities && model.capabilities.length > 0 && (
        <div className="chip-row">
          {model.capabilities.slice(0, 3).map((c) => (
            <span key={c.id} className="chip">
              {c.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
