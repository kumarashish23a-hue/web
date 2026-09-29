import { useState } from 'react';
import { modelsApi } from '../lib/api';
import { usePaged } from '../lib/paged';
import { ModelCard } from '../components/ModelCard';
import { SearchBar } from '../components/SearchBar';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { PageSeo } from '../components/Seo';

export function Models() {
  const [search, setSearch] = useState('');
  const [modelType, setModelType] = useState('');

  const list = usePaged(
    (page, limit) =>
      modelsApi.list({
        page,
        limit,
        search: search || undefined,
        // ASSUMPTION: backend supports ?modelType= filter; ignored otherwise.
        ...(modelType ? { modelType } : {}),
      }),
    [search, modelType],
  );

  return (
    <>
      <PageSeo
        meta={{
          title: 'AI models — availability & access compared',
          description:
            'Compare AI models: where to use each model, access requirements, limits and verification status.',
        }}
      />
      <div className="page-head">
        <h1>AI models</h1>
        <p>
          Compare models by capability, license, context window, and where you
          can actually use them — including free access.
        </p>
      </div>

      <div className="toolbar">
        <div style={{ flex: 1, minWidth: '14rem' }}>
          <SearchBar
            initial={search}
            placeholder="Search models…"
            onSearch={(q) => {
              setSearch(q);
              list.setPage(1);
            }}
          />
        </div>
        <select
          className="select"
          value={modelType}
          onChange={(e) => {
            setModelType(e.target.value);
            list.setPage(1);
          }}
          aria-label="Filter by model type"
        >
          <option value="">All types</option>
          {['chat', 'image', 'video', 'audio', 'music', 'voice', 'stt', 'embedding', 'code', 'agent', 'multimodal', 'other'].map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
      </div>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState hint="Try a different search term or type." />
      )}
      <div className="grid grid-3">
        {list.items.map((m) => (
          <ModelCard key={m.id} model={m} />
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
