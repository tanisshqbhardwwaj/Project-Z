/**
 * Pure date maths for recurring expense schedules. Kept free of Prisma so the
 * rules that decide "which month is due, and is it late?" are unit-testable.
 */

export type OccurrencePeriod = {
  periodYear: number;
  periodMonth: number;
  /** UTC midnight of the day this instalment is due. */
  dueDate: Date;
};

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The due date for a rule in a given month. A rule due on the 31st lands on the
 * 30th in November and the 28th/29th in February rather than skipping a month.
 */
export function dueDateFor(year: number, month: number, dueDay: number): Date {
  const clamped = Math.min(Math.max(Math.round(dueDay), 1), daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, clamped));
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addMonths(year: number, month: number, delta: number) {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

/**
 * Every month a rule should have an occurrence for, from its start month through
 * `monthsAhead` months past today (so the "Upcoming" list is always populated),
 * stopping at the rule's end date.
 */
export function occurrencePeriodsFor(input: {
  startDate: Date;
  endDate?: Date | null;
  dueDay: number;
  today: Date;
  monthsAhead?: number;
}): OccurrencePeriod[] {
  const monthsAhead = input.monthsAhead ?? 3;
  const start = startOfUtcDay(input.startDate);
  const today = startOfUtcDay(input.today);

  let cursor = { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
  const horizon = addMonths(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    monthsAhead
  );
  const horizonIndex = horizon.year * 12 + horizon.month;

  const periods: OccurrencePeriod[] = [];
  // Guard against a runaway loop if a rule was backdated years ago.
  for (let guard = 0; guard < 600; guard++) {
    const index = cursor.year * 12 + cursor.month;
    if (index > horizonIndex) break;

    const dueDate = dueDateFor(cursor.year, cursor.month, input.dueDay);
    if (input.endDate && dueDate > startOfUtcDay(input.endDate)) break;
    // The first month only counts if the due day has not already passed before
    // the rule started.
    if (dueDate >= start || periods.length > 0) {
      periods.push({
        periodYear: cursor.year,
        periodMonth: cursor.month,
        dueDate,
      });
    }

    cursor = addMonths(cursor.year, cursor.month, 1);
  }

  return periods;
}

export type OccurrenceUrgency =
  | "paid"
  | "skipped"
  | "overdue"
  | "due-today"
  | "due-soon"
  | "upcoming";

/**
 * Classifies an occurrence for the UI. "due-soon" respects the rule's own
 * reminder window so a 7-day reminder and a 2-day reminder behave differently.
 */
export function occurrenceUrgency(input: {
  status: "UPCOMING" | "PENDING" | "PAID" | "SKIPPED";
  dueDate: Date;
  today: Date;
  reminderDaysBefore?: number;
}): OccurrenceUrgency {
  if (input.status === "PAID") return "paid";
  if (input.status === "SKIPPED") return "skipped";

  const days = daysUntil(input.dueDate, input.today);
  if (days < 0) return "overdue";
  if (days === 0) return "due-today";
  if (days <= (input.reminderDaysBefore ?? 3)) return "due-soon";
  return "upcoming";
}

export function daysUntil(dueDate: Date, today: Date): number {
  const a = startOfUtcDay(dueDate).getTime();
  const b = startOfUtcDay(today).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function formatDueIn(days: number): string {
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days > 0) return `due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
