import type { OrgSettingsJson } from "@/lib/org/modules";
import type { AttendanceGeofence } from "@/lib/staff/attendance-geofence";

export function readAttendanceGeofence(
  settings: OrgSettingsJson | null | undefined
): AttendanceGeofence | null {
  const raw = settings?.attendanceGeofence;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const latitude = Number(o.latitude);
  const longitude = Number(o.longitude);
  const radiusMeters = Number(o.radiusMeters ?? 200);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    radiusMeters: Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 200,
    required: o.required === true,
  };
}
