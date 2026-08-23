import { describe, it, expect } from "vitest";
import {
  calculatePayrollBreakdown,
  calculateMonthlyPayrollPaise,
} from "@/services/attendance-payroll.service";

const rupees = (value: number) => BigInt(Math.round(value * 100));

const base = {
  wagePaise: rupees(20000),
  wagePeriod: "MONTHLY",
  paidUnits: 30,
  absentDays: 0,
  halfDays: 0,
  unmarkedDays: 0,
  overtimeHours: 0,
  overtimeRatePaise: null,
  advanceDeductionPaise: BigInt(0),
  lineEarningsPaise: BigInt(0),
  lineDeductionsPaise: BigInt(0),
  daysInMonth: 30,
} as const;

describe("calculatePayrollBreakdown", () => {
  it("pays the full monthly salary for a full month", () => {
    const result = calculatePayrollBreakdown({ ...base });
    expect(result.basePaise).toBe(rupees(20000));
    expect(result.netPaise).toBe(rupees(20000));
  });

  it("adds salary + commission + bonus and subtracts deductions", () => {
    // ₹20,000 + ₹2,450 commission + ₹500 bonus − ₹0 = ₹22,950
    const result = calculatePayrollBreakdown({
      ...base,
      commissionPaise: rupees(2450),
      lineEarningsPaise: rupees(500),
    });
    expect(result.commissionPaise).toBe(rupees(2450));
    expect(result.earningsPaise).toBe(rupees(500));
    expect(result.grossPaise).toBe(rupees(22950));
    expect(result.netPaise).toBe(rupees(22950));
  });

  it("pays salary only when there is no commission", () => {
    const result = calculatePayrollBreakdown({ ...base, commissionPaise: BigInt(0) });
    expect(result.commissionPaise).toBe(BigInt(0));
    expect(result.netPaise).toBe(rupees(20000));
  });

  it("pays commission only for a commission-only staff member", () => {
    const result = calculatePayrollBreakdown({
      ...base,
      wagePaise: BigInt(0),
      commissionPaise: rupees(3200),
    });
    expect(result.basePaise).toBe(BigInt(0));
    expect(result.netPaise).toBe(rupees(3200));
  });

  it("deducts absence proportionally for monthly salary", () => {
    // Three absent days out of thirty on ₹20,000 → ₹18,000.
    const result = calculatePayrollBreakdown({ ...base, absentDays: 3 });
    expect(result.basePaise).toBe(rupees(18000));
  });

  it("treats a half day as half an absence", () => {
    // Two half days = one absent day out of thirty; the deduction is truncated
    // to whole paise, so the rounding lands in the staff member's favour.
    const result = calculatePayrollBreakdown({ ...base, halfDays: 2 });
    expect(result.basePaise).toBe(BigInt(1_933_334));
  });

  it("pays a daily wage per paid day", () => {
    const result = calculatePayrollBreakdown({
      ...base,
      wagePaise: rupees(600),
      wagePeriod: "DAILY",
      paidUnits: 24.5,
    });
    expect(result.basePaise).toBe(rupees(14700));
  });

  it("adds overtime at the configured rate", () => {
    const result = calculatePayrollBreakdown({
      ...base,
      overtimeHours: 10,
      overtimeRatePaise: rupees(80),
    });
    expect(result.overtimePaise).toBe(rupees(800));
    expect(result.netPaise).toBe(rupees(20800));
  });

  it("recovers an advance and other deductions", () => {
    const result = calculatePayrollBreakdown({
      ...base,
      commissionPaise: rupees(1000),
      advanceDeductionPaise: rupees(2000),
      lineDeductionsPaise: rupees(500),
    });
    expect(result.netPaise).toBe(rupees(18500));
  });

  it("never returns a negative net pay", () => {
    const result = calculatePayrollBreakdown({
      ...base,
      advanceDeductionPaise: rupees(50000),
    });
    expect(result.netPaise).toBe(BigInt(0));
  });

  it("counts unmarked days as absent only when the org says so", () => {
    const excluded = calculatePayrollBreakdown({
      ...base,
      unmarkedDays: 4,
      unmarkedDayPolicy: "EXCLUDED",
    });
    const asAbsent = calculatePayrollBreakdown({
      ...base,
      unmarkedDays: 4,
      unmarkedDayPolicy: "ABSENT",
    });
    expect(excluded.basePaise).toBe(rupees(20000));
    expect(asAbsent.basePaise).toBe(BigInt(1_733_334));
  });
});

describe("calculateMonthlyPayrollPaise", () => {
  it("returns the same net pay as the breakdown", () => {
    const input = {
      ...base,
      commissionPaise: rupees(1500),
      lineEarningsPaise: rupees(250),
      lineDeductionsPaise: rupees(100),
    };
    expect(calculateMonthlyPayrollPaise(input)).toBe(
      calculatePayrollBreakdown(input).netPaise
    );
  });
});
