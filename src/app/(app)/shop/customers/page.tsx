"use client";

import Link from "next/link";
import { useState } from "react";
<<<<<<< HEAD
import { ArrowLeft, Receipt, Search, Users } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { queryKeys } from "@/lib/query/keys";
import { buildCursorListUrl } from "@/lib/api/list-url";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadMoreTrigger } from "@/components/ui/load-more-trigger";
import { ListFetchIndicator } from "@/components/ui/list-fetch-indicator";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { useInfiniteShopList } from "@/hooks/use-infinite-shop-list";
=======
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCustomerLabel } from "@/lib/shop/customer";
>>>>>>> origin/master

type ShopCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  lastSaleAt: string | null;
  _count: { sales: number };
};

export default function ShopCustomersPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const [search, setSearch] = useState("");

<<<<<<< HEAD
  const {
    items: customers,
    debouncedSearch,
    isInitialLoading,
    isSearchPending,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteShopList<ShopCustomerRow>({
    queryKey: orgId ? queryKeys.modules.shop.customerRegistry(orgId, "list") : ["disabled"],
    buildUrl: (cursor, debouncedSearch) =>
      debouncedSearch.trim()
        ? buildCursorListUrl("/api/v1/shop/customers", { q: debouncedSearch.trim(), limit: 25 }, cursor)
        : buildCursorListUrl("/api/v1/shop/customers", { all: 1, limit: 25 }, cursor),
    enabled: !!orgId && salesEnabled,
    search,
=======
  const { data, isLoading, error } = useQuery({
    queryKey: orgId
      ? queryKeys.modules.shop.customerRegistry(orgId, search || "all")
      : ["disabled"],
    queryFn: () =>
      apiFetch<ShopCustomerRow[]>(
        search.trim()
          ? `/api/v1/shop/customers?q=${encodeURIComponent(search.trim())}`
          : "/api/v1/shop/customers?all=1"
      ),
    enabled: !!orgId && salesEnabled,
>>>>>>> origin/master
  });

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Invoices in Manage Organization → Features.
      </p>
    );
  }

<<<<<<< HEAD
  if (isInitialLoading) return <PageLoader label="Loading customers..." />;
=======
  if (isLoading) return <PageLoader label="Loading customers..." />;
>>>>>>> origin/master
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load customers"}
      </p>
    );
  }

<<<<<<< HEAD
=======
  const customers = data ?? [];

>>>>>>> origin/master
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/shop/invoices"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to invoices
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Saved from invoices — same name is distinguished by mobile number
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl pl-10"
          placeholder="Search by name or phone"
<<<<<<< HEAD
          aria-busy={isSearchPending}
=======
>>>>>>> origin/master
        />
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
<<<<<<< HEAD
          <CardTitle className="flex items-center gap-2">
            {customers.length} customer{customers.length === 1 ? "" : "s"}
            <ListFetchIndicator active={isSearchPending} />
=======
          <CardTitle>
            {customers.length} customer{customers.length === 1 ? "" : "s"}
>>>>>>> origin/master
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customers.length === 0 ? (
<<<<<<< HEAD
            <EmptyState
              icon={Users}
              title={debouncedSearch.trim() ? "No customers match your search" : "No customers yet"}
              description={
                debouncedSearch.trim()
                  ? "Try a different name or phone number."
                  : "Customers appear here when you bill someone with a name."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">GSTIN</th>
                      <th className="px-4 py-3 font-medium">Invoices</th>
                      <th className="px-4 py-3 font-medium">Last bill</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {formatCustomerLabel(c)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {c.gstin ?? "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{c._count.sales}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.lastSaleAt
                            ? new Date(c.lastSaleAt).toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/shop/invoices?customerId=${c.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl">
                              <Receipt className="mr-1 h-3.5 w-3.5" />
                              View bills
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
              {search.trim()
                ? "No customers match your search."
                : "Customers appear here when you bill someone with a name."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">GSTIN</th>
                    <th className="px-4 py-3 font-medium">Invoices</th>
                    <th className="px-4 py-3 font-medium">Last bill</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {formatCustomerLabel(c)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {c.gstin ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{c._count.sales}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.lastSaleAt
                          ? new Date(c.lastSaleAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/shop/invoices?customerId=${c.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            <Receipt className="mr-1 h-3.5 w-3.5" />
                            View bills
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
