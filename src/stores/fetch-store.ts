import { getQueryClient } from "@/lib/query/client";
import { invalidateProjectQueries } from "@/lib/query/keys";
import { getActiveOrganizationId } from "@/lib/api/client";

/** @deprecated TanStack Query handles caching. Use queryClient.invalidateQueries. */
export const useFetchStore = {
  getState() {
    return {
      invalidatePrefix(prefix: string) {
        const orgId = getActiveOrganizationId();
        if (!orgId) return;
        const queryClient = getQueryClient();
        if (prefix === "") {
          queryClient.invalidateQueries({ queryKey: ["org", orgId] });
          return;
        }
        if (prefix === "projects") {
          queryClient.invalidateQueries({ queryKey: ["org", orgId, "projects"] });
          return;
        }
        if (prefix.startsWith("project:")) {
          const rest = prefix.slice("project:".length);
          const projectId = rest.replace(/:$/, "").split(":")[0];
          if (rest.endsWith(":") || !rest.includes(":")) {
            invalidateProjectQueries(queryClient, orgId, projectId || undefined);
          } else {
            invalidateProjectQueries(queryClient, orgId, projectId);
          }
        }
      },
    };
  },
};
