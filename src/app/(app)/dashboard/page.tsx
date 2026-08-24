"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { canAccessProjectsNav, hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import { PageLoader } from "@/components/ui/page-loader";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Receipt } from "lucide-react";
import { useBusinessType } from "@/hooks/use-business-type";
import { ShopkeeperDashboard } from "@/components/shop/shopkeeper-dashboard";

type DashboardData = {
  activeProjects: number;
  totalContract: string;
  totalExpenses: string;
  outstanding: string;
  summary: { expectedProfitPaise: string; actualProfitPaise: string };
  projects: Array<{ id: string; name: string; contractAmountPaise: string }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  const biz = useBusinessType();
  const { active: cashierMode, homePath } = useCashierMode();
  const isShopkeeper = activeBusinessType === "SHOPKEEPER";

  useEffect(() => {
    if (!role) return;
    if (cashierMode) {
      router.replace(homePath);
      return;
    }
    if (canAccessProjectsNav(role)) return;
    if (hasPermission(role, "shop.sales")) router.replace("/shop/invoices/new");
    else if (hasPermission(role, "attendance.view_own")) router.replace("/staff/me");
  }, [role, router, cashierMode, homePath]);

  const { data, loading, error } = useFetch(
    role && canAccessProjectsNav(role) && !isShopkeeper ? "dashboard" : null,
    () => apiFetch<DashboardData>("/api/v1/dashboard")
  );

  if (role && (cashierMode || !canAccessProjectsNav(role))) {
    return <PageLoader label="Opening workspace..." />;
  }

  if (isShopkeeper) {
    return <ShopkeeperDashboard />;
  }

  if (loading) return <PageLoader label="Loading dashboard..." />;
  if (error || !data) {
    return <p className="text-destructive">{error ?? "Failed to load dashboard"}</p>;
  }

  const cards = [
    { label: biz.activeCountLabel, value: data.activeProjects, isMoney: false },
    { label: biz.contractTotalLabel, value: data.totalContract, isMoney: true },
    { label: "Total Expenses", value: data.totalExpenses, isMoney: true },
    { label: "Actual Profit", value: data.summary.actualProfitPaise, isMoney: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <Link href="/work-orders/new">
          <Button size="lg" className="rounded-xl">
            <Plus className="mr-2 h-5 w-5" />
            {biz.newWorkItemLabel}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.isMoney ? (
                <MoneyDisplay paise={card.value as string} className="text-2xl" />
              ) : (
                <span className="text-2xl font-bold">{card.value as number}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href="/work-orders/new">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl text-base">
              <FolderKanban className="mr-3 h-5 w-5" />
              {biz.newWorkItemLabel}
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl text-base">
              <Receipt className="mr-3 h-5 w-5" />
              Open {biz.workItemPlural}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {data.projects.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>{biz.recentListLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex justify-between rounded-xl border p-4 hover:bg-accent"
                  >
                    <span className="font-medium">{p.name}</span>
                    <MoneyDisplay paise={p.contractAmountPaise} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
