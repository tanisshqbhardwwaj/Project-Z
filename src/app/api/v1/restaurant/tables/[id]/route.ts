import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  getRestaurantTable,
  updateRestaurantTable,
  deleteRestaurantTable,
} from "@/services/restaurant/tables.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const { id } = await context.params;
    const row = await getRestaurantTable(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(row));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const { id } = await context.params;
    const body = await request.json();
    const row = await updateRestaurantTable({
      organizationId: ctx.organizationId,
      tableId: id,
      ...body,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await requireModule(ctx.organizationId, "restaurant_tables");
    const { id } = await context.params;
    const row = await deleteRestaurantTable(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(row));
  });
}
