import { useFetch } from "@/hooks/use-fetch";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { MULTI_STORE_ADDON_KEY } from "@/lib/billing/addon-catalog";

export function useOrgAddons() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { data, loading, refetch } = useFetch(
    orgId ? `org:${orgId}:addons` : null,
    () => apiFetch<{ addonKeys: string[] }>("/api/v1/organizations/addons")
  );

  const addonKeys = data?.addonKeys ?? [];

  return {
    addonKeys,
    loading,
    refetch,
    hasMultiStore: addonKeys.includes(MULTI_STORE_ADDON_KEY),
  };
}
