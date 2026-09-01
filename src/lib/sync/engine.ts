import { runSync } from "@/lib/sync/client";
import { getLocalDb } from "@/lib/local-db";
import { useSyncStore } from "@/lib/sync/store";
import { isCapacitorNative } from "@/platform/common/native";

let started = false;
let currentOrgId: string | null = null;

export function startSyncEngine(orgId: string | null) {
  currentOrgId = orgId;
  if (typeof window === "undefined") return;
  if (!started) {
    started = true;
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void tick();
    });
    window.setInterval(() => void tick(), 45_000);
    void attachCapacitorNetwork();
  }
  useSyncStore
    .getState()
    .setConnection(navigator.onLine ? "online" : "offline");
  void tick();
}

function onOnline() {
  useSyncStore.getState().setConnection("online");
  void tick();
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
      void tick();
    });
  } catch {
    /* plugins not installed in this shell */
  }
}

async function tick() {
  if (!currentOrgId) return;
  try {
    const pending = await getLocalDb().pendingCount(currentOrgId);
    useSyncStore.getState().setPending(pending);
  } catch {
    /* db not ready */
  }
  if (!navigator.onLine) return;
  await runSync(currentOrgId);
}
