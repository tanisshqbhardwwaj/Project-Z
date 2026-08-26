import { getLocalDb } from "@/lib/local-db";
import { getActiveOrganizationId } from "@/lib/api/client";
import {
  createSaleOffline,
  createReturnOffline,
  recordUdhaarPaymentOffline,
  createPurchaseOffline,
  createExpenseOffline,
  adjustStockOffline,
  upsertCustomerOffline,
} from "@/lib/sync/offline-writes";

const LOCAL_FIRST_POST = new Set([
  "/api/v1/shop/sales",
  "/api/v1/shop/returns",
  "/api/v1/shop/udhaar/payments",
  "/api/v1/shop/purchases",
  "/api/v1/shop/expenses",
  "/api/v1/shop/customers",
]);

function orgId(): string {
  const id = getActiveOrganizationId();
  if (!id) throw new Error("Organization context required");
  return id;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function pathOnly(path: string): string {
  return path.split("?")[0];
}

export function shouldHandleLocally(path: string, method: string): boolean {
  const m = method.toUpperCase();
  const p = pathOnly(path);
  if (isOffline()) {
    return p.startsWith("/api/v1/shop/") || p.startsWith("/api/v1/sync/");
  }
  if (m === "POST" && LOCAL_FIRST_POST.has(p)) return true;
  if (m === "PATCH" && /^\/api\/v1\/shop\/inventory\/[^/]+$/.test(p)) return true;
  return false;
}

export function isLocalFirstWrite(path: string, method: string): boolean {
  const m = method.toUpperCase();
  const p = pathOnly(path);
  if (m === "POST" && LOCAL_FIRST_POST.has(p)) return true;
  if (m === "PATCH" && /^\/api\/v1\/shop\/inventory\/[^/]+$/.test(p)) return true;
  return false;
}

export async function handleLocalApi<T>(path: string, options: RequestInit): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://local.shop");
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const id = orgId();
  const p = url.pathname;

  if (method === "GET" && p === "/api/v1/shop/sales/lookup") {
    const bill = (url.searchParams.get("bill") ?? "").trim();
    const sales = await getLocalDb().getAll<{
      id: string;
      billNumber?: string | null;
      customerName?: string | null;
      staffId?: string | null;
      status?: string;
    }>("sales", id);
    const sale = sales.find((s) => (s.billNumber ?? "").toUpperCase() === bill.toUpperCase());
    if (!sale) throw new Error("No invoice found for this bill number");
    if (sale.status && sale.status !== "COMPLETED") {
      throw new Error("This invoice cannot be returned");
    }
    return {
      id: sale.id,
      billNumber: sale.billNumber ?? null,
      customerName: sale.customerName ?? null,
      staffId: sale.staffId ?? null,
      status: sale.status ?? "COMPLETED",
    } as T;
  }

  if (method === "GET" && p.startsWith("/api/v1/shop/sales")) {
    const sales = await getLocalDb().getAll<T>("sales", id);
    return sales as T;
  }

  if (method === "GET" && p === "/api/v1/shop/inventory/lookup") {
    const barcode = (url.searchParams.get("barcode") ?? "").trim();
    const items = await getLocalDb().getAll<Record<string, unknown>>("inventory", id);
    const item = items.find(
      (row) => String(row.barcode ?? "").toLowerCase() === barcode.toLowerCase()
    );
    if (!item) throw new Error("No product for this barcode");
    return item as T;
  }

  if (method === "GET" && p.startsWith("/api/v1/shop/inventory") && !p.includes("/tools")) {
    const items = await getLocalDb().getAll<T>("inventory", id);
    return items as T;
  }

  if (method === "GET" && p.startsWith("/api/v1/shop/customers")) {
    const rows = await getLocalDb().getAll<T>("customers", id);
    return rows as T;
  }

  if (method === "GET" && p.startsWith("/api/v1/shop/returns")) {
    const rows = await getLocalDb().getAll<T>("returns", id);
    return rows as T;
  }

  if (method === "GET" && p === "/api/v1/sync/status") {
    const meta = await getLocalDb().getMeta(id);
    const pending = await getLocalDb().pendingCount(id);
    return {
      pendingServerOutbox: pending,
      lastAppliedAt: meta?.lastSyncAt ?? null,
      cloudEnabled: meta?.storage?.cloudEnabled ?? true,
      storage: meta?.storage ?? null,
    } as T;
  }

  if (method === "POST" && p === "/api/v1/shop/sales") {
    const sale = await createSaleOffline(id, body);
    return sale as T;
  }

  if (method === "POST" && p === "/api/v1/shop/returns") {
    const retId = await createReturnOffline(id, body);
    return { id: retId, ...body } as T;
  }

  if (method === "POST" && p === "/api/v1/shop/udhaar/payments") {
    const payId = await recordUdhaarPaymentOffline(id, body);
    return { id: payId, ...body } as T;
  }

  if (method === "POST" && p === "/api/v1/shop/purchases") {
    const purchaseId = await createPurchaseOffline(id, body);
    return { id: purchaseId, ...body } as T;
  }

  if (method === "POST" && p === "/api/v1/shop/expenses") {
    const expenseId = await createExpenseOffline(id, body);
    return { id: expenseId, ...body } as T;
  }

  if (method === "POST" && p === "/api/v1/shop/customers") {
    const customerId = await upsertCustomerOffline(id, body);
    return { id: customerId, ...body } as T;
  }

  if (method === "PATCH" && /^\/api\/v1\/shop\/inventory\/[^/]+$/.test(p)) {
    const itemId = p.split("/").pop()!;
    if (typeof body.quantity === "number") {
      await adjustStockOffline(id, itemId, body.quantity);
    }
    return body as T;
  }

  throw new Error("This action needs internet. Reconnect to continue.");
}
