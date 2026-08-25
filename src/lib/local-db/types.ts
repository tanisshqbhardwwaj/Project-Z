export type LocalMeta = {
  orgId: string;
  cursor: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  billSeq: number;
  fiscalYear: string;
  windowDays: number;
  storage?: {
    usedBytes: string;
    quotaBytes: string;
    cloudEnabled: boolean;
    byCategory: { category: string; bytes: string; count: number }[];
  } | null;
};

export type LocalOutboxRow = {
  id: string;
  orgId: string;
  kind: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "SYNCING" | "DONE" | "ERROR" | "DEAD";
  createdAt: string;
  lastError?: string | null;
  attempts?: number;
};

export type LocalStoreName =
  | "meta"
  | "outbox"
  | "sales"
  | "returns"
  | "inventory"
  | "customers"
  | "credits"
  | "creditEntries"
  | "purchases"
  | "expenses"
  | "staff";
