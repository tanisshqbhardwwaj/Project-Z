import type { LocalDbAdapter } from "./adapter";
import type { LocalMeta, LocalOutboxRow, LocalStoreName } from "./types";
import { LOCAL_SHOP_MIGRATIONS, LOCAL_SHOP_STATEMENTS } from "./schema";
import type { SqlRunner } from "./sql-runner";
import { isRetryableOutboxStatus } from "@/lib/sync/outbox-policy";

const KV_OK: LocalStoreName[] = [
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

function isKvStore(store: LocalStoreName): boolean {
  return KV_OK.includes(store);
}

export async function applyLocalShopSchema(runner: SqlRunner) {
  for (const sql of LOCAL_SHOP_STATEMENTS) {
    await runner.run(sql);
  }
  for (const sql of LOCAL_SHOP_MIGRATIONS) {
    try {
      await runner.run(sql);
    } catch {
      /* column already exists on newer files */
    }
  }
}

export function createSqlAdapter(
  runner: SqlRunner,
  name: LocalDbAdapter["name"],
  persist?: () => Promise<void>
): LocalDbAdapter {
  async function afterWrite() {
    if (persist) await persist();
  }

  const adapter: LocalDbAdapter = {
    name,
    ready: Promise.resolve(),
    async getMeta(orgId) {
      const rows = await runner.all<{
        org_id: string;
        cursor: string | null;
        last_sync_at: string | null;
        last_error: string | null;
        bill_seq: number;
        fiscal_year: string | null;
        window_days: number;
        storage_json: string | null;
      }>("SELECT * FROM meta WHERE org_id = ?", [orgId]);
      const row = rows[0];
      if (!row) return null;
      return {
        orgId: row.org_id,
        cursor: row.cursor,
        lastSyncAt: row.last_sync_at,
        lastError: row.last_error,
        billSeq: Number(row.bill_seq) || 0,
        fiscalYear: row.fiscal_year ?? "",
        windowDays: Number(row.window_days) || 3650,
        storage: row.storage_json ? (JSON.parse(row.storage_json) as LocalMeta["storage"]) : null,
      };
    },
    async setMeta(meta) {
      await runner.run(
        `INSERT INTO meta (org_id, cursor, last_sync_at, last_error, bill_seq, fiscal_year, window_days, storage_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(org_id) DO UPDATE SET
           cursor = excluded.cursor,
           last_sync_at = excluded.last_sync_at,
           last_error = excluded.last_error,
           bill_seq = excluded.bill_seq,
           fiscal_year = excluded.fiscal_year,
           window_days = excluded.window_days,
           storage_json = excluded.storage_json`,
        [
          meta.orgId,
          meta.cursor,
          meta.lastSyncAt,
          meta.lastError,
          meta.billSeq,
          meta.fiscalYear,
          meta.windowDays,
          meta.storage ? JSON.stringify(meta.storage) : null,
        ]
      );
      await afterWrite();
    },
    async putAll(store, rows) {
      if (!isKvStore(store)) return;
      for (const row of rows) {
        await runner.run(
          `INSERT INTO kv (store, id, org_id, data) VALUES (?, ?, ?, ?)
           ON CONFLICT(store, id) DO UPDATE SET org_id = excluded.org_id, data = excluded.data`,
          [store, row.id, row.orgId, JSON.stringify(row.data)]
        );
      }
      await afterWrite();
    },
    async getAll<T>(store: LocalStoreName, orgId: string) {
      if (!isKvStore(store)) return [];
      const rows = await runner.all<{ data: string }>(
        "SELECT data FROM kv WHERE store = ? AND org_id = ?",
        [store, orgId]
      );
      return rows.map((r) => JSON.parse(r.data) as T);
    },
    async getById<T>(store: LocalStoreName, id: string) {
      if (!isKvStore(store)) return null;
      const rows = await runner.all<{ data: string }>(
        "SELECT data FROM kv WHERE store = ? AND id = ?",
        [store, id]
      );
      return rows[0] ? (JSON.parse(rows[0].data) as T) : null;
    },
    async putOne(store, row) {
      if (!isKvStore(store)) return;
      await runner.run(
        `INSERT INTO kv (store, id, org_id, data) VALUES (?, ?, ?, ?)
         ON CONFLICT(store, id) DO UPDATE SET org_id = excluded.org_id, data = excluded.data`,
        [store, row.id, row.orgId, JSON.stringify(row.data)]
      );
      await afterWrite();
    },
    async enqueue(row) {
      await runner.run(
        `INSERT INTO outbox (id, org_id, kind, payload, status, created_at, last_error, attempts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           status = excluded.status,
           last_error = excluded.last_error,
           attempts = excluded.attempts`,
        [
          row.id,
          row.orgId,
          row.kind,
          JSON.stringify(row.payload),
          row.status,
          row.createdAt,
          row.lastError ?? null,
          row.attempts ?? 0,
        ]
      );
      await afterWrite();
    },
    async pendingOutbox(orgId) {
      const rows = await runner.all<{
        id: string;
        org_id: string;
        kind: string;
        payload: string;
        status: LocalOutboxRow["status"];
        created_at: string;
        last_error: string | null;
        attempts: number | null;
      }>(
        `SELECT * FROM outbox WHERE org_id = ? AND status IN ('PENDING', 'ERROR', 'SYNCING')
         ORDER BY created_at ASC`,
        [orgId]
      );
      return rows
        .filter((r) =>
          isRetryableOutboxStatus(r.status, Number(r.attempts) || 0)
        )
        .map((r) => ({
          id: r.id,
          orgId: r.org_id,
          kind: r.kind,
          payload: JSON.parse(r.payload) as Record<string, unknown>,
          status: r.status,
          createdAt: r.created_at,
          lastError: r.last_error,
          attempts: Number(r.attempts) || 0,
        }));
    },
    async markOutbox(id, status, lastError, attempts) {
      if (attempts != null) {
        await runner.run(
          "UPDATE outbox SET status = ?, last_error = ?, attempts = ? WHERE id = ?",
          [status, lastError ?? null, attempts, id]
        );
      } else {
        await runner.run("UPDATE outbox SET status = ?, last_error = ? WHERE id = ?", [
          status,
          lastError ?? null,
          id,
        ]);
      }
      await afterWrite();
    },
    async pendingCount(orgId) {
      const rows = await this.pendingOutbox(orgId);
      return rows.length;
    },
  };

  return adapter;
}
