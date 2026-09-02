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
import { normalizeLocalSaleRecord } from "@/lib/shop/invoices/sale-invoice-mapper";
import {
  deriveAttendanceSessionStatus,
  formatTimeLabel,
  formatWorkingDuration,
} from "@/lib/staff/attendance-duration";

const LOCAL_FIRST_POST = new Set([
  "/api/v1/shop/sales",
  "/api/v1/shop/returns",
  "/api/v1/shop/udhaar/payments",
  "/api/v1/shop/purchases",
  "/api/v1/shop/expenses",
  "/api/v1/shop/customers",
  "/api/v1/staff/attendance/scan",
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
    return (
      p.startsWith("/api/v1/shop/") ||
      p.startsWith("/api/v1/sync/") ||
      p.startsWith("/api/v1/staff/attendance/")
    );
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
    const sales = await getLocalDb().getAll<Record<string, unknown>>("sales", id);
    const detailMatch = p.match(/^\/api\/v1\/shop\/sales\/([^/]+)$/);
    if (detailMatch) {
      const saleId = detailMatch[1]!;
      const sale = sales.find((row) => String(row.id) === saleId);
      if (!sale) throw new Error("Invoice not found");
      return normalizeLocalSaleRecord(sale) as T;
    }
    if (p === "/api/v1/shop/sales") {
      return sales.map(normalizeLocalSaleRecord) as T;
    }
    throw new Error("Invoice not found");
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

  if (method === "POST" && p === "/api/v1/staff/attendance/scan") {
    const { applyBarcodeScanOffline } = await import("@/lib/staff/offline-attendance-scan");
    try {
      return (await applyBarcodeScanOffline({
        orgId: id,
        userId: "local-user",
        barcode: String(body.barcode ?? ""),
        confirmCheckout: Boolean(body.confirmCheckout),
        eventId: typeof body.eventId === "string" ? body.eventId : undefined,
        deviceId: typeof body.deviceId === "string" ? body.deviceId : null,
      })) as T;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "SCAN_FAILED";
      throw new Error(`${code}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (method === "GET" && p === "/api/v1/staff/attendance") {
    const board = url.searchParams.get("board");
    if (board === "1" || board === "today") {
      const date = (url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10)).slice(
        0,
        10
      );
      const staffRows = await getLocalDb().getAll<{
        id: string;
        name: string;
        roleTitle?: string;
        roleKey?: string;
        attendanceBarcode?: string | null;
        status?: string;
      }>("staff", id);
      const attendanceRows = await getLocalDb().getAll<{
        id: string;
        staffId: string;
        date: string;
        checkInAt?: string | null;
        checkOutAt?: string | null;
        status?: string;
      }>("attendance", id);
      const byStaff = new Map(
        attendanceRows
          .filter((row) => String(row.date).slice(0, 10) === date)
          .map((row) => [row.staffId, row])
      );
      return staffRows
        .filter((s) => s.status !== "LEFT")
        .map((staff) => {
          const attendance = byStaff.get(staff.id) ?? null;
          const sessionStatus = attendance
            ? deriveAttendanceSessionStatus(attendance)
            : null;
          return {
            staff,
            attendance,
            sessionStatus,
            checkInLabel: attendance?.checkInAt
              ? formatTimeLabel(attendance.checkInAt)
              : null,
            checkOutLabel: attendance?.checkOutAt
              ? formatTimeLabel(attendance.checkOutAt)
              : null,
            durationLabel:
              attendance?.checkInAt != null
                ? formatWorkingDuration(attendance.checkInAt, attendance.checkOutAt)
                : null,
            date,
          };
        }) as T;
    }
  }

  throw new Error("This action needs internet. Reconnect to continue.");
}
