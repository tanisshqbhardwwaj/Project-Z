import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { requireModule } from "@/lib/org/require-module";
import {
  listAppointments,
  createAppointment,
} from "@/services/service/appointments.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const data = await listAppointments({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      status: searchParams.get("status") ?? undefined,
      staffId: searchParams.get("staffId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
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
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const body = await request.json();
    const row = await createAppointment({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      branchId: shopCtx.branchId === "all" ? undefined : shopCtx.branchId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
