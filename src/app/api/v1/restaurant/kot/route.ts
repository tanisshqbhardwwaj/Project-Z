import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { requireModule } from "@/lib/org/require-module";
import { listRestaurantKots } from "@/services/restaurant/kot.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_kitchen");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const data = await listRestaurantKots({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      status: searchParams.get("status") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
    });
    return apiSuccess(serializeBigInt(data));
  });
}
