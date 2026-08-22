import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  generateOrRefreshPayroll,
  listPayroll,
  updatePayroll,
  markPayrollPaid,
} from "@/services/attendance-payroll.service";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  generatePayrollSchema,
  updatePayrollSchema,
  yearMonthQuerySchema,
} from "@/lib/validation/staff";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const { year, month } = yearMonthQuerySchema.parse({
      year: searchParams.get("year"),
      month: searchParams.get("month"),
    });
    const rows = await listPayroll(ctx.organizationId, year, month);
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "payroll.manage");
    const body = await request.json();
    const data = generatePayrollSchema.parse(body);
    const rows = await generateOrRefreshPayroll({
      organizationId: ctx.organizationId,
      year: data.year,
      month: data.month,
      userId: ctx.userId,
      staffId: data.staffId,
    });
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "payroll.manage");
    const body = await request.json();
    const data = updatePayrollSchema.parse(body);

    if (data.status === "PAID") {
      const row = await markPayrollPaid({
        organizationId: ctx.organizationId,
        payrollId: data.payrollId,
        userId: ctx.userId,
      });
      return apiSuccess(serializeBigInt(row));
    }

    const row = await updatePayroll({
      organizationId: ctx.organizationId,
      payrollId: data.payrollId,
      userId: ctx.userId,
      adjustmentRupees: data.adjustmentRupees,
      finalAmountRupees: data.finalAmountRupees,
      status: data.status,
      notes: data.notes,
      lines: data.lines,
    });
    return apiSuccess(serializeBigInt(row));
  });
}
