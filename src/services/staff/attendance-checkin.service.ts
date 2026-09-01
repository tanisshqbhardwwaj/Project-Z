import type { AttendanceCheckMethod, AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createHash, timingSafeEqual } from "crypto";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";
import {
  dayKeyToUtcDate,
  isFutureDayKey,
  orgTodayKey,
} from "@/lib/date/org-day";
import { getOrgModuleContext } from "@/lib/org/require-module";
import { readAttendanceGeofence } from "@/lib/org/attendance-settings";
import type { OrgSettingsJson } from "@/lib/org/modules";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

function verifyPin(pin: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const digest = hashPin(pin);
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hash));
  } catch {
    return false;
  }
}

export async function resolveCheckInGeo(input: {
  organizationId: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  const geofence = readAttendanceGeofence(org?.settings as OrgSettingsJson);
  const { evaluateGeofence } = await import("@/lib/staff/attendance-geofence");
  const result = evaluateGeofence(
    geofence,
    input.latitude ?? undefined,
    input.longitude ?? undefined
  );
  if (result.error) throw new Error(result.error);
  return {
    geoVerified: result.geoVerified,
    geoDistanceMeters: result.geoDistanceMeters,
  };
}

export async function setStaffAttendancePin(input: {
  organizationId: string;
  staffId: string;
  pin: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "staff");
  if (!/^\d{4,6}$/.test(input.pin)) {
    throw new Error("PIN must be 4–6 digits");
  }
  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!staff) throw new Error("Staff member not found");
  await prisma.staffMember.update({
    where: { id: staff.id },
    data: { attendancePinHash: hashPin(input.pin) },
  });
  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "attendance.pin_set",
    entityType: "StaffMember",
    entityId: staff.id,
  });
}

export async function staffCheckIn(input: {
  organizationId: string;
  staffId: string;
  markedById: string;
  method: AttendanceCheckMethod;
  deviceFingerprint?: string | null;
  geoVerified?: boolean | null;
  geoDistanceMeters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: AttendanceStatus;
}) {
  await requireModule(input.organizationId, "staff");
  const { org } = await getOrgModuleContext(input.organizationId);
  const geo =
    input.geoVerified !== undefined && input.geoDistanceMeters !== undefined
      ? {
          geoVerified: input.geoVerified,
          geoDistanceMeters: input.geoDistanceMeters,
        }
      : await resolveCheckInGeo({
          organizationId: input.organizationId,
          latitude: input.latitude,
          longitude: input.longitude,
        });
  const dayKey = orgTodayKey(org.timezone);
  if (isFutureDayKey(dayKey, org.timezone)) {
    throw new Error("Cannot check in for a future date");
  }
  const date = dayKeyToUtcDate(dayKey);
  const now = new Date();
  const row = await prisma.staffAttendance.upsert({
    where: { staffId_date: { staffId: input.staffId, date } },
    create: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      date,
      status: input.status ?? "PRESENT",
      checkInAt: now,
      checkInMethod: input.method,
      deviceFingerprint: input.deviceFingerprint ?? null,
      geoVerified: geo.geoVerified,
      geoDistanceMeters: geo.geoDistanceMeters,
      markedById: input.markedById,
    },
    update: {
      status: input.status ?? "PRESENT",
      checkInAt: now,
      checkInMethod: input.method,
      deviceFingerprint: input.deviceFingerprint ?? undefined,
      geoVerified: geo.geoVerified ?? undefined,
      geoDistanceMeters: geo.geoDistanceMeters ?? undefined,
      markedById: input.markedById,
    },
  });
  return row;
}

export async function staffCheckOut(input: {
  organizationId: string;
  staffId: string;
  markedById: string;
  method: AttendanceCheckMethod;
}) {
  await requireModule(input.organizationId, "staff");
  const { org } = await getOrgModuleContext(input.organizationId);
  const dayKey = orgTodayKey(org.timezone);
  const date = dayKeyToUtcDate(dayKey);
  const existing = await prisma.staffAttendance.findFirst({
    where: { organizationId: input.organizationId, staffId: input.staffId, date },
  });
  if (!existing) throw new Error("No check-in found for today");
  return prisma.staffAttendance.update({
    where: { id: existing.id },
    data: {
      checkOutAt: new Date(),
      checkOutMethod: input.method,
      markedById: input.markedById,
    },
  });
}

export async function checkInWithPin(input: {
  organizationId: string;
  pin: string;
  markedById: string;
  latitude?: number | null;
  longitude?: number | null;
  geoVerified?: boolean;
  geoDistanceMeters?: number;
}) {
  const staff = await prisma.staffMember.findMany({
    where: { organizationId: input.organizationId, status: "ACTIVE" },
    select: { id: true, attendancePinHash: true },
  });
  const match = staff.find((s) => verifyPin(input.pin, s.attendancePinHash));
  if (!match) throw new Error("Invalid PIN");
  return staffCheckIn({
    organizationId: input.organizationId,
    staffId: match.id,
    markedById: input.markedById,
    method: "PIN",
    latitude: input.latitude,
    longitude: input.longitude,
    geoVerified: input.geoVerified,
    geoDistanceMeters: input.geoDistanceMeters,
  });
}

export async function checkInWithQrToken(input: {
  organizationId: string;
  staffId: string;
  token: string;
  markedById: string;
}) {
  const expected = createHash("sha256")
    .update(`${input.organizationId}:${input.staffId}:attendance`)
    .digest("hex")
    .slice(0, 12);
  if (input.token !== expected) throw new Error("Invalid QR token");
  return staffCheckIn({
    organizationId: input.organizationId,
    staffId: input.staffId,
    markedById: input.markedById,
    method: "QR",
  });
}

export async function getAttendanceBoard(organizationId: string, date: string) {
  await requireModule(organizationId, "staff");
  const dateUtc = dayKeyToUtcDate(date);
  const [staff, attendance] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        roleTitle: true,
        phone: true,
      },
    }),
    prisma.staffAttendance.findMany({
      where: { organizationId, date: dateUtc },
    }),
  ]);
  const byStaff = new Map(attendance.map((a) => [a.staffId, a]));
  return staff.map((s) => ({ staff: s, attendance: byStaff.get(s.id) ?? null }));
}

export function attendanceQrToken(organizationId: string, staffId: string): string {
  return createHash("sha256")
    .update(`${organizationId}:${staffId}:attendance`)
    .digest("hex")
    .slice(0, 12);
}
