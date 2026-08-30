import { prisma } from "@/lib/db/prisma";
import type { AuthContext } from "@/lib/api/context";
import { ApiError } from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import {
  getLinkedStaffRecord,
  requireStaffAccess,
} from "@/lib/staff/require-staff-access";
import { parseStaffAccess } from "@/lib/staff/access";

export async function orgHasInventoryManager(
  organizationId: string
): Promise<boolean> {
  const count = await prisma.staffMember.count({
    where: {
      organizationId,
      status: "ACTIVE",
      roleKey: "INVENTORY_MANAGER",
    },
  });
  return count > 0;
}

/** Resolve inventory manage for manager when no inventory manager exists. */
export async function resolveCanManageInventory(
  organizationId: string,
  userId: string,
  role: AuthContext["role"]
): Promise<boolean> {
  if (hasPermission(role, "shop.inventory.manage")) return true;
  if (role !== "CASHIER") return false;
  const staff = await prisma.staffMember.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
    select: { id: true, roleKey: true },
  });
  if (!staff) return false;
  const accessJson = (await getLinkedStaffRecord(organizationId, userId))
    ?.accessJson;
  const access = parseStaffAccess(accessJson);
  if (access.canManageInventory) return true;
  if (staff.roleKey === "MANAGER") {
    return !(await orgHasInventoryManager(organizationId));
  }
  return false;
}

export async function requireInventoryManage(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.inventory.manage")) return;
  if (ctx.role === "CASHIER") {
    const ok = await resolveCanManageInventory(
      ctx.organizationId,
      ctx.userId,
      ctx.role
    );
    if (ok) return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to manage inventory");
}

export async function requireAllStaffAttendance(ctx: AuthContext) {
  if (hasPermission(ctx.role, "staff.view")) return;
  if (hasPermission(ctx.role, "attendance.mark")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewAllAttendance");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view staff attendance");
}

export async function requireAllSalesRead(ctx: AuthContext) {
  if (hasPermission(ctx.role, "shop.sales")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewAllSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view all sales");
}

/** null = all staff; string = own staff only */
export async function allSalesStaffScope(
  ctx: AuthContext
): Promise<string | null | undefined> {
  if (hasPermission(ctx.role, "shop.sales")) return null;
  if (ctx.role === "CASHIER") {
    const staff = await getLinkedStaffRecord(ctx.organizationId, ctx.userId);
    if (!staff) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Your login is not linked to a staff profile"
      );
    }
    const access = parseStaffAccess(staff.accessJson);
    if (access.canViewAllSales) return null;
    if (access.canViewOwnSales) return staff.id;
    throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}

export async function requireDeliveryManage(ctx: AuthContext) {
  if (hasPermission(ctx.role, "delivery.manage")) return;
  if (hasPermission(ctx.role, "shop.sales")) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to manage deliveries");
}

export async function requireOwnDeliveries(ctx: AuthContext) {
  if (hasPermission(ctx.role, "delivery.manage")) return;
  if (hasPermission(ctx.role, "delivery.view_own")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canViewOwnDeliveries");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view deliveries");
}

export async function requireDeliveryStatusUpdate(ctx: AuthContext) {
  if (hasPermission(ctx.role, "delivery.manage")) return;
  if (ctx.role === "CASHIER") {
    await requireStaffAccess(ctx, "canUpdateDeliveryStatus");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to update delivery status");
}

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
