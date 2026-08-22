import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  getReturnableLines,
  listSaleReturns,
  processReturn,
} from "@/services/shop-return.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const { searchParams } = new URL(request.url);
    const shopSaleId = searchParams.get("shopSaleId") ?? undefined;
    const rows = await listSaleReturns(ctx.organizationId, shopSaleId);
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const body = await request.json();
    const row = await processReturn({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      shopSaleId: body.shopSaleId,
      type: body.type,
      reason: body.reason,
      notes: body.notes,
      refundMethod: body.refundMethod ?? "CASH",
      lines: body.lines ?? [],
      exchangeItems: body.exchangeItems,
      exchangePaymentMethod: body.exchangePaymentMethod,
      exchangePaidRupees: body.exchangePaidRupees,
    });
    return apiSuccess(serializeBigInt(row));
  });
}
