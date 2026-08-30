"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MyDelivery = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  status: string;
  scheduledAt: string | null;
  notes: string | null;
};

const NEXT_STATUS: Record<string, { status: string; label: string } | null> = {
  ASSIGNED: { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Mark delivered" },
  PENDING: { status: "OUT_FOR_DELIVERY", label: "Start delivery" },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  ASSIGNED: "bg-blue-100 text-blue-800",
  OUT_FOR_DELIVERY: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-destructive/10 text-destructive",
};

export default function MyDeliveriesPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "deliveries");
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.deliveries(orgId), "me"] : ["disabled"],
    queryFn: () =>
      apiFetch<{ deliveries: MyDelivery[] }>("/api/v1/deliveries/me").then((r) =>
        Array.isArray(r) ? r : r.deliveries ?? []
      ),
    enabled: !!orgId && enabled,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/v1/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.deliveries(orgId) });
    },
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Deliveries in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading your deliveries..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load deliveries"}
      </p>
    );
  }

  const deliveries = (data ?? []).filter((d) => d.status !== "DELIVERED" && d.status !== "CANCELLED");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/deliveries"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All deliveries
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">My deliveries</h1>
            <p className="text-sm text-muted-foreground">Update status as you deliver</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent>
            <EmptyState
              icon={Truck}
              title="No active deliveries"
              description="Assigned deliveries will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => {
            const next = NEXT_STATUS[d.status];
            return (
              <Card key={d.id} className="rounded-2xl border-0 shadow-md">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-lg">{d.customerName}</CardTitle>
                  <Badge className={cn(STATUS_COLORS[d.status] ?? "")}>
                    {d.status.replace(/_/g, " ")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {d.address}
                  </p>
                  {d.customerPhone ? (
                    <p className="text-sm">
                      <a href={`tel:${d.customerPhone}`} className="text-primary hover:underline">
                        {d.customerPhone}
                      </a>
                    </p>
                  ) : null}
                  {d.notes ? <p className="text-xs text-muted-foreground">{d.notes}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {next ? (
                      <Button
                        className="rounded-xl"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: d.id, status: next.status })}
                      >
                        {next.label}
                      </Button>
                    ) : null}
                    {d.status !== "FAILED" && d.status !== "DELIVERED" ? (
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: d.id, status: "FAILED" })}
                      >
                        Failed
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
