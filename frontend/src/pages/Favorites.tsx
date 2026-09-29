import { Link, Navigate } from 'react-router-dom';
import { favoritesApi, stacksApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { WebsiteCard } from '../components/WebsiteCard';
import { ModelCard } from '../components/ModelCard';
import { StackCard } from '../components/StackCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { FavoriteItem, SavedStack } from '../types';

export function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const favs = useFetch(() => favoritesApi.list().then((r) => r.data));
  const stacks = useFetch(() => stacksApi.list().then((r) => r.data));

  if (!authLoading && !user) {
    return <Navigate to="/login" replace state={{ from: '/favorites' }} />;
  }

  const items: FavoriteItem[] = favs.data ?? [];
  const websiteFavs = items.filter((f) => f.kind === 'website' && f.website);
  const modelFavs = items.filter((f) => f.kind === 'model' && f.model);
  const stackList: SavedStack[] = stacks.data ?? [];

  return (
    <>
      <div className="page-head">
        <h1>Your saved items</h1>
        <p>Websites, models, and AI stacks you saved for later.</p>
      </div>

      {favs.loading || stacks.loading ? (
        <LoadingState />
      ) : favs.error ? (
        <ErrorState message={favs.error} onRetry={favs.reload} />
      ) : (
        <>
          <section className="section" aria-labelledby="fav-websites">
            <h2 id="fav-websites">Websites ({websiteFavs.length})</h2>
            {websiteFavs.length === 0 && (
              <EmptyState
                title="No saved websites yet"
                hint="Tap “Save” on any website to keep it here."
              />
            )}
            <div className="grid grid-3">
              {websiteFavs.map((f) => (
                <WebsiteCard key={f.id} website={f.website!} />
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="fav-models">
            <h2 id="fav-models">Models ({modelFavs.length})</h2>
            {modelFavs.length === 0 && (
              <EmptyState
                title="No saved models yet"
                hint="Tap “Save” on any model to keep it here."
              />
            )}
            <div className="grid grid-3">
              {modelFavs.map((f) => (
                <ModelCard key={f.id} model={f.model!} />
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="fav-stacks">
            <div className="section-head">
              <h2 id="fav-stacks">AI stacks ({stackList.length})</h2>
              <Link to="/recommend">Create a stack</Link>
            </div>
            {stackList.length === 0 && (
              <EmptyState
                title="No saved stacks yet"
                hint="Get recommendations, then “Save as AI stack”."
              />
            )}
            <div className="grid grid-3">
              {stackList.map((s) => (
                <StackCard key={s.id} stack={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
