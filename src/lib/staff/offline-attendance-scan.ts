import { getLocalDb } from "@/lib/local-db";
import { enqueueMutation, runSync } from "@/lib/sync/client";
import type { SyncKind } from "@/lib/sync/kinds";
import {
  isLikelyProductBarcode,
  isStaffAttendanceBarcode,
  normalizeStaffBarcode,
} from "@/lib/staff/attendance-barcode";
import {
  deriveAttendanceSessionStatus,
  formatTimeLabel,
  formatWorkingDuration,
} from "@/lib/staff/attendance-duration";
import type { AttendanceScanResult } from "@/services/staff/attendance-scan.service";

type LocalStaffRow = {
  id: string;
  name: string;
  roleTitle?: string;
  status?: string;
  attendanceBarcode?: string | null;
};

type LocalAttendanceRow = {
  id: string;
  staffId: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: string;
  _pendingSync?: boolean;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function attendanceKey(staffId: string, date: string): string {
  return `${staffId}:${date}`;
}

export async function applyBarcodeScanOffline(input: {
  orgId: string;
  userId: string;
  barcode: string;
  confirmCheckout?: boolean;
  eventId?: string;
  deviceId?: string | null;
}): Promise<AttendanceScanResult> {
  const normalized = normalizeStaffBarcode(input.barcode);
  if (!normalized || !isStaffAttendanceBarcode(normalized)) {
    if (isLikelyProductBarcode(normalized)) {
      throw Object.assign(new Error("Please scan a valid staff attendance barcode."), {
        code: "INVALID_BARCODE",
      });
    }
    throw Object.assign(new Error("Staff not recognized."), { code: "STAFF_NOT_RECOGNIZED" });
  }

  const db = getLocalDb();
  const staffRows = await db.getAll<LocalStaffRow>("staff", input.orgId);
  const staff = staffRows.find(
    (row) => normalizeStaffBarcode(String(row.attendanceBarcode ?? "")) === normalized
  );
  if (!staff) {
    throw Object.assign(new Error("Staff not recognized."), { code: "STAFF_NOT_RECOGNIZED" });
  }
  if (staff.status && staff.status !== "ACTIVE") {
    throw Object.assign(new Error("Attendance cannot be recorded."), { code: "STAFF_INACTIVE" });
  }

  const day = todayKey();
  const attendanceRows = await db.getAll<LocalAttendanceRow>("attendance", input.orgId);
  const existing = attendanceRows.find(
    (row) => row.staffId === staff.id && String(row.date).slice(0, 10) === day
  );

  const isOpen =
    existing?.checkInAt &&
    !existing.checkOutAt &&
    deriveAttendanceSessionStatus(existing) === "OPEN";

  const eventId = input.eventId ?? crypto.randomUUID();
  const now = new Date().toISOString();

  if (isOpen) {
    if (!input.confirmCheckout) {
      return {
        action: "NEEDS_CHECKOUT_CONFIRM",
        staffId: staff.id,
        staffName: staff.name,
        checkInAt: existing!.checkInAt!,
        checkInLabel: formatTimeLabel(existing!.checkInAt),
      };
    }

    const updated: LocalAttendanceRow = {
      ...existing!,
      checkOutAt: now,
      _pendingSync: true,
    };
    await db.putOne("attendance", {
      id: existing!.id,
      orgId: input.orgId,
      data: updated,
    });
    await enqueueMutation(
      input.orgId,
      "attendance.check_out" as SyncKind,
      {
        barcode: normalized,
        confirmCheckout: true,
        eventId,
        deviceId: input.deviceId ?? null,
        clientId: eventId,
        staffId: staff.id,
        at: now,
      },
      eventId
    );
    if (typeof navigator !== "undefined" && navigator.onLine) void runSync(input.orgId);

    return {
      action: "CHECKED_OUT",
      staffId: staff.id,
      staffName: staff.name,
      attendanceId: existing!.id,
      checkInAt: existing!.checkInAt!,
      checkOutAt: now,
      durationLabel: formatWorkingDuration(existing!.checkInAt, now),
      eventId,
    };
  }

  const attendanceId = existing?.id ?? crypto.randomUUID();
  const created: LocalAttendanceRow = {
    id: attendanceId,
    staffId: staff.id,
    date: day,
    status: "PRESENT",
    checkInAt: now,
    checkOutAt: null,
    _pendingSync: true,
  };
  await db.putOne("attendance", {
    id: attendanceId,
    orgId: input.orgId,
    data: created,
  });
  await enqueueMutation(
    input.orgId,
    "attendance.check_in" as SyncKind,
    {
      barcode: normalized,
      eventId,
      deviceId: input.deviceId ?? null,
      clientId: eventId,
      staffId: staff.id,
      at: now,
    },
    eventId
  );
  if (typeof navigator !== "undefined" && navigator.onLine) void runSync(input.orgId);

  return {
    action: "CHECKED_IN",
    staffId: staff.id,
    staffName: staff.name,
    attendanceId,
    checkInAt: now,
    eventId,
  };
}

export { attendanceKey };
