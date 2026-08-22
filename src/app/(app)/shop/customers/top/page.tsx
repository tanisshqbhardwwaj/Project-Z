"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/finance/money";

type TopCustomersResponse = {
  period: string;
  customers: Array<{
    name: string;
    phone: string | null;
    orderCount: number;
    itemCount: number;
    totalPaise: string;
    averageOrderPaise: string;
    outstandingPaise: string;
    lastPurchaseDate?: string | null;
  }>;
};

export default function TopCustomersPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [sort, setSort] = useState<"amount" | "orders" | "items">("amount");

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.topCustomers(orgId, `${period}-${sort}`) : ["disabled"],
    queryFn: () =>
      apiFetch<TopCustomersResponse>(
        `/api/v1/shop/customers/top?period=${period}&sort=${sort}&limit=25`
      ),
    enabled: !!orgId,
  });

  if (isLoading) return <PageLoader label="Loading top customers..." />;
  if (error) {
    return (
      <p className="p-8 text-destructive">
        {error instanceof Error ? error.message : "Failed to load analytics"}
      </p>
    );
  }

  const periodLabel =
    period === "7d" ? "Last 7 days" : period === "30d" ? "Last 30 days" : "Last 90 days";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Top customers</h1>
        <p className="text-sm text-muted-foreground">
          Ranked by purchase history (excludes cancelled invoices; returns deducted)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => setPeriod(p)}
          >
            {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
          </Button>
        ))}
        <span className="mx-2 hidden h-8 w-px bg-border sm:inline" />
        {(["amount", "orders", "items"] as const).map((s) => (
          <Button
            key={s}
            variant={sort === s ? "default" : "outline"}
            size="sm"
            className="rounded-xl capitalize"
            onClick={() => setSort(s)}
          >
            {s === "amount" ? "Highest spend" : s === "orders" ? "Most orders" : "Most items"}
          </Button>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <p className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            TOP CUSTOMERS — {periodLabel.toUpperCase()}
          </p>
          <ol className="divide-y">
            {(data?.customers ?? []).length === 0 ? (
              <li className="px-4 py-8 text-center text-muted-foreground">No sales in this period</li>
            ) : (
              (data?.customers ?? []).map((c, i) => (
                <li key={`${c.phone ?? c.name}-${i}`} className="flex flex-wrap gap-3 px-4 py-3 text-sm">
                  <span className="w-6 font-semibold text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.phone ?? "No phone"} · {c.orderCount} orders · {c.itemCount} items · Avg{" "}
                      {formatINR(c.averageOrderPaise)}
                      {Number(c.outstandingPaise) > 0
                        ? ` · Udhaar ${formatINR(c.outstandingPaise)}`
                        : ""}
                      {c.lastPurchaseDate
                        ? ` · Last ${new Date(c.lastPurchaseDate).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatINR(c.totalPaise)}</p>
                </li>
              ))
            )}
          </ol>
        </CardContent>
      </Card>

      <Link href="/shop/customers">
        <Button variant="outline" className="rounded-xl">
          All customers
        </Button>
      </Link>
    </div>
  );
}
