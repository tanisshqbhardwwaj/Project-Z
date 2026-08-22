"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

export function useUnreadNotificationCount() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return useQuery({
    queryKey: orgId ? queryKeys.notificationsUnread(orgId) : ["disabled"],
    queryFn: () => apiFetch<{ count: number }>("/api/v1/notifications/unread-count"),
    enabled: !!orgId,
    refetchInterval: 60_000,
    select: (data) => data.count,
  });
}
