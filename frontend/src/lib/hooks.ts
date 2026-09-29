import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch-on-mount hook. `fetcher` must return a promise of the envelope's
 * `data` (callers unwrap `api.list().then(r => r.data)` style, or pass the
 * whole promise and read `.data` via `select`).
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!cancelled && mounted.current) {
          setData(d);
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
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Format an ISO timestamp for display; falls back to the raw string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a price amount + currency, or "—" when null. */
export function formatPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
  pricePer?: string | null,
): string {
  if (amount === null || amount === undefined) return '—';
  const cur = currency ?? 'USD';
  let s: string;
  try {
    s = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
    }).format(amount);
  } catch {
    s = `${amount} ${cur}`;
  }
  return pricePer ? `${s} ${pricePer}` : s;
}
