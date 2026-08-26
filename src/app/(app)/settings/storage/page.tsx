"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StorageUsageBar } from "@/components/billing/plan-cards";
import { useSyncStore } from "@/lib/sync/store";
import { runSync } from "@/lib/sync/client";
import { getLocalDb } from "@/lib/local-db";
import { Cloud, Database, RefreshCw } from "lucide-react";

type Usage = {
  usedBytes: string;
  quotaBytes: string;
  cloudEnabled: boolean;
  byCategory: { category: string; bytes: string; count: number }[];
  planName?: string;
};

function formatBytes(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export default function StorageSyncPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const pending = useSyncStore((s) => s.pending);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastError = useSyncStore((s) => s.lastError);
  const connection = useSyncStore((s) => s.connection);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cloud = await apiFetch<Usage>("/api/v1/storage/usage").catch(() => null);
        if (cloud && !cancelled) {
          setUsage(cloud);
          return;
        }
        if (orgId) {
          const meta = await getLocalDb().getMeta(orgId);
          if (meta?.storage && !cancelled) {
            setUsage({
              usedBytes: meta.storage.usedBytes,
              quotaBytes: meta.storage.quotaBytes,
              cloudEnabled: meta.storage.cloudEnabled,
              byCategory: meta.storage.byCategory,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (loading) return <PageLoader label="Loading storage…" />;

  const used = Number(usage?.usedBytes ?? 0);
  const quota = Number(usage?.quotaBytes ?? 0);
  const pct = quota > 0 ? (used / quota) * 100 : 0;
  const full = pct >= 100;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Storage & Sync</h1>
        <p className="text-sm text-muted-foreground">
          Bills, stock and customers sync to your shop cloud. This quota is only for
          photos, PDFs and backups.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Shop data (bills & stock)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Invoices, returns, inventory, customers and udhaar live in the shop
            database. They <span className="font-medium text-foreground">do not use</span>{" "}
            the photo/file quota below — that is why the bar can show 0 B while
            the shop is still synced.
          </p>
          <p>
            Status: <span className="font-medium capitalize">{connection}</span>
          </p>
          <p>
            Waiting to upload: <span className="font-medium tabular-nums">{pending}</span>
          </p>
          <p>
            Last sync:{" "}
            {lastSyncAt ? new Date(lastSyncAt).toLocaleString("en-IN") : "Never"}
          </p>
          {lastError ? <p className="text-destructive">{lastError}</p> : null}
          <Button
            className="rounded-xl"
            disabled={!orgId || connection === "offline"}
            onClick={() => orgId && void runSync(orgId)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync shop data now
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4" />
            Photos, PDFs & backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StorageUsageBar
            usedLabel={formatBytes(String(used))}
            quotaLabel={formatBytes(String(quota))}
            percent={pct}
          />
          {full ? (
            <p className="text-sm text-amber-700">
              Cloud photos/backups paused. Billing on this device still works. Delete
              files or upgrade to resume file sync.
            </p>
          ) : null}
          {!usage?.cloudEnabled ? (
            <p className="text-sm text-muted-foreground">
              Cloud file backup is off for this subscription. Counter billing still works locally.
            </p>
          ) : null}
          <ul className="space-y-1 text-sm">
            {(usage?.byCategory ?? []).map((row) => (
              <li key={row.category} className="flex justify-between">
                <span className="capitalize text-muted-foreground">
                  {row.category} ({row.count})
                </span>
                <span className="tabular-nums">{formatBytes(row.bytes)}</span>
              </li>
            ))}
            {(usage?.byCategory ?? []).length === 0 ? (
              <li className="text-muted-foreground">
                No photos, PDFs or backups in this quota yet
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
