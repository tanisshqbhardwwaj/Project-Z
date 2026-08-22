import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getReturnableLines } from "@/services/shop-return.service";

type RouteParams = { params: Promise<{ saleId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const { saleId } = await params;
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const lines = await getReturnableLines(ctx.organizationId, saleId);
    return apiSuccess(lines);
  });
}
