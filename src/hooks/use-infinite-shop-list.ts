"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import {
  flattenCursorPages,
  type CursorPage,
} from "@/lib/api/cursor-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type UseInfiniteShopListOptions = {
  queryKey: QueryKey;
  buildUrl: (cursor: string | undefined, debouncedSearch: string) => string;
  enabled?: boolean;
  search?: string;
  debounceMs?: number;
};

export function useInfiniteShopList<T extends { id: string }>({
  queryKey,
  buildUrl,
  enabled = true,
  search = "",
  debounceMs = 300,
}: UseInfiniteShopListOptions) {
  const debouncedSearch = useDebouncedValue(search, debounceMs);

  const result = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearch],
    queryFn: ({ pageParam }) =>
      apiFetch<CursorPage<T>>(
        buildUrl(pageParam as string | undefined, debouncedSearch)
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? (last.nextCursor ?? undefined) : undefined,
    enabled,
    placeholderData: keepPreviousData,
  });

  const items = flattenCursorPages(result.data?.pages);

  return {
    ...result,
    items,
    debouncedSearch,
    isInitialLoading: result.isLoading && !result.data,
    isSearchPending: result.isFetching && debouncedSearch !== search,
  };
}
