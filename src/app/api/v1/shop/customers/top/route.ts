import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { getShopBranchContext } from "@/lib/shop/branch-context";
import { getTopCustomers } from "@/services/shop-customer-analytics.service";
import { requireReportFeature } from "@/lib/billing/require-report-feature";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireReportFeature(ctx.organizationId, "customer-analytics");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "30d") as "7d" | "30d" | "90d" | "custom";
    const sort = (searchParams.get("sort") ?? "amount") as "amount" | "orders" | "items";
    const limit = Number(searchParams.get("limit") ?? "20");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const result = await getTopCustomers({
      organizationId: ctx.organizationId,
      period,
      sort,
      limit,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      branchScope: shopCtx.branchId,
    });
    return apiSuccess(result);
  });
}
