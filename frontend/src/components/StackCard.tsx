import { Link } from 'react-router-dom';
import { Card } from './Card';
import { VerificationBadge } from './badges';
import type { SavedStack, StackItem } from '../types';

export function StackCard({ stack }: { stack: SavedStack }) {
  return (
    <Link to={`/stack/${stack.id}`} className="stack-card-link">
      <Card className="stack-card">
        <h3 className="entity-card-title">{stack.title}</h3>
        <p className="entity-card-desc">{stack.goalText}</p>
        <p className="entity-card-meta">
          {stack.itemCount ?? '?'} {stack.itemCount === 1 ? 'item' : 'items'}
        </p>
      </Card>
    </Link>
  );
}

export function StackItemCard({ item }: { item: StackItem }) {
  const linked =
    item.website != null
      ? { to: `/websites/${item.website.slug}`, name: item.website.name }
      : item.model != null
        ? { to: `/models/${item.model.slug}`, name: item.model.name }
        : null;
  return (
    <Card className="stack-item-card">
      <p className="stack-item-label">{item.requirementLabel}</p>
      {linked && (
        <Link to={linked.to} className="entity-card-title">
          {linked.name}
        </Link>
      )}
      <div className="badge-row">
        {item.freeStatus && <span className="chip">{item.freeStatus}</span>}
        {item.verificationStatus && (
          <VerificationBadge status={item.verificationStatus} />
        )}
      </div>
      {item.reason && <p className="entity-card-desc">{item.reason}</p>}
      {(item.requirementsSummary || item.limitsSummary) && (
        <dl className="stack-item-meta">
          {item.requirementsSummary && (
            <>
              <dt>Requirements</dt>
              <dd>{item.requirementsSummary}</dd>
            </>
          )}
          {item.limitsSummary && (
            <>
              <dt>Limits</dt>
              <dd>{item.limitsSummary}</dd>
            </>
          )}
          {item.confidence && (
            <>
              <dt>Confidence</dt>
              <dd>{item.confidence}</dd>
            </>
          )}
        </dl>
      )}
    </Card>
  );
}
