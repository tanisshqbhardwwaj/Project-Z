import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  getSalesChannelSettings,
  updateSalesChannelSettings,
} from "@/services/shop/aggregator.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const settings = await getSalesChannelSettings(ctx.organizationId);
    return apiSuccess(serializeBigInt(settings));
  });
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const settings = await updateSalesChannelSettings({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...body,
    });
    return apiSuccess(serializeBigInt(settings));
  });
}
