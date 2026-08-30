import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getNotifications, markNotificationRead } from "@/services/notification.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const notifications = await getNotifications(ctx.userId, ctx.organizationId);
    return apiSuccess(serializeBigInt(notifications));
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const body = await request.json();
    if (body.id) {
      await markNotificationRead(body.id, ctx.userId, ctx.organizationId);
    }
    return apiSuccess({ success: true });
  });
}
