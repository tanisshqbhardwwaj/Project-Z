"use client";

import { CloudOff } from "lucide-react";
import { useSyncStore } from "@/lib/sync/store";

export function OfflineBanner() {
  const connection = useSyncStore((s) => s.connection);
  const pending = useSyncStore((s) => s.pending);
  if (connection !== "offline" && connection !== "error") return null;
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {connection === "offline"
          ? `No internet — bills, returns and stock still work on this device. ${pending} change(s) will upload when Wi‑Fi returns.`
          : "Could not reach the cloud. Counter billing still works from the copy on this device."}
      </p>
    </div>
  );
}
