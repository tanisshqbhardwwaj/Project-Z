import type { LocalDbAdapter } from "@/lib/local-db/adapter";
import { applyLocalShopSchema, createSqlAdapter } from "@/lib/local-db/sql-adapter";
import type { SqlRunner, SqlValue } from "@/lib/local-db/sql-runner";
import { isCapacitorNative } from "@/lib/platform/native";
import { createIndexedDbAdapter } from "@/lib/local-db/indexed-adapter";

type CapDb = {
  open: () => Promise<void>;
  close: () => Promise<void>;
  execute: (sql: string) => Promise<unknown>;
  run: (sql: string, values?: SqlValue[]) => Promise<unknown>;
  query: (sql: string, values?: SqlValue[]) => Promise<{ values?: Record<string, unknown>[] }>;
};

type SqliteConnection = {
  isSecretStored: () => Promise<{ result?: boolean }>;
  setEncryptionSecret: (passphrase: string) => Promise<void>;
  isDatabase: (name: string) => Promise<{ result?: boolean }>;
  isDatabaseEncrypted: (name: string) => Promise<{ result?: boolean }>;
  createConnection: (
    name: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean
  ) => Promise<CapDb>;
  closeConnection: (name: string, readonly: boolean) => Promise<void>;
};

const DB_NAME = "projectz_shop";

function randomPassphrase(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Android: SQLCipher via `@capacitor-community/sqlite`.
 * Passphrase lives in the Android Keystore / iOS Keychain (`setEncryptionSecret`).
 * Falls back to IndexedDB when the native plugin is missing.
 */
export async function createCapacitorSqliteAdapter(): Promise<LocalDbAdapter> {
  if (isCapacitorNative()) {
    const native = await tryNativeSqlite();
    if (native) return native;
  }
  return createIndexedDbAdapter();
}

async function ensureEncryptionSecret(conn: SqliteConnection) {
  const stored = await conn.isSecretStored();
  if (stored.result) return;
  await conn.setEncryptionSecret(randomPassphrase());
}

async function openEncrypted(conn: SqliteConnection): Promise<CapDb> {
  await ensureEncryptionSecret(conn);

  const exists = await conn.isDatabase(DB_NAME).catch(() => ({ result: false }));
  if (exists.result) {
    const encrypted = await conn.isDatabaseEncrypted(DB_NAME).catch(() => ({ result: true }));
    if (!encrypted.result) {
      const migrating = await conn.createConnection(DB_NAME, true, "encryption", 1, false);
      await migrating.open();
      await migrating.close();
      await conn.closeConnection(DB_NAME, false).catch(() => undefined);
    }
  }

  const db = await conn.createConnection(DB_NAME, true, "secret", 1, false);
  await db.open();
  return db;
}

async function tryNativeSqlite(): Promise<LocalDbAdapter | null> {
  try {
    const mod = await import("@capacitor-community/sqlite");
    const sqlitePlugin = (mod as { CapacitorSQLite: unknown }).CapacitorSQLite;
    const SQLiteConnection = (
      mod as { SQLiteConnection: new (plugin: unknown) => SqliteConnection }
    ).SQLiteConnection;
    if (!sqlitePlugin || !SQLiteConnection) return null;

    const conn = new SQLiteConnection(sqlitePlugin);
    const db = await openEncrypted(conn);

    const runner: SqlRunner = {
      async run(sql: string, params: SqlValue[] = []) {
        if (params.length === 0) {
          await db.execute(sql);
          return;
        }
        await db.run(sql, params);
      },
      async all<T>(sql: string, params: SqlValue[] = []) {
        const res = await db.query(sql, params);
        return (res.values ?? []) as T[];
      },
    };

    await applyLocalShopSchema(runner);
    return createSqlAdapter(runner, "capacitor-sqlite");
  } catch {
    return null;
  }
}
