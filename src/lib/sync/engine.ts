import { runSync } from "@/lib/sync/client";
import { getLocalDb } from "@/lib/local-db";
import { useSyncStore } from "@/lib/sync/store";
import { isCapacitorNative } from "@/platform/common/native";
import { requiresVerifiedSession } from "@/stores/auth-store";

const SYNC_START_DELAY_MS = 3_000;

let started = false;
let currentOrgId: string | null = null;
let syncDeferredUntil = 0;
let deferTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

export function startSyncEngine(orgId: string | null) {
  currentOrgId = orgId;
  if (typeof window === "undefined") return;
  if (!started) {
    started = true;
    syncDeferredUntil = Date.now() + SYNC_START_DELAY_MS;
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void tick({ allowSync: true });
    });
    window.setInterval(() => void tick({ allowSync: true }), 45_000);
    void attachCapacitorNetwork();
    deferTimer = window.setTimeout(() => {
      syncDeferredUntil = 0;
      void tick({ allowSync: true });
    }, SYNC_START_DELAY_MS) as unknown as ReturnType<typeof globalThis.setTimeout>;
  }
  useSyncStore
    .getState()
    .setConnection(navigator.onLine ? "online" : "offline");
  void tick({ allowSync: false });
}

function onOnline() {
  useSyncStore.getState().setConnection("online");
  void tick({ allowSync: true });
}

function onOffline() {
  useSyncStore.getState().setConnection("offline");
}

async function attachCapacitorNetwork() {
  if (!isCapacitorNative()) return;
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    useSyncStore.getState().setConnection(status.connected ? "online" : "offline");
    await Network.addListener("networkStatusChange", (next) => {
      if (next.connected) onOnline();
      else onOffline();
    });
    const { App } = await import("@capacitor/app");
    await App.addListener("resume", () => {
      void tick({ allowSync: true });
    });
  } catch {
    /* plugins not installed in this shell */
  }
}

type TickOptions = { allowSync?: boolean };

async function tick(options: TickOptions = {}) {
  if (!currentOrgId) return;
  try {
    const pending = await getLocalDb().pendingCount(currentOrgId);
    useSyncStore.getState().setPending(pending);
  } catch {
    /* db not ready */
  }
  const allowSync = options.allowSync !== false;
  if (!allowSync || Date.now() < syncDeferredUntil) return;
  if (!navigator.onLine) return;
  if (requiresVerifiedSession()) return;
  await runSync(currentOrgId);
}
