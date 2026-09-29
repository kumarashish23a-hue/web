import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { recommendApi, stacksApi } from '../lib/api';
import { RecommendationCard } from '../components/RecommendationCard';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { RecommendConstraints, RecommendItem } from '../types';

const CONSTRAINT_FIELDS: {
  key: keyof RecommendConstraints;
  label: string;
  hint?: string;
}[] = [
  { key: 'preferFree', label: 'Prefer free options' },
  { key: 'noCreditCard', label: 'No credit card required' },
  { key: 'noPayment', label: 'No payment at all' },
  { key: 'noLogin', label: 'No login required' },
  { key: 'beginnerFriendly', label: 'Beginner friendly' },
  { key: 'apiRequired', label: 'Must have an API' },
];

export function RecommendPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [goal, setGoal] = useState(params.get('goal') ?? '');
  const [constraints, setConstraints] = useState<RecommendConstraints>({});
  const [regionCode, setRegionCode] = useState('');
  const [items, setItems] = useState<RecommendItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const g = params.get('goal');
    if (g) {
      setGoal(g);
      void run(g, constraints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (goalText: string, c: RecommendConstraints) => {
    const trimmed = goalText.trim();
    if (!trimmed) {
      toast('Describe your goal first.', 'info');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await recommendApi.get(trimmed, {
        ...c,
        regionCode: regionCode.trim().toUpperCase() || undefined,
      });
      setItems(data.items);
      setRan(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recommendation failed.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(goal, constraints);
  };

  const setConstraint = (key: keyof RecommendConstraints, value: boolean) =>
    setConstraints((prev) => ({ ...prev, [key]: value || undefined }));

  const saveAsStack = async () => {
    if (!items || items.length === 0) return;
    if (!user) {
      navigate('/login', { state: { from: '/recommend' } });
      return;
    }
    setSaving(true);
    try {
      const title = goal.length > 60 ? `${goal.slice(0, 57)}…` : goal;
      const { data } = await stacksApi.saveRecommendation(title, goal, items);
      toast('Saved as an AI stack.', 'success');
      navigate(`/stack/${data.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the stack.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Get AI recommendations</h1>
        <p>
          Describe what you want to achieve. Our engine matches your goal
          against verified listings and explains <em>why</em> each pick fits.
        </p>
      </div>

      <form className="recommend-form" onSubmit={onSubmit}>
        <Card>
          <div className="field">
            <label htmlFor="rec-goal">What do you want to do with AI?</label>
            <textarea
              id="rec-goal"
              className="input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I need to transcribe customer calls and summarize them, preferably free and without a credit card…"
              rows={4}
            />
          </div>

          <fieldset className="filter-group">
            <legend>Constraints (optional)</legend>
            <div className="constraint-grid">
              {CONSTRAINT_FIELDS.map((f) => (
                <label key={f.key} className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(constraints[f.key])}
                    onChange={(e) => setConstraint(f.key, e.target.checked)}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="rec-region">Your region (country code, optional)</label>
            <input
              id="rec-region"
              className="input"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="e.g. US"
              maxLength={2}
              style={{ maxWidth: '10rem' }}
            />
          </div>

          <Button type="submit" size="lg" disabled={loading || !goal.trim()}>
            {loading ? 'Finding matches…' : 'Recommend AI for me'}
          </Button>
        </Card>
      </form>

      <section className="section" aria-live="polite">
        {loading && <LoadingState label="Analyzing your goal…" />}
        {error && <ErrorState message={error} />}
        {!loading && !error && ran && (!items || items.length === 0) && (
          <EmptyState
            title="No matches found"
            hint="Try describing your goal differently or relaxing a constraint."
          />
        )}
        {items && items.length > 0 && (
          <>
            <div className="section-head">
              <h2>Recommended for you ({items.length})</h2>
              <Button variant="secondary" size="sm" onClick={saveAsStack} disabled={saving}>
                {saving ? 'Saving…' : '♥ Save as AI stack'}
              </Button>
            </div>
            <div className="grid grid-2">
              {items.map((item) => (
                <RecommendationCard key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
