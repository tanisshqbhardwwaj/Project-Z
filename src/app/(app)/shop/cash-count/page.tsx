"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { useActivePlan } from "@/hooks/use-active-plan";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import {
  canAccessReportFeature,
  minimumPlanLabelForReportFeature,
} from "@/lib/billing/report-entitlements";
import {
  INR_CASH_DENOMINATIONS,
  emptyDenominationCounts,
  normalizeDenominationCounts,
  totalPaiseFromDenominations,
  type CashDenominationCounts,
} from "@/lib/shop/cash-denominations";
import { formatINR } from "@/lib/finance/money";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { cn } from "@/lib/utils";

type CashCountResponse = {
  date: string;
  countType: string;
  record: {
    id: string;
    denominations: CashDenominationCounts;
    totalPaise: string;
    openingFloatPaise: string;
    expectedPaise: string | null;
    variancePaise: string | null;
    notes: string | null;
    createdBy: { name: string };
  } | null;
  movement: {
    cashSalesPaise: string;
    cashExpensesPaise: string;
    netCashMovementPaise: string;
  };
  suggestedOpeningFloatPaise: string;
};

type HistoryRow = {
  id: string;
  countDate: string;
  countType: string;
  totalPaise: string;
  variancePaise: string | null;
  createdBy: { name: string };
};

export default function ShopCashCountPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const plan = useActivePlan();
  const enabled = isModuleEnabled(enabledModules, "shop_expenses");
  const canManage = role ? hasPermission(role, "shop.expense.manage") : false;
  const planOk = canAccessReportFeature(plan, "cash-denomination");
  const { error, clear, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [countType, setCountType] = useState<"OPENING" | "CLOSING">("CLOSING");
  const [counts, setCounts] = useState(emptyDenominationCounts);
  const [openingFloat, setOpeningFloat] = useState("");
  const [notes, setNotes] = useState("");

  const queryKey = orgId
    ? [...queryKeys.modules.shop.cashCounts(orgId), date, countType]
    : ["disabled"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<CashCountResponse>(
        `/api/v1/shop/cash-counts?date=${date}&countType=${countType}`
      ),
    enabled: !!orgId && enabled && planOk,
  });

  const historyQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.cashCountHistory(orgId) : ["disabled"],
    queryFn: () => apiFetch<HistoryRow[]>("/api/v1/shop/cash-counts?list=1"),
    enabled: !!orgId && enabled && planOk,
  });

  useEffect(() => {
    if (!data) return;
    if (data.record) {
      setCounts(normalizeDenominationCounts(data.record.denominations));
      setOpeningFloat(String(Number(data.record.openingFloatPaise) / 100));
      setNotes(data.record.notes ?? "");
    } else {
      setCounts(emptyDenominationCounts());
      setOpeningFloat(String(Number(data.suggestedOpeningFloatPaise) / 100));
      setNotes("");
    }
  }, [data]);

  const countedTotalPaise = totalPaiseFromDenominations(counts);
  const openingPaise = BigInt(Math.round((Number(openingFloat) || 0) * 100));
  const expectedPaise = data
    ? openingPaise + BigInt(data.movement.netCashMovementPaise)
    : BigInt(0);
  const variancePaise = countedTotalPaise - expectedPaise;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/shop/cash-counts", {
        method: "POST",
        body: JSON.stringify({
          date,
          countType,
          denominations: counts,
          openingFloatRupees: Number(openingFloat) || 0,
          notes: notes.trim() || null,
        }),
      }),
    onSuccess: () => {
      clear();
      if (!orgId) return;
      qc.invalidateQueries({ queryKey: queryKeys.modules.shop.cashCounts(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.modules.shop.cashCountHistory(orgId) });
    },
    onError: applyError,
  });

  if (!enabled) {
    return (
      <p className="p-8 text-muted-foreground">Enable the Expenses module to use cash counts.</p>
    );
  }

  if (!planOk) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <Banknote className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Cash denomination tracking</h1>
        <p className="text-sm text-muted-foreground">
          Available on the {minimumPlanLabelForReportFeature("cash-denomination")} plan and above.
        </p>
        <Link href="/settings/billing">
          <Button className="rounded-xl">View plans</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) return <PageLoader label="Loading cash count..." />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cash denomination count</h1>
          <p className="text-sm text-muted-foreground">
            Count notes and coins, then compare against expected cash in the drawer.
          </p>
        </div>
        <Link href="/shop/reports">
          <Button variant="outline" className="gap-1 rounded-xl">
            <ChevronLeft className="h-4 w-4" />
            Reports
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-1">
            {(["OPENING", "CLOSING"] as const).map((t) => (
              <Button
                key={t}
                variant={countType === t ? "default" : "outline"}
                size="sm"
                className="rounded-xl capitalize"
                onClick={() => setCountType(t)}
              >
                {t.toLowerCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cash sales</p>
              <p className="text-lg font-bold">{formatINR(data.movement.cashSalesPaise)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cash expenses</p>
              <p className="text-lg font-bold">{formatINR(data.movement.cashExpensesPaise)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net cash movement</p>
              <p className="text-lg font-bold">{formatINR(data.movement.netCashMovementPaise)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Count denominations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Opening float (₹)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className="h-10 max-w-xs rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Cash already in the drawer at start of day (previous closing is suggested).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {INR_CASH_DENOMINATIONS.map((denom) => (
              <div key={denom.key} className="flex items-center gap-3">
                <Label className="w-14 shrink-0">{denom.label}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={counts[denom.key] || ""}
                  onChange={(e) =>
                    setCounts((prev) => ({
                      ...prev,
                      [denom.key]: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-10 rounded-xl"
                  disabled={!canManage}
                />
              </div>
            ))}
            <div className="flex items-center gap-3 sm:col-span-2">
              <Label className="w-14 shrink-0">Coins</Label>
              <Input
                type="number"
                min={0}
                step="1"
                placeholder="Total ₹ in coins"
                value={counts.coins || ""}
                onChange={(e) =>
                  setCounts((prev) => ({
                    ...prev,
                    coins: Number(e.target.value) || 0,
                  }))
                }
                className="h-10 max-w-xs rounded-xl"
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Counted total</p>
              <p className="text-xl font-bold">{formatINR(countedTotalPaise.toString())}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected in drawer</p>
              <p className="text-xl font-bold">{formatINR(expectedPaise.toString())}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variance</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  variancePaise === BigInt(0)
                    ? "text-emerald-600"
                    : variancePaise > BigInt(0)
                      ? "text-amber-600"
                      : "text-destructive"
                )}
              >
                {variancePaise >= BigInt(0) ? "+" : ""}
                {formatINR(variancePaise.toString())}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — e.g. paid supplier from drawer"
              className="h-10 rounded-xl"
              disabled={!canManage}
            />
          </div>

          <FormFeedback error={error} />

          {canManage ? (
            <Button
              className="rounded-xl"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(undefined)}
            >
              {saveMutation.isPending ? "Saving..." : "Save count"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">View only — ask an owner to save counts.</p>
          )}
        </CardContent>
      </Card>

      {historyQuery.data && historyQuery.data.length > 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent counts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {historyQuery.data.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {new Date(row.countDate).toLocaleDateString("en-IN")} ·{" "}
                    <span className="capitalize">{row.countType.toLowerCase()}</span>
                  </span>
                  <span className="font-medium">{formatINR(row.totalPaise)}</span>
                  {row.variancePaise ? (
                    <span
                      className={cn(
                        "text-xs",
                        BigInt(row.variancePaise) === BigInt(0)
                          ? "text-emerald-600"
                          : "text-amber-700"
                      )}
                    >
                      Δ {formatINR(row.variancePaise)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
