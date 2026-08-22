import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { getAttendanceRegularityStats } from "@/services/attendance-payroll.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? "99");

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { timezone: true },
    });

    const stats = await getAttendanceRegularityStats(ctx.organizationId, {
      days: Number.isFinite(days) ? days : 99,
      timezone: org?.timezone,
    });
    return apiSuccess(serializeBigInt(stats));
  });
}
