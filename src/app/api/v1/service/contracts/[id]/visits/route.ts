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
  listContractVisits,
  scheduleContractVisit,
} from "@/services/service/contracts.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.contracts.manage");
    await requireModule(ctx.organizationId, "service_contracts");
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const data = await listContractVisits({
      organizationId: ctx.organizationId,
      contractId: id,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.contracts.manage");
    await requireModule(ctx.organizationId, "service_contracts");
    const { id } = await context.params;
    const body = await request.json();
    const row = await scheduleContractVisit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      contractId: id,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
