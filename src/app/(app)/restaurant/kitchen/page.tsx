"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChefHat, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type KotItem = {
  name: string;
  quantity: number;
  notes?: string;
};

type KotTicket = {
  id: string;
  orderId: string;
  roundNumber: number;
  status: string;
  tableName: string | null;
  channel: string | null;
  itemsJson: KotItem[];
  createdAt: string;
};

const STATUS_COLUMNS = ["NEW", "PREPARING", "READY", "SERVED"] as const;

const COLUMN_COLORS: Record<string, string> = {
  NEW: "border-blue-200 bg-blue-50/50",
  PREPARING: "border-amber-200 bg-amber-50/50",
  READY: "border-emerald-200 bg-emerald-50/50",
  SERVED: "border-muted bg-muted/30",
};

const NEXT_STATUS: Record<string, string | null> = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

export default function RestaurantKitchenPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "restaurant_kitchen");
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: orgId ? queryKeys.modules.restaurant.kot(orgId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ tickets: KotTicket[] }>("/api/v1/restaurant/kot").then((r) =>
        Array.isArray(r) ? r : r.tickets ?? []
      ),
    enabled: !!orgId && enabled,
    refetchInterval: 10_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/v1/restaurant/kot/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.restaurant.kot(orgId) });
    },
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Kitchen in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading kitchen queue..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load KOT queue"}
      </p>
    );
  }

  const tickets = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitchen display"
        description="Live KOT queue — auto-refreshes every 10 seconds"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {new Date(dataUpdatedAt).toLocaleTimeString("en-IN")}
            </span>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Link href="/restaurant/tables">
              <Button variant="outline" size="lg" className="rounded-xl">
                Floor
              </Button>
            </Link>
          </div>
        }
      />

      {tickets.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent>
            <EmptyState
              icon={ChefHat}
              title="Kitchen clear"
              description="New KOT tickets will appear here when orders are fired."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTickets = tickets.filter((t) => t.status === column);
            return (
              <div key={column} className="space-y-3">
                <h2 className="flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {column.replace(/_/g, " ")}
                  <Badge variant="secondary">{columnTickets.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {columnTickets.map((ticket) => {
                    const items = Array.isArray(ticket.itemsJson) ? ticket.itemsJson : [];
                    const next = NEXT_STATUS[ticket.status];
                    return (
                      <Card
                        key={ticket.id}
                        className={cn("rounded-2xl border-2 shadow-md", COLUMN_COLORS[column])}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">
                              {ticket.tableName ? `Table ${ticket.tableName}` : "Takeaway"}
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                #{ticket.roundNumber}
                              </span>
                            </CardTitle>
                            {ticket.channel && ticket.channel !== "DIRECT" ? (
                              <Badge>{ticket.channel}</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleTimeString("en-IN")}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <ul className="space-y-1 text-sm">
                            {items.map((item: KotItem, i: number) => (
                              <li key={i}>
                                <span className="font-medium">{item.quantity}×</span> {item.name}
                                {item.notes ? (
                                  <span className="block text-xs text-muted-foreground">
                                    {item.notes}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                          {next ? (
                            <Button
                              size="sm"
                              className="mt-2 w-full rounded-xl"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: ticket.id, status: next })}
                            >
                              Mark {next.toLowerCase().replace(/_/g, " ")}
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
