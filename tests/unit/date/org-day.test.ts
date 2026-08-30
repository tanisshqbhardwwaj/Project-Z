import {
  paidDayUnits,
  calculateWagePaise,
  calculateMonthlyPayrollPaise,
} from "@/lib/staff/payroll-math";
import {
  orgTodayKey,
  dayKeyToUtcDate,
  utcDateToDayKey,
  daysInMonth,
  isFutureDayKey,
} from "@/lib/date/org-day";
import { describe, expect, it } from "vitest";

describe("paidDayUnits", () => {
  it("counts present and leave as 1", () => {
    expect(paidDayUnits("PRESENT")).toBe(1);
    expect(paidDayUnits("PAID_LEAVE")).toBe(1);
  });
  it("counts half day as 0.5", () => {
    expect(paidDayUnits("HALF_DAY")).toBe(0.5);
  });
  it("counts absent as 0", () => {
    expect(paidDayUnits("ABSENT")).toBe(0);
  });
});

describe("calculateWagePaise", () => {
  it("pays full monthly salary when no absences", () => {
    const wage = BigInt(3000000);
    const result = calculateWagePaise({
      wagePaise: wage,
      wagePeriod: "MONTHLY",
      daysInMonth: 30,
      absentDays: 0,
      halfDays: 0,
    });
    expect(result).toBe(wage);
  });

  it("deducts absent and half days from monthly salary", () => {
    const wage = BigInt(3000000);
    const oneDay = wage / BigInt(30);
    expect(
      calculateWagePaise({
        wagePaise: wage,
        wagePeriod: "MONTHLY",
        daysInMonth: 30,
        absentDays: 1,
        halfDays: 0,
      })
    ).toBe(wage - oneDay);
    expect(
      calculateWagePaise({
        wagePaise: wage,
        wagePeriod: "MONTHLY",
        daysInMonth: 30,
        absentDays: 0,
        halfDays: 1,
      })
    ).toBe(wage - oneDay / BigInt(2));
  });

  it("computes daily wage from marked days", () => {
    const result = calculateWagePaise({
      wagePaise: BigInt(50000),
      wagePeriod: "DAILY",
      paidUnits: 10,
      daysInMonth: 30,
    });
    expect(result).toBe(BigInt(500000));
  });
});

describe("calculateMonthlyPayrollPaise", () => {
  it("adds overtime and line earnings, subtracts advances and deductions", () => {
    const net = calculateMonthlyPayrollPaise({
      wagePaise: BigInt(3000000),
      wagePeriod: "MONTHLY",
      daysInMonth: 30,
      absentDays: 0,
      halfDays: 0,
      overtimeHours: 2,
      overtimeRatePaise: BigInt(10000),
      advanceDeductionPaise: BigInt(50000),
      lineEarningsPaise: BigInt(20000),
      lineDeductionsPaise: BigInt(10000),
    });
    expect(net).toBe(BigInt(2980000));
  });

  it("never returns negative net pay", () => {
    const net = calculateMonthlyPayrollPaise({
      wagePaise: BigInt(100000),
      wagePeriod: "MONTHLY",
      daysInMonth: 30,
      absentDays: 0,
      halfDays: 0,
      overtimeHours: 0,
      overtimeRatePaise: null,
      advanceDeductionPaise: BigInt(500000),
      lineEarningsPaise: BigInt(0),
      lineDeductionsPaise: BigInt(0),
    });
    expect(net).toBe(BigInt(0));
  });
});

describe("org-day", () => {
  it("round-trips day keys", () => {
    const key = "2026-08-20";
    expect(utcDateToDayKey(dayKeyToUtcDate(key))).toBe(key);
  });

  it("days in month", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it("future day check uses timezone", () => {
    const today = orgTodayKey("Asia/Kolkata");
    expect(isFutureDayKey(today, "Asia/Kolkata")).toBe(false);
  });
});
