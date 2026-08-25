import type { LocalMeta, LocalOutboxRow, LocalStoreName } from "./types";

export interface LocalDbAdapter {
  name: "indexeddb" | "tauri-sql" | "capacitor-sqlite";
  ready: Promise<void>;
  getMeta(orgId: string): Promise<LocalMeta | null>;
  setMeta(meta: LocalMeta): Promise<void>;
  putAll(store: LocalStoreName, rows: { id: string; orgId: string; data: unknown }[]): Promise<void>;
  getAll<T>(store: LocalStoreName, orgId: string): Promise<T[]>;
  getById<T>(store: LocalStoreName, id: string): Promise<T | null>;
  putOne(store: LocalStoreName, row: { id: string; orgId: string; data: unknown }): Promise<void>;
  enqueue(row: LocalOutboxRow): Promise<void>;
  pendingOutbox(orgId: string): Promise<LocalOutboxRow[]>;
  markOutbox(
    id: string,
    status: LocalOutboxRow["status"],
    lastError?: string | null,
    attempts?: number
  ): Promise<void>;
  pendingCount(orgId: string): Promise<number>;
}
