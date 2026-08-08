import { create } from "zustand";

type CacheEntry<T = unknown> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatedAt: number;
};

type FetchStore = {
  cache: Record<string, CacheEntry>;
  inflight: Record<string, Promise<unknown>>;

  getEntry: <T>(key: string) => CacheEntry<T> | undefined;
  setLoading: (key: string) => void;
  setData: <T>(key: string, data: T) => void;
  setError: (key: string, error: string) => void;
  invalidate: (key: string) => void;
  invalidatePrefix: (prefix: string) => void;
  fetch: <T>(key: string, fetcher: () => Promise<T>, force?: boolean) => Promise<T>;
};

export const useFetchStore = create<FetchStore>((set, get) => ({
  cache: {},
  inflight: {},

  getEntry: <T>(key: string) => get().cache[key] as CacheEntry<T> | undefined,

  setLoading: (key) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [key]: {
          ...(s.cache[key] ?? { data: null, error: null, updatedAt: 0 }),
          loading: true,
          error: null,
        },
      },
    })),

  setData: (key, data) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [key]: { data, loading: false, error: null, updatedAt: Date.now() },
      },
    })),

  setError: (key, error) =>
    set((s) => ({
      cache: {
        ...s.cache,
        [key]: {
          data: s.cache[key]?.data ?? null,
          loading: false,
          error,
          updatedAt: Date.now(),
        },
      },
    })),

  invalidate: (key) =>
    set((s) => {
      const next = { ...s.cache };
      delete next[key];
      return { cache: next };
    }),

  invalidatePrefix: (prefix) =>
    set((s) => {
      const next = { ...s.cache };
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      return { cache: next };
    }),

  fetch: async <T>(key: string, fetcher: () => Promise<T>, force = false) => {
    const existing = get().cache[key];
    if (!force && existing?.data != null && !existing.loading) {
      return existing.data as T;
    }

    const inflight = get().inflight[key];
    if (inflight) {
      return inflight as Promise<T>;
    }

    get().setLoading(key);

    const promise = fetcher()
      .then((data) => {
        get().setData(key, data);
        set((s) => {
          const inflight = { ...s.inflight };
          delete inflight[key];
          return { inflight };
        });
        return data;
      })
      .catch((err: Error) => {
        get().setError(key, err.message ?? "Failed to load");
        set((s) => {
          const inflight = { ...s.inflight };
          delete inflight[key];
          return { inflight };
        });
        throw err;
      });

    set((s) => ({ inflight: { ...s.inflight, [key]: promise } }));
    return promise;
  },
}));
