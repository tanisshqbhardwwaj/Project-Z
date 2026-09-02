import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { processReturnSchema } from "@/lib/validation/shop-return";
import { listSaleReturns, processReturn } from "@/services/shop/shop-return.service";
import {
  ownSalesStaffScope,
  requireShopReturns,
} from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const staffScope = await ownSalesStaffScope(ctx).catch(() => null);
    if (staffScope === null) {
      await requireShopReturns(ctx);
    }
    const { searchParams } = new URL(request.url);
    const shopSaleId = searchParams.get("shopSaleId") ?? undefined;
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const rows = await listSaleReturns(ctx.organizationId, shopSaleId, {
      type: type === "RETURN" || type === "EXCHANGE" ? type : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      staffId: staffScope ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopReturns(ctx);
    const data = processReturnSchema.parse(await request.json());
    const row = await processReturn({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      shopSaleId: data.shopSaleId,
      type: data.type,
      reason: data.reason,
      notes: data.notes,
      refundMethod: data.refundMethod,
      lines: data.lines,
      exchangeItems: data.exchangeItems,
      staffId: data.staffId,
      staffName: data.staffName,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
