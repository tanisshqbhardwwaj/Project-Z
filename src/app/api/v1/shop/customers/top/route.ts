import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { getTopCustomers } from "@/services/shop-customer-analytics.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
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
    });
    return apiSuccess(result);
  });
}
