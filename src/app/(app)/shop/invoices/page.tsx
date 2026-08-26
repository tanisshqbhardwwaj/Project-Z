"use client";

import Link from "next/link";
<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
=======
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
>>>>>>> origin/master
import { Plus, Printer, Receipt, Search, Settings, Users } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
<<<<<<< HEAD
import { queryKeys } from "@/lib/query/keys";
import { buildCursorListUrl } from "@/lib/api/list-url";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadMoreTrigger } from "@/components/ui/load-more-trigger";
import { ListFetchIndicator } from "@/components/ui/list-fetch-indicator";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { useInfiniteShopList } from "@/hooks/use-infinite-shop-list";
=======
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
>>>>>>> origin/master

type ShopSale = {
  id: string;
  billNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  totalPaise: string;
  paymentMethod: string;
  createdAt: string;
};

export default function InvoicesPage() {
  const { activeBusinessType, activeOrganizationId, enabledModules } = useAuthStore();
  const orgId = activeOrganizationId;
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");

  const [search, setSearch] = useState("");
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromUrl = searchParams.get("customerId");
    if (fromUrl) setCustomerIdFilter(fromUrl);
  }, [searchParams]);

<<<<<<< HEAD
  const {
    items: invoices,
    isInitialLoading,
    isSearchPending,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteShopList<ShopSale>({
    queryKey: orgId
      ? [...queryKeys.modules.shop.invoices(orgId), customerIdFilter]
      : ["disabled"],
    buildUrl: (cursor, debouncedSearch) =>
      buildCursorListUrl("/api/v1/shop/sales", {
        q: debouncedSearch.trim() || undefined,
        customerId: customerIdFilter ?? undefined,
        limit: 25,
      }, cursor),
    enabled: !!orgId && salesEnabled,
    search,
=======
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (customerIdFilter) params.set("customerId", customerIdFilter);
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [search, customerIdFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: orgId
      ? [...queryKeys.modules.shop.invoices(orgId), search, customerIdFilter]
      : ["disabled"],
    queryFn: () => apiFetch<ShopSale[]>(`/api/v1/shop/sales${queryString}`),
    enabled: !!orgId && salesEnabled,
>>>>>>> origin/master
  });

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

<<<<<<< HEAD
  if (isInitialLoading) return <PageLoader label="Loading invoices..." />;
=======
  if (isLoading) return <PageLoader label="Loading invoices..." />;
>>>>>>> origin/master
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load invoices"}
      </p>
    );
  }

<<<<<<< HEAD
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Search by customer name, phone, or bill number"
        actions={
          <>
            <Link href="/shop/customers">
              <Button variant="outline" size="lg" className="rounded-xl">
                <Users className="mr-2 h-5 w-5" />
                Customers
              </Button>
            </Link>
            <Link href="/shop/invoices/settings">
              <Button variant="outline" size="lg" className="rounded-xl">
                <Settings className="mr-2 h-5 w-5" />
                Invoice settings
              </Button>
            </Link>
            <Link href="/shop/invoices/new">
              <Button size="lg" className="rounded-xl">
                <Plus className="mr-2 h-5 w-5" />
                New invoice
              </Button>
            </Link>
          </>
        }
      />
=======
  const invoices = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Search by customer name, phone, or bill number
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/shop/customers">
            <Button variant="outline" size="lg" className="rounded-xl">
              <Users className="mr-2 h-5 w-5" />
              Customers
            </Button>
          </Link>
          <Link href="/shop/invoices/settings">
            <Button variant="outline" size="lg" className="rounded-xl">
              <Settings className="mr-2 h-5 w-5" />
              Invoice settings
            </Button>
          </Link>
          <Link href="/shop/invoices/new">
            <Button size="lg" className="rounded-xl">
              <Plus className="mr-2 h-5 w-5" />
              New invoice
            </Button>
          </Link>
        </div>
      </div>
>>>>>>> origin/master

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCustomerIdFilter(null);
          }}
          className="h-11 rounded-xl pl-10"
          placeholder="Search customer name, phone, or bill #"
<<<<<<< HEAD
          aria-busy={isSearchPending}
=======
>>>>>>> origin/master
        />
      </div>

      {customerIdFilter ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered by customer</span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => setCustomerIdFilter(null)}
          >
            Clear filter
          </Button>
        </div>
      ) : null}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent invoices
<<<<<<< HEAD
            <ListFetchIndicator active={isSearchPending} className="ml-1" />
            {search.trim() ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({invoices.length} loaded)
=======
            {search.trim() ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({invoices.length} match{invoices.length === 1 ? "" : "es"})
>>>>>>> origin/master
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
<<<<<<< HEAD
            <EmptyState
              icon={Receipt}
              title={
                search.trim() ? "No invoices match your search" : "No invoices yet"
              }
              description={
                search.trim()
                  ? "Try a different bill number or customer name."
                  : "Create your first invoice to start tracking sales."
              }
            >
              {!search.trim() ? (
                <Link href="/shop/invoices/new">
                  <Button className="rounded-xl">New invoice</Button>
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Bill #</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">
                          {inv.billNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {inv.customerName ? (
                            inv.customerId ? (
                              <button
                                type="button"
                                className="text-left hover:underline"
                                onClick={() => {
                                  setCustomerIdFilter(inv.customerId);
                                  setSearch("");
                                }}
                              >
                                {formatCustomerLabel({
                                  name: inv.customerName,
                                  phone: inv.customerPhone,
                                })}
                              </button>
                            ) : (
                              formatCustomerLabel({
                                name: inv.customerName,
                                phone: inv.customerPhone,
                              })
                            )
                          ) : (
                            "Walk-in"
                          )}
                        </td>
                        <td className="px-4 py-3">{inv.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatINR(inv.totalPaise)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/shop/invoices/${inv.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl">
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              View / Print
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreTrigger
                hasMore={!!hasNextPage}
                isLoading={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
              />
            </>
=======
            <p className="p-6 text-sm text-muted-foreground">
              {search.trim() ? "No invoices match your search." : "No invoices yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Bill #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {inv.billNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        {inv.customerName ? (
                          inv.customerId ? (
                            <button
                              type="button"
                              className="text-left hover:underline"
                              onClick={() => {
                                setCustomerIdFilter(inv.customerId);
                                setSearch("");
                              }}
                            >
                              {formatCustomerLabel({
                                name: inv.customerName,
                                phone: inv.customerPhone,
                              })}
                            </button>
                          ) : (
                            formatCustomerLabel({
                              name: inv.customerName,
                              phone: inv.customerPhone,
                            })
                          )
                        ) : (
                          "Walk-in"
                        )}
                      </td>
                      <td className="px-4 py-3">{inv.paymentMethod}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatINR(inv.totalPaise)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/shop/invoices/${inv.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            View / Print
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
>>>>>>> origin/master
          )}
        </CardContent>
      </Card>
    </div>
  );
}
