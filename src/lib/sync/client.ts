import { getLocalDb, androidInvoiceWindowDays } from "@/lib/local-db";
import { apiFetch } from "@/lib/api/client";
import { useSyncStore } from "@/lib/sync/store";
import { formatShopBillNumber, fiscalYearLabel, normalizeCashierCode, resolveStoreCode } from "@/lib/shop/invoices/bill-number";
import type { SyncKind, SyncPullSnapshot, SyncPushResult } from "@/lib/sync/kinds";
import type { LocalOutboxRow } from "@/lib/local-db/types";
import { nextOutboxFailure } from "@/lib/sync/outbox-policy";

function newId(): string {
  return crypto.randomUUID();
}

const DEVICE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomDeviceCode(): string {
  const pick = () =>
    DEVICE_CODE_ALPHABET[Math.floor(Math.random() * DEVICE_CODE_ALPHABET.length)];
  return `D${pick()}`;
}

export async function allocateLocalBillNumber(
  orgId: string,
  cashierCode?: string | null
): Promise<string> {
  const db = getLocalDb();
  const fy = fiscalYearLabel();
  const meta = (await db.getMeta(orgId)) ?? {
    orgId,
    cursor: null,
    lastSyncAt: null,
    lastError: null,
    billSeq: 0,
    fiscalYear: fy,
    windowDays: androidInvoiceWindowDays(),
  };
  const seq = (meta.fiscalYear === fy ? meta.billSeq : 0) + 1;
  // Without a staff cashier code, use a stable per-device code so offline
  // numbers from different devices can't collide on the same segment.
  const deviceCode = meta.deviceCode ?? randomDeviceCode();
  await db.setMeta({ ...meta, billSeq: seq, fiscalYear: fy, deviceCode });
  return formatShopBillNumber({
    storeCode: meta.storeCode ?? null,
    cashierCode: cashierCode?.trim() ? normalizeCashierCode(cashierCode) : deviceCode,
    fiscalYear: fy,
    sequence: seq,
  });
}

export async function enqueueMutation(
  orgId: string,
  kind: SyncKind,
  payload: Record<string, unknown>,
  id = newId()
): Promise<string> {
  const db = getLocalDb();
  const row: LocalOutboxRow = {
    id,
    orgId,
    kind,
    payload,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await db.enqueue(row);
  useSyncStore.getState().setPending(await db.pendingCount(orgId));
  return id;
}

export async function applyPullSnapshot(orgId: string, snapshot: SyncPullSnapshot) {
  const db = getLocalDb();
  const asRows = (rows: unknown[], idOf: (row: Record<string, unknown>) => string) =>
    (rows as Record<string, unknown>[]).map((row) => ({
      id: idOf(row),
      orgId,
      data: row,
    }));

  await db.putAll("sales", asRows(snapshot.sales, (r) => String(r.id)));
  await db.putAll("returns", asRows(snapshot.returns, (r) => String(r.id)));
  await db.putAll("inventory", asRows(snapshot.inventory, (r) => String(r.id)));
  await db.putAll("customers", asRows(snapshot.customers, (r) => String(r.id)));
  await db.putAll("credits", asRows(snapshot.credits, (r) => String(r.id)));
  await db.putAll("creditEntries", asRows(snapshot.creditEntries, (r) => String(r.id)));
  await db.putAll("purchases", asRows(snapshot.purchases, (r) => String(r.id)));
  await db.putAll("expenses", asRows(snapshot.expenses, (r) => String(r.id)));
  await db.putAll("staff", asRows(snapshot.staff, (r) => String(r.id)));

  const used = Number(snapshot.storage.usedBytes);
  const quota = Number(snapshot.storage.quotaBytes);
  const fy = fiscalYearLabel();
  const meta = (await db.getMeta(orgId)) ?? {
    orgId,
    cursor: null,
    lastSyncAt: null,
    lastError: null,
    billSeq: 0,
    fiscalYear: fy,
    windowDays: snapshot.windowDays,
  };
  const invoiceSettings =
    snapshot.invoiceSettings && typeof snapshot.invoiceSettings === "object"
      ? (snapshot.invoiceSettings as Record<string, unknown>)
      : {};
  const storeCode = snapshot.storeCode || resolveStoreCode(invoiceSettings, null);
  // Adopt the server's sequence so this device never reuses numbers the
  // server already issued while it was offline.
  const billSeq =
    meta.fiscalYear === fy ? Math.max(meta.billSeq, snapshot.billSeq ?? 0) : Math.max(0, snapshot.billSeq ?? 0);
  await db.setMeta({
    ...meta,
    cursor: snapshot.cursor,
    lastSyncAt: snapshot.cursor,
    lastError: null,
    windowDays: snapshot.windowDays,
    storage: snapshot.storage,
    billSeq,
    fiscalYear: fy,
    storeCode,
  });

  const ui = useSyncStore.getState();
  ui.setLastSync(snapshot.cursor);
  ui.setError(null);
  ui.setStorage({
    usedLabel: formatBytes(used),
    quotaLabel: formatBytes(quota),
    percent: quota > 0 ? (used / quota) * 100 : 0,
    cloudEnabled: snapshot.storage.cloudEnabled,
    quotaFull: quota > 0 && used >= quota,
  });
}

function formatBytes(n: number): string {
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

export async function pullFromCloud(orgId: string) {
  const db = getLocalDb();
  const meta = await db.getMeta(orgId);
  const windowDays = androidInvoiceWindowDays();
  const params = new URLSearchParams();
  if (meta?.cursor) params.set("since", meta.cursor);
  params.set("windowDays", String(windowDays));
  const snapshot = await apiFetch<SyncPullSnapshot>(`/api/v1/sync/pull?${params.toString()}`);
  await applyPullSnapshot(orgId, snapshot);
}

export async function pushOutbox(orgId: string) {
  const db = getLocalDb();
  const pending = await db.pendingOutbox(orgId);
  if (pending.length === 0) {
    useSyncStore.getState().setPending(0);
    return;
  }
  const batch = pending.slice(0, 50);
  for (const row of batch) await db.markOutbox(row.id, "SYNCING");
  try {
    const res = await apiFetch<{ results: SyncPushResult[] }>("/api/v1/sync/push", {
      method: "POST",
      body: JSON.stringify({
        items: batch.map((r) => ({ id: r.id, kind: r.kind, payload: r.payload })),
      }),
    });
    for (const result of res.results) {
      if (result.status === "applied" || result.status === "duplicate") {
        await db.markOutbox(result.id, "DONE");
      } else {
        const source = batch.find((r) => r.id === result.id);
        const failure = nextOutboxFailure(source?.attempts ?? 0);
        await db.markOutbox(
          result.id,
          failure.status,
          result.error ?? "Push failed",
          failure.attempts
        );
      }
    }
  } catch (err) {
    for (const row of batch) await db.markOutbox(row.id, "PENDING");
    throw err;
  }
  useSyncStore.getState().setPending(await db.pendingCount(orgId));
}

export async function runSync(orgId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStore.getState().setConnection("offline");
    return;
  }
  const { requiresVerifiedSession } = await import("@/stores/auth-store");
  if (requiresVerifiedSession()) return;
  const ui = useSyncStore.getState();
  ui.setConnection("syncing");
  try {
    await pushOutbox(orgId);
    await apiFetch("/api/v1/sync/outbox/drain", { method: "POST" }).catch(() => undefined);
    await pullFromCloud(orgId);
    ui.setConnection("online");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    ui.setError(message);
    const db = getLocalDb();
    const meta = await db.getMeta(orgId);
    if (meta) await db.setMeta({ ...meta, lastError: message });
  }
}

export async function saveLocalSale(
  orgId: string,
  sale: Record<string, unknown> & { id: string }
) {
  const db = getLocalDb();
  await db.putOne("sales", { id: sale.id, orgId, data: sale });
}
