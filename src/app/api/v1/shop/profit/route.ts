import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopProfitAnalytics, getShopProfitReport } from "@/services/shop-profit.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.profit.view");
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = searchParams.get("period");

    if (from && to) {
      const data = await getShopProfitReport({
        organizationId: ctx.organizationId,
        from: new Date(from),
        to: new Date(to),
      });
      return apiSuccess(serializeBigInt(data));
    }

    const data = await getShopProfitAnalytics({
      organizationId: ctx.organizationId,
      period:
        period === "week"
          ? "week"
          : period === "month"
            ? "month"
            : "today",
    });
    return apiSuccess(serializeBigInt(data));
  });
}
