"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { apiFetch, getActiveBranchId } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RestaurantTable = {
  id: string;
  name: string;
  area: string | null;
  seats: number;
  status: string;
  sortOrder: number;
};

const STATUS_STYLES: Record<string, string> = {
  FREE: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
  OCCUPIED: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  RESERVED: "border-blue-200 bg-blue-50 hover:bg-blue-100",
  BILLED: "border-violet-200 bg-violet-50 hover:bg-violet-100",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  FREE: "outline",
  OCCUPIED: "default",
  RESERVED: "secondary",
  BILLED: "secondary",
};

export default function RestaurantTablesPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "restaurant_tables");
  const branchId = getActiveBranchId();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.restaurant.tables(orgId, branchId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ tables: RestaurantTable[] }>("/api/v1/restaurant/tables").then((r) =>
        Array.isArray(r) ? r : r.tables ?? []
      ),
    enabled: !!orgId && enabled,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/v1/restaurant/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.restaurant.tables(orgId, branchId) });
      }
    },
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Tables in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading floor plan..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load tables"}
      </p>
    );
  }

  const tables = data ?? [];
  const areas = [...new Set(tables.map((t) => t.area ?? "Main floor"))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant floor"
        description="Table status and running tabs"
        actions={
          <Link href="/restaurant/kitchen">
            <Button variant="outline" size="lg" className="rounded-xl">
              Kitchen display
            </Button>
          </Link>
        }
      />

      {tables.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent>
            <EmptyState
              icon={UtensilsCrossed}
              title="No tables configured"
              description="Add tables via the API or organization setup."
            />
          </CardContent>
        </Card>
      ) : (
        areas.map((area) => (
          <div key={area} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {area}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {tables
                .filter((t) => (t.area ?? "Main floor") === area)
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left shadow-sm transition-colors",
                      STATUS_STYLES[table.status] ?? "border-border bg-card"
                    )}
                    onClick={() => {
                      const next =
                        table.status === "FREE"
                          ? "OCCUPIED"
                          : table.status === "OCCUPIED"
                            ? "BILLED"
                            : "FREE";
                      patchMutation.mutate({ id: table.id, status: next });
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-bold">{table.name}</p>
                      <Badge variant={STATUS_BADGE[table.status] ?? "outline"}>
                        {table.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{table.seats} seats</p>
                    {table.status === "OCCUPIED" ? (
                      <p className="mt-3 text-xs font-medium text-amber-800">Tap to mark billed</p>
                    ) : table.status === "FREE" ? (
                      <p className="mt-3 text-xs font-medium text-emerald-800">Tap to seat guests</p>
                    ) : null}
                  </button>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
