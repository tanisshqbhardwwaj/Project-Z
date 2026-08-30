import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  getAggregatorPayout,
  updateAggregatorPayout,
  deleteAggregatorPayout,
} from "@/services/shop/aggregator.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const { id } = await context.params;
    const row = await getAggregatorPayout({
      organizationId: ctx.organizationId,
      payoutId: id,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const { id } = await context.params;
    const body = await request.json();
    const row = await updateAggregatorPayout({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      payoutId: id,
      ...body,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const { id } = await context.params;
    await deleteAggregatorPayout({
      organizationId: ctx.organizationId,
      payoutId: id,
    });
    return apiSuccess({ ok: true });
  });
}
