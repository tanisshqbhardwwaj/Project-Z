import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  createStaffMember,
  listStaffMembers,
  listStaffWithPerformance,
} from "@/services/staff.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { createStaffSchema } from "@/lib/validation/staff";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const options = {
      status: (status === "ACTIVE" || status === "LEFT" ? status : undefined) as
        | "ACTIVE"
        | "LEFT"
        | undefined,
      search: searchParams.get("q") ?? undefined,
    };

    // `withPerformance=1` adds this month's sales and commission per person.
    if (searchParams.get("withPerformance") === "1") {
      const now = new Date();
      const staff = await listStaffWithPerformance({
        organizationId: ctx.organizationId,
        year: Number(searchParams.get("year") ?? now.getFullYear()),
        month: Number(searchParams.get("month") ?? now.getMonth() + 1),
        ...options,
      });
      return apiSuccess(serializeBigInt(staff));
    }

    const staff = await listStaffMembers(ctx.organizationId, options);
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
      email: data.email || null,
      roleKey: data.roleKey,
      roleTitle: data.roleTitle,
      wageRupees: data.wageRupees,
      wagePeriod: data.wagePeriod,
      paymentFrequency: data.paymentFrequency,
      overtimeRateRupees: data.overtimeRateRupees,
      commissionType: data.commissionType,
      commissionPercent: data.commissionPercent,
      commissionAmountRupees: data.commissionAmountRupees,
      joinedAt: data.joinedAt,
      notes: data.notes,
    });

    return NextResponse.json({ data: serializeBigInt(staff) }, { status: 201 });
  });
}
