"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpsPageHeader } from "@/components/ops/ops-page-header";
import { OpsPlanPill, OpsStatusPill } from "@/components/ops/ops-status-pill";
import { formatStorageBytes } from "@/lib/billing/plans";
import { getShopSectorConfig } from "@/lib/org/shop-sector";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Package,
  RefreshCw,
  Users,
  UserCog,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type RecentOrg = {
  id: string;
  name: string;
  businessType: string;
  shopSector: string | null;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  owner: { name: string; email: string; phone: string | null } | null;
};

type ExpiringOrg = {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  expiresAt: string;
  expireReason: string;
  owner: { name: string; email: string; phone: string | null } | null;
};

type Summary = {
  orgCount: number;
  pendingRequests: number;
  cancelledCount: number;
  earlyBirdRemaining: number;
  mrrLabel: string;
  setupOutstanding: number;
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
  storageUsedBytes: string;
  activity: {
    newOrgsThisWeek: number;
    newOrgsThisMonth: number;
    trialsExpiringSoon: number;
  };
  totalUsers: number;
  totalStaff: number;
  activeUsers30d: number;
  inactiveOrgs30d: number;
  recentOrganizations: RecentOrg[];
  expiringSoon: ExpiringOrg[];
  platformFeed: Array<{
    id: string;
    type: string;
    label: string;
    at: string;
    href: string | null;
  }>;
};

const PLAN_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];

export default function OpsOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setSummary(await apiFetch<Summary>("/api/v1/ops/summary"));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planChartData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byPlan).map(([name, value]) => ({ name, value }));
  }, [summary]);

  if (!summary) {
    return loadError ? (
      <p className="text-sm text-destructive">{loadError}</p>
    ) : (
      <PageLoader label="Loading summary…" />
    );
  }

  const activity = summary.activity;
  const expiringCount = summary.expiringSoon.filter(
    (o) => new Date(o.expiresAt) >= new Date()
  ).length;

  const attention: Array<{ label: string; href: string; count: number }> = [
    {
      label: "plan requests waiting",
      href: "/ops/requests",
      count: summary.pendingRequests,
    },
    {
      label: "orgs expiring within 7 days",
      href: "/ops/expiring",
      count: expiringCount,
    },
    {
      label: "setup fees unpaid",
      href: "/ops/customers",
      count: summary.setupOutstanding,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <OpsPageHeader
        title="Overview"
        description="Billing and adoption across the platform. Shop sales and stock stay inside each organization."
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={refreshing}
            onClick={() => void load()}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {attention.length > 0 ? (
        <Card className="rounded-2xl border-amber-300/60 bg-amber-500/5 dark:border-amber-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-amber-400/40 bg-background/80 px-3 py-1.5 text-xs font-medium hover:bg-background"
              >
                {item.count} {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Business
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            title="Organizations"
            value={String(summary.orgCount)}
            hint={`+${activity.newOrgsThisWeek} this week · +${activity.newOrgsThisMonth} this month`}
            href="/ops/customers"
          />
          <StatCard
            icon={Wallet}
            title="MRR (assigned)"
            value={summary.mrrLabel}
            hint={`${summary.cancelledCount} cancelled`}
          />
          <StatCard
            icon={ClipboardList}
            title="Plan requests"
            value={String(summary.pendingRequests)}
            hint="Awaiting your approval"
            href="/ops/requests"
          />
          <StatCard
            icon={Package}
            title="Storage used"
            value={formatStorageBytes(BigInt(summary.storageUsedBytes))}
            hint={`${summary.earlyBirdRemaining} early-bird slots left`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          People
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Users}
            title="Org members"
            value={String(summary.totalUsers)}
            hint={`${summary.activeUsers30d} logged in last 30 days`}
            href="/ops/users"
          />
          <StatCard
            icon={UserCog}
            title="Staff records"
            value={String(summary.totalStaff)}
            hint="Payroll/cashier staff across all orgs"
            href="/ops/users"
          />
          <StatCard
            icon={Building2}
            title="Inactive orgs (30d)"
            value={String(summary.inactiveOrgs30d)}
            hint="No platform activity in 30 days"
            href="/ops/customers"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Newest organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recentOrganizations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No organizations yet.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.recentOrganizations.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/ops/customers/${org.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {org.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {org.owner?.name ?? "No owner"}
                        {org.owner?.email ? ` · ${org.owner.email}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <OpsPlanPill plan={org.plan} />
                      <OpsStatusPill status={org.subscriptionStatus} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plans distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {planChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plan data.</p>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {planChartData.map((_, i) => (
                          <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          String(value ?? 0),
                          String(name ?? "").replace(/_/g, " "),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {planChartData.map((item, i) => (
                    <li key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                        />
                        {item.name.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium tabular-nums">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Expiring soon</CardTitle>
            <Link href="/ops/expiring" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {summary.expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orgs expiring in the next 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {summary.expiringSoon.slice(0, 6).map((org) => {
                  const expired = new Date(org.expiresAt) < new Date();
                  return (
                    <li
                      key={org.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div>
                        <Link
                          href={`/ops/customers/${org.id}`}
                          className="font-medium hover:underline"
                        >
                          {org.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {org.owner?.email ?? "No owner email"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <OpsStatusPill status={org.subscriptionStatus} />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            expired ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {expired ? "Expired" : "Expires"}{" "}
                          {new Date(org.expiresAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(summary.byStatus).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <OpsStatusPill status={k} />
                <span className="font-medium tabular-nums">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform activity</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.platformFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent events.</p>
          ) : (
            <ul className="space-y-2">
              {summary.platformFeed.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  {ev.href ? (
                    <Link href={ev.href} className="font-medium hover:underline">
                      {ev.label}
                    </Link>
                  ) : (
                    <span className="font-medium">{ev.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  href,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: typeof Building2;
}) {
  const inner = (
    <Card className={cn("rounded-2xl", href && "transition-colors hover:bg-muted/40")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
