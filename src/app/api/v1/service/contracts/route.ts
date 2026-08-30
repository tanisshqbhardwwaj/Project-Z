import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  listServiceContracts,
  createServiceContract,
} from "@/services/service/contracts.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.contracts.manage");
    await requireModule(ctx.organizationId, "service_contracts");
    const { searchParams } = new URL(request.url);
    const data = await listServiceContracts({
      organizationId: ctx.organizationId,
      customerId: searchParams.get("customerId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.contracts.manage");
    await requireModule(ctx.organizationId, "service_contracts");
    const body = await request.json();
    const row = await createServiceContract({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
