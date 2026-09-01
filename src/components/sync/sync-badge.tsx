"use client";

import Link from "next/link";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useSyncStore } from "@/lib/sync/store";
import { startSyncEngine } from "@/lib/sync/engine";
import { runSync } from "@/lib/sync/client";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const SYNC_ENGINE_DELAY_MS = 3_000;

export function SyncEngineProvider({ children }: { children: React.ReactNode }) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const sessionVerified = useAuthStore((s) => s.sessionVerified);
  useEffect(() => {
    if (!orgId || !sessionVerified) return;
    const timer = window.setTimeout(() => {
      startSyncEngine(orgId);
    }, SYNC_ENGINE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [orgId, sessionVerified]);
  return <>{children}</>;
}

export function SyncBadge() {
  const connection = useSyncStore((s) => s.connection);
  const pending = useSyncStore((s) => s.pending);
  const lastError = useSyncStore((s) => s.lastError);
  const quotaFull = useSyncStore((s) => s.quotaFull);
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  const label =
    connection === "offline"
      ? "Offline"
      : connection === "syncing"
        ? "Syncing"
        : connection === "error"
          ? "Sync failed"
          : pending > 0
            ? `${pending} waiting`
            : "Synced";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        title={lastError ?? label}
        onClick={() => orgId && void runSync(orgId)}
        className={cn(
          "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium",
          connection === "offline" && "border-amber-300 bg-amber-50 text-amber-900",
          connection === "syncing" && "border-border bg-muted text-foreground",
          connection === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
          connection === "online" && "border-border bg-background text-muted-foreground"
        )}
      >
        {connection === "offline" ? (
          <CloudOff className="h-3.5 w-3.5" />
        ) : connection === "syncing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : connection === "error" ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Cloud className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{label}</span>
      </button>
      {quotaFull ? (
        <Link
          href="/settings/storage"
          className="hidden rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900 sm:inline"
        >
          Cloud full
        </Link>
      ) : null}
    </div>
  );
}
