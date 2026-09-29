import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { compareApi, modelsApi, websitesApi } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { useFetch } from '../lib/hooks';
import { ComparisonTable } from '../components/ComparisonTable';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { PageSeo } from '../components/Seo';
import { useToast } from '../lib/toast';
import type { CompareResult } from '../types';

/**
 * Multi-select compare: pick 2–4 websites or models, then render the
 * ComparisonTable generated from GET /compare data.
 */
export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const type = (params.get('type') as 'website' | 'model') || 'website';
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);

  const [selected, setSelected] = useState<string[]>(ids);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websites = useFetch(() => websitesApi.list({ limit: 100 }).then((r) => r.data));
  const models = useFetch(() => modelsApi.list({ limit: 100 }).then((r) => r.data));

  const candidates = type === 'website' ? (websites.data ?? []) : (models.data ?? []);

  useEffect(() => {
    setSelected(ids);
    if (ids.length >= 2) {
      setLoading(true);
      setError(null);
      compareApi
        .get(type, ids)
        .then((r) => {
          setResult(r.data);
          setLoading(false);
          // Analytics: coarse only — what kind and how many were compared.
          trackEvent('compare_used', {
            meta: { type, itemCount: ids.length },
          });
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Could not load comparison.');
          setLoading(false);
        });
    } else {
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast('You can compare up to 4 items at a time.', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  const runCompare = () => {
    if (selected.length < 2) {
      toast('Select at least 2 items to compare.', 'info');
      return;
    }
    setParams({ type, ids: selected.join(',') });
  };

  const switchType = (t: 'website' | 'model') => {
    setSelected([]);
    setResult(null);
    navigate('/compare');
    setParams(t === 'website' ? {} : { type: t });
  };

  return (
    <>
      <PageSeo
        meta={{
          title: 'Compare AI tools side by side',
          description:
            'Put AI websites or models side by side — pricing, plans, access requirements and verification in one table.',
        }}
      />
      <div className="page-head">
        <h1>Compare</h1>
        <p>
          Select 2 to 4 {type === 'website' ? 'websites' : 'models'} and compare
          them side by side.
        </p>
      </div>

      {result === null && (
        <>
          <div className="compare-tabs" role="tablist" aria-label="Compare type">
            <Button
              variant={type === 'website' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => switchType('website')}
            >
              Websites
            </Button>
            <Button
              variant={type === 'model' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => switchType('model')}
            >
              Models
            </Button>
          </div>

          {(type === 'website' ? websites.loading : models.loading) && <LoadingState />}
          <div className="compare-picker">
            {candidates.map((c) => (
              <label key={c.id} className="compare-pick-row">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span>
                  <strong>{c.name}</strong>
                  {'tagline' in c && c.tagline ? (
                    <span className="muted"> — {c.tagline}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {candidates.length === 0 && !(type === 'website' ? websites.loading : models.loading) && (
            <EmptyState />
          )}
          <Button onClick={runCompare} disabled={selected.length < 2}>
            Compare selected ({selected.length})
          </Button>
        </>
      )}

      {loading && <LoadingState label="Building comparison…" />}
      {error && <ErrorState message={error} />}
      {result && !loading && (
        <>
          <div className="toolbar">
            <Button variant="secondary" onClick={() => navigate('/compare')}>
              ← Pick different items
            </Button>
          </div>
          <Card>
            <ComparisonTable result={result} />
          </Card>
        </>
      )}
    </>
  );
}
