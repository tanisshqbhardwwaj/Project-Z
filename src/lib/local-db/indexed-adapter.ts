import type { LocalDbAdapter } from "./adapter";
import type { LocalMeta, LocalOutboxRow, LocalStoreName } from "./types";
import { isRetryableOutboxStatus } from "@/lib/sync/outbox-policy";
import {
  INDEXED_STORES,
  parseShopDiskSnapshot,
  type ShopDiskSnapshot,
} from "./snapshot";

const DB_NAME = "projectz-local-shop";
const DB_VERSION = 1;
const STORES: LocalStoreName[] = INDEXED_STORES;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          store.createIndex("orgId", "orgId", { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createIndexedDbAdapter(): LocalDbAdapter {
  const ready = typeof indexedDB === "undefined" ? Promise.reject(new Error("No IndexedDB")) : Promise.resolve();

  async function withStore<T>(
    store: LocalStoreName,
    mode: IDBTransactionMode,
    fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>
  ): Promise<T> {
    const db = await openDb();
    const tx = db.transaction(store, mode);
    const objectStore = tx.objectStore(store);
    const result = fn(objectStore);
    const value = result instanceof Promise ? await result : await reqToPromise(result);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return value;
  }

  return {
    name: "indexeddb",
    ready,
    async getMeta(orgId) {
      const row = await withStore("meta", "readonly", (s) => s.get(orgId));
      return (row as LocalMeta | undefined) ?? null;
    },
    async setMeta(meta) {
      await withStore("meta", "readwrite", (s) => s.put({ ...meta, id: meta.orgId, orgId: meta.orgId }));
    },
    async putAll(store, rows) {
      const db = await openDb();
      const tx = db.transaction(store, "readwrite");
      const objectStore = tx.objectStore(store);
      for (const row of rows) {
        objectStore.put({ id: row.id, orgId: row.orgId, data: row.data });
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async getAll<T>(store: LocalStoreName, orgId: string) {
      const db = await openDb();
      const tx = db.transaction(store, "readonly");
      const index = tx.objectStore(store).index("orgId");
      const rows = await reqToPromise(index.getAll(orgId));
      return rows.map((r: { data: T }) => r.data);
    },
    async getById<T>(store: LocalStoreName, id: string) {
      const row = await withStore(store, "readonly", (s) => s.get(id));
      return row ? ((row as { data: T }).data ?? (row as T)) : null;
    },
    async putOne(store, row) {
      await withStore(store, "readwrite", (s) =>
        s.put({ id: row.id, orgId: row.orgId, data: row.data })
      );
    },
    async enqueue(row) {
      await withStore("outbox", "readwrite", (s) => s.put(row));
    },
    async pendingOutbox(orgId) {
      const db = await openDb();
      const tx = db.transaction("outbox", "readonly");
      const rows = (await reqToPromise(
        tx.objectStore("outbox").index("orgId").getAll(orgId)
      )) as LocalOutboxRow[];
      return rows
        .filter((r) => isRetryableOutboxStatus(r.status, r.attempts ?? 0))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async markOutbox(id, status, lastError, attempts) {
      const existing = (await withStore("outbox", "readonly", (s) =>
        s.get(id)
      )) as LocalOutboxRow | undefined;
      if (!existing) return;
      await withStore("outbox", "readwrite", (s) =>
        s.put({
          ...existing,
          status,
          lastError: lastError ?? null,
          attempts: attempts ?? existing.attempts ?? 0,
        })
      );
    },
    async pendingCount(orgId) {
      const rows = await this.pendingOutbox(orgId);
      return rows.length;
    },
  };
}

const KV_STORES: LocalStoreName[] = [
  "sales",
  "returns",
  "inventory",
  "customers",
  "credits",
  "creditEntries",
  "purchases",
  "expenses",
  "staff",
];

export async function exportIndexedOrg(orgId: string): Promise<ShopDiskSnapshot> {
  const db = await openDb();
  const metaTx = db.transaction("meta", "readonly");
  const metaRow = await reqToPromise(metaTx.objectStore("meta").get(orgId));
  const outTx = db.transaction("outbox", "readonly");
  const outAll = (await reqToPromise(
    outTx.objectStore("outbox").index("orgId").getAll(orgId)
  )) as LocalOutboxRow[];
  const kv: ShopDiskSnapshot["kv"] = {};
  for (const store of KV_STORES) {
    const tx = db.transaction(store, "readonly");
    const rows = (await reqToPromise(
      tx.objectStore(store).index("orgId").getAll(orgId)
    )) as { id: string; orgId: string; data: unknown }[];
    kv[store] = rows;
  }
  return {
    version: 1,
    orgId,
    exportedAt: new Date().toISOString(),
    meta: (metaRow as LocalMeta | undefined) ?? null,
    outbox: outAll,
    kv,
  };
}

export async function importIndexedOrg(snapshot: ShopDiskSnapshot | string): Promise<void> {
  const data =
    typeof snapshot === "string" ? parseShopDiskSnapshot(snapshot) : snapshot;
  if (!data) return;
  const adapter = createIndexedDbAdapter();
  if (data.meta) await adapter.setMeta(data.meta);
  for (const row of data.outbox ?? []) {
    await adapter.enqueue(row);
  }
  for (const store of KV_STORES) {
    const rows = data.kv?.[store] ?? [];
    if (rows.length) await adapter.putAll(store, rows);
  }
}
