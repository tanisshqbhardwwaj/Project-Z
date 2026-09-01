import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createStaffAdvanceSchema } from "@/lib/validation/staff";
import {
  createStaffAdvance,
  listStaffAdvances,
} from "@/services/staff/staff-advance.service";
import { dayKeyToUtcDate } from "@/lib/date/org-day";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId") ?? undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "OPEN" || statusParam === "CLOSED" ? statusParam : undefined;
    const rows = await listStaffAdvances(ctx.organizationId, { staffId, status });
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "payroll.manage");
    const body = await request.json();
    const data = createStaffAdvanceSchema.parse(body);
    const row = await createStaffAdvance({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      staffId: data.staffId,
      amountRupees: data.amountRupees,
      notes: data.notes,
      givenDate: data.givenDate ? dayKeyToUtcDate(data.givenDate) : undefined,
      paymentMethod: data.paymentMethod,
    });
    return apiSuccess(serializeBigInt(row));
  });
}
