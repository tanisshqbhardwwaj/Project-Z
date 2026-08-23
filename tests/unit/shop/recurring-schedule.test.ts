import { describe, it, expect } from "vitest";
import {
  daysUntil,
  dueDateFor,
  formatDueIn,
  monthLabel,
  occurrencePeriodsFor,
  occurrenceUrgency,
} from "@/lib/shop/recurring-schedule";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("dueDateFor", () => {
  it("uses the requested day when the month is long enough", () => {
    expect(dueDateFor(2026, 3, 5).toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("clamps to the last day of a short month instead of skipping it", () => {
    expect(dueDateFor(2026, 2, 31).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(dueDateFor(2024, 2, 30).toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(dueDateFor(2026, 4, 31).toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });
});

describe("occurrencePeriodsFor", () => {
  it("covers every month from the start through three months ahead", () => {
    const periods = occurrencePeriodsFor({
      startDate: utc("2026-01-01"),
      dueDay: 5,
      today: utc("2026-03-10"),
    });
    expect(periods.map((p) => `${p.periodYear}-${p.periodMonth}`)).toEqual([
      "2026-1",
      "2026-2",
      "2026-3",
      "2026-4",
      "2026-5",
      "2026-6",
    ]);
  });

  it("stops at the rule's end date", () => {
    const periods = occurrencePeriodsFor({
      startDate: utc("2026-01-01"),
      endDate: utc("2026-02-28"),
      dueDay: 5,
      today: utc("2026-03-10"),
    });
    expect(periods).toHaveLength(2);
    expect(periods.at(-1)!.dueDate.toISOString()).toBe("2026-02-05T00:00:00.000Z");
  });

  it("rolls across a year boundary", () => {
    const periods = occurrencePeriodsFor({
      startDate: utc("2025-12-01"),
      dueDay: 1,
      today: utc("2025-12-15"),
    });
    expect(periods.map((p) => `${p.periodYear}-${p.periodMonth}`)).toEqual([
      "2025-12",
      "2026-1",
      "2026-2",
      "2026-3",
    ]);
  });

  it("skips a first month whose due day fell before the rule started", () => {
    const periods = occurrencePeriodsFor({
      startDate: utc("2026-01-20"),
      dueDay: 5,
      today: utc("2026-01-25"),
      monthsAhead: 1,
    });
    expect(periods[0]!.dueDate.toISOString()).toBe("2026-02-05T00:00:00.000Z");
  });

  it("backfills months for a rule that was backdated", () => {
    const periods = occurrencePeriodsFor({
      startDate: utc("2025-06-05"),
      dueDay: 5,
      today: utc("2026-01-10"),
      monthsAhead: 0,
    });
    expect(periods).toHaveLength(8);
    expect(periods[0]!.dueDate.toISOString()).toBe("2025-06-05T00:00:00.000Z");
    expect(periods.at(-1)!.dueDate.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });
});

describe("occurrenceUrgency", () => {
  const today = utc("2026-03-10");

  it("marks a past due date overdue", () => {
    expect(
      occurrenceUrgency({ status: "PENDING", dueDate: utc("2026-03-05"), today })
    ).toBe("overdue");
  });

  it("marks today's payment due-today", () => {
    expect(
      occurrenceUrgency({ status: "PENDING", dueDate: today, today })
    ).toBe("due-today");
  });

  it("respects the rule's own reminder window", () => {
    expect(
      occurrenceUrgency({
        status: "UPCOMING",
        dueDate: utc("2026-03-15"),
        today,
        reminderDaysBefore: 7,
      })
    ).toBe("due-soon");
    expect(
      occurrenceUrgency({
        status: "UPCOMING",
        dueDate: utc("2026-03-15"),
        today,
        reminderDaysBefore: 2,
      })
    ).toBe("upcoming");
  });

  it("keeps paid and skipped months out of the reminder logic", () => {
    expect(
      occurrenceUrgency({ status: "PAID", dueDate: utc("2026-01-05"), today })
    ).toBe("paid");
    expect(
      occurrenceUrgency({ status: "SKIPPED", dueDate: utc("2026-01-05"), today })
    ).toBe("skipped");
  });
});

describe("labels", () => {
  it("counts days to and past a due date", () => {
    expect(daysUntil(utc("2026-03-13"), utc("2026-03-10"))).toBe(3);
    expect(daysUntil(utc("2026-03-07"), utc("2026-03-10"))).toBe(-3);
  });

  it("phrases the countdown for the UI", () => {
    expect(formatDueIn(0)).toBe("due today");
    expect(formatDueIn(1)).toBe("due tomorrow");
    expect(formatDueIn(3)).toBe("due in 3 days");
    expect(formatDueIn(-1)).toBe("1 day overdue");
    expect(formatDueIn(-4)).toBe("4 days overdue");
  });

  it("names the period", () => {
    expect(monthLabel(2026, 3)).toBe("March 2026");
  });
});
