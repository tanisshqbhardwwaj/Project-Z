import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  createStaffMember,
  listStaffMembers,
} from "@/services/staff.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { createStaffSchema } from "@/lib/validation/staff";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const staff = await listStaffMembers(ctx.organizationId, {
      status: status === "ACTIVE" || status === "LEFT" ? status : undefined,
    });
    return apiSuccess(serializeBigInt(staff));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");

    const body = await request.json();
    const data = createStaffSchema.parse(body);

    const staff = await createStaffMember({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      name: data.name,
      phone: data.phone ?? undefined,
      roleTitle: data.roleTitle,
      wageRupees: data.wageRupees,
      wagePeriod: data.wagePeriod,
      overtimeRateRupees: data.overtimeRateRupees,
      joinedAt: data.joinedAt,
      notes: data.notes,
    });

    return NextResponse.json({ data: serializeBigInt(staff) }, { status: 201 });
  });
}
