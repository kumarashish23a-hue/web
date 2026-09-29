import { Card } from './Card';
import { DemoBadge, FreeBadge } from './badges';
import { formatPrice } from '../lib/hooks';
import type { Plan } from '../types';

const KIND_LABEL: Record<string, string> = {
  free: 'Free',
  free_trial: 'Free trial',
  freemium: 'Freemium',
  paid: 'Paid',
  usage_based: 'Usage based',
  subscription: 'Subscription',
  api_only: 'API only',
};

export function PricingCard({ plan }: { plan: Plan }) {
  const isFreeKind = plan.kind === 'free' || plan.kind === 'free_trial' || plan.kind === 'freemium';
  return (
    <Card className="pricing-card">
      <div className="pricing-head">
        <h3 className="pricing-name">{plan.name}</h3>
        <div className="badge-row">
          {plan.isDemo && <DemoBadge />}
          {isFreeKind && <FreeBadge label={KIND_LABEL[plan.kind] ?? plan.kind} />}
        </div>
      </div>
      <p className="pricing-kind">
        {KIND_LABEL[plan.kind] ?? plan.kind}
        {plan.billingCycle !== 'none' ? ` · ${plan.billingCycle.replace('_', ' ')}` : ''}
      </p>
      <p className="pricing-price">
        {formatPrice(plan.priceAmount, plan.priceCurrency, plan.pricePer)}
      </p>
      {plan.limits && plan.limits.length > 0 && (
        <ul className="pricing-limits">
          {plan.limits.map((l) => (
            <li key={l.id}>
              <strong>{l.limitKind.replace(/_/g, ' ')}</strong>
              {l.limitValue !== null && l.limitValue !== undefined
                ? `: ${l.limitValue}${l.limitUnit ? ` ${l.limitUnit}` : ''}`
                : ''}
              {l.description ? ` — ${l.description}` : ''}
            </li>
          ))}
        </ul>
      )}
      {!plan.isCurrent && (
        <p className="pricing-note">This plan is no longer current.</p>
      )}
    </Card>
  );
}
