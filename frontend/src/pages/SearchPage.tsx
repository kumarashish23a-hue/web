import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriesApi, searchApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { FilterPanel, EMPTY_FILTERS } from '../components/FilterPanel';
import { SearchBar } from '../components/SearchBar';
import { ModelCard } from '../components/ModelCard';
import { WebsiteCard } from '../components/WebsiteCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useToast } from '../lib/toast';
import type { SearchFilters, SearchResults } from '../types';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const cats = useFetch(() => categoriesApi.list().then((r) => r.data));

  const [filters, setFilters] = useState<SearchFilters>({
    ...EMPTY_FILTERS,
    q: params.get('q') ?? '',
    price: (params.get('price') as SearchFilters['price']) ?? 'any',
  });
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (f: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined> = {
        q: f.q || undefined,
        price: f.price !== 'any' ? f.price : undefined,
        access: f.access !== 'any' ? f.access : undefined,
        noCard: f.noCard || undefined,
        noPayment: f.noPayment || undefined,
        noLogin: f.noLogin || undefined,
        category: f.category || undefined,
        region: f.region || undefined,
      };
      const { data } = await searchApi.query(query);
      setResults(data);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
      toast('Search failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run once on mount if the URL carries a query (e.g. from the navbar search).
  useEffect(() => {
    const q = params.get('q');
    if (q) {
      const f = { ...EMPTY_FILTERS, q, price: (params.get('price') as SearchFilters['price']) ?? 'any' };
      setFilters(f);
      void runSearch(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (q: string) => {
    const f = { ...filters, q };
    setFilters(f);
    setParams(q ? { q } : {});
    void runSearch(f);
  };

  const onFilterChange = (f: SearchFilters) => {
    setFilters(f);
    void runSearch(f);
  };

  const total =
    (results?.websites.length ?? 0) + (results?.models.length ?? 0);

  return (
    <>
      <div className="page-head">
        <h1>Search</h1>
        <p>
          Search across AI websites and models, then narrow by price, access
          requirements, category, and region.
        </p>
      </div>

      <div style={{ marginBottom: '1.25rem', maxWidth: '36rem' }}>
        <SearchBar initial={filters.q} onSearch={onSearch} />
      </div>

      <div className="search-layout">
        <FilterPanel
          filters={filters}
          onChange={onFilterChange}
          categories={cats.data ?? []}
          onReset={() => {
            const f = { ...EMPTY_FILTERS };
            setFilters(f);
            setParams({});
            setResults(null);
            setSearched(false);
          }}
        />
        <div>
          {loading && <LoadingState label="Searching…" />}
          {error && <ErrorState message={error} />}
          {!loading && !error && searched && total === 0 && (
            <EmptyState
              title="No results"
              hint="Try fewer filters or a different search term."
            />
          )}
          {!loading && !error && !searched && (
            <EmptyState
              title="Search to begin"
              hint="Type a query above, or pick filters on the left."
            />
          )}
          {results && results.websites.length > 0 && (
            <section className="section" aria-labelledby="search-websites">
              <h2 id="search-websites">
                Websites ({results.websites.length})
              </h2>
              <div className="grid grid-2">
                {results.websites.map((w) => (
                  <WebsiteCard key={w.id} website={w} />
                ))}
              </div>
            </section>
          )}
          {results && results.models.length > 0 && (
            <section className="section" aria-labelledby="search-models">
              <h2 id="search-models">Models ({results.models.length})</h2>
              <div className="grid grid-2">
                {results.models.map((m) => (
                  <ModelCard key={m.id} model={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
