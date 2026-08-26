"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/finance/money";

type ProfitData = {
  revenuePaise: string;
  cogsPaise: string;
  grossProfitPaise: string;
  expensePaise: string;
  netProfitPaise: string;
  expensesByCategory: Array<{ name: string; totalPaise: string }>;
};

export default function ExpenseReportPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "shop_expenses");

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.profit(orgId, `${from}-${to}`)] : ["disabled"],
    queryFn: () => apiFetch<ProfitData>(`/api/v1/shop/profit?from=${from}&to=${to}`),
    enabled: !!orgId && enabled,
  });

  if (!enabled) return <p className="text-muted-foreground">Enable Expenses module first.</p>;
  if (isLoading) return <PageLoader label="Loading report..." />;
  if (queryError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <div>
          <h2 className="text-xl font-semibold">Could not load report</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {queryError instanceof Error ? queryError.message : "Failed to load report"}
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit & expense report</h1>
          <p className="text-sm text-muted-foreground">Gross profit = sales − cost of goods. Net = gross − expenses.</p>
        </div>
        <Link href="/shop/expenses"><Button variant="outline" className="rounded-xl">Back</Button></Link>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <Button className="rounded-xl" onClick={() => refetch()}>Apply</Button>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold">{formatINR(data.revenuePaise)}</p></CardContent></Card>
            <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cost of goods</p><p className="text-xl font-bold">{formatINR(data.cogsPaise)}</p></CardContent></Card>
            <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gross profit</p><p className="text-xl font-bold text-emerald-600">{formatINR(data.grossProfitPaise)}</p></CardContent></Card>
            <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Business expenses</p><p className="text-xl font-bold">{formatINR(data.expensePaise)}</p></CardContent></Card>
          </div>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader><CardTitle className="text-lg">Net profit: {formatINR(data.netProfitPaise)}</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm font-medium">Category breakdown</p>
              {data.expensesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses in this period.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.expensesByCategory.map((c) => (
                    <li key={c.name} className="flex justify-between border-b pb-2">
                      <span>{c.name}</span>
                      <span>{formatINR(c.totalPaise)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
