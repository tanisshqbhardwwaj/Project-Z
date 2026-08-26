"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { buildCursorListUrl } from "@/lib/api/list-url";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
=======
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
>>>>>>> origin/master
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
<<<<<<< HEAD
import { LoadMoreTrigger } from "@/components/ui/load-more-trigger";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { useInfiniteShopList } from "@/hooks/use-infinite-shop-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ReturnExchangeWizard } from "@/components/shop/return-exchange-wizard";
import { CameraScanButton } from "@/components/shop/camera-scan-button";
=======
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { ReturnExchangeWizard } from "@/components/shop/return-exchange-wizard";
>>>>>>> origin/master
import { ArrowRight, Repeat, RotateCcw, Search } from "lucide-react";

type BillLookup = {
  id: string;
  billNumber: string | null;
  customerName: string | null;
};

type ReturnRow = {
  id: string;
  returnNumber: string;
  type: "RETURN" | "EXCHANGE";
  returnValuePaise: string;
  exchangeValuePaise: string;
  additionalPaidPaise: string;
  refundAmountPaise: string;
  refundMethod: string;
  reason: string;
  notes: string | null;
  customerName: string | null;
  staffName: string | null;
  createdAt: string;
  shopSale: {
    id: string;
    billNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
  };
  lines: {
    id: string;
    productName: string;
    size: string | null;
    variantLabel: string | null;
    returnQty: number;
    isExchangeIn: boolean;
  }[];
  createdBy: { name: string };
  staff: { id: string; name: string; roleTitle: string } | null;
};

type Filter = "all" | "RETURN" | "EXCHANGE";

function lineLabel(line: ReturnRow["lines"][number]): string {
  const qualifier = line.variantLabel ?? (line.size ? `Size ${line.size}` : null);
  const name = qualifier ? `${line.productName} — ${qualifier}` : line.productName;
  return `${name} × ${line.returnQty}`;
}

export default function ShopReturnsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
<<<<<<< HEAD
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
=======
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
>>>>>>> origin/master
  const [billLookup, setBillLookup] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [returnTarget, setReturnTarget] = useState<BillLookup | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  async function findBillForReturn() {
    const bill = billLookup.trim();
    if (!bill) {
      setLookupError("Enter a bill number");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      const sale = await apiFetch<BillLookup>(
        `/api/v1/shop/sales/lookup?bill=${encodeURIComponent(bill)}`
      );
      setReturnTarget(sale);
      setWizardOpen(true);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Could not find that bill"
      );
    } finally {
      setLookupLoading(false);
    }
  }

<<<<<<< HEAD
  const {
    items: rows,
    isInitialLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteShopList<ReturnRow>({
    queryKey: orgId ? queryKeys.modules.shop.returns(orgId) : ["disabled"],
    buildUrl: (cursor) =>
      buildCursorListUrl("/api/v1/shop/returns", { limit: 25 }, cursor),
    enabled: !!orgId,
    search: "",
  });

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
=======
  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.returns(orgId) : ["disabled"],
    queryFn: () => apiFetch<ReturnRow[]>("/api/v1/shop/returns"),
    enabled: !!orgId,
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
>>>>>>> origin/master
    return rows.filter((row) => {
      if (filter !== "all" && row.type !== filter) return false;
      if (!query) return true;
      const haystack = [
        row.returnNumber,
        row.shopSale.billNumber ?? "",
        row.customerName ?? row.shopSale.customerName ?? "",
        row.staffName ?? row.staff?.name ?? "",
        ...row.lines.map((l) => `${l.productName} ${l.size ?? ""}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
<<<<<<< HEAD
  }, [rows, filter, debouncedSearch]);
=======
  }, [rows, filter, search]);
>>>>>>> origin/master

  const totals = useMemo(() => {
    let refunded = BigInt(0);
    let collected = BigInt(0);
    for (const row of rows) {
      refunded += BigInt(row.refundAmountPaise);
      collected += BigInt(row.additionalPaidPaise);
    }
    return {
      refunded: refunded.toString(),
      collected: collected.toString(),
      returns: rows.filter((r) => r.type === "RETURN").length,
      exchanges: rows.filter((r) => r.type === "EXCHANGE").length,
    };
  }, [rows]);

<<<<<<< HEAD
  if (isInitialLoading) return <PageLoader label="Loading returns..." />;
=======
  if (isLoading) return <PageLoader label="Loading returns..." />;
>>>>>>> origin/master
  if (error) {
    return (
      <p className="p-8 text-destructive">
        {error instanceof Error ? error.message : "Failed to load returns"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Returns & exchanges</h1>
          <p className="text-sm text-muted-foreground">
            Every return and exchange is its own receipt. Original bills stay
            untouched.
          </p>
        </div>
        <Link href="/shop/invoices">
          <Button variant="outline" className="rounded-xl">
            Open invoices
          </Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-medium">Return or exchange by bill number</p>
            <p className="text-sm text-muted-foreground">
              Any cashier can process a return on another cashier&apos;s bill —
              enter the full bill number (e.g. INV-4-26-27-00018).
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="bill-lookup">Bill number</Label>
<<<<<<< HEAD
              <div className="flex gap-2">
                <Input
                  id="bill-lookup"
                  value={billLookup}
                  onChange={(e) => {
                    setBillLookup(e.target.value.toUpperCase());
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void findBillForReturn();
                    }
                  }}
                  placeholder="INV-4-26-27-00018"
                  className="h-12 rounded-xl font-mono text-base uppercase"
                />
                <CameraScanButton
                  onCode={(code) => {
                    if (!code) return;
                    setBillLookup(code.toUpperCase());
                    setLookupError(null);
                  }}
                />
              </div>
=======
              <Input
                id="bill-lookup"
                value={billLookup}
                onChange={(e) => {
                  setBillLookup(e.target.value.toUpperCase());
                  setLookupError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void findBillForReturn();
                  }
                }}
                placeholder="INV-4-26-27-00018"
                className="h-11 rounded-xl font-mono uppercase"
              />
>>>>>>> origin/master
            </div>
            <Button
              type="button"
              className="h-11 rounded-xl sm:shrink-0"
              disabled={lookupLoading}
              onClick={() => void findBillForReturn()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {lookupLoading ? "Finding…" : "Start return"}
            </Button>
          </div>
          {lookupError ? (
            <p className="text-sm text-destructive">{lookupError}</p>
          ) : null}
        </CardContent>
      </Card>

      {returnTarget ? (
        <ReturnExchangeWizard
          saleId={returnTarget.id}
          billNumber={returnTarget.billNumber}
          customerName={returnTarget.customerName}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onCompleted={() => {
<<<<<<< HEAD
            if (orgId) {
              qc.invalidateQueries({ queryKey: queryKeys.modules.shop.returns(orgId) });
            }
=======
>>>>>>> origin/master
            setBillLookup("");
            setReturnTarget(null);
          }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Returns", value: String(totals.returns) },
          { label: "Exchanges", value: String(totals.exchanges) },
          { label: "Refunded", value: formatINR(totals.refunded) },
          { label: "Collected on exchange", value: formatINR(totals.collected) },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, bill, customer, staff, product or size…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All (${rows.length})`],
              ["RETURN", `Returns (${totals.returns})`],
              ["EXCHANGE", `Exchanges (${totals.exchanges})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
<<<<<<< HEAD
          <CardContent>
            <EmptyState
              icon={RotateCcw}
              title={
                rows.length === 0
                  ? "No returns or exchanges yet"
                  : "Nothing matches that search"
              }
              description={
                rows.length === 0
                  ? "Open an invoice and use Return / Exchange to start one."
                  : "Try a different search or filter."
              }
            />
=======
          <CardContent className="py-12 text-center">
            <RotateCcw className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">
              {rows.length === 0
                ? "No returns or exchanges yet"
                : "Nothing matches that search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Open an invoice and use Return / Exchange to start one."
                : "Try a different search or filter."}
            </p>
>>>>>>> origin/master
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const returned = row.lines.filter((l) => !l.isExchangeIn);
            const replacements = row.lines.filter((l) => l.isExchangeIn);
            const refund = BigInt(row.refundAmountPaise);
            const extra = BigInt(row.additionalPaidPaise);
            return (
              <Card key={row.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/shop/returns/${row.id}`}
                      className="text-base font-semibold text-primary hover:underline"
                    >
                      {row.returnNumber}
                    </Link>
                    <Badge
                      variant={row.type === "EXCHANGE" ? "default" : "secondary"}
                      className="rounded-full text-[10px]"
                    >
                      {row.type === "EXCHANGE" ? (
                        <>
                          <Repeat className="mr-1 h-3 w-3" />
                          Exchange
                        </>
                      ) : (
                        "Return"
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/shop/invoices/${row.shopSale.id}`}
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Bill {row.shopSale.billNumber ?? "—"}
                    </Link>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{returned.map(lineLabel).join(", ") || "—"}</span>
                    {replacements.length > 0 ? (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-primary">
                          {replacements.map(lineLabel).join(", ")}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {row.customerName ?? row.shopSale.customerName ?? "Walk-in"} ·{" "}
                      {row.reason.replace(/_/g, " ").toLowerCase()} ·{" "}
                      {row.staff?.name ?? row.staffName ?? row.createdBy.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        extra > BigInt(0)
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                          : refund > BigInt(0)
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {extra > BigInt(0)
                        ? `Customer paid ${formatINR(row.additionalPaidPaise)}`
                        : refund > BigInt(0)
                          ? `Refunded ${formatINR(row.refundAmountPaise)} · ${
                              row.refundMethod === "CREDIT"
                                ? "store credit"
                                : row.refundMethod.toLowerCase()
                            }`
                          : "Even exchange"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
<<<<<<< HEAD
          <LoadMoreTrigger
            hasMore={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
=======
>>>>>>> origin/master
        </div>
      )}
    </div>
  );
}
