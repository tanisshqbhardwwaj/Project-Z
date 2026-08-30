import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  listAttendanceForDate,
  upsertAttendance,
  bulkMarkAttendance,
  listAttendanceRange,
  listAttendanceGrid,
} from "@/services/attendance-payroll.service";
import {
  checkInWithPin,
  checkInWithQrToken,
  getAttendanceBoard,
  staffCheckIn,
  staffCheckOut,
} from "@/services/attendance-checkin.service";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  upsertAttendanceSchema,
  bulkAttendanceSchema,
  dayKeySchema,
  yearMonthQuerySchema,
} from "@/lib/validation/staff";
import { orgTodayKey } from "@/lib/date/org-day";
import { prisma } from "@/lib/db/prisma";
import { requireAllStaffAttendance } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireAllStaffAttendance(ctx);
    const { searchParams } = new URL(request.url);

    const gridYear = searchParams.get("year");
    const gridMonth = searchParams.get("month");
    const hasDate = searchParams.has("date");
    if (gridYear && gridMonth && !hasDate) {
      const { year, month } = yearMonthQuerySchema.parse({
        year: gridYear,
        month: gridMonth,
      });
      const grid = await listAttendanceGrid(ctx.organizationId, year, month);
      return apiSuccess(serializeBigInt(grid));
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      const staffId = searchParams.get("staffId") ?? undefined;
      dayKeySchema.parse(from);
      dayKeySchema.parse(to);
      const rows = await listAttendanceRange(ctx.organizationId, from, to, staffId);
      return apiSuccess(serializeBigInt(rows));
    }

    const board = searchParams.get("board");
    if (board === "1") {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { timezone: true },
      });
      const date =
        searchParams.get("date") ?? orgTodayKey(org?.timezone);
      dayKeySchema.parse(date);
      const rows = await getAttendanceBoard(ctx.organizationId, date);
      return apiSuccess(serializeBigInt(rows));
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { timezone: true },
    });
    const date =
      searchParams.get("date") ?? orgTodayKey(org?.timezone);
    dayKeySchema.parse(date);
    const rows = await listAttendanceForDate(ctx.organizationId, date);
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "attendance.mark");
    const body = await request.json();

    if (body.action === "check_in") {
      const row = await staffCheckIn({
        organizationId: ctx.organizationId,
        staffId: z.string().uuid().parse(body.staffId),
        markedById: ctx.userId,
        method: z.enum(["MANUAL", "QUICK_CHECKIN", "PIN", "QR", "DEVICE", "GEO"]).parse(
          body.method ?? "QUICK_CHECKIN"
        ),
        deviceFingerprint: body.deviceFingerprint ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        geoVerified: body.geoVerified ?? null,
        geoDistanceMeters: body.geoDistanceMeters ?? null,
      });
      return apiSuccess(serializeBigInt(row));
    }

    if (body.action === "check_out") {
      const row = await staffCheckOut({
        organizationId: ctx.organizationId,
        staffId: z.string().uuid().parse(body.staffId),
        markedById: ctx.userId,
        method: z.enum(["MANUAL", "QUICK_CHECKIN", "PIN", "QR", "DEVICE", "GEO"]).parse(
          body.method ?? "QUICK_CHECKIN"
        ),
      });
      return apiSuccess(serializeBigInt(row));
    }

    if (body.action === "pin_check_in") {
      const row = await checkInWithPin({
        organizationId: ctx.organizationId,
        pin: z.string().min(4).max(6).parse(body.pin),
        markedById: ctx.userId,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        geoVerified: body.geoVerified,
        geoDistanceMeters: body.geoDistanceMeters,
      });
      return apiSuccess(serializeBigInt(row));
    }

    if (body.action === "qr_check_in") {
      const row = await checkInWithQrToken({
        organizationId: ctx.organizationId,
        staffId: z.string().uuid().parse(body.staffId),
        token: z.string().min(8).parse(body.token),
        markedById: ctx.userId,
      });
      return apiSuccess(serializeBigInt(row));
    }

    if (body.staffIds || body.bulk) {
      const data = bulkAttendanceSchema.parse(body);
      const rows = await bulkMarkAttendance({
        organizationId: ctx.organizationId,
        date: data.date,
        status: data.status,
        staffIds: data.staffIds,
        markedById: ctx.userId,
      });
      return apiSuccess(serializeBigInt(rows));
    }

    const data = upsertAttendanceSchema.parse(body);
    const row = await upsertAttendance({
      organizationId: ctx.organizationId,
      staffId: data.staffId,
      date: data.date,
      status: data.status,
      overtimeHours: data.overtimeHours,
      notes: data.notes,
      markedById: ctx.userId,
    });
    return apiSuccess(serializeBigInt(row));
  });
}
