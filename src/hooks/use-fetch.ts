"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useFetchStore } from "@/stores/fetch-store";

export function useFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: { enabled?: boolean; force?: boolean }
) {
  const enabled = options?.enabled !== false && key != null;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback(
    (onStoreChange: () => void) => useFetchStore.subscribe(onStoreChange),
    []
  );

  const entry = useSyncExternalStore(
    subscribe,
    () => (key ? useFetchStore.getState().getEntry<T>(key) : undefined),
    () => undefined
  );

  const refetch = useCallback(
    (force = true) => {
      if (!key) return Promise.resolve(null as T);
      return useFetchStore.getState().fetch(key, () => fetcherRef.current(), force);
    },
    [key]
  );

  useEffect(() => {
    if (!enabled || !key) return;
    useFetchStore
      .getState()
      .fetch(key, () => fetcherRef.current(), options?.force)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, options?.force]);

  return {
    data: (entry?.data ?? null) as T | null,
    loading: enabled && (!entry || entry.loading),
    error: entry?.error ?? null,
    refetch,
  };
}
