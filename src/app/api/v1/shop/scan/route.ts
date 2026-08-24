import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { resolveBarcodeScan } from "@/services/shop.service";
import { requireShopScanAccess } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopScanAccess(ctx);

    const code = new URL(request.url).searchParams.get("code");
    if (!code?.trim()) {
      throw new Error("code query parameter is required");
    }

    const result = await resolveBarcodeScan(ctx.organizationId, code);
    return apiSuccess(serializeBigInt(result));
  });
}
