import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { getInventoryAnalytics } from "@/services/shop/shop.service";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { requireReportFeature } from "@/lib/billing/require-report-feature";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }

    await requireReportFeature(ctx.organizationId, "product-analytics");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const salesDays = daysParam ? Number(daysParam) : 30;

    const analytics = await getInventoryAnalytics(
      ctx.organizationId,
      salesDays,
      shopCtx.branchId
    );
    return apiSuccess(analytics);
  });
}
