import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { findShopSaleByBillNumber } from "@/services/shop/shop.service";
import { requireShopReturns } from "@/lib/staff/shop-access";

/** Look up any invoice by bill number for returns (cross-cashier). */
export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopReturns(ctx);

    const bill = new URL(request.url).searchParams.get("bill");
    if (!bill?.trim()) {
      throw new Error("bill query parameter is required");
    }

    const sale = await findShopSaleByBillNumber(ctx.organizationId, bill);
    return apiSuccess(serializeBigInt(sale));
  });
}
