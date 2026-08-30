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
  listServicePackages,
  createServicePackage,
} from "@/services/service/packages.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.packages.manage");
    await requireModule(ctx.organizationId, "service_packages");
    const { searchParams } = new URL(request.url);
    const data = await listServicePackages({
      organizationId: ctx.organizationId,
      activeOnly: searchParams.get("activeOnly") !== "0",
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.packages.manage");
    await requireModule(ctx.organizationId, "service_packages");
    const body = await request.json();
    const row = await createServicePackage({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(row) }, { status: 201 });
  });
}
