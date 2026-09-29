import { categoriesApi, modelsApi, websitesApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { CategoryCard } from '../components/CategoryCard';
import { ModelCard } from '../components/ModelCard';
import { WebsiteCard } from '../components/WebsiteCard';
import { SearchBar } from '../components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useNavigate } from 'react-router-dom';

export function Explore() {
  const navigate = useNavigate();
  const categories = useFetch(() => categoriesApi.list().then((r) => r.data));
  const websites = useFetch(() => websitesApi.list({ limit: 12 }).then((r) => r.data));
  const models = useFetch(() => modelsApi.list({ limit: 12 }).then((r) => r.data));

  return (
    <>
      <div className="page-head">
        <h1>Explore AI</h1>
        <p>
          Browse AI websites and models by category, or search for exactly what
          you need.
        </p>
      </div>

      <div className="toolbar">
        <div style={{ flex: 1, minWidth: '16rem' }}>
          <SearchBar
            onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
          />
        </div>
      </div>

      <section className="section" aria-labelledby="explore-categories">
        <h2 id="explore-categories">Categories</h2>
        {categories.loading && <LoadingState />}
        {categories.error && <ErrorState message={categories.error} onRetry={categories.reload} />}
        {categories.data && categories.data.length === 0 && <EmptyState />}
        <div className="home-grid home-grid-4">
          {(categories.data ?? []).map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="explore-websites">
        <div className="section-head">
          <h2 id="explore-websites">AI websites</h2>
        </div>
        {websites.loading && <LoadingState />}
        {websites.error && <ErrorState message={websites.error} onRetry={websites.reload} />}
        {websites.data && websites.data.length === 0 && <EmptyState />}
        <div className="home-grid home-grid-3">
          {(websites.data ?? []).map((w) => (
            <WebsiteCard key={w.id} website={w} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="explore-models">
        <div className="section-head">
          <h2 id="explore-models">AI models</h2>
        </div>
        {models.loading && <LoadingState />}
        {models.error && <ErrorState message={models.error} onRetry={models.reload} />}
        {models.data && models.data.length === 0 && <EmptyState />}
        <div className="home-grid home-grid-3">
          {(models.data ?? []).map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </section>
    </>
  );
}
