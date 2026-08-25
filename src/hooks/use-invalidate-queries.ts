"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { invalidateProjectQueries } from "@/lib/query/keys";

/** @deprecated Use queryClient.invalidateQueries with queryKeys instead */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return {
    invalidatePrefix(prefix: string) {
      if (!orgId) return;
      if (prefix === "") {
        queryClient.invalidateQueries({ queryKey: ["org", orgId] });
        return;
      }
      if (prefix.startsWith("project:")) {
        const rest = prefix.slice("project:".length);
        if (rest.endsWith(":")) {
          invalidateProjectQueries(queryClient, orgId);
        } else {
          invalidateProjectQueries(queryClient, orgId, rest.split(":")[0]);
        }
        return;
      }
      if (prefix === "projects") {
        queryClient.invalidateQueries({ queryKey: ["org", orgId, "projects"] });
      }
    },
  };
}
