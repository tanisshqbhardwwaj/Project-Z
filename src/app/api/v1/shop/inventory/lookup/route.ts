import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { lookupInventoryByBarcode } from "@/services/shop.service";
import { requireShopScanAccess } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopScanAccess(ctx);

    const barcode = new URL(request.url).searchParams.get("barcode");
    if (!barcode?.trim()) {
      throw new Error("barcode query parameter is required");
    }

    const item = await lookupInventoryByBarcode(ctx.organizationId, barcode);
    return apiSuccess(serializeBigInt(item));
  });
}
