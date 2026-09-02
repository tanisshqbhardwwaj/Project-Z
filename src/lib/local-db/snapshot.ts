import type { LocalMeta, LocalOutboxRow, LocalStoreName } from "./types";

export const INDEXED_STORES: LocalStoreName[] = [
  "meta",
  "outbox",
  "sales",
  "returns",
  "inventory",
  "customers",
  "credits",
  "creditEntries",
  "purchases",
  "expenses",
  "staff",
  "attendance",
];

export type ShopDiskSnapshot = {
  version: 1;
  orgId: string;
  exportedAt: string;
  meta: LocalMeta | null;
  outbox: LocalOutboxRow[];
  kv: Partial<Record<LocalStoreName, { id: string; orgId: string; data: unknown }[]>>;
};

export function parseShopDiskSnapshot(raw: string): ShopDiskSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as ShopDiskSnapshot;
    if (parsed?.version !== 1 || typeof parsed.orgId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
