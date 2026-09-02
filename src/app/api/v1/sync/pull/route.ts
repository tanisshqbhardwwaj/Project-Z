import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { pullShopSnapshot } from "@/services/shop/shop-sync.service";
import { requireShopScanAccess } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopScanAccess(ctx);
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const windowDays = Number(searchParams.get("windowDays") ?? "3650");
    const snapshot = await pullShopSnapshot({
      organizationId: ctx.organizationId,
      since,
      windowDays: Number.isFinite(windowDays) ? windowDays : 3650,
    });
    return apiSuccess(snapshot);
  });
}
