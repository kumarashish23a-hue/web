import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';
import type { PageMeta } from '../types';

export interface PagedResult<T> {
  items: T[];
  meta: PageMeta | null;
  page: number;
  setPage: (p: number) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const PAGE_SIZE = 12;

/**
 * Paginated list fetcher. `fetcher(page, limit)` must return the API envelope.
 */
export function usePaged<T>(
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; meta?: PageMeta }>,
  deps: unknown[] = [],
  limit = PAGE_SIZE,
): PagedResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(page, limit)
      .then(({ data, meta: m }) => {
        if (!cancelled && mounted.current) {
          setItems(data);
          setMeta(m ?? null);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled && mounted.current) {
          setError(
            e instanceof ApiError ? e.message : 'Something went wrong loading data.',
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, nonce, limit, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { items, meta, page, setPage, loading, error, reload };
}

/** True when the API signals demo data (meta.demo or any row flagged). */
export function hasDemoData<T extends { isDemo?: boolean }>(
  items: T[],
  meta: PageMeta | null,
): boolean {
  return meta?.demo === true || items.some((i) => i.isDemo === true);
}
