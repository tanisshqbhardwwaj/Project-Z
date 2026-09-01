import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { yearMonthQuerySchema } from "@/lib/validation/staff";
import {
  computeStaffCommission,
  listStaffCommissions,
} from "@/services/staff/staff-commission.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const { year, month } = yearMonthQuerySchema.parse({
      year: searchParams.get("year") ?? now.getFullYear(),
      month: searchParams.get("month") ?? now.getMonth() + 1,
    });

    const staffId = searchParams.get("staffId");
    if (staffId) {
      const result = await computeStaffCommission({
        organizationId: ctx.organizationId,
        staffId,
        year,
        month,
      });
      return apiSuccess(serializeBigInt(result));
    }

    const rows = await listStaffCommissions({
      organizationId: ctx.organizationId,
      year,
      month,
    });
    return apiSuccess(serializeBigInt(rows));
  });
}
