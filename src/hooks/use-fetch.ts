"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { legacyKey } from "@/lib/query/keys";

export function useFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: { enabled?: boolean; force?: boolean }
) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const enabled = options?.enabled !== false && key != null && !!orgId;

  const queryKey = orgId && key ? legacyKey(orgId, key) : ["disabled"];

  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: options?.force ? 0 : undefined,
  });

  return {
    data: (query.data ?? null) as T | null,
    loading: enabled && query.isLoading,
    error: query.error?.message ?? null,
    refetch: (force = true) =>
      query.refetch({ throwOnError: false, cancelRefetch: force }),
  };
}
