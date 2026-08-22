"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ActivityRow = {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export default function ShopActivityPage() {
  const { activeBusinessType, activeOrganizationId, enabledModules } = useAuthStore();
  const orgId = activeOrganizationId;
  const enabled = isModuleEnabled(enabledModules, "shop_activity");
  const title = moduleLabel("shop_activity", activeBusinessType ?? "SHOPKEEPER");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.activity(orgId), search] : ["disabled"],
    queryFn: () => apiFetch<ActivityRow[]>(`/api/v1/shop/activity?q=${encodeURIComponent(search)}`),
    enabled: !!orgId && enabled,
  });

  if (!enabled) {
    return <p className="text-muted-foreground">Activity log is owner-only. Enable it in Features.</p>;
  }

  if (isLoading) return <PageLoader label="Loading activity log..." />;
  if (error) {
    return <p className="text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>;
  }

  const logs = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Append-only audit trail — owner access only</p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Recent activity
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions…" className="h-11 rounded-xl pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => {
                const dt = new Date(log.createdAt);
                return (
                  <li key={log.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{log.userName} · {log.userRole}</p>
                        <p className="text-muted-foreground">{log.module} — {log.description}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{dt.toLocaleDateString("en-IN")}</p>
                        <p>{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
