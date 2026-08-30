import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { redeemCustomerPackage } from "@/services/service/customer-packages.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.packages.manage");
    await requireModule(ctx.organizationId, "service_packages");
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const row = await redeemCustomerPackage({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      customerPackageId: id,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
