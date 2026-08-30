import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  getDelivery,
  updateDelivery,
  deleteDelivery,
} from "@/services/delivery.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!hasPermission(ctx.role, "delivery.manage")) {
      requirePermission(ctx, "delivery.view_own");
    }
    await requireModule(ctx.organizationId, "deliveries");
    const { id } = await context.params;
    const row = await getDelivery(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(row));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "delivery.manage") &&
      !hasPermission(ctx.role, "delivery.view_own")
    ) {
      requirePermission(ctx, "delivery.manage");
    }
    await requireModule(ctx.organizationId, "deliveries");
    const { id } = await context.params;
    const body = await request.json();
    const row = await updateDelivery({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      deliveryId: id,
      ...body,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "delivery.manage");
    await requireModule(ctx.organizationId, "deliveries");
    const { id } = await context.params;
    const row = await deleteDelivery(ctx.organizationId, ctx.userId, id);
    return apiSuccess(serializeBigInt(row));
  });
}
