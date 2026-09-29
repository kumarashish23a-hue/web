import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  accessApi,
  pricingApi,
  sourcesApi,
  verificationApi,
  websitesApi,
  type WebsiteDetail as WebsiteDetailType,
} from '../lib/api';
import { formatDate, formatPrice, useFetch } from '../lib/hooks';
import { Card } from '../components/Card';
import { AccessBadge, DemoBadge, FreeBadge, VerificationBadge } from '../components/badges';
import { PricingCard } from '../components/PricingCard';
import { FavoriteButton } from '../components/FavoriteButton';
import { ExternalLink } from '../lib/leaving-site';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type {
  AccessRequirements,
  ApiAccessInfo,
  CancellationPolicy,
  ChangeItem,
  PaymentMethod,
  Plan,
  RegionalAvailability,
  SourceRecord,
  VerificationRecordItem,
  WebsiteModelEntry,
} from '../types';

function RequirementsTable({ req }: { req: AccessRequirements }) {
  const rows: [string, string][] = [
    ['Account required', req.accountRequired ? 'Yes' : 'No'],
    ['Email verification', req.emailVerification ? 'Yes' : 'No'],
    ['Phone verification', req.phoneVerification ? 'Yes' : 'No'],
    ['Credit card required', req.creditCardRequired ? 'Yes' : 'No'],
    ['Debit card required', req.debitCardRequired ? 'Yes' : 'No'],
    ['Payment method required', req.paymentMethodRequired ? 'Yes' : 'No'],
    ['Payment required', req.paymentRequired ? 'Yes' : 'No'],
    ['Minimum age', req.minimumAge !== null ? String(req.minimumAge) : '—'],
  ];
  return (
    <dl className="fact-list">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      {req.notes && (
        <div>
          <dt>Notes</dt>
          <dd>{req.notes}</dd>
        </div>
      )}
    </dl>
  );
}

export function WebsiteDetail() {
  const { slug = '' } = useParams();
  const detail = useFetch(() => websitesApi.get(slug).then((r) => r.data), [slug]);
  const website: WebsiteDetailType | null = detail.data;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [access, setAccess] = useState<{
    requirements: AccessRequirements | null;
    paymentMethods: PaymentMethod[];
    cancellation: CancellationPolicy | null;
    apiAccess: ApiAccessInfo | null;
    regions: RegionalAvailability[];
  } | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [timeline, setTimeline] = useState<VerificationRecordItem[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    if (!website) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, a, s, v, c] = await Promise.all([
          pricingApi.byWebsite(website.slug).then((r) => r.data.plans),
          accessApi.byWebsite(website.slug).then((r) => r.data),
          sourcesApi.list('website', website.id).then((r) => r.data),
          verificationApi.list('website', website.id).then((r) => r.data),
          // Change history is admin-only; non-fatal for public viewers.
          verificationApi
            .changes('website', website.id)
            .then((r) => r.data)
            .catch(() => []),
        ]);
        if (!cancelled) {
          setPlans(p);
          setAccess(a);
          setSources(s);
          setTimeline(v);
          setChanges(c);
        }
      } catch (e) {
        if (!cancelled) {
          setSubError(
            e instanceof Error ? e.message : 'Could not load pricing and access details.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [website]);

  if (detail.loading) return <LoadingState label="Loading website…" />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!website) return <EmptyState title="Website not found" />;

  const models: WebsiteModelEntry[] = website.models ?? [];
  const freePlans = plans.filter((p) =>
    ['free', 'free_trial', 'freemium'].includes(p.kind),
  );

  return (
    <>
      <div className="detail-head">
        <div className="detail-meta-row">
          {website.isDemo && <DemoBadge />}
          <VerificationBadge
            status={website.verification?.status}
            lastChecked={website.verification?.lastChecked}
          />
          {website.beginnerFriendly && <span className="chip">Beginner friendly</span>}
          {website.isOpenSource && <span className="chip">Open source</span>}
        </div>
        <h1>{website.name}</h1>
        {website.tagline && <p className="detail-tagline">{website.tagline}</p>}
        <div className="detail-meta-row">
          {website.officialUrl && (
            <ExternalLink href={website.officialUrl} className="btn btn-primary btn-sm">
              Visit official website ↗
            </ExternalLink>
          )}
          <FavoriteButton kind="website" entityId={website.id} />
        </div>
        {website.categories && website.categories.length > 0 && (
          <div className="chip-row">
            {website.categories.map((c) => (
              <Link key={c.id} to={`/categories/${c.slug}`} className="chip">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {website.isDemo && (
        <div className="demo-banner" role="note">
          <strong>Demo data:</strong> “{website.name}” is a fictional listing for
          evaluation. Pricing and limits below are not real.
        </div>
      )}

      {subError && (
        <p className="muted" role="note">
          Some sections could not be loaded: {subError}
        </p>
      )}

      <div className="detail-layout">
        <div>
          <section className="section" aria-labelledby="wd-overview">
            <h2 id="wd-overview">Overview</h2>
            <Card>
              <p>{website.description ?? 'No description yet.'}</p>
              {website.monitoringStatus && (
                <p className="muted">
                  Monitoring: <strong>{website.monitoringStatus.replace(/_/g, ' ')}</strong>
                  {website.lastCheckedAt && <> · last checked {formatDate(website.lastCheckedAt)}</>}
                </p>
              )}
            </Card>
          </section>

          <section className="section" aria-labelledby="wd-models">
            <h2 id="wd-models">Models available here</h2>
            {models.length === 0 ? (
              <EmptyState title="No models listed yet" />
            ) : (
              <div className="grid">
                {models.map((wm) => (
                  <Card key={wm.id}>
                    <div className="entity-card-top">
                      <Link to={`/models/${wm.model.slug}`} className="entity-card-title">
                        {wm.model.name}
                      </Link>
                      <AccessBadge status={wm.accessStatus} />
                    </div>
                    {wm.notes && <p className="entity-card-desc">{wm.notes}</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="wd-pricing">
            <h2 id="wd-pricing">Pricing</h2>
            {plans.length === 0 ? (
              <EmptyState title="No pricing records yet" />
            ) : (
              <div className="grid grid-2">
                {plans.map((p) => (
                  <PricingCard key={p.id} plan={p} />
                ))}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="wd-free">
            <h2 id="wd-free">Free access</h2>
            <Card>
              {freePlans.length === 0 ? (
                <p className="muted">
                  No free plan, free trial, or free tier is recorded for this
                  website. {plans.length > 0 && 'All recorded plans are paid.'}
                </p>
              ) : (
                <ul>
                  {freePlans.map((p) => (
                    <li key={p.id}>
                      <FreeBadge label={p.kind.replace('_', ' ').toUpperCase()} />{' '}
                      <strong>{p.name}</strong> —{' '}
                      {formatPrice(p.priceAmount, p.priceCurrency, p.pricePer)}
                      {p.limits && p.limits.length > 0 && (
                        <ul>
                          {p.limits.map((l) => (
                            <li key={l.id}>
                              {l.limitKind.replace(/_/g, ' ')}
                              {l.limitValue !== null && l.limitValue !== undefined
                                ? `: ${l.limitValue}${l.limitUnit ? ` ${l.limitUnit}` : ''}`
                                : ''}
                              {l.description ? ` — ${l.description}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="section" aria-labelledby="wd-timeline">
            <h2 id="wd-timeline">Verification timeline</h2>
            <Card>
              {timeline.length === 0 && changes.length === 0 ? (
                <EmptyState title="No verification history yet" />
              ) : (
                <ul className="timeline">
                  {timeline.map((t) => (
                    <li key={t.id}>
                      <VerificationBadge status={t.status} />
                      <p style={{ margin: '0.3rem 0' }}>{t.claim}</p>
                      <p className="timeline-date">
                        {t.verifiedAt ? formatDate(t.verifiedAt) : 'Not yet verified'}
                        {t.notes ? ` — ${t.notes}` : ''}
                      </p>
                    </li>
                  ))}
                  {changes.map((c) => (
                    <li key={c.id}>
                      <p style={{ margin: 0 }}>
                        <strong>{c.fieldName}</strong> changed
                        {c.oldValue ? (
                          <>
                            {' '}from <code>{c.oldValue}</code>
                          </>
                        ) : null}{' '}
                        to <code>{c.newValue}</code>
                      </p>
                      <p className="timeline-date">{formatDate(c.changedAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <aside className="detail-side">
          <Card>
            <h3>Requirements</h3>
            {access?.requirements ? (
              <RequirementsTable req={access.requirements} />
            ) : (
              <p className="muted">No requirement records yet.</p>
            )}
          </Card>

          <Card>
            <h3>Payment methods</h3>
            {!access || access.paymentMethods.length === 0 ? (
              <p className="muted">No payment methods recorded.</p>
            ) : (
              <div className="chip-row">
                {access.paymentMethods.map((pm) => (
                  <span key={pm.code} className="chip" title={pm.notes ?? undefined}>
                    {pm.label}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3>Cancellation</h3>
            {!access?.cancellation ? (
              <p className="muted">No cancellation policy recorded.</p>
            ) : (
              <dl className="fact-list">
                <dt>Can cancel</dt>
                <dd>{access.cancellation.canCancel ? 'Yes' : 'No'}</dd>
                {access.cancellation.method && (
                  <>
                    <dt>How</dt>
                    <dd>{access.cancellation.method}</dd>
                  </>
                )}
                {access.cancellation.timing && (
                  <>
                    <dt>Timing</dt>
                    <dd>{access.cancellation.timing}</dd>
                  </>
                )}
                <dt>Auto-renewal</dt>
                <dd>{access.cancellation.autoRenewal ? 'Yes' : 'No'}</dd>
                {access.cancellation.accessAfterCancel && (
                  <>
                    <dt>Access after cancel</dt>
                    <dd>{access.cancellation.accessAfterCancel}</dd>
                  </>
                )}
                {access.cancellation.refundInfo && (
                  <>
                    <dt>Refunds</dt>
                    <dd>{access.cancellation.refundInfo}</dd>
                  </>
                )}
              </dl>
            )}
          </Card>

          <Card>
            <h3>API access</h3>
            {!access?.apiAccess ? (
              <p className="muted">No API information recorded.</p>
            ) : (
              <dl className="fact-list">
                <dt>Has API</dt>
                <dd>{access.apiAccess.hasApi ? 'Yes' : 'No'}</dd>
                <dt>Free tier</dt>
                <dd>{access.apiAccess.freeTier ? 'Yes' : 'No'}</dd>
                {access.apiAccess.pricingText && (
                  <>
                    <dt>Pricing</dt>
                    <dd>{access.apiAccess.pricingText}</dd>
                  </>
                )}
                {access.apiAccess.rateLimitsText && (
                  <>
                    <dt>Rate limits</dt>
                    <dd>{access.apiAccess.rateLimitsText}</dd>
                  </>
                )}
                {access.apiAccess.docsUrl && (
                  <>
                    <dt>Docs</dt>
                    <dd>
                      <ExternalLink href={access.apiAccess.docsUrl}>API docs ↗</ExternalLink>
                    </dd>
                  </>
                )}
              </dl>
            )}
          </Card>

          <Card>
            <h3>Regions</h3>
            {!access || access.regions.length === 0 ? (
              <p className="muted">No regional availability recorded.</p>
            ) : (
              <ul className="pricing-limits">
                {access.regions.map((r) => (
                  <li key={r.countryCode}>
                    <strong>{r.countryCode}</strong> —{' '}
                    {r.available ? 'Available' : 'Not available'}
                    {r.notes ? ` (${r.notes})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3>Sources</h3>
            {sources.length === 0 ? (
              <p className="muted">No sources recorded.</p>
            ) : (
              <ul className="pricing-limits">
                {sources.map((s) => (
                  <li key={s.id}>
                    <ExternalLink href={s.url}>
                      {s.pageTitle ?? s.url} ↗
                    </ExternalLink>{' '}
                    <span className="muted">({s.sourceType.replace(/_/g, ' ')})</span>
                    {s.retrievedAt && (
                      <span className="muted"> · retrieved {formatDate(s.retrievedAt)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
