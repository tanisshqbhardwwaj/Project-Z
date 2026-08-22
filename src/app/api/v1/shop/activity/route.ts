import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { getShopActivityLogs } from "@/services/shop-activity.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.activity.view");
    const { searchParams } = new URL(request.url);
    const logs = await getShopActivityLogs({
      organizationId: ctx.organizationId,
      search: searchParams.get("q") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    return apiSuccess(logs);
  });
}
