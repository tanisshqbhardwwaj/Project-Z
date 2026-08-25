import type { LocalDbAdapter } from "./adapter";

export function createLazyAdapter(factory: () => Promise<LocalDbAdapter>): LocalDbAdapter {
  let inner: LocalDbAdapter | null = null;
  const ready = factory().then((adapter) => {
    inner = adapter;
    return adapter;
  });

  async function use<T>(fn: (adapter: LocalDbAdapter) => Promise<T>): Promise<T> {
    const adapter = inner ?? (await ready);
    return fn(adapter);
  }

  return {
    name: "indexeddb",
    ready: ready.then(() => undefined),
    getMeta: (orgId) => use((a) => a.getMeta(orgId)),
    setMeta: (meta) => use((a) => a.setMeta(meta)),
    putAll: (store, rows) => use((a) => a.putAll(store, rows)),
    getAll: (store, orgId) => use((a) => a.getAll(store, orgId)),
    getById: (store, id) => use((a) => a.getById(store, id)),
    putOne: (store, row) => use((a) => a.putOne(store, row)),
    enqueue: (row) => use((a) => a.enqueue(row)),
    pendingOutbox: (orgId) => use((a) => a.pendingOutbox(orgId)),
    markOutbox: (id, status, lastError, attempts) =>
      use((a) => a.markOutbox(id, status, lastError, attempts)),
    pendingCount: (orgId) => use((a) => a.pendingCount(orgId)),
  };
}
