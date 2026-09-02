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
import type { RestaurantTableStatus } from "@prisma/client";
import {
  listRestaurantTables,
  createRestaurantTable,
} from "@/services/restaurant/tables.service";

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
    const data = await listRestaurantTables({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      status: (searchParams.get("status") as RestaurantTableStatus | null) ?? undefined,
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
      throw new Error("Select a branch to create a table");
    }
    const body = await request.json();
    const row = await createRestaurantTable({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
