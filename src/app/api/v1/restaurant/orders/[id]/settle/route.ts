import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { settleRestaurantOrder } from "@/services/restaurant/orders.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const { id } = await context.params;
    const body = await request.json();
    const result = await settleRestaurantOrder({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      orderId: id,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(result) }, { status: 201 });
  });
}
