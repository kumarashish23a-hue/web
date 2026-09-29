import { Link, useParams } from 'react-router-dom';
import { modelsApi, sourcesApi, verificationApi } from '../lib/api';
import { formatDate, useFetch } from '../lib/hooks';
import { modelMeta } from '../lib/seo';
import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { PageSeo } from '../components/Seo';
import { AccessBadge, DemoBadge, VerificationBadge } from '../components/badges';
import { FavoriteButton } from '../components/FavoriteButton';
import { ExternalLink } from '../lib/leaving-site';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { SourceRecord, VerificationRecordItem } from '../types';

export function ModelDetail() {
  const { slug = '' } = useParams();
  const detail = useFetch(() => modelsApi.get(slug).then((r) => r.data), [slug]);
  const model = detail.data;

  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [timeline, setTimeline] = useState<VerificationRecordItem[]>([]);

  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, v] = await Promise.all([
          sourcesApi.list('model', model.id).then((r) => r.data),
          verificationApi.list('model', model.id).then((r) => r.data),
        ]);
        if (!cancelled) {
          setSources(s);
          setTimeline(v);
        }
      } catch {
        /* non-fatal: sections stay empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [model]);

  if (detail.loading) return <LoadingState label="Loading model…" />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!model) return <EmptyState title="Model not found" />;

  const availability = model.availability ?? [];

  return (
    <>
      <PageSeo meta={modelMeta(model, timeline)} />
      <div className="detail-head">
        <div className="detail-meta-row">
          {model.isDemo && <DemoBadge />}
          <VerificationBadge
            status={model.verification?.status}
            lastChecked={model.verification?.lastChecked}
          />
          <span className="chip">{model.modelType}</span>
          {model.isOpenSource && <span className="chip">Open source</span>}
          {model.apiAvailable && <span className="chip">API available</span>}
        </div>
        <h1>{model.name}</h1>
        <p className="detail-tagline">
          by {model.provider?.name ?? 'unknown provider'}
        </p>
        <div className="detail-meta-row">
          <FavoriteButton kind="model" entityId={model.id} />
        </div>
        {(model.categories?.length ?? 0) > 0 && (
          <div className="chip-row">
            {model.categories!.map((c) => (
              <Link key={c.id} to={`/categories/${c.slug}`} className="chip">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {model.isDemo && (
        <div className="demo-banner" role="note">
          <strong>Demo data:</strong> “{model.name}” is a fictional listing for
          evaluation. Details below are not real.
        </div>
      )}

      <div className="detail-layout">
        <div>
          <section className="section" aria-labelledby="md-overview">
            <h2 id="md-overview">Overview</h2>
            <Card>
              <p>{model.description ?? 'No description yet.'}</p>
              <dl className="fact-list">
                {model.license && (
                  <>
                    <dt>License</dt>
                    <dd>{model.license}</dd>
                  </>
                )}
                {model.contextWindowTokens !== null &&
                  model.contextWindowTokens !== undefined && (
                    <>
                      <dt>Context window</dt>
                      <dd>{model.contextWindowTokens.toLocaleString()} tokens</dd>
                    </>
                  )}
                {(model.inputModalities?.length ?? 0) > 0 && (
                  <>
                    <dt>Input modalities</dt>
                    <dd>{model.inputModalities!.join(', ')}</dd>
                  </>
                )}
                {(model.outputModalities?.length ?? 0) > 0 && (
                  <>
                    <dt>Output modalities</dt>
                    <dd>{model.outputModalities!.join(', ')}</dd>
                  </>
                )}
              </dl>
              {(model.capabilities?.length ?? 0) > 0 && (
                <>
                  <h3 style={{ marginTop: '1rem' }}>Capabilities</h3>
                  <div className="chip-row">
                    {model.capabilities!.map((c) => (
                      <span key={c.id} className="chip" title={c.description ?? undefined}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </section>

          <section className="section" aria-labelledby="md-where">
            <h2 id="md-where">Where can I use this model?</h2>
            <Card>
              {availability.length === 0 ? (
                <EmptyState
                  title="No platform listings yet"
                  hint="No website has been recorded as offering this model."
                />
              ) : (
                availability.map((a) => (
                  <div key={a.website.id} className="availability-row">
                    <div>
                      <Link to={`/websites/${a.website.slug}`} className="availability-site">
                        {a.website.name}
                      </Link>
                      {(a.limitsSummary || a.regionNotes || a.notes) && (
                        <p className="availability-notes">
                          {[a.limitsSummary, a.regionNotes, a.notes]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {a.cardRequired !== null && a.cardRequired !== undefined && (
                        <p className="availability-notes">
                          {a.cardRequired
                            ? 'Payment card required'
                            : 'No payment card required'}
                        </p>
                      )}
                    </div>
                    <AccessBadge status={a.accessStatus} />
                  </div>
                ))
              )}
            </Card>
          </section>

          {timeline.length > 0 && (
            <section className="section" aria-labelledby="md-timeline">
              <h2 id="md-timeline">Verification timeline</h2>
              <Card>
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
                </ul>
              </Card>
            </section>
          )}
        </div>

        <aside className="detail-side">
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
