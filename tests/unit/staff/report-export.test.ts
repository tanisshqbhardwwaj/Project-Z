import { describe, expect, it } from "vitest";
import {
  buildAttendanceReportCsv,
  buildPayrollReportCsv,
  csvCell,
} from "@/lib/staff/report-export";
import { formatWorkingDuration } from "@/lib/staff/attendance-duration";

describe("report-export", () => {
  it("escapes csv cells with commas", () => {
    expect(csvCell('Rahul, Jr')).toBe('"Rahul, Jr"');
  });

  it("formats working duration", () => {
    const checkIn = new Date("2026-09-02T04:12:00.000Z");
    const checkOut = new Date("2026-09-02T12:48:00.000Z");
    expect(formatWorkingDuration(checkIn, checkOut)).toBe("8h 36m");
  });

  it("builds attendance csv rows", () => {
    const csv = buildAttendanceReportCsv([
      {
        date: "2026-09-02",
        staffName: "Rahul Sharma",
        roleTitle: "Cashier",
        checkInAt: "2026-09-02T04:12:00.000Z",
        checkOutAt: "2026-09-02T12:48:00.000Z",
        overtimeHours: 0,
        status: "PRESENT",
      },
    ]);
    expect(csv).toContain("Rahul Sharma");
    expect(csv).toContain("Completed");
  });

  it("builds payroll csv with totals row", () => {
    const csv = buildPayrollReportCsv([
      {
        staffName: "Amit",
        roleTitle: "Sales",
        presentDays: 20,
        halfDays: 0,
        absentDays: 2,
        paidLeaveDays: 0,
        workingDays: 22,
        overtimeHours: 1,
        basePaise: BigInt(10000),
        commissionPaise: BigInt(500),
        netPaise: BigInt(10500),
        status: "DRAFT",
      },
    ]);
    expect(csv).toContain("TOTAL");
    expect(csv).toContain("Amit");
  });
});
