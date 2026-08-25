import type { SqlRunner, SqlValue } from "./sql-runner";
import { applyLocalShopSchema } from "./sql-adapter";

type SqlJsDatabase = {
  run: (sql: string, params?: SqlValue[]) => void;
  prepare: (sql: string) => {
    bind: (params: SqlValue[]) => void;
    step: () => boolean;
    getAsObject: () => Record<string, unknown>;
    free: () => void;
  };
  export: () => Uint8Array;
  close: () => void;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function loadSqlJsModule() {
  const imported = await import("sql.js");
  const maybeFn = imported as unknown as { default?: unknown };
  let init = (maybeFn.default ?? imported) as unknown;
  if (init && typeof init === "object" && "default" in (init as object)) {
    init = (init as { default: unknown }).default;
  }
  if (typeof init !== "function") {
    throw new Error("sql.js failed to load");
  }
  const start = init as (opts?: {
    locateFile?: (f: string) => string;
    wasmBinary?: Uint8Array;
  }) => Promise<{
    Database: new (data?: Uint8Array) => SqlJsDatabase;
  }>;
  if (typeof window === "undefined") {
    return start();
  }
  const wasmUrl = `${window.location.origin}/sql-wasm.wasm`;
  const res = await fetch(wasmUrl);
  if (!res.ok) {
    throw new Error(`Could not load SQLite wasm (${res.status})`);
  }
  const wasmBinary = new Uint8Array(await res.arrayBuffer());
  return start({
    locateFile: () => wasmUrl,
    wasmBinary,
  });
}

export async function createSqlJsRunner(initialBytes?: Uint8Array): Promise<{
  runner: SqlRunner;
  exportBytes: () => Uint8Array;
  close: () => void;
}> {
  const SQL = await loadSqlJsModule();
  const db = initialBytes?.length
    ? new SQL.Database(initialBytes)
    : new SQL.Database();

  let queue: Promise<void> = Promise.resolve();
  function serialized<T>(fn: () => T): Promise<T> {
    const run = queue.then(() => fn());
    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  const runner: SqlRunner = {
    run(sql: string, params: SqlValue[] = []) {
      return serialized(() => {
        db.run(sql, params);
      });
    },
    all<T>(sql: string, params: SqlValue[] = []) {
      return serialized(() => {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        stmt.free();
        return rows;
      });
    },
  };

  await applyLocalShopSchema(runner);

  return {
    runner,
    exportBytes: () => db.export(),
    close: () => db.close(),
  };
}

const IDB_NAME = "projectz-sqlite-file";
const IDB_STORE = "files";
const IDB_KEY = "shop.db";

export async function readIndexedSqliteBytes(): Promise<Uint8Array | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, "readonly");
      const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
      get.onsuccess = () => {
        const val = get.result;
        resolve(val instanceof Uint8Array ? val : null);
      };
      get.onerror = () => reject(get.error);
    };
  });
}

export async function writeIndexedSqliteBytes(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

export { bytesToBase64, base64ToBytes };
