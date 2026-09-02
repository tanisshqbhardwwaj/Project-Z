import type { StaffAttendance } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireModule, getOrgModuleContext } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";
import {
  dayKeyToUtcDate,
  orgTodayKey,
  utcDateToDayKey,
} from "@/lib/date/org-day";
import {
  generateStaffAttendanceBarcode,
  isLikelyProductBarcode,
  isStaffAttendanceBarcode,
  normalizeStaffBarcode,
} from "@/lib/staff/attendance-barcode";
import {
  deriveAttendanceSessionStatus,
  formatTimeLabel,
  formatWorkingDuration,
} from "@/lib/staff/attendance-duration";

export type AttendanceScanErrorCode =
  | "STAFF_NOT_RECOGNIZED"
  | "STAFF_INACTIVE"
  | "UNAUTHORIZED_BARCODE"
  | "INVALID_BARCODE"
  | "NO_CHECK_IN"
  | "DUPLICATE_EVENT";

export type AttendanceScanResult =
  | {
      action: "CHECKED_IN";
      staffId: string;
      staffName: string;
      attendanceId: string;
      checkInAt: string;
      eventId: string;
    }
  | {
      action: "CHECKED_OUT";
      staffId: string;
      staffName: string;
      attendanceId: string;
      checkInAt: string;
      checkOutAt: string;
      durationLabel: string;
      eventId: string;
    }
  | {
      action: "NEEDS_CHECKOUT_CONFIRM";
      staffId: string;
      staffName: string;
      checkInAt: string;
      checkInLabel: string;
    };

export class AttendanceScanError extends Error {
  constructor(
    public code: AttendanceScanErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AttendanceScanError";
  }
}

async function findStaffByBarcode(organizationId: string, barcode: string) {
  return prisma.staffMember.findFirst({
    where: { organizationId, attendanceBarcode: barcode },
    select: {
      id: true,
      name: true,
      status: true,
      organizationId: true,
      roleTitle: true,
    },
  });
}

async function findForeignStaffBarcode(barcode: string, organizationId: string) {
  return prisma.staffMember.findFirst({
    where: {
      attendanceBarcode: barcode,
      NOT: { organizationId },
    },
    select: { id: true },
  });
}

function serializeScanResult(
  row: StaffAttendance,
  staffName: string,
  eventId: string,
  action: "CHECKED_IN" | "CHECKED_OUT"
): AttendanceScanResult {
  const checkInAt = row.checkInAt!.toISOString();
  if (action === "CHECKED_IN") {
    return {
      action: "CHECKED_IN",
      staffId: row.staffId,
      staffName,
      attendanceId: row.id,
      checkInAt,
      eventId,
    };
  }
  return {
    action: "CHECKED_OUT",
    staffId: row.staffId,
    staffName,
    attendanceId: row.id,
    checkInAt,
    checkOutAt: row.checkOutAt!.toISOString(),
    durationLabel: formatWorkingDuration(row.checkInAt, row.checkOutAt),
    eventId,
  };
}

async function getExistingEventResult(
  eventId: string,
  organizationId: string
): Promise<AttendanceScanResult | null> {
  const event = await prisma.staffAttendanceEvent.findFirst({
    where: { id: eventId, organizationId },
    include: {
      staff: { select: { name: true } },
      attendance: true,
    },
  });
  if (!event?.attendance) return null;
  const staffName = event.staff.name;
  if (event.type === "CHECK_IN") {
    return serializeScanResult(event.attendance, staffName, eventId, "CHECKED_IN");
  }
  if (event.type === "CHECK_OUT") {
    return serializeScanResult(event.attendance, staffName, eventId, "CHECKED_OUT");
  }
  return null;
}

export async function applyBarcodeScan(input: {
  organizationId: string;
  userId: string;
  barcode: string;
  confirmCheckout?: boolean;
  eventId?: string;
  deviceId?: string | null;
}): Promise<AttendanceScanResult> {
  await requireModule(input.organizationId, "staff");
  const eventId = input.eventId ?? crypto.randomUUID();

  const existing = await getExistingEventResult(eventId, input.organizationId);
  if (existing) return existing;

  const normalized = normalizeStaffBarcode(input.barcode);
  if (!normalized || !isStaffAttendanceBarcode(normalized)) {
    if (isLikelyProductBarcode(normalized)) {
      throw new AttendanceScanError(
        "INVALID_BARCODE",
        "Please scan a valid staff attendance barcode."
      );
    }
    throw new AttendanceScanError(
      "STAFF_NOT_RECOGNIZED",
      "Please scan a valid staff attendance barcode."
    );
  }

  const staff = await findStaffByBarcode(input.organizationId, normalized);
  if (!staff) {
    const foreign = await findForeignStaffBarcode(normalized, input.organizationId);
    if (foreign) {
      throw new AttendanceScanError(
        "UNAUTHORIZED_BARCODE",
        "Unauthorized staff barcode."
      );
    }
    throw new AttendanceScanError(
      "STAFF_NOT_RECOGNIZED",
      "Staff not recognized."
    );
  }

  if (staff.status !== "ACTIVE") {
    throw new AttendanceScanError(
      "STAFF_INACTIVE",
      "Attendance cannot be recorded."
    );
  }

  const { org } = await getOrgModuleContext(input.organizationId);
  const dayKey = orgTodayKey(org.timezone);
  const date = dayKeyToUtcDate(dayKey);
  const now = new Date();

  const existingRow = await prisma.staffAttendance.findFirst({
    where: {
      organizationId: input.organizationId,
      staffId: staff.id,
      date,
    },
  });

  const isOpen =
    existingRow?.checkInAt != null &&
    existingRow.checkOutAt == null &&
    deriveAttendanceSessionStatus(existingRow) === "OPEN";

  if (isOpen) {
    if (!input.confirmCheckout) {
      return {
        action: "NEEDS_CHECKOUT_CONFIRM",
        staffId: staff.id,
        staffName: staff.name,
        checkInAt: existingRow!.checkInAt!.toISOString(),
        checkInLabel: formatTimeLabel(existingRow!.checkInAt),
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.staffAttendance.update({
        where: { id: existingRow!.id },
        data: {
          checkOutAt: now,
          checkOutMethod: "BARCODE",
          deviceId: input.deviceId ?? existingRow!.deviceId,
          markedById: input.userId,
        },
      });
      await tx.staffAttendanceEvent.create({
        data: {
          id: eventId,
          organizationId: input.organizationId,
          staffId: staff.id,
          attendanceId: row.id,
          deviceId: input.deviceId ?? null,
          type: "CHECK_OUT",
          at: now,
          source: "BARCODE",
          createdById: input.userId,
        },
      });
      return row;
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "attendance.barcode_check_out",
      entityType: "StaffAttendance",
      entityId: updated.id,
      after: { staffId: staff.id, eventId },
    });

    return serializeScanResult(updated, staff.name, eventId, "CHECKED_OUT");
  }

  const row = await prisma.$transaction(async (tx) => {
    const attendance = await tx.staffAttendance.upsert({
      where: { staffId_date: { staffId: staff.id, date } },
      create: {
        organizationId: input.organizationId,
        staffId: staff.id,
        date,
        status: "PRESENT",
        checkInAt: now,
        checkInMethod: "BARCODE",
        deviceId: input.deviceId ?? null,
        markedById: input.userId,
      },
      update: {
        status: "PRESENT",
        checkInAt: now,
        checkOutAt: null,
        checkOutMethod: null,
        checkInMethod: "BARCODE",
        deviceId: input.deviceId ?? null,
        markedById: input.userId,
      },
    });
    await tx.staffAttendanceEvent.create({
      data: {
        id: eventId,
        organizationId: input.organizationId,
        staffId: staff.id,
        attendanceId: attendance.id,
        deviceId: input.deviceId ?? null,
        type: "CHECK_IN",
        at: now,
        source: "BARCODE",
        createdById: input.userId,
      },
    });
    return attendance;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "attendance.barcode_check_in",
    entityType: "StaffAttendance",
    entityId: row.id,
    after: { staffId: staff.id, eventId },
  });

  return serializeScanResult(row, staff.name, eventId, "CHECKED_IN");
}

export async function generateStaffAttendanceBarcodeForMember(input: {
  organizationId: string;
  staffId: string;
  userId: string;
  regenerate?: boolean;
}) {
  await requireModule(input.organizationId, "staff");
  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!staff) throw new Error("Staff member not found");
  if (staff.attendanceBarcode && !input.regenerate) {
    return {
      staffId: staff.id,
      attendanceBarcode: staff.attendanceBarcode,
      attendanceBarcodeSetAt: staff.attendanceBarcodeSetAt,
    };
  }

  let barcode = "";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = generateStaffAttendanceBarcode(input.organizationId);
    const taken = await prisma.staffMember.findFirst({
      where: {
        organizationId: input.organizationId,
        attendanceBarcode: candidate,
        NOT: { id: staff.id },
      },
      select: { id: true },
    });
    if (!taken) {
      barcode = candidate;
      break;
    }
  }
  if (!barcode) throw new Error("Could not generate a unique staff barcode");

  const updated = await prisma.staffMember.update({
    where: { id: staff.id },
    data: {
      attendanceBarcode: barcode,
      attendanceBarcodeSetAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      attendanceBarcode: true,
      attendanceBarcodeSetAt: true,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: input.regenerate ? "attendance.barcode_regenerated" : "attendance.barcode_generated",
    entityType: "StaffMember",
    entityId: staff.id,
    after: { attendanceBarcode: barcode },
  });

  return updated;
}

export async function bulkGenerateStaffAttendanceBarcodes(input: {
  organizationId: string;
  userId: string;
  regenerate?: boolean;
  staffIds?: string[];
}) {
  await requireModule(input.organizationId, "staff");
  const staff = await prisma.staffMember.findMany({
    where: {
      organizationId: input.organizationId,
      status: "ACTIVE",
      ...(input.staffIds?.length ? { id: { in: input.staffIds } } : {}),
      ...(input.regenerate ? {} : { attendanceBarcode: null }),
    },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  const results = [];
  for (const member of staff) {
    const row = await generateStaffAttendanceBarcodeForMember({
      organizationId: input.organizationId,
      staffId: member.id,
      userId: input.userId,
      regenerate: input.regenerate,
    });
    results.push(row);
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "attendance.barcode_bulk_generated",
    entityType: "StaffMember",
    entityId: input.organizationId,
    after: { count: results.length, regenerate: !!input.regenerate },
  });

  return { count: results.length, staff: results };
}

export async function revokeStaffAttendanceBarcode(input: {
  organizationId: string;
  staffId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "staff");
  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!staff) throw new Error("Staff member not found");

  await prisma.staffMember.update({
    where: { id: staff.id },
    data: {
      attendanceBarcode: null,
      attendanceBarcodeSetAt: null,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "attendance.barcode_revoked",
    entityType: "StaffMember",
    entityId: staff.id,
  });
}

export async function correctAttendanceRecord(input: {
  organizationId: string;
  attendanceId: string;
  userId: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: "PRESENT" | "ABSENT" | "HALF_DAY" | "PAID_LEAVE";
  notes?: string | null;
  eventId?: string;
}) {
  await requireModule(input.organizationId, "staff");
  const existing = await prisma.staffAttendance.findFirst({
    where: { id: input.attendanceId, organizationId: input.organizationId },
    include: { staff: { select: { id: true, name: true } } },
  });
  if (!existing) throw new Error("Attendance record not found");

  const eventId = input.eventId ?? crypto.randomUUID();
  const dup = await prisma.staffAttendanceEvent.findUnique({ where: { id: eventId } });
  if (dup) return existing;

  const previousJson = {
    checkInAt: existing.checkInAt?.toISOString() ?? null,
    checkOutAt: existing.checkOutAt?.toISOString() ?? null,
    status: existing.status,
    notes: existing.notes,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.staffAttendance.update({
      where: { id: existing.id },
      data: {
        ...(input.checkInAt !== undefined && {
          checkInAt: input.checkInAt ? new Date(input.checkInAt) : null,
        }),
        ...(input.checkOutAt !== undefined && {
          checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : null,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        markedById: input.userId,
      },
    });
    await tx.staffAttendanceEvent.create({
      data: {
        id: eventId,
        organizationId: input.organizationId,
        staffId: existing.staffId,
        attendanceId: row.id,
        type: "CORRECTION",
        at: new Date(),
        source: "MANUAL",
        createdById: input.userId,
        previousJson,
      },
    });
    return row;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "attendance.corrected",
    entityType: "StaffAttendance",
    entityId: existing.id,
    before: previousJson,
    after: updated,
  });

  return updated;
}

export async function listTodayAttendanceBoard(organizationId: string, date?: string) {
  await requireModule(organizationId, "staff");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const dayKey = date ?? orgTodayKey(org?.timezone);
  const dateUtc = dayKeyToUtcDate(dayKey);

  const [staff, attendance] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        roleTitle: true,
        roleKey: true,
        attendanceBarcode: true,
      },
    }),
    prisma.staffAttendance.findMany({
      where: { organizationId, date: dateUtc },
      orderBy: { checkInAt: "asc" },
    }),
  ]);

  const byStaff = new Map(attendance.map((a) => [a.staffId, a]));

  return staff.map((s) => {
    const row = byStaff.get(s.id) ?? null;
    const sessionStatus = row ? deriveAttendanceSessionStatus(row) : null;
    return {
      staff: s,
      attendance: row,
      sessionStatus,
      checkInLabel: row?.checkInAt ? formatTimeLabel(row.checkInAt) : null,
      checkOutLabel: row?.checkOutAt ? formatTimeLabel(row.checkOutAt) : null,
      durationLabel:
        row?.checkInAt != null
          ? formatWorkingDuration(row.checkInAt, row.checkOutAt)
          : null,
      date: dayKey,
    };
  });
}

export async function listStaffAttendanceHistory(
  organizationId: string,
  staffId: string,
  from: string,
  to: string
) {
  await requireModule(organizationId, "staff");
  const rows = await prisma.staffAttendance.findMany({
    where: {
      organizationId,
      staffId,
      date: { gte: dayKeyToUtcDate(from), lte: dayKeyToUtcDate(to) },
    },
    orderBy: { date: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    dateKey: utcDateToDayKey(row.date),
    sessionStatus: deriveAttendanceSessionStatus(row),
    checkInLabel: formatTimeLabel(row.checkInAt),
    checkOutLabel: formatTimeLabel(row.checkOutAt),
    durationLabel: formatWorkingDuration(row.checkInAt, row.checkOutAt),
  }));
}
