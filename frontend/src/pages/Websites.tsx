import { useState } from 'react';
import { categoriesApi, websitesApi } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { usePaged } from '../lib/paged';
import { WebsiteCard } from '../components/WebsiteCard';
import { SearchBar } from '../components/SearchBar';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { PageSeo } from '../components/Seo';

export function Websites() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const cats = useFetch(() => categoriesApi.list().then((r) => r.data));
  const list = usePaged(
    (page, limit) =>
      websitesApi.list({
        page,
        limit,
        search: search || undefined,
        category: category || undefined,
      }),
    [search, category],
  );

  return (
    <>
      <PageSeo
        meta={{
          title: 'AI websites — pricing & access compared',
          description:
            'Compare AI websites: plans, pricing, free tiers, access requirements and verification, checked against official sources.',
        }}
      />
      <div className="page-head">
        <h1>AI websites</h1>
        <p>
          Every listing shows its verification status, pricing, and what it
          takes to get started — no card required is clearly marked.
        </p>
      </div>

      <div className="toolbar">
        <div style={{ flex: 1, minWidth: '14rem' }}>
          <SearchBar
            initial={search}
            placeholder="Search websites…"
            onSearch={(q) => {
              setSearch(q);
              list.setPage(1);
            }}
          />
        </div>
        <select
          className="select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            list.setPage(1);
          }}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState hint="Try a different search term or category." />
      )}
      <div className="grid grid-3">
        {list.items.map((w) => (
          <WebsiteCard key={w.id} website={w} />
        ))}
      </div>
      <Pagination
        page={list.page}
        totalPages={list.meta?.totalPages ?? 1}
        onChange={list.setPage}
      />
    </>
  );
}
