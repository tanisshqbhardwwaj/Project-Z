import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { processPendingOutbox } from "@/lib/desktop/local-mode";
import { requireShopScanAccess } from "@/lib/staff/shop-access";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopScanAccess(ctx);
    const result = await processPendingOutbox(ctx);
    return apiSuccess(result);
  });
}
