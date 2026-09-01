import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch/branch-context";
import { requireModule } from "@/lib/org/require-module";
import type { DeliveryStatus } from "@prisma/client";
import {
  listDeliveries,
  createDelivery,
} from "@/services/shared/delivery.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (!hasPermission(ctx.role, "delivery.manage")) {
      requirePermission(ctx, "delivery.view_own");
    }
    await requireModule(ctx.organizationId, "deliveries");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const { searchParams } = new URL(request.url);
    const data = await listDeliveries({
      organizationId: ctx.organizationId,
      branchId: shopCtx.branchId,
      status: (searchParams.get("status") as DeliveryStatus | null) ?? undefined,
      assignedStaffId: searchParams.get("assignedStaffId") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "delivery.manage");
    await requireModule(ctx.organizationId, "deliveries");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );
    const body = await request.json();
    const row = await createDelivery({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      branchId: shopCtx.branchId === "all" ? undefined : shopCtx.branchId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
