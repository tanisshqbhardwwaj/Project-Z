import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { requireModule } from "@/lib/org/require-module";
import {
  listRestaurantOrders,
  createRestaurantOrder,
} from "@/services/restaurant/orders.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const data = await listRestaurantOrders({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      tableId: searchParams.get("tableId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      orderType: searchParams.get("orderType") ?? undefined,
      channel: searchParams.get("channel") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    if (shopCtx.branchId === "all") {
      throw new Error("Select a branch to create an order");
    }
    const body = await request.json();
    const row = await createRestaurantOrder({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      branchId: shopCtx.branchId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
