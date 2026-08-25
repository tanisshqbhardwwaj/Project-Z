import {
  getAuthContext,
  handleApi,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { getLinkedStaffMember } from "@/services/staff.service";
import { listAttendanceRange } from "@/services/attendance-payroll.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { yearMonthQuerySchema } from "@/lib/validation/staff";
import { eachDayKeyInMonth, utcDateToDayKey } from "@/lib/date/org-day";
import { requireOwnAttendance } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireOwnAttendance(ctx);

    const staff = await getLinkedStaffMember(ctx.organizationId, ctx.userId);
    if (!staff) {
      throw new ApiError(
        404,
        "NOT_LINKED",
        "Your login is not linked to a staff profile. Ask the owner to link your account."
      );
    }

    const { searchParams } = new URL(request.url);
    const { year, month } = yearMonthQuerySchema.parse({
      year: searchParams.get("year"),
      month: searchParams.get("month"),
    });

    const days = eachDayKeyInMonth(year, month);
    const from = days[0];
    const to = days[days.length - 1];

    const rows = await listAttendanceRange(
      ctx.organizationId,
      from,
      to,
      staff.id
    );

    const byDate = new Map(
      rows.map((r) => [utcDateToDayKey(r.date), r])
    );

    return apiSuccess(
      serializeBigInt({
        staff,
        year,
        month,
        days: days.map((date) => ({
          date,
          status: byDate.get(date)?.status ?? null,
          overtimeHours: byDate.get(date)?.overtimeHours ?? null,
          notes: byDate.get(date)?.notes ?? null,
        })),
      })
    );
  });
}
