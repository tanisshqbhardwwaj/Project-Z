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
  listServiceFollowUps,
  createServiceFollowUp,
} from "@/services/service/followups.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const { searchParams } = new URL(request.url);
    const data = await listServiceFollowUps({
      organizationId: ctx.organizationId,
      customerId: searchParams.get("customerId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const body = await request.json();
    const row = await createServiceFollowUp({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
