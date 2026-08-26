import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getShopSyncStatus } from "@/services/shop-sync.service";
import { requireShopScanAccess } from "@/lib/staff/shop-access";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopScanAccess(ctx);
    const status = await getShopSyncStatus(ctx.organizationId);
    return apiSuccess(serializeBigInt(status));
  });
}
