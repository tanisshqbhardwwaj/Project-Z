import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import type { AggregatorPayoutStatus, SalesChannel } from "@prisma/client";
import {
  listAggregatorPayouts,
  createAggregatorPayout,
} from "@/services/shop/aggregator.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const { searchParams } = new URL(request.url);
    const data = await listAggregatorPayouts({
      organizationId: ctx.organizationId,
      channel: (searchParams.get("channel") as SalesChannel | null) ?? undefined,
      status: (searchParams.get("status") as AggregatorPayoutStatus | null) ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const row = await createAggregatorPayout({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
