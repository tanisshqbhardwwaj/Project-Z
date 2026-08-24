import type { AuthContext } from "@/lib/api/context";
import { ApiError } from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import {
  getLinkedStaffRecord,
  requireStaffAccess,
} from "@/lib/staff/require-staff-access";

/** Owners/partners use RBAC; linked cashiers need the canBill toggle. */
export async function requireShopBilling(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canBill");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to create invoices");
}

export async function requireShopReturns(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canProcessReturns");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to process returns");
}

export async function canProcessShopReturns(ctx: AuthContext): Promise<boolean> {
  if (hasPermission(ctx.role, "shop.sales")) return true;
  if (ctx.role !== "CASHIER") return false;
  try {
    await requireStaffAccess(ctx, "canProcessReturns");
    return true;
  } catch {
    return false;
  }
}

/** Scan / bill lookup: billing staff, return processors, or full sales access. */
export async function requireShopScanAccess(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role !== "CASHIER") {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to scan");
  }
  try {
    await requireStaffAccess(ctx, "canBill");
    return;
  } catch {
    /* try returns */
  }
  await requireStaffAccess(ctx, "canProcessReturns");
}

export async function requireShopSalesRead(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewOwnSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}

/** When the caller may only see their own invoices, returns their staff id. */
export async function ownSalesStaffScope(
  ctx: AuthContext
): Promise<string | undefined> {
  if (hasPermission(ctx.role, "shop.sales")) return undefined;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewOwnSales");
    const staff = await getLinkedStaffRecord(ctx.organizationId, ctx.userId);
    if (!staff) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Your login is not linked to a staff profile"
      );
    }
    return staff.id;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}

/** Read a sale: full access, own sales, or any bill when processing returns. */
export async function assertSaleReadAccess(
  ctx: AuthContext,
  saleStaffId: string | null | undefined
) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (await canProcessShopReturns(ctx)) return;
  const scope = await ownSalesStaffScope(ctx);
  if (scope && saleStaffId !== scope) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to view this invoice");
  }
}

export async function assertOwnSaleAccess(
  ctx: AuthContext,
  saleStaffId: string | null | undefined
) {
  const scope = await ownSalesStaffScope(ctx);
  if (scope && saleStaffId !== scope) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to view this invoice");
  }
}

export async function requireOwnAttendance(ctx: AuthContext) {
  if (hasPermission(ctx.role, "attendance.view_own")) return;
  if (hasPermission(ctx.role, "attendance.mark")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewOwnAttendance");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view attendance");
}

export async function requireOwnSales(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewOwnSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}
