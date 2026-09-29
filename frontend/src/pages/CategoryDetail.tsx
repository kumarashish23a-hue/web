import { useParams } from 'react-router-dom';
import { categoriesApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { ModelCard } from '../components/ModelCard';
import { WebsiteCard } from '../components/WebsiteCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

export function CategoryDetail() {
  const { slug = '' } = useParams();
  const detail = useFetch(() => categoriesApi.get(slug).then((r) => r.data), [slug]);

  if (detail.loading) return <LoadingState label="Loading category…" />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <EmptyState title="Category not found" />;

  const { category, websites, models } = detail.data;

  return (
    <>
      <div className="page-head">
        <h1>
          {category.icon ? `${category.icon} ` : ''}
          {category.name}
        </h1>
        {category.description && <p>{category.description}</p>}
      </div>

      <section className="section" aria-labelledby="cat-websites">
        <h2 id="cat-websites">Websites ({websites.length})</h2>
        {websites.length === 0 && <EmptyState title="No websites in this category yet" />}
        <div className="grid grid-3">
          {websites.map((w) => (
            <WebsiteCard key={w.id} website={w} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="cat-models">
        <h2 id="cat-models">Models ({models.length})</h2>
        {models.length === 0 && <EmptyState title="No models in this category yet" />}
        <div className="grid grid-3">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </section>
    </>
  );
}
