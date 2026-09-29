import { useParams } from 'react-router-dom';
import { stacksApi } from '../lib/api';
import { formatDate, useFetch } from '../lib/hooks';
import { StackItemCard } from '../components/StackCard';
import { PageSeo } from '../components/Seo';
import { FavoriteButton } from '../components/FavoriteButton';
import { truncate } from '../lib/seo';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

export function StackDetail() {
  const { id = '' } = useParams();
  const detail = useFetch(() => stacksApi.get(id).then((r) => r.data), [id]);

  if (detail.loading) return <LoadingState label="Loading stack…" />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <EmptyState title="Stack not found" />;

  const { stack, items } = detail.data;

  return (
    <>
      <PageSeo
        meta={{
          title: `AI stack: ${stack.title}`,
          description: truncate(stack.goalText),
          noindex: true,
        }}
      />
      <div className="page-head">
        <h1>{stack.title}</h1>
        <p>{stack.goalText}</p>
        <p className="muted">
          Saved {formatDate(stack.createdAt)} · {items.length}{' '}
          {items.length === 1 ? 'item' : 'items'}
        </p>
        <FavoriteButton kind="stack" entityId={stack.id} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="This stack has no items yet" />
      ) : (
        <div className="grid">
          {[...items]
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <StackItemCard key={item.id} item={item} />
            ))}
        </div>
      )}
    </>
  );
}
