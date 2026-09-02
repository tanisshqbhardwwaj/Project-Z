import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getReturnableLines } from "@/services/shop/shop-return.service";
import { requireShopReturns } from "@/lib/staff/shop-access";

type RouteParams = { params: Promise<{ saleId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { saleId } = await params;
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    await requireShopReturns(ctx);
    const lines = await getReturnableLines(ctx.organizationId, saleId);
    return apiSuccess(lines);
  });
}
