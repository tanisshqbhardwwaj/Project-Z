import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { parseShopDashboardPeriod } from "@/lib/shop/dashboard-period";
import { getShopDashboard } from "@/services/shop.service";

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
    const { period, date } = parseShopDashboardPeriod(
      searchParams.get("period"),
      searchParams.get("date")
    );
    const data = await getShopDashboard(ctx.organizationId, period, date);
    return apiSuccess(serializeBigInt(data));
  });
}
