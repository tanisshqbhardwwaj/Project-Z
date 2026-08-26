"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  platformFeed: Array<{
    id: string;
    type: string;
    label: string;
    at: string;
    href: string | null;
  }>;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  TRIAL: "bg-sky-100 text-sky-800",
  PENDING_PAYMENT: "bg-amber-100 text-amber-900",
  PAST_DUE: "bg-amber-100 text-amber-900",
  CANCELLED: "bg-muted text-muted-foreground",
};

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

  if (!summary) {
    return loadError ? (
      <p className="p-6 text-sm text-destructive">{loadError}</p>
    ) : (
      <PageLoader label="Loading summary…" />
    );
  }

  const activity = summary.activity;
  const attention: Array<{ label: string; href: string; count: number }> = [
    {
      label: "plan requests waiting",
      href: "/ops/requests",
      count: summary.pendingRequests,
    },
    {
      label: "trials ending within 7 days",
      href: "/ops/customers",
      count: activity.trialsExpiringSoon,
    },
    {
      label: "setup fees unpaid",
      href: "/ops/customers",
      count: summary.setupOutstanding,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Billing and adoption across the platform. Shop sales and stock stay
            inside each organization.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={refreshing}
          onClick={() => void load()}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {attention.length > 0 ? (
        <Card className="rounded-2xl border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-amber-400/60 bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-background"
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
                        {org.owner?.phone ? ` · ${org.owner.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {org.shopSector ? (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {getShopSectorConfig(org.shopSector).label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {org.businessType}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        {org.plan}
                      </Badge>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_STYLES[org.subscriptionStatus] ??
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {org.subscriptionStatus.replace("_", " ")}
                      </span>
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

        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(summary.byPlan).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(summary.byStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k.replace("_", " ")}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
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
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
