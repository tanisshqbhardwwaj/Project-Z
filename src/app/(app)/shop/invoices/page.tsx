"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Plus, Receipt, Search, Settings, Users } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
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
import { useShopStaffUi } from "@/hooks/use-shop-staff-ui";

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
  const {
    isStaffLimitedView,
    canViewCustomers,
    canEditInvoiceSettings,
    canCreateInvoice,
    canViewCustomerDetails,
  } = useShopStaffUi();
  const orgId = activeOrganizationId;
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");

  const [search, setSearch] = useState("");
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isStaffLimitedView) return;
    const fromUrl = searchParams.get("customerId");
    if (fromUrl) setCustomerIdFilter(fromUrl);
  }, [searchParams, isStaffLimitedView]);

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
        customerId: isStaffLimitedView ? undefined : customerIdFilter ?? undefined,
        limit: 25,
      }, cursor),
    enabled: !!orgId && salesEnabled,
    search,
  });

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

  if (isInitialLoading) return <PageLoader label="Loading invoices..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load invoices"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaffLimitedView ? "My bills" : title}
        description={
          isStaffLimitedView
            ? "Search by bill number — customer details are hidden"
            : "Search by customer name, phone, or bill number"
        }
        actions={
          <>
            {canViewCustomers ? (
              <Link href="/shop/customers">
                <Button variant="outline" size="lg" className="rounded-xl">
                  <Users className="mr-2 h-5 w-5" />
                  Customers
                </Button>
              </Link>
            ) : null}
            {canEditInvoiceSettings ? (
              <Link href="/shop/invoices/settings">
                <Button variant="outline" size="lg" className="rounded-xl">
                  <Settings className="mr-2 h-5 w-5" />
                  Invoice settings
                </Button>
              </Link>
            ) : null}
            {canCreateInvoice ? (
              <Link href="/shop/invoices/new">
                <Button size="lg" className="rounded-xl">
                  <Plus className="mr-2 h-5 w-5" />
                  New invoice
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isStaffLimitedView) setCustomerIdFilter(null);
          }}
          className="h-11 rounded-xl pl-10"
          placeholder={
            isStaffLimitedView
              ? "Search bill number"
              : "Search customer name, phone, or bill #"
          }
          aria-busy={isSearchPending}
        />
      </div>

      {!isStaffLimitedView && customerIdFilter ? (
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
            {isStaffLimitedView ? "Your recent bills" : "Recent invoices"}
            <ListFetchIndicator active={isSearchPending} className="ml-1" />
            {search.trim() ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({invoices.length} loaded)
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={
                search.trim() ? "No invoices match your search" : "No invoices yet"
              }
              description={
                search.trim()
                  ? isStaffLimitedView
                    ? "Try a different bill number."
                    : "Try a different bill number or customer name."
                  : isStaffLimitedView
                    ? "Bills you create will appear here."
                    : "Create your first invoice to start tracking sales."
              }
            >
              {canCreateInvoice && !search.trim() ? (
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
                      {!isStaffLimitedView ? (
                        <th className="px-4 py-3 font-medium">Date</th>
                      ) : null}
                      {canViewCustomerDetails ? (
                        <th className="px-4 py-3 font-medium">Customer</th>
                      ) : null}
                      {!isStaffLimitedView ? (
                        <th className="px-4 py-3 font-medium">Payment</th>
                      ) : null}
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
                        {!isStaffLimitedView ? (
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleString("en-IN")}
                          </td>
                        ) : null}
                        {canViewCustomerDetails ? (
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
                        ) : null}
                        {!isStaffLimitedView ? (
                          <td className="px-4 py-3">{inv.paymentMethod}</td>
                        ) : null}
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatINR(inv.totalPaise)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/shop/invoices/${inv.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl">
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              {isStaffLimitedView ? "View items" : "View / Print"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
