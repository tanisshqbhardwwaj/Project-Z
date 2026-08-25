import type { LocalDbAdapter } from "./adapter";
import { createLazyAdapter } from "./lazy-adapter";
import { createIndexedDbAdapter } from "./indexed-adapter";
import { isCapacitorAndroid, isCapacitorNative, isTauriRuntime } from "@/lib/platform/native";

let adapter: LocalDbAdapter | null = null;

export function getLocalDb(): LocalDbAdapter {
  if (adapter) return adapter;
  if (typeof window === "undefined") {
    throw new Error("Local shop database is only available in the app");
  }
  adapter = createLazyAdapter(async () => {
    try {
      if (isCapacitorNative()) {
        const { createCapacitorSqliteAdapter } = await import(
          "@/lib/sync/adapters/capacitor-sqlite"
        );
        return createCapacitorSqliteAdapter();
      }
      if (isTauriRuntime()) {
        const { createTauriSqlAdapter } = await import("@/lib/sync/adapters/tauri-sql");
        return createTauriSqlAdapter();
      }
    } catch {
      /* native shell unavailable */
    }
    return createIndexedDbAdapter();
  });
  return adapter;
}

export function androidInvoiceWindowDays(): number {
  if (isCapacitorAndroid()) return 90;
  return 3650;
}

export type { LocalDbAdapter } from "./adapter";
