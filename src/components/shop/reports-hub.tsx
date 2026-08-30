"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Bell,
  Banknote,
  ClipboardList,
  Lock,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch, getActiveBranchId } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { useActivePlan } from "@/hooks/use-active-plan";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import {
  canAccessReportFeature,
  minimumPlanLabelForReportFeature,
  type ReportFeatureId,
} from "@/lib/billing/report-entitlements";
import { formatINR } from "@/lib/finance/money";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InventoryInsightsPanel } from "@/components/shop/inventory-insights-panel";
import { ChannelReportsPanel } from "@/components/shop/channel-reports-panel";
import {
  ReportDateRangeBar,
  type ReportPeriodPreset,
} from "@/components/shop/report-date-range";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";

type DashboardSummary = {
  salesPaise: string;
  invoiceCount: number;
  profitPaise?: string;
  netProfitPaise?: string;
  lowStockCount: number;
  topCustomer?: { name: string; totalPaise: string; orderCount: number } | null;
};

type ReportCardConfig = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof BarChart3;
  feature?: ReportFeatureId;
  moduleKey?: "shop_expenses" | "shop_sales" | "shop_inventory" | "shop_activity" | "shop_udhaar";
  permission?: "shop.profit.view" | "shop.sales";
};

const REPORT_CARDS: ReportCardConfig[] = [
  {
    id: "profit",
    title: "Profit & expenses",
    description: "Revenue, gross profit, expenses by category, and net profit for any date range.",
    href: "/shop/expenses/report",
    icon: TrendingUp,
    feature: "profit-reports",
    moduleKey: "shop_expenses",
    permission: "shop.profit.view",
  },
  {
    id: "customers",
    title: "Top customers",
    description: "Rank customers by spend, order count, or items purchased.",
    href: "/shop/customers/top",
    icon: Users,
    feature: "customer-analytics",
    moduleKey: "shop_sales",
    permission: "shop.sales",
  },
  {
    id: "products",
    title: "Product performance",
    description: "Top and slow movers, stock snapshot, and inventory value.",
    href: "/shop/inventory",
    icon: BarChart3,
    feature: "product-analytics",
    moduleKey: "shop_inventory",
    permission: "shop.sales",
  },
  {
    id: "stock",
    title: "Stock report",
    description: "Printable SKU list with quantities, low-stock flags, and expiry dates.",
    href: "/shop/inventory/report",
    icon: Package,
    moduleKey: "shop_inventory",
    permission: "shop.sales",
  },
  {
    id: "activity",
    title: "Activity trail",
    description: "Owner audit log of shop actions — sales, inventory, and settings changes.",
    href: "/shop/activity",
    icon: ClipboardList,
    feature: "activity-trail",
    moduleKey: "shop_activity",
    permission: "shop.sales",
  },
  {
    id: "cash-count",
    title: "Cash denomination",
    description: "Count notes and coins at opening or closing, with variance vs expected drawer cash.",
    href: "/shop/cash-count",
    icon: Banknote,
    feature: "cash-denomination",
    moduleKey: "shop_expenses",
    permission: "shop.profit.view",
  },
  {
    id: "payment-reminders",
    title: "Payment reminders",
    description: "Daily udhaar alerts and one-tap WhatsApp reminders for outstanding customers.",
    href: "/shop/udhaar",
    icon: Bell,
    feature: "payment-reminders",
    moduleKey: "shop_udhaar",
    permission: "shop.sales",
  },
];

function ReportCard({
  card,
  locked,
  upgradeLabel,
  moduleDisabled,
}: {
  card: ReportCardConfig;
  locked: boolean;
  upgradeLabel?: string;
  moduleDisabled?: boolean;
}) {
  const Icon = card.icon;
  const disabled = locked || moduleDisabled;

  const inner = (
    <Card
      className={cn(
        "h-full rounded-2xl border-0 shadow-md transition-shadow",
        !disabled && "hover:shadow-lg"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              <Lock className="h-3 w-3" aria-hidden />
              {upgradeLabel}
            </span>
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </div>
        <CardTitle className="text-base">{card.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{card.description}</p>
        {moduleDisabled ? (
          <p className="mt-2 text-xs text-muted-foreground">Enable the module in Organization settings.</p>
        ) : null}
        {locked && !moduleDisabled ? (
          <p className="mt-2 text-xs text-amber-700">Upgrade your plan to unlock this report.</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (disabled) {
    return (
      <div className="relative opacity-90" aria-disabled>
        {inner}
        {locked && !moduleDisabled ? (
          <Link
            href="/settings/billing"
            className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="sr-only">Upgrade plan for {card.title}</span>
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={card.href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  );
}

export function ReportsHub() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const activeShopSector = useAuthStore((s) => s.activeShopSector);
  const activeOrgSettings = useAuthStore((s) => s.activeOrgSettings);
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const plan = useActivePlan();
  const [period, setPeriod] = useState<ReportPeriodPreset>("month");
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exactDate, setExactDate] = useState(() => new Date().toISOString().slice(0, 10));

  const dashboardQuery = useMemo(() => {
    if (period === "range") {
      return `from=${rangeFrom}&to=${rangeTo}`;
    }
    if (period === "date") {
      return `period=date&date=${exactDate}`;
    }
    return `period=${period}`;
  }, [period, rangeFrom, rangeTo, exactDate]);

  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const canViewProfit = role ? hasPermission(role, "shop.profit.view") : false;

  const branchId = getActiveBranchId();

  const { data: summary, isLoading } = useQuery({
    queryKey:
      orgId && salesEnabled
        ? [...queryKeys.modules.shop.dashboard(orgId, branchId), "reports-hub", dashboardQuery]
        : ["disabled"],
    queryFn: () =>
      apiFetch<DashboardSummary>(`/api/v1/shop/dashboard?${dashboardQuery}`),
    enabled: !!orgId && salesEnabled,
  });

  const visibleCards = useMemo(() => {
    return REPORT_CARDS.filter((card) => {
      if (card.permission === "shop.profit.view") {
        return canViewProfit;
      }
      if (card.permission === "shop.sales") {
        return role ? hasPermission(role, "shop.sales") : false;
      }
      return true;
    });
  }, [canViewProfit, role]);

  const productAnalyticsUnlocked =
    plan &&
    canAccessReportFeature(plan, "product-analytics") &&
    inventoryEnabled &&
    role &&
    hasPermission(role, "shop.sales");

  const shopSectors = resolveShopBusinessTypes(activeOrgSettings?.shop, activeShopSector);
  const isRestaurantSector = shopSectors.includes("RESTAURANT");
  const canViewChannelReports = role ? hasPermission(role, "shop.profit.view") : false;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Profit, customers, inventory, and audit reports in one place.
        </p>
      </div>

      {salesEnabled ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Summary
            </CardTitle>
            <ReportDateRangeBar
              preset={period}
              onPresetChange={setPeriod}
              date={exactDate}
              onDateChange={setExactDate}
              from={rangeFrom}
              to={rangeTo}
              onFromChange={setRangeFrom}
              onToChange={setRangeTo}
              presets={["today", "week", "month", "range"]}
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PageLoader label="Loading summary..." />
            ) : summary ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Sales</p>
                  <p className="text-lg font-bold">{formatINR(summary.salesPaise)}</p>
                  <p className="text-xs text-muted-foreground">{summary.invoiceCount} invoices</p>
                </div>
                {canViewProfit && summary.profitPaise ? (
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Gross profit</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatINR(summary.profitPaise)}
                    </p>
                  </div>
                ) : null}
                {canViewProfit && summary.netProfitPaise ? (
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Net profit</p>
                    <p className="text-lg font-bold">{formatINR(summary.netProfitPaise)}</p>
                  </div>
                ) : null}
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Low stock SKUs</p>
                  <p className="text-lg font-bold">{summary.lowStockCount}</p>
                  {summary.topCustomer ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Top: {summary.topCustomer.name}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No summary data for this period.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleCards.map((card) => {
          const moduleDisabled =
            card.moduleKey != null && !isModuleEnabled(enabledModules, card.moduleKey);
          const locked =
            !moduleDisabled &&
            card.feature != null &&
            !canAccessReportFeature(plan, card.feature);

          return (
            <ReportCard
              key={card.id}
              card={card}
              locked={locked}
              moduleDisabled={moduleDisabled}
              upgradeLabel={
                card.feature
                  ? minimumPlanLabelForReportFeature(card.feature)
                  : undefined
              }
            />
          );
        })}
      </div>

      {productAnalyticsUnlocked ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Product performance</h2>
            <Link href="/shop/inventory">
              <Button variant="ghost" size="sm" className="rounded-xl">
                Open inventory
              </Button>
            </Link>
          </div>
          <InventoryInsightsPanel orgId={orgId} enabled />
        </div>
      ) : null}

      {isRestaurantSector && canViewChannelReports ? <ChannelReportsPanel /> : null}
    </div>
  );
}
