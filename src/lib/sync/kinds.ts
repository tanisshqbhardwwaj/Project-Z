export const SYNC_KINDS = [
  "sale.create",
  "return.create",
  "stock.adjust",
  "customer.upsert",
  "udhaar.payment",
  "purchase.create",
  "expense.create",
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number];

export type SyncOutboxItem = {
  id: string;
  kind: SyncKind | string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SyncPushResult = {
  id: string;
  status: "applied" | "duplicate" | "error";
  entityId?: string;
  error?: string;
};

export type SyncPullSnapshot = {
  cursor: string;
  windowDays: number;
  sales: unknown[];
  returns: unknown[];
  inventory: unknown[];
  customers: unknown[];
  credits: unknown[];
  creditEntries: unknown[];
  purchases: unknown[];
  expenses: unknown[];
  staff: unknown[];
  invoiceSettings: unknown;
  /** Server-authoritative bill sequence for the current fiscal year. */
  billSeq: number;
  /** Resolved store code used as the first bill-number segment. */
  storeCode: string;
  storage: {
    usedBytes: string;
    quotaBytes: string;
    cloudEnabled: boolean;
    byCategory: { category: string; bytes: string; count: number }[];
  };
};
