import type { LocalDbAdapter } from "@/lib/local-db/adapter";
import {
  createIndexedDbAdapter,
  exportIndexedOrg,
  importIndexedOrg,
} from "@/lib/local-db/indexed-adapter";
import { isTauriRuntime, tauriInvoke } from "@/platform/common/native";

const hydrations = new Map<string, Promise<void>>();
const persistTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
const PERSIST_DEBOUNCE_MS = 2_500;
let lifecycleHooksInstalled = false;

function installPersistLifecycleHooks() {
  if (lifecycleHooksInstalled || typeof window === "undefined") return;
  lifecycleHooksInstalled = true;
  const flushAll = () => {
    void flushAllPendingPersists();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  window.addEventListener("beforeunload", flushAll);
}

async function flushAllPendingPersists() {
  const orgIds = [...persistTimers.keys()];
  for (const orgId of orgIds) {
    const timer = persistTimers.get(orgId);
    if (timer) window.clearTimeout(timer);
    persistTimers.delete(orgId);
    await persistEncrypted(orgId);
  }
}

function schedulePersistEncrypted(orgId: string) {
  installPersistLifecycleHooks();
  const existing = persistTimers.get(orgId);
  if (existing) window.clearTimeout(existing);
  persistTimers.set(
    orgId,
    window.setTimeout(() => {
      persistTimers.delete(orgId);
      void persistEncrypted(orgId);
    }, PERSIST_DEBOUNCE_MS) as unknown as ReturnType<typeof globalThis.setTimeout>
  );
}

function utf8FromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function ensureHydrated(orgId: string): Promise<void> {
  const existing = hydrations.get(orgId);
  if (existing) return existing;
  const job = (async () => {
    const payload = await tauriInvoke<string | null>("load_shop_db", { orgId });
    if (!payload) return;
    const json = payload.trim().startsWith("{") ? payload : utf8FromBase64(payload);
    await importIndexedOrg(json);
  })();
  hydrations.set(orgId, job);
  void job.catch(() => {
    hydrations.delete(orgId);
  });
  return job;
}

async function hydrateAllKnown() {
  const orgs = (await tauriInvoke<string[]>("list_shop_orgs")) ?? [];
  await Promise.all(orgs.map((orgId) => ensureHydrated(orgId)));
}

async function persistEncrypted(orgId: string) {
  await ensureHydrated(orgId);
  const snapshot = await exportIndexedOrg(orgId);
  await tauriInvoke("save_shop_db", {
    orgId,
    dataBase64: utf8ToBase64(JSON.stringify(snapshot)),
  });
}

/**
 * Windows (Tauri): IndexedDB working copy + DPAPI-encrypted %AppData%/ProjectZ/{org}/shop.db
 */
export async function createTauriSqlAdapter(): Promise<LocalDbAdapter> {
  const inner = createIndexedDbAdapter();
  if (!isTauriRuntime()) return inner;

  return {
    ...inner,
    name: "tauri-sql",
    async getMeta(orgId) {
      await ensureHydrated(orgId);
      return inner.getMeta(orgId);
    },
    async setMeta(meta) {
      await ensureHydrated(meta.orgId);
      await inner.setMeta(meta);
      schedulePersistEncrypted(meta.orgId);
    },
    async enqueue(row) {
      await ensureHydrated(row.orgId);
      await inner.enqueue(row);
      schedulePersistEncrypted(row.orgId);
    },
    async putOne(store, row) {
      await ensureHydrated(row.orgId);
      await inner.putOne(store, row);
      schedulePersistEncrypted(row.orgId);
    },
    async putAll(store, rows) {
      if (rows[0]) await ensureHydrated(rows[0].orgId);
      await inner.putAll(store, rows);
      if (rows[0]) schedulePersistEncrypted(rows[0].orgId);
    },
    async getAll(store, orgId) {
      await ensureHydrated(orgId);
      return inner.getAll(store, orgId);
    },
    async getById(store, id) {
      if (hydrations.size === 0) await hydrateAllKnown();
      else await Promise.all([...hydrations.values()]);
      return inner.getById(store, id);
    },
    async pendingOutbox(orgId) {
      await ensureHydrated(orgId);
      return inner.pendingOutbox(orgId);
    },
    async pendingCount(orgId) {
      await ensureHydrated(orgId);
      return inner.pendingCount(orgId);
    },
    async markOutbox(id, status, lastError, attempts) {
      if (hydrations.size === 0) await hydrateAllKnown();
      let row = await inner.getById<{ orgId?: string }>("outbox", id);
      if (!row) {
        await hydrateAllKnown();
        row = await inner.getById<{ orgId?: string }>("outbox", id);
      }
      const orgId = typeof row?.orgId === "string" ? row.orgId : null;
      if (orgId) await ensureHydrated(orgId);
      await inner.markOutbox(id, status, lastError, attempts);
      if (orgId) schedulePersistEncrypted(orgId);
    },
  };
}
