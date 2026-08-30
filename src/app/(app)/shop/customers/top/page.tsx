"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/finance/money";
import {
  ReportDateRangeBar,
  type ReportPeriodPreset,
} from "@/components/shop/report-date-range";

type TopCustomersResponse = {
  period: string;
  from?: string;
  to?: string;
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

const PRESET_TO_API: Record<Exclude<ReportPeriodPreset, "range" | "date">, "7d" | "30d" | "90d"> = {
  today: "7d",
  week: "7d",
  month: "30d",
};

export default function TopCustomersPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [preset, setPreset] = useState<ReportPeriodPreset>("month");
  const [exactDate, setExactDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sort, setSort] = useState<"amount" | "orders" | "items">("amount");

  const queryString = useMemo(() => {
    if (preset === "range") {
      return `period=custom&from=${rangeFrom}&to=${rangeTo}&sort=${sort}&limit=25`;
    }
    if (preset === "date") {
      return `period=custom&from=${exactDate}&to=${exactDate}&sort=${sort}&limit=25`;
    }
    const period = PRESET_TO_API[preset];
    return `period=${period}&sort=${sort}&limit=25`;
  }, [preset, rangeFrom, rangeTo, exactDate, sort]);

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.topCustomers(orgId, queryString) : ["disabled"],
    queryFn: () =>
      apiFetch<TopCustomersResponse>(`/api/v1/shop/customers/top?${queryString}`),
    enabled: !!orgId,
  });

  const periodLabel = useMemo(() => {
    if (preset === "range" && rangeFrom && rangeTo) {
      const from = new Date(rangeFrom).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      const to = new Date(rangeTo).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${from} – ${to}`;
    }
    if (preset === "date" && exactDate) {
      return new Date(exactDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (preset === "today") return "Last 7 days";
    if (preset === "week") return "This week";
    return "Last 30 days";
  }, [preset, rangeFrom, rangeTo, exactDate]);

  if (isLoading) return <PageLoader label="Loading top customers..." />;
  if (error) {
    return (
      <p className="p-8 text-destructive">
        {error instanceof Error ? error.message : "Failed to load analytics"}
      </p>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Top customers</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by purchase history (excludes cancelled invoices; returns deducted)
          </p>
        </div>
        <Link href="/shop/reports">
          <Button variant="outline" className="rounded-xl">
            All reports
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <ReportDateRangeBar
          preset={preset}
          onPresetChange={setPreset}
          date={exactDate}
          onDateChange={setExactDate}
          from={rangeFrom}
          to={rangeTo}
          onFromChange={setRangeFrom}
          onToChange={setRangeTo}
          presets={["today", "week", "month", "date", "range"]}
        />
        <span className="hidden h-8 w-px bg-border sm:inline" />
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
