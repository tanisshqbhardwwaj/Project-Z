/** Org-timezone day helpers — all attendance/payroll dates go through here. */

const DEFAULT_TZ = "Asia/Kolkata";

export function orgTimezone(tz?: string | null): string {
  return tz && tz.length > 0 ? tz : DEFAULT_TZ;
}

/** YYYY-MM-DD for "now" in org timezone */
export function orgTodayKey(tz?: string | null): string {
  return formatDayKeyInTz(new Date(), orgTimezone(tz));
}

export function formatDayKeyInTz(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Stored as UTC midnight of the calendar day (org-neutral day key) */
export function dayKeyToUtcDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error("Invalid calendar date");
  }
  return dt;
}

export function utcDateToDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthRangeUtc(year: number, month: number) {
  if (month < 1 || month > 12) throw new Error("Invalid month");
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));
  return { from, to, daysInMonth: daysInMonth(year, month) };
}

export function eachDayKeyInMonth(year: number, month: number): string[] {
  const dim = daysInMonth(year, month);
  const keys: string[] = [];
  for (let d = 1; d <= dim; d++) {
    keys.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  return keys;
}

export function dayOfWeekUtc(dayKey: string): number {
  return dayKeyToUtcDate(dayKey).getUTCDay();
}

export function isFutureDayKey(dayKey: string, tz?: string | null): boolean {
  return dayKey > orgTodayKey(tz);
}

export function parseYearMonth(input: { year?: unknown; month?: unknown }) {
  const now = new Date();
  const year = Number(input.year ?? now.getFullYear());
  const month = Number(input.month ?? now.getMonth() + 1);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }
  return { year, month };
}
