import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { lookupInventoryByBarcode } from "@/services/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");

    const barcode = new URL(request.url).searchParams.get("barcode");
    if (!barcode?.trim()) {
      throw new Error("barcode query parameter is required");
    }

    const item = await lookupInventoryByBarcode(ctx.organizationId, barcode);
    return apiSuccess(serializeBigInt(item));
  });
}
