"use client";

import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type StableListQueryOptions<TData, TError = Error> = Omit<
  UseQueryOptions<TData, TError, TData, QueryKey>,
  "queryKey" | "queryFn" | "placeholderData"
> & {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  /** Immediate search/filter input; debounced before queryKey/queryFn use. */
  search?: string;
  debounceMs?: number;
};

/**
 * List query that keeps the page mounted while filters/search refetch.
 * Shows full-page loader only on the first load (no cached data yet).
 */
export function useStableListQuery<TData, TError = Error>({
  search = "",
  debounceMs = 300,
  queryKey,
  queryFn,
  ...options
}: StableListQueryOptions<TData, TError>) {
  const debouncedSearch = useDebouncedValue(search, debounceMs);

  const result = useQuery({
    ...options,
    queryKey: [...queryKey, debouncedSearch],
    queryFn,
    placeholderData: keepPreviousData,
  });

  return {
    ...result,
    debouncedSearch,
    isInitialLoading: result.isLoading && result.data === undefined,
    isSearchPending: result.isFetching && debouncedSearch !== search,
  };
}
