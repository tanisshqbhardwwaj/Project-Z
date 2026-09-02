import { format } from "date-fns";

/** Format working duration between check-in and check-out. */
export function formatWorkingDuration(
  checkInAt: Date | string | null | undefined,
  checkOutAt: Date | string | null | undefined
): string {
  if (!checkInAt) return "—";
  const start = new Date(checkInAt);
  const end = checkOutAt ? new Date(checkOutAt) : new Date();
  const ms = Math.max(0, end.getTime() - start.getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTimeLabel(at: Date | string | null | undefined): string {
  if (!at) return "—";
  return format(new Date(at), "hh:mm a");
}

export type AttendanceSessionStatus = "OPEN" | "COMPLETED" | "ABSENT";

export function deriveAttendanceSessionStatus(row: {
  checkInAt?: Date | string | null;
  checkOutAt?: Date | string | null;
  status?: string;
}): AttendanceSessionStatus {
  if (row.checkInAt && !row.checkOutAt) return "OPEN";
  if (row.checkInAt && row.checkOutAt) return "COMPLETED";
  if (row.status === "ABSENT") return "ABSENT";
  return "ABSENT";
}
