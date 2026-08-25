"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Barcode,
  Package,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";
import type { InventoryAnalytics } from "@/lib/shop/inventory-analytics";

const PERIOD_OPTIONS = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

function formatRupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function PeriodPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.days}
          type="button"
          onClick={() => onChange(opt.days)}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
            value === opt.days
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SellerList({
  rows,
  variant,
  emptyMessage,
}: {
  rows: InventoryAnalytics["topSellers"];
  variant: "top" | "bottom";
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="py-3 text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.itemId}
          className="flex items-start justify-between gap-2 text-xs"
        >
          <div className="min-w-0 flex-1">
            <span className="mr-1.5 font-medium text-muted-foreground">
              {index + 1}.
            </span>
            <span className="font-medium leading-tight">{row.label}</span>
            {variant === "bottom" && row.stockQty > 0 ? (
              <p className="mt-0.5 pl-4 text-[10px] text-muted-foreground">
                {row.stockQty} in stock
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums">{row.qtySold} sold</p>
            {row.revenueRupees > 0 ? (
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatRupees(row.revenueRupees)}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

type InventoryInsightsPanelProps = {
  orgId: string | null;
  enabled: boolean;
};

export function InventoryInsightsPanel({ orgId, enabled }: InventoryInsightsPanelProps) {
  const [salesDays, setSalesDays] = useState(30);

  const analyticsQuery = useQuery({
    queryKey: orgId
      ? queryKeys.modules.shop.inventoryAnalytics(orgId, salesDays)
      : ["disabled"],
    queryFn: () =>
      apiFetch<InventoryAnalytics>(
        `/api/v1/shop/inventory/analytics?days=${salesDays}`
      ),
    enabled: !!orgId && enabled,
    staleTime: 60_000,
  });

  if (analyticsQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <PageLoader label="Loading insights..." />
      </div>
    );
  }

  if (analyticsQuery.error) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-destructive">
          {analyticsQuery.error instanceof Error
            ? analyticsQuery.error.message
            : "Failed to load insights"}
        </p>
      </div>
    );
  }

  if (!analyticsQuery.data) return null;

  const { snapshot, topSellers, bottomSellers } = analyticsQuery.data;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-4 w-4 text-primary" />
            Stock snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                SKUs
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{snapshot.skuCount}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Units
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{snapshot.totalUnits}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Package className="h-3 w-3" />
                Stock value
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums leading-tight">
                {formatRupees(snapshot.stockValueRupees)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Alerts
              </p>
              <div className="mt-1 space-y-0.5">
                {snapshot.lowStockCount > 0 ? (
                  <p className="flex items-center gap-1 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {snapshot.lowStockCount} low
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Stock OK</p>
                )}
                {snapshot.noBarcodeCount > 0 ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-amber-700">
                    <Barcode className="h-3 w-3" />
                    {snapshot.noBarcodeCount} no barcode
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Top sellers
          </CardTitle>
          <PeriodPicker value={salesDays} onChange={setSalesDays} />
        </CardHeader>
        <CardContent>
          <SellerList
            rows={topSellers}
            variant="top"
            emptyMessage="No linked inventory sales in this period. Sell from stock at counter to track."
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-amber-600" />
            Slow movers
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">In stock · {salesDays}d</span>
        </CardHeader>
        <CardContent>
          <SellerList
            rows={bottomSellers}
            variant="bottom"
            emptyMessage="No in-stock items to rank yet."
          />
          <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">
            Items with the fewest sales while still in stock — consider promos or less reordering.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
