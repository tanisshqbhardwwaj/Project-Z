import { prisma } from "@/lib/db/prisma";
import type { AttendanceStatus, PayrollStatus } from "@prisma/client";
import { createAuditLog } from "./audit.service";
import { scheduleShopInventoryAlertSync } from "./shop-notification.service";
import {
  applyAdvanceRepayments,
  createSalaryShopExpense,
  getOpenAdvanceDeductionPaise,
} from "./staff-advance.service";
import { setPayrollShopExpenseId, getPayrollShopExpenseId } from "@/lib/shop/staff-expense-links";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule, getOrgModuleContext, parseOrgSettings } from "@/lib/org/require-module";
import {
  dayKeyToUtcDate,
  utcDateToDayKey,
  monthRangeUtc,
  eachDayKeyInMonth,
  isFutureDayKey,
  addDaysToDayKey,
  orgTodayKey,
} from "@/lib/date/org-day";

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
  advanceDeductionPaise: bigint;
  lineEarningsPaise: bigint;
  lineDeductionsPaise: bigint;
  daysInMonth: number;
}): bigint {
  const base = calculateWagePaise({
    wagePaise: input.wagePaise,
    wagePeriod: input.wagePeriod,
    paidUnits: input.paidUnits,
    absentDays: input.absentDays,
    halfDays: input.halfDays,
    unmarkedDays: input.unmarkedDays,
    unmarkedDayPolicy: input.unmarkedDayPolicy,
    daysInMonth: input.daysInMonth,
  });
  const ot =
    input.overtimeRatePaise && input.overtimeHours > 0
      ? BigInt(Math.round(Number(input.overtimeRatePaise) * input.overtimeHours))
      : BigInt(0);
  const gross = base + ot + input.lineEarningsPaise;
  const net = gross - input.advanceDeductionPaise - input.lineDeductionsPaise;
  return net > BigInt(0) ? net : BigInt(0);
}

async function getStaffWageForDay(
  staffId: string,
  dayKey: string
): Promise<{ wagePaise: bigint | null; wagePeriod: string | null; overtimeRatePaise: bigint | null }> {
  const date = dayKeyToUtcDate(dayKey);
  const history = await prisma.staffWage.findFirst({
    where: { staffId, effectiveFrom: { lte: date } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (history) {
    return {
      wagePaise: history.wagePaise,
      wagePeriod: history.wagePeriod,
      overtimeRatePaise: history.overtimeRatePaise,
    };
  }
  const staff = await prisma.staffMember.findUnique({
    where: { id: staffId },
    select: { wagePaise: true, wagePeriod: true, overtimeRatePaise: true },
  });
  return {
    wagePaise: staff?.wagePaise ?? null,
    wagePeriod: staff?.wagePeriod ?? null,
    overtimeRatePaise: staff?.overtimeRatePaise ?? null,
  };
}

async function buildMonthContext(organizationId: string, year: number, month: number) {
  const { settings, org } = await getOrgModuleContext(organizationId);
  const monthDayKeys = eachDayKeyInMonth(year, month);
  return {
    org,
    settings,
    monthDayKeys,
    daysInMonth: monthDayKeys.length,
  };
}

function assertStaffEligible(staff: {
  status: string;
  joinedAt: Date | null;
  leftAt: Date | null;
}, dayKey: string) {
  if (staff.status === "LEFT") throw new Error("Cannot mark attendance for staff who has left");
  if (staff.joinedAt) {
    const joinedDay = utcDateToDayKey(staff.joinedAt);
    if (dayKey < joinedDay) throw new Error("Date is before staff joined");
  }
  if (staff.leftAt) {
    const leftDay = utcDateToDayKey(staff.leftAt);
    if (dayKey > leftDay) throw new Error("Date is after staff left");
  }
}

export async function listAttendanceForDate(organizationId: string, dateStr: string) {
  await requireModule(organizationId, "staff");
  const date = dayKeyToUtcDate(dateStr);

  const staff = await prisma.staffMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const rows = await prisma.staffAttendance.findMany({
    where: { organizationId, date },
  });
  const byStaff = new Map(rows.map((r) => [r.staffId, r]));

  return staff.map((s) => ({
    staff: s,
    attendance: byStaff.get(s.id) ?? null,
  }));
}

export async function upsertAttendance(input: {
  organizationId: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string | null;
  markedById: string;
}) {
  const { org } = await getOrgModuleContext(input.organizationId);
  await requireModule(input.organizationId, "staff");

  if (isFutureDayKey(input.date, org.timezone)) {
    throw new Error("Cannot mark attendance for a future date");
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!staff) throw new Error("Staff member not found");
  assertStaffEligible(staff, input.date);

  const date = dayKeyToUtcDate(input.date);
  const row = await prisma.staffAttendance.upsert({
    where: { staffId_date: { staffId: input.staffId, date } },
    create: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      date,
      status: input.status,
      overtimeHours: input.overtimeHours ?? 0,
      notes: input.notes?.trim() || null,
      markedById: input.markedById,
    },
    update: {
      status: input.status,
      overtimeHours: input.overtimeHours ?? 0,
      notes: input.notes?.trim() || null,
      markedById: input.markedById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.markedById,
    action: "attendance.upserted",
    entityType: "StaffAttendance",
    entityId: row.id,
    after: row,
  });

  return row;
}

export async function bulkMarkAttendance(input: {
  organizationId: string;
  date: string;
  status: AttendanceStatus;
  markedById: string;
  staffIds?: string[];
}) {
  await requireModule(input.organizationId, "staff");
  const rows = await listAttendanceForDate(input.organizationId, input.date);
  const targets = input.staffIds?.length
    ? rows.filter((r) => input.staffIds!.includes(r.staff.id))
    : rows;

  const results = [];
  for (const { staff } of targets) {
    results.push(
      await upsertAttendance({
        organizationId: input.organizationId,
        staffId: staff.id,
        date: input.date,
        status: input.status,
        markedById: input.markedById,
      })
    );
  }
  return results;
}

export async function listAttendanceRange(
  organizationId: string,
  from: string,
  to: string,
  staffId?: string
) {
  await requireModule(organizationId, "staff");
  return prisma.staffAttendance.findMany({
    where: {
      organizationId,
      date: { gte: dayKeyToUtcDate(from), lte: dayKeyToUtcDate(to) },
      ...(staffId && { staffId }),
    },
    include: { staff: { select: { id: true, name: true, roleTitle: true } } },
    orderBy: [{ date: "asc" }, { staff: { name: "asc" } }],
  });
}

export async function listAttendanceGrid(
  organizationId: string,
  year: number,
  month: number
) {
  await requireModule(organizationId, "staff");
  const { from, to } = monthRangeUtc(year, month);
  const staff = await prisma.staffMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  const attendance = await prisma.staffAttendance.findMany({
    where: { organizationId, date: { gte: from, lte: to } },
  });
  const byStaffDate = new Map(
    attendance.map((a) => [`${a.staffId}:${utcDateToDayKey(a.date)}`, a])
  );
  const dayKeys = eachDayKeyInMonth(year, month);

  return {
    dayKeys,
    rows: staff.map((s) => ({
      staff: s,
      days: dayKeys.map((dk) => ({
        date: dk,
        attendance: byStaffDate.get(`${s.id}:${dk}`) ?? null,
      })),
    })),
  };
}

export type AttendanceRegularityRow = {
  staffId: string;
  name: string;
  roleTitle: string;
  currentStreak: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  unmarkedDays: number;
  attendanceRate: number;
  periodDays: number;
};

function attendancePresentUnits(status: AttendanceStatus): number {
  if (status === "PRESENT" || status === "PAID_LEAVE") return 1;
  if (status === "HALF_DAY") return 0.5;
  return 0;
}

function streakEligible(status: AttendanceStatus): boolean {
  return status !== "ABSENT";
}

export async function getAttendanceRegularityStats(
  organizationId: string,
  options?: { days?: number; timezone?: string | null }
) {
  await requireModule(organizationId, "staff");
  const days = Math.min(Math.max(options?.days ?? 99, 7), 99);
  const today = orgTodayKey(options?.timezone);
  const from = addDaysToDayKey(today, -(days - 1));

  const staffList = await prisma.staffMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const records = await prisma.staffAttendance.findMany({
    where: {
      organizationId,
      date: { gte: dayKeyToUtcDate(from), lte: dayKeyToUtcDate(today) },
    },
  });

  const byStaffDate = new Map<string, Map<string, AttendanceStatus>>();
  for (const record of records) {
    const dayKey = utcDateToDayKey(record.date);
    if (!byStaffDate.has(record.staffId)) {
      byStaffDate.set(record.staffId, new Map());
    }
    byStaffDate.get(record.staffId)!.set(dayKey, record.status);
  }

  const dayKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    dayKeys.push(addDaysToDayKey(from, i));
  }

  const all: AttendanceRegularityRow[] = staffList.map((staff) => {
    const joinedDay = staff.joinedAt ? utcDateToDayKey(staff.joinedAt) : from;
    const eligibleDays = dayKeys.filter((dk) => dk >= joinedDay && dk <= today);
    const statusMap = byStaffDate.get(staff.id) ?? new Map();

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let unmarkedDays = 0;

    for (const dk of eligibleDays) {
      const status = statusMap.get(dk);
      if (!status) {
        unmarkedDays += 1;
        continue;
      }
      if (status === "ABSENT") absentDays += 1;
      else if (status === "HALF_DAY") halfDays += 1;
      else if (status === "PAID_LEAVE") leaveDays += 1;
      presentDays += attendancePresentUnits(status);
    }

    let currentStreak = 0;
    for (let i = eligibleDays.length - 1; i >= 0; i--) {
      const status = statusMap.get(eligibleDays[i]!);
      if (!status || !streakEligible(status)) break;
      currentStreak += 1;
    }

    const periodDays = eligibleDays.length;
    const attendanceRate =
      periodDays > 0 ? Math.round((presentDays / periodDays) * 100) : 0;

    return {
      staffId: staff.id,
      name: staff.name,
      roleTitle: staff.roleTitle,
      currentStreak,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      unmarkedDays,
      attendanceRate,
      periodDays,
    };
  });

  const mostRegular = [...all]
    .sort(
      (a, b) =>
        b.currentStreak - a.currentStreak ||
        b.attendanceRate - a.attendanceRate ||
        b.presentDays - a.presentDays
    )
    .slice(0, 5);

  const leastRegular = [...all]
    .sort(
      (a, b) =>
        a.attendanceRate - b.attendanceRate ||
        b.absentDays - a.absentDays ||
        a.presentDays - b.presentDays
    )
    .slice(0, 5);

  return { days, from, to: today, mostRegular, leastRegular, all };
}

async function computeStaffMonthStats(input: {
  organizationId: string;
  staffId: string;
  year: number;
  month: number;
  settings: ReturnType<typeof parseOrgSettings>;
  monthDayKeys: string[];
}) {
  const { from, to } = monthRangeUtc(input.year, input.month);
  const rows = await prisma.staffAttendance.findMany({
    where: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      date: { gte: from, lte: to },
    },
  });
  const byDay = new Map(rows.map((r) => [utcDateToDayKey(r.date), r]));

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unmarkedDays = 0;
  let overtimeHours = 0;
  let paidUnits = 0;

  for (const dayKey of input.monthDayKeys) {
    const row = byDay.get(dayKey);
    if (row) {
      if (row.status === "PRESENT") presentDays += 1;
      else if (row.status === "HALF_DAY") halfDays += 1;
      else if (row.status === "ABSENT") absentDays += 1;
      else if (row.status === "PAID_LEAVE") paidLeaveDays += 1;
      paidUnits += paidDayUnits(row.status);
      overtimeHours += row.overtimeHours ?? 0;
    } else {
      unmarkedDays += 1;
    }
  }

  const policy = input.settings.unmarkedDayPolicy ?? "EXCLUDED";
  if (policy === "PRESENT") {
    presentDays += unmarkedDays;
    paidUnits += unmarkedDays;
  } else if (policy === "ABSENT") {
    absentDays += unmarkedDays;
  } else {
    // EXCLUDED: monthly staff assume working; daily staff need explicit marks
    presentDays += unmarkedDays;
  }

  const wage = await getStaffWageForDay(
    input.staffId,
    input.monthDayKeys[input.monthDayKeys.length - 1] ??
      `${input.year}-${String(input.month).padStart(2, "0")}-01`
  );

  const advances = await prisma.staffAdvance.findMany({
    where: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      status: "OPEN",
    },
  });
  let advanceDeductionPaise = BigInt(0);
  for (const adv of advances) {
    const remaining = adv.amountPaise - adv.repaidPaise;
    if (remaining <= BigInt(0)) continue;
    const deduct = adv.monthlyDeductionPaise ?? remaining;
    advanceDeductionPaise += deduct > remaining ? remaining : deduct;
  }

  return {
    presentDays,
    halfDays,
    absentDays,
    paidLeaveDays,
    unmarkedDays,
    overtimeHours,
    paidUnits,
    wage,
    advanceDeductionPaise,
    workingDays: input.monthDayKeys.length,
    unmarkedDayPolicy: policy,
  };
}

export async function generateOrRefreshPayroll(input: {
  organizationId: string;
  year: number;
  month: number;
  userId: string;
  staffId?: string;
}) {
  await requireModule(input.organizationId, "staff");
  if (input.month < 1 || input.month > 12) throw new Error("Invalid month");

  const ctx = await buildMonthContext(input.organizationId, input.year, input.month);

  const staffList = await prisma.staffMember.findMany({
    where: {
      organizationId: input.organizationId,
      status: "ACTIVE",
      ...(input.staffId && { id: input.staffId }),
    },
    orderBy: { name: "asc" },
  });

  const results = [];
  for (const staff of staffList) {
    const stats = await computeStaffMonthStats({
      organizationId: input.organizationId,
      staffId: staff.id,
      year: input.year,
      month: input.month,
      settings: ctx.settings,
      monthDayKeys: ctx.monthDayKeys,
    });

    const existing = await prisma.staffPayroll.findUnique({
      where: {
        staffId_year_month: {
          staffId: staff.id,
          year: input.year,
          month: input.month,
        },
      },
      include: { lines: true },
    });

    const lineEarnings = (existing?.lines ?? [])
      .filter((l) => l.type === "EARNING")
      .reduce((s, l) => s + l.amountPaise, BigInt(0));
    const lineDeductions = (existing?.lines ?? [])
      .filter((l) => l.type === "DEDUCTION")
      .reduce((s, l) => s + l.amountPaise, BigInt(0));

    const wagePaise = stats.wage.wagePaise ?? staff.wagePaise;
    const wagePeriod = stats.wage.wagePeriod ?? staff.wagePeriod ?? "DAILY";

    const calculatedPaise = wagePaise
      ? calculateMonthlyPayrollPaise({
          wagePaise,
          wagePeriod,
          paidUnits: stats.paidUnits,
          absentDays: stats.absentDays,
          halfDays: stats.halfDays,
          unmarkedDays: stats.unmarkedDays,
          unmarkedDayPolicy: stats.unmarkedDayPolicy,
          overtimeHours: stats.overtimeHours,
          overtimeRatePaise: stats.wage.overtimeRatePaise ?? staff.overtimeRatePaise,
          advanceDeductionPaise: stats.advanceDeductionPaise,
          lineEarningsPaise: lineEarnings,
          lineDeductionsPaise: lineDeductions,
          daysInMonth: ctx.daysInMonth,
        })
      : BigInt(0);

    if (existing?.status === "PAID") {
      const drift = calculatedPaise !== existing.finalAmountPaise;
      if (drift) {
        await prisma.staffPayroll.update({
          where: { id: existing.id },
          data: { driftCalculatedPaise: calculatedPaise },
        });
      }
      results.push({ ...existing, driftCalculatedPaise: drift ? calculatedPaise : null });
      continue;
    }

    const adjustmentPaise = BigInt(0);
    const finalAmountPaise = calculatedPaise;

    const payroll = await prisma.staffPayroll.upsert({
      where: {
        staffId_year_month: {
          staffId: staff.id,
          year: input.year,
          month: input.month,
        },
      },
      create: {
        organizationId: input.organizationId,
        staffId: staff.id,
        year: input.year,
        month: input.month,
        presentDays: stats.presentDays,
        halfDays: stats.halfDays,
        absentDays: stats.absentDays,
        paidLeaveDays: stats.paidLeaveDays,
        workingDays: stats.workingDays,
        overtimeHours: stats.overtimeHours,
        calculatedPaise,
        adjustmentPaise,
        finalAmountPaise,
        status: "DRAFT",
        createdById: input.userId,
        updatedById: input.userId,
      },
      update: {
        presentDays: stats.presentDays,
        halfDays: stats.halfDays,
        absentDays: stats.absentDays,
        paidLeaveDays: stats.paidLeaveDays,
        workingDays: stats.workingDays,
        overtimeHours: stats.overtimeHours,
        calculatedPaise,
        adjustmentPaise: BigInt(0),
        finalAmountPaise: calculatedPaise,
        driftCalculatedPaise: null,
        updatedById: input.userId,
        ...(existing?.status === "FINALIZED" ? {} : { status: "DRAFT" }),
      },
      include: {
        staff: { select: { id: true, name: true, roleTitle: true, wagePeriod: true } },
        lines: true,
      },
    });
    results.push(payroll);
  }

  return results;
}

export async function listPayroll(organizationId: string, year: number, month: number) {
  await requireModule(organizationId, "staff");
  const rows = await prisma.staffPayroll.findMany({
    where: { organizationId, year, month },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          roleTitle: true,
          wagePaise: true,
          wagePeriod: true,
        },
      },
      lines: true,
    },
    orderBy: { staff: { name: "asc" } },
  });

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [openAdvances, advanceDeductionPaise] = await Promise.all([
        prisma.staffAdvance.findMany({
          where: {
            organizationId,
            staffId: row.staffId,
            status: "OPEN",
          },
          orderBy: { createdAt: "desc" },
        }),
        getOpenAdvanceDeductionPaise(organizationId, row.staffId),
      ]);
      return {
        ...row,
        openAdvances,
        advanceDeductionPaise: advanceDeductionPaise.toString(),
      };
    })
  );

  return enriched;
}

export async function markPayrollPaid(input: {
  organizationId: string;
  payrollId: string;
  userId: string;
  projectId?: string;
}) {
  const payroll = await prisma.staffPayroll.findFirst({
    where: { id: input.payrollId, organizationId: input.organizationId },
    include: { staff: true },
  });
  if (!payroll) throw new Error("Payroll row not found");

  const advanceDeduction = await getOpenAdvanceDeductionPaise(
    input.organizationId,
    payroll.staffId
  );

  let shopExpenseId = await getPayrollShopExpenseId(payroll.id);
  if (!shopExpenseId && payroll.finalAmountPaise > BigInt(0)) {
    const shopExpense = await createSalaryShopExpense({
      organizationId: input.organizationId,
      userId: input.userId,
      payrollId: payroll.id,
      staffId: payroll.staffId,
      staffName: payroll.staff.name,
      amountPaise: payroll.finalAmountPaise,
      month: payroll.month,
      year: payroll.year,
      notes: payroll.notes,
    });
    shopExpenseId = shopExpense?.id ?? null;
  }

  if (advanceDeduction > BigInt(0)) {
    await applyAdvanceRepayments({
      organizationId: input.organizationId,
      staffId: payroll.staffId,
      repayPaise: advanceDeduction,
    });
  }

  let expenseId = payroll.expenseId;
  let paymentId = payroll.paymentId;

  if (!expenseId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { organizationId: input.organizationId, name: "Staff wages" },
    });
    const cat =
      category ??
      (await prisma.expenseCategory.create({
        data: {
          organizationId: input.organizationId,
          name: "Staff wages",
          isDefault: true,
        },
      }));

    const project = input.projectId
      ? await prisma.project.findFirst({
          where: { id: input.projectId, organizationId: input.organizationId },
        })
      : await prisma.project.findFirst({
          where: { organizationId: input.organizationId, deletedAt: null },
          orderBy: { createdAt: "asc" },
        });

    if (project) {
      const expense = await prisma.expense.create({
        data: {
          organizationId: input.organizationId,
          projectId: project.id,
          categoryId: cat.id,
          description: `Salary ${payroll.staff.name} ${payroll.month}/${payroll.year}`,
          amountPaise: payroll.finalAmountPaise,
          paidAmountPaise: payroll.finalAmountPaise,
          expenseDate: new Date(),
          createdById: input.userId,
        },
      });
      expenseId = expense.id;

      const payment = await prisma.payment.create({
        data: {
          organizationId: input.organizationId,
          projectId: project.id,
          amountPaise: payroll.finalAmountPaise,
          paymentMethod: "CASH",
          paymentType: "OTHER",
          paymentDate: new Date(),
          notes: `Payroll ${payroll.staff.name}`,
          createdById: input.userId,
          paidByUserId: input.userId,
        },
      });
      paymentId = payment.id;
    }
  }

  return updatePayroll({
    organizationId: input.organizationId,
    payrollId: input.payrollId,
    userId: input.userId,
    status: "PAID",
    expenseId,
    paymentId,
    shopExpenseId,
  });
}

export async function updatePayroll(input: {
  organizationId: string;
  payrollId: string;
  userId: string;
  adjustmentRupees?: number | null;
  finalAmountRupees?: number | null;
  status?: PayrollStatus;
  notes?: string | null;
  expenseId?: string | null;
  paymentId?: string | null;
  shopExpenseId?: string | null;
  lines?: { type: "EARNING" | "DEDUCTION"; label: string; amountRupees: number }[];
}) {
  await requireModule(input.organizationId, "staff");
  const existing = await prisma.staffPayroll.findFirst({
    where: { id: input.payrollId, organizationId: input.organizationId },
    include: { lines: true },
  });
  if (!existing) throw new Error("Payroll row not found");

  if (existing.status === "PAID" && input.status !== "DRAFT") {
    if (
      input.finalAmountRupees !== undefined ||
      input.adjustmentRupees !== undefined ||
      input.lines
    ) {
      throw new Error("Paid payroll is locked. Reopen as draft to edit amounts.");
    }
  }

  if (input.lines) {
    await prisma.staffPayrollLine.deleteMany({ where: { payrollId: input.payrollId } });
    await prisma.staffPayrollLine.createMany({
      data: input.lines.map((l) => ({
        payrollId: input.payrollId,
        type: l.type,
        label: l.label,
        amountPaise: rupeesToPaise(l.amountRupees),
      })),
    });
  }

  const refreshedLines = input.lines
    ? input.lines
    : existing.lines.map((l) => ({
        type: l.type as "EARNING" | "DEDUCTION",
        label: l.label,
        amountRupees: Number(l.amountPaise) / 100,
      }));

  const lineEarnings = refreshedLines
    .filter((l) => l.type === "EARNING")
    .reduce((s, l) => s + rupeesToPaise(l.amountRupees), BigInt(0));
  const lineDeductions = refreshedLines
    .filter((l) => l.type === "DEDUCTION")
    .reduce((s, l) => s + rupeesToPaise(l.amountRupees), BigInt(0));

  let calculatedPaise = existing.calculatedPaise;
  if (input.lines) {
    calculatedPaise = existing.calculatedPaise;
  }

  const data: {
    adjustmentPaise?: bigint;
    finalAmountPaise?: bigint;
    status?: PayrollStatus;
    notes?: string | null;
    paidAt?: Date | null;
    expenseId?: string | null;
    paymentId?: string | null;
    driftCalculatedPaise?: null;
    updatedById: string;
  } = { updatedById: input.userId };

  if (input.adjustmentRupees !== undefined) {
    const adjustmentPaise =
      input.adjustmentRupees != null ? rupeesToPaise(input.adjustmentRupees) : BigInt(0);
    data.adjustmentPaise = adjustmentPaise;
    data.finalAmountPaise = calculatedPaise + adjustmentPaise;
  }

  if (input.finalAmountRupees !== undefined && input.finalAmountRupees != null) {
    data.finalAmountPaise = rupeesToPaise(input.finalAmountRupees);
    data.adjustmentPaise = data.finalAmountPaise - calculatedPaise;
  }

  if (input.lines && !input.finalAmountRupees && input.adjustmentRupees === undefined) {
    data.finalAmountPaise =
      calculatedPaise + lineEarnings - lineDeductions + (existing.adjustmentPaise ?? BigInt(0));
  }

  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.expenseId !== undefined) data.expenseId = input.expenseId;
  if (input.paymentId !== undefined) data.paymentId = input.paymentId;

  const shopExpenseIdToSet = input.shopExpenseId;

  if (input.status !== undefined) {
    data.status = input.status;
    data.paidAt = input.status === "PAID" ? new Date() : null;
    if (input.status === "DRAFT") data.driftCalculatedPaise = null;
  }

  const updated = await prisma.staffPayroll.update({
    where: { id: input.payrollId },
    data,
    include: {
      staff: { select: { id: true, name: true, roleTitle: true } },
      lines: true,
    },
  });

  if (shopExpenseIdToSet !== undefined) {
    await setPayrollShopExpenseId(prisma, input.payrollId, shopExpenseIdToSet);
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "payroll.updated",
    entityType: "StaffPayroll",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function listHolidays(organizationId: string, year: number) {
  await requireModule(organizationId, "staff");
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  return prisma.orgHoliday.findMany({
    where: { organizationId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
}

export async function upsertHoliday(input: {
  organizationId: string;
  date: string;
  name: string;
}) {
  await requireModule(input.organizationId, "staff");
  const date = dayKeyToUtcDate(input.date);
  return prisma.orgHoliday.upsert({
    where: { organizationId_date: { organizationId: input.organizationId, date } },
    create: {
      organizationId: input.organizationId,
      date,
      name: input.name.trim(),
    },
    update: { name: input.name.trim() },
  });
}

export async function deleteHoliday(organizationId: string, id: string) {
  await requireModule(organizationId, "staff");
  return prisma.orgHoliday.deleteMany({ where: { id, organizationId } });
}
