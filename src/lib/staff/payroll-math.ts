import type { AttendanceStatus } from "@prisma/client";

export function paidDayUnits(status: AttendanceStatus): number {
  if (status === "PRESENT" || status === "PAID_LEAVE") return 1;
  if (status === "HALF_DAY") return 0.5;
  return 0;
}

export function calculateWagePaise(input: {
  wagePaise: bigint | null | undefined;
  wagePeriod: string | null | undefined;
  paidUnits?: number;
  daysInMonth: number;
  absentDays?: number;
  halfDays?: number;
  unmarkedDays?: number;
  unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
}): bigint {
  if (!input.wagePaise || input.wagePaise <= BigInt(0)) {
    return BigInt(0);
  }

  if (input.wagePeriod === "MONTHLY") {
    const denom = BigInt(Math.max(input.daysInMonth, 1));
    const absent = input.absentDays ?? 0;
    const half = input.halfDays ?? 0;
    const unmarked = input.unmarkedDays ?? 0;
    const policy = input.unmarkedDayPolicy ?? "EXCLUDED";
    const unmarkedAbsent = policy === "ABSENT" ? unmarked : 0;
    const deductMilli = BigInt(
      Math.round((absent + unmarkedAbsent) * 1000 + half * 500)
    );
    const deduction = (input.wagePaise * deductMilli) / (denom * BigInt(1000));
    const net = input.wagePaise - deduction;
    return net > BigInt(0) ? net : BigInt(0);
  }

  const paidUnits = input.paidUnits ?? 0;
  if (paidUnits <= 0) return BigInt(0);
  const paidMilli = BigInt(Math.round(paidUnits * 1000));
  return (input.wagePaise * paidMilli) / BigInt(1000);
}

export type PayrollBreakdown = {
  /** Attendance-adjusted salary. */
  basePaise: bigint;
  overtimePaise: bigint;
  /** Sales commission earned this month, already net of returns. */
  commissionPaise: bigint;
  /** Approved incentives and bonuses entered as EARNING lines. */
  earningsPaise: bigint;
  grossPaise: bigint;
  advanceDeductionPaise: bigint;
  /** Other deductions entered as DEDUCTION lines. */
  deductionsPaise: bigint;
  netPaise: bigint;
};

/**
 * Net pay = base salary + overtime + commission + bonuses − advances − deductions.
 */
export function calculatePayrollBreakdown(input: {
  wagePaise: bigint;
  wagePeriod: string;
  paidUnits?: number;
  absentDays?: number;
  halfDays?: number;
  unmarkedDays?: number;
  unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
  overtimeHours: number;
  overtimeRatePaise: bigint | null | undefined;
  commissionPaise?: bigint;
  advanceDeductionPaise: bigint;
  lineEarningsPaise: bigint;
  lineDeductionsPaise: bigint;
  daysInMonth: number;
}): PayrollBreakdown {
  const basePaise = calculateWagePaise({
    wagePaise: input.wagePaise,
    wagePeriod: input.wagePeriod,
    paidUnits: input.paidUnits,
    absentDays: input.absentDays,
    halfDays: input.halfDays,
    unmarkedDays: input.unmarkedDays,
    unmarkedDayPolicy: input.unmarkedDayPolicy,
    daysInMonth: input.daysInMonth,
  });
  const overtimePaise =
    input.overtimeRatePaise && input.overtimeHours > 0
      ? BigInt(Math.round(Number(input.overtimeRatePaise) * input.overtimeHours))
      : BigInt(0);
  const commissionPaise = input.commissionPaise ?? BigInt(0);
  const grossPaise =
    basePaise + overtimePaise + commissionPaise + input.lineEarningsPaise;
  const netPaise =
    grossPaise - input.advanceDeductionPaise - input.lineDeductionsPaise;

  return {
    basePaise,
    overtimePaise,
    commissionPaise,
    earningsPaise: input.lineEarningsPaise,
    grossPaise,
    advanceDeductionPaise: input.advanceDeductionPaise,
    deductionsPaise: input.lineDeductionsPaise,
    netPaise: netPaise > BigInt(0) ? netPaise : BigInt(0),
  };
}

export function calculateMonthlyPayrollPaise(input: {
  wagePaise: bigint;
  wagePeriod: string;
  paidUnits?: number;
  absentDays?: number;
  halfDays?: number;
  unmarkedDays?: number;
  unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
  overtimeHours: number;
  overtimeRatePaise: bigint | null | undefined;
  commissionPaise?: bigint;
  advanceDeductionPaise: bigint;
  lineEarningsPaise: bigint;
  lineDeductionsPaise: bigint;
  daysInMonth: number;
}): bigint {
  return calculatePayrollBreakdown(input).netPaise;
}
