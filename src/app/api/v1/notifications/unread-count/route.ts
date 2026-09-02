import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getUnreadCount } from "@/services/shared/notification.service";
import { syncShopAlertNotifications } from "@/services/shop/shop-notification.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await syncShopAlertNotifications(ctx.organizationId);
    const count = await getUnreadCount(ctx.userId, ctx.organizationId);
    return apiSuccess({ count });
  });
}
