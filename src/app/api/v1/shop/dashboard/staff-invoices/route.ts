import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { getStaffSalesInvoices } from "@/services/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.sales");
    }
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") === "month" ? "month" : "today";
    const staffName = searchParams.get("staffName")?.trim();
    if (!staffName) {
      throw new Error("staffName is required");
    }
    const data = await getStaffSalesInvoices(
      ctx.organizationId,
      period,
      staffName
    );
    return apiSuccess(serializeBigInt(data));
  });
}
