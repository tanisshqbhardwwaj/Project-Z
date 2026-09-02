import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getSaleReturn } from "@/services/shop/shop-return.service";
import { requireShopReturns } from "@/lib/staff/shop-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopReturns(ctx);
    const { id } = await params;
    const record = await getSaleReturn(ctx.organizationId, id);
    return apiSuccess(serializeBigInt(record));
  });
}
