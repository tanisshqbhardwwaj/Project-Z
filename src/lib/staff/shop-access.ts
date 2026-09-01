import { prisma } from "@/lib/db/prisma";
import type { AuthContext } from "@/lib/api/context";
import { ApiError } from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import {
  getLinkedStaffRecord,
  requireStaffAccess,
} from "@/lib/staff/require-staff-access";
import { parseStaffAccess } from "@/lib/staff/access";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";

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
  role: AuthContext["role"],
  businessType?: string | null
): Promise<boolean> {
  if (!shopStaffAccessApplies({ role, businessType }) && hasPermission(role, "shop.inventory.manage")) {
    return true;
  }
  if (!shopStaffAccessApplies({ role, businessType }) && role !== "CASHIER") return false;
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
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.inventory.manage")) {
    return;
  }
  const ok = await resolveCanManageInventory(
    ctx.organizationId,
    ctx.userId,
    ctx.role,
    ctx.businessType
  );
  if (ok) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to manage inventory");
}

export async function requireAllStaffAttendance(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "staff.view")) return;
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "attendance.mark")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewAllAttendance");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view staff attendance");
}

export async function requireAllSalesRead(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewAllSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view all sales");
}

/** null = all staff; string = own staff only */
export async function allSalesStaffScope(
  ctx: AuthContext
): Promise<string | null | undefined> {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return null;
  if (shopStaffAccessApplies(ctx)) {
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
  if (shopStaffAccessApplies(ctx)) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to manage deliveries");
  }
  if (hasPermission(ctx.role, "delivery.manage")) return;
  if (hasPermission(ctx.role, "shop.sales")) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to manage deliveries");
}

export async function requireOwnDeliveries(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "delivery.manage")) return;
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "delivery.view_own")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewOwnDeliveries");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view deliveries");
}

export async function requireDeliveryStatusUpdate(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "delivery.manage")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canUpdateDeliveryStatus");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to update delivery status");
}

/** Owners use RBAC; shop non-owners and cashiers need the canBill toggle. */
export async function requireShopBilling(ctx: AuthContext) {
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canBill");
    return;
  }
  if (hasPermission(ctx.role, "shop.sales")) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to create invoices");
}

export async function requireShopReturns(ctx: AuthContext) {
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canProcessReturns");
    return;
  }
  if (hasPermission(ctx.role, "shop.sales")) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to process returns");
}

export async function canProcessShopReturns(ctx: AuthContext): Promise<boolean> {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return true;
  if (!shopStaffAccessApplies(ctx)) return false;
  try {
    await requireStaffAccess(ctx, "canProcessReturns");
    return true;
  } catch {
    return false;
  }
}

/** Scan / bill lookup: billing staff, return processors, or full sales access. */
export async function requireShopScanAccess(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return;
  if (!shopStaffAccessApplies(ctx)) {
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
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewOwnSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}

/** When the caller may only see their own invoices, returns their staff id. */
export async function ownSalesStaffScope(
  ctx: AuthContext
): Promise<string | undefined> {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return undefined;
  if (shopStaffAccessApplies(ctx)) {
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
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "attendance.view_own")) return;
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "attendance.mark")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewOwnAttendance");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view attendance");
}

export async function requireOwnSales(ctx: AuthContext) {
  if (!shopStaffAccessApplies(ctx) && hasPermission(ctx.role, "shop.sales")) return;
  if (shopStaffAccessApplies(ctx)) {
    await requireStaffAccess(ctx, "canViewOwnSales");
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "Not allowed to view sales");
}
