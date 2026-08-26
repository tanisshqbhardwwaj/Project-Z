"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Package,
  Plus,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Tag,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyDisplay } from "@/components/finance/money-display";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
import {
  resolveShopDashboardBounds,
  type ShopDashboardPeriod,
} from "@/lib/shop/dashboard-period";
import {
  filterSortInvoices,
  type InvoiceSort,
} from "@/lib/shop/invoice-list-filters";
import { StaffSalesSidebar } from "@/components/shop/staff-sales-sidebar";
import { DashboardInvoiceFilters } from "@/components/shop/dashboard-invoice-filters";
import { cn } from "@/lib/utils";

type DashboardPeriod = ShopDashboardPeriod;

type ShopDashboardData = {
  period: DashboardPeriod;
  salesPaise: string;
  invoiceCount: number;
  lowStockCount: number;
  stockValueRupees: number;
  profitPaise?: string;
  netProfitPaise?: string;
  purchaseTotalPaise?: string;
  expenseTotalPaise?: string;
  outstandingCreditPaise?: string;
  totalProducts?: number;
  totalCustomers?: number;
  totalStaff?: number;
  paymentSplit: Record<string, number>;
  salesByStaff: Array<{
    name: string;
    salesPaise: string;
    invoiceCount: number;
    targetRupees: number;
    progressPercent: number | null;
  }>;
  recentInvoices: Array<{
    id: string;
    billNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
    totalPaise: string;
    paymentMethod: string;
    createdAt: string;
  }>;
  heldBillsCount?: number;
  activeOffersCount?: number;
  recentReturnsCount?: number;
  topCustomer?: { name: string; totalPaise: string; orderCount: number } | null;
};

export function ShopkeeperDashboard() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const udhaarEnabled = isModuleEnabled(enabledModules, "shop_udhaar");
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [exactDate, setExactDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePayment, setInvoicePayment] = useState("all");
  const [invoiceSort, setInvoiceSort] = useState<InvoiceSort>("newest");
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const dashboardQueryKey =
    orgId && salesEnabled
      ? [...queryKeys.modules.shop.dashboard(orgId), period, period === "date" ? exactDate : ""]
      : ["disabled"];

  const { data, isLoading, error } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (period === "date") params.set("date", exactDate);
      return apiFetch<ShopDashboardData>(`/api/v1/shop/dashboard?${params}`);
    },
    enabled: !!orgId && salesEnabled,
  });

  const periodLabel = resolveShopDashboardBounds(period, exactDate).label;

  const paymentMethods = useMemo(
    () => Object.keys(data?.paymentSplit ?? {}).sort(),
    [data?.paymentSplit]
  );

  const filteredInvoices = useMemo(
    () =>
      filterSortInvoices(data?.recentInvoices ?? [], {
        search: invoiceSearch,
        payment: invoicePayment,
        sort: invoiceSort,
      }),
    [data?.recentInvoices, invoiceSearch, invoicePayment, invoiceSort]
  );

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Invoices in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading shop dashboard..." />;
  if (error || !data) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load dashboard"}
      </p>
    );
  }

  const paymentSummary = Object.entries(data.paymentSplit)
    .map(([method, count]) => `${method} ${count}`)
    .join(" · ");

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Shop dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Sales, staff performance, and recent invoices
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border p-1">
              {(["today", "month", "date"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === "today" ? "Today" : p === "month" ? "This month" : "Date"}
                </button>
              ))}
            </div>
            {period === "date" ? (
              <Input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="h-10 w-auto rounded-xl"
              />
            ) : null}
          </div>
          <Link href="/shop/invoices/new" className="w-full sm:w-auto">
            <Button size="lg" className="w-full rounded-xl sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              New invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {periodLabel}&apos;s sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.salesPaise} className="text-2xl" />
            {paymentSummary ? (
              <p className="mt-1 text-xs text-muted-foreground">{paymentSummary}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {periodLabel}&apos;s profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.profitPaise ?? "0"} className="text-2xl text-emerald-600" />
            {data.netProfitPaise && (
              <p className="mt-1 text-xs text-muted-foreground">
                Net {formatINR(data.netProfitPaise ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchases ({periodLabel.toLowerCase()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.purchaseTotalPaise ?? "0"} className="text-2xl" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses ({periodLabel.toLowerCase()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.expenseTotalPaise ?? "0"} className="text-2xl" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoices ({periodLabel.toLowerCase()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{data.invoiceCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${data.lowStockCount > 0 ? "text-destructive" : ""}`}
            >
              {data.lowStockCount}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(data.stockValueRupees)}
            </p>
          </CardContent>
        </Card>
        <Link
          href={udhaarEnabled ? "/shop/udhaar" : "/settings/organization"}
          className="block h-full"
        >
        <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding udhaar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.outstandingCreditPaise ?? "0"} className="text-2xl text-amber-600" />
            {!udhaarEnabled ? (
              <p className="mt-1 text-xs text-muted-foreground">Enable credit ledger in Features</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Open customer ledger</p>
            )}
          </CardContent>
        </Card>
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Shop overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/shop/inventory" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.totalProducts ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shop/customers" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.totalCustomers ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/staff" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.totalStaff ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shop/customers/top" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top customer (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topCustomer ? (
                  <>
                    <p className="truncate font-semibold">{data.topCustomer.name}</p>
                    <MoneyDisplay paise={data.topCustomer.totalPaise} className="text-lg" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No sales yet</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/shop/offers" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.activeOffersCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Tap to manage offers</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shop/invoices/new" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Held bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.heldBillsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">30 min max · billing screen</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shop/returns" className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent returns (7d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{data.recentReturnsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Tap for return history</p>
              </CardContent>
            </Card>
          </Link>
          <Link href={udhaarEnabled ? "/shop/udhaar" : "/settings/organization"} className="block h-full">
            <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credit ledger
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyDisplay paise={data.outstandingCreditPaise ?? "0"} className="text-2xl text-amber-600" />
                <p className="text-xs text-muted-foreground">
                  {udhaarEnabled ? "Udhaar accounts & payments" : "Enable in Features"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {data.salesByStaff.length > 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <button
            type="button"
            onClick={() => {
              setSelectedStaff(null);
              setStaffPanelOpen(true);
            }}
            className="w-full text-left"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sales by staff ({periodLabel.toLowerCase()})
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap to open staff breakdown and invoice list
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </CardHeader>
          </button>
          <CardContent className="space-y-3 pt-0">
            {data.salesByStaff.slice(0, 3).map((staff) => (
              <div key={staff.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{staff.name}</span>
                  <span className="tabular-nums">
                    {formatINR(staff.salesPaise)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {staff.invoiceCount} bill{staff.invoiceCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </div>
                {period === "month" && staff.targetRupees > 0 ? (
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          (staff.progressPercent ?? 0) >= 100
                            ? "bg-emerald-500"
                            : "bg-primary"
                        )}
                        style={{ width: `${staff.progressPercent ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {staff.progressPercent ?? 0}% of ₹
                      {staff.targetRupees.toLocaleString("en-IN")} target
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
            {data.salesByStaff.length > 3 ? (
              <p className="text-xs text-muted-foreground">
                +{data.salesByStaff.length - 3} more — open panel for full list
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <StaffSalesSidebar
        open={staffPanelOpen}
        period={period}
        exactDate={exactDate}
        periodLabel={periodLabel}
        staffList={data.salesByStaff}
        paymentMethods={paymentMethods}
        selectedStaff={selectedStaff}
        onClose={() => {
          setStaffPanelOpen(false);
          setSelectedStaff(null);
        }}
        onSelectStaff={setSelectedStaff}
      />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/shop/invoices/new">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Receipt className="mr-3 h-5 w-5" />
              New invoice
            </Button>
          </Link>
          <Link href="/shop/invoices/settings">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Settings className="mr-3 h-5 w-5" />
              Invoice settings
            </Button>
          </Link>
          {inventoryEnabled ? (
            <Link href="/shop/inventory">
              <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
                <Package className="mr-3 h-5 w-5" />
                Inventory
              </Button>
            </Link>
          ) : null}
          {inventoryEnabled ? (
            <Link href="/shop/inventory/report">
              <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
                <FileText className="mr-3 h-5 w-5" />
                Stock report
              </Button>
            </Link>
          ) : null}
          <Link href="/shop/offers">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Tag className="mr-3 h-5 w-5" />
              Offers & discounts
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Invoices ({periodLabel.toLowerCase()})
            </CardTitle>
            <Link href="/shop/invoices">
              <Button variant="ghost" size="sm" className="rounded-xl">
                View all
              </Button>
            </Link>
          </div>
          <DashboardInvoiceFilters
            search={invoiceSearch}
            onSearchChange={setInvoiceSearch}
            payment={invoicePayment}
            onPaymentChange={setInvoicePayment}
            sort={invoiceSort}
            onSortChange={setInvoiceSort}
            paymentMethods={paymentMethods}
          />
        </CardHeader>
        <CardContent className="divide-y p-0 pt-0">
          {filteredInvoices.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {data.recentInvoices.length === 0
                ? "No invoices in this period."
                : "No invoices match your search or filters."}
            </p>
          ) : (
            filteredInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/shop/invoices/${inv.id}`}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">
                    {inv.customerName
                      ? formatCustomerLabel({
                          name: inv.customerName,
                          phone: inv.customerPhone,
                        })
                      : "Walk-in"}
                    {inv.billNumber ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{inv.billNumber}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleString("en-IN")} ·{" "}
                    {inv.paymentMethod}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {formatINR(inv.totalPaise)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
