import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  getServiceFollowUp,
  updateServiceFollowUp,
  deleteServiceFollowUp,
} from "@/services/service/followups.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const { id } = await context.params;
    const row = await getServiceFollowUp(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(row));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const { id } = await context.params;
    const body = await request.json();
    const row = await updateServiceFollowUp({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      followUpId: id,
      ...body,
    });
    return apiSuccess(serializeBigInt(row));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const { id } = await context.params;
    const row = await deleteServiceFollowUp(ctx.organizationId, ctx.userId, id);
    return apiSuccess(serializeBigInt(row));
  });
}
