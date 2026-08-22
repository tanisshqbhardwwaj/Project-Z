"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
};

export default function OpsOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/api/v1/ops/summary").then(setSummary).catch(() => {});
  }, []);

  if (!summary) return <PageLoader label="Loading summary…" />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Organizations" value={String(summary.orgCount)} />
        <StatCard title="MRR (assigned)" value={summary.mrrLabel} />
        <StatCard title="Pending requests" value={String(summary.pendingRequests)} href="/ops/requests" />
        <StatCard title="Cancelled" value={String(summary.cancelledCount)} />
        <StatCard title="Setup fees outstanding" value={String(summary.setupOutstanding)} />
        <StatCard title="Early-bird slots left" value={String(summary.earlyBirdRemaining)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">By plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(summary.byPlan).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">By status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(summary.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
