/** Shared local shop SQLite schema (Windows Tauri file + Android Capacitor + sql.js). */

export const LOCAL_SHOP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS meta (
    org_id TEXT PRIMARY KEY,
    cursor TEXT,
    last_sync_at TEXT,
    last_error TEXT,
    bill_seq INTEGER NOT NULL DEFAULT 0,
    fiscal_year TEXT,
    window_days INTEGER NOT NULL DEFAULT 3650,
    storage_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS kv (
    store TEXT NOT NULL,
    id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (store, id)
  )`,
  `CREATE INDEX IF NOT EXISTS kv_org_store ON kv (org_id, store)`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS outbox_org_status ON outbox (org_id, status, created_at)`,
] as const;

export const LOCAL_SHOP_MIGRATIONS = [
  `ALTER TABLE outbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`,
] as const;

export const KV_STORES = [
  "sales",
  "returns",
  "inventory",
  "customers",
  "credits",
  "creditEntries",
  "purchases",
  "expenses",
  "staff",
] as const;
