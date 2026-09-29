import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoriesApi, modelsApi, websitesApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { hasDemoData } from '../lib/paged';
import { CategoryCard } from '../components/CategoryCard';
import { ModelCard } from '../components/ModelCard';
import { WebsiteCard } from '../components/WebsiteCard';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { AiModel, Category, Website } from '../types';
import { PageSeo } from '../components/Seo';

export function Home() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');

  const categories = useFetch(() => categoriesApi.list().then((r) => r.data));
  const websites = useFetch(() => websitesApi.list({ limit: 24 }).then((r) => r));
  const models = useFetch(() => modelsApi.list({ limit: 12 }).then((r) => r));

  const onGoalSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (goal.trim()) {
      navigate(`/recommend?goal=${encodeURIComponent(goal.trim())}`);
    }
  };

  const allWebsites: Website[] = websites.data?.data ?? [];
  const verified = allWebsites
    .filter((w) => w.verification?.status === 'verified')
    .sort((a, b) =>
      (b.verification?.lastChecked ?? '').localeCompare(a.verification?.lastChecked ?? ''),
    )
    .slice(0, 4);
  const freeToTry = allWebsites
    .filter((w) => /free/i.test(w.freeAccessSummary ?? ''))
    .slice(0, 4);
  const recent: Website[] = [...allWebsites]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 4);
  const showDemo = hasDemoData(allWebsites, websites.data?.meta ?? null);

  return (
    <>
      <PageSeo
        meta={{
          title: 'Find the right AI for your goal',
          description:
            'AI Discovery helps you find the right AI website or model for your goal — compare plans, pricing, access requirements, and verification status, checked against official sources.',
        }}
      />
      <section className="hero">
        <h1>Tell us what you want to do with AI</h1>
        <p>
          Describe your goal in plain words and we will match you with AI
          websites and models — with verified pricing, free-access details, and
          honest limits.
        </p>
        <form className="goal-box" onSubmit={onGoalSubmit}>
          <label className="muted" htmlFor="home-goal">
            Describe your goal
          </label>
          <textarea
            id="home-goal"
            className="input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. I want to generate product photos for my online store without paying for a subscription…"
            rows={3}
          />
          <div className="goal-actions">
            <Button type="submit" size="lg" disabled={!goal.trim()}>
              Get recommendations
            </Button>
            <Link to="/explore" className="btn btn-secondary btn-lg">
              Explore AI
            </Link>
          </div>
        </form>
      </section>

      {showDemo && (
        <div className="demo-banner" role="note">
          <strong>Demo data:</strong> this site is currently showing fictional
          sample listings for evaluation. Nothing here is real pricing or a real
          company.
        </div>
      )}

      <section className="section" aria-labelledby="home-categories">
        <div className="section-head">
          <h2 id="home-categories">Browse by category</h2>
          <Link to="/explore">View all</Link>
        </div>
        {categories.loading && <LoadingState />}
        {categories.error && <ErrorState message={categories.error} onRetry={categories.reload} />}
        {categories.data && categories.data.length === 0 && <EmptyState />}
        {categories.data && categories.data.length > 0 && (
          <div className="home-grid home-grid-4">
            {(categories.data as Category[]).slice(0, 8).map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="home-verified">
        <div className="section-head">
          <h2 id="home-verified">Recently verified</h2>
          <Link to="/websites">All websites</Link>
        </div>
        {websites.loading && <LoadingState />}
        {websites.error && <ErrorState message={websites.error} onRetry={websites.reload} />}
        {websites.data && verified.length === 0 && (
          <EmptyState
            title="No verified listings yet"
            hint="Listings appear here once our team verifies them against official sources."
          />
        )}
        <div className="home-grid home-grid-4">
          {verified.map((w) => (
            <WebsiteCard key={w.id} website={w} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="home-free">
        <div className="section-head">
          <h2 id="home-free">Free to try</h2>
          <Link to="/search?price=free">More free options</Link>
        </div>
        {websites.data && freeToTry.length === 0 && <EmptyState />}
        <div className="home-grid home-grid-4">
          {freeToTry.map((w) => (
            <WebsiteCard key={w.id} website={w} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="home-recent">
        <div className="section-head">
          <h2 id="home-recent">Recently added</h2>
          <Link to="/models">All models</Link>
        </div>
        {models.loading && <LoadingState />}
        {models.error && <ErrorState message={models.error} onRetry={models.reload} />}
        {models.data && (models.data.data as AiModel[]).length === 0 && <EmptyState />}
        <div className="home-grid home-grid-3">
          {((models.data?.data ?? []) as AiModel[]).slice(0, 6).map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
        {websites.data && (
          <div className="home-grid home-grid-4" style={{ marginTop: '1rem' }}>
            {recent.map((w) => (
              <WebsiteCard key={w.id} website={w} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
