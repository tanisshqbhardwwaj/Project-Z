import {
  getAuthContext,
  handleApi,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { getLinkedStaffMember } from "@/services/staff/staff.service";
import { listAttendanceRange } from "@/services/staff/attendance-payroll.service";
import {
  staffCheckIn,
  staffCheckOut,
} from "@/services/staff/attendance-checkin.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { yearMonthQuerySchema } from "@/lib/validation/staff";
import { eachDayKeyInMonth, orgTodayKey, utcDateToDayKey } from "@/lib/date/org-day";
import { requireOwnAttendance } from "@/lib/staff/shop-access";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { timezone: true },
    });
    const todayKey = orgTodayKey(org?.timezone);
    const todayRow = byDate.get(todayKey);

    return apiSuccess(
      serializeBigInt({
        staff,
        year,
        month,
        today: todayRow
          ? {
              date: todayKey,
              status: todayRow.status,
              checkInAt: todayRow.checkInAt,
              checkOutAt: todayRow.checkOutAt,
              overtimeHours: todayRow.overtimeHours,
              geoVerified: todayRow.geoVerified,
            }
          : { date: todayKey, status: null, checkInAt: null, checkOutAt: null },
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

export async function POST(request: Request) {
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

    const body = await request.json();
    const action = z.enum(["check_in", "check_out"]).parse(body.action);

    if (action === "check_in") {
      const row = await staffCheckIn({
        organizationId: ctx.organizationId,
        staffId: staff.id,
        markedById: ctx.userId,
        method: "GEO",
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
      });
      return apiSuccess(serializeBigInt(row));
    }

    const row = await staffCheckOut({
      organizationId: ctx.organizationId,
      staffId: staff.id,
      markedById: ctx.userId,
      method: "GEO",
    });
    return apiSuccess(serializeBigInt(row));
  });
}
