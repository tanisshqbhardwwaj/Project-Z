import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { parseShopDashboardPeriod } from "@/lib/shop/reports/dashboard-period";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { getShopDashboard } from "@/services/shop/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.sales");
    }
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const { period, date, from, to } = parseShopDashboardPeriod(
      searchParams.get("period"),
      searchParams.get("date"),
      searchParams.get("from"),
      searchParams.get("to")
    );
    const data = await getShopDashboard(ctx.organizationId, period, date, {
      from,
      to,
    }, shopCtx.branchId);
    return apiSuccess(serializeBigInt(data));
  });
}
