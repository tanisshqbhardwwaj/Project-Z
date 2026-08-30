import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  dayKeyToUtcDate,
  orgTodayKey,
  utcDateToDayKey,
} from "@/lib/date/org-day";
import { detectContractRenewals } from "./service-contract.service";

type ServiceLine = { name: string; qty: number; priceRupees: number };

function parseServiceLines(raw: unknown): ServiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const o = row as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        qty: Number(o.qty ?? 1),
        priceRupees: Number(o.priceRupees ?? 0),
      };
    })
    .filter((line) => line.name.length > 0 && line.qty > 0);
}

export async function getServiceDashboardTodayBookings(input: {
  organizationId: string;
  branchId?: string;
  timezone?: string;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const dayKey = orgTodayKey(input.timezone);
  const from = dayKeyToUtcDate(dayKey);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  return prisma.serviceAppointment.findMany({
    where: {
      organizationId: input.organizationId,
      startAt: { gte: from, lt: to },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      ...(input.branchId && { branchId: input.branchId }),
    },
    include: {
      staff: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getServiceDashboardStaffLoad(input: {
  organizationId: string;
  branchId?: string;
  timezone?: string;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const dayKey = orgTodayKey(input.timezone);
  const from = dayKeyToUtcDate(dayKey);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  const appointments = await prisma.serviceAppointment.findMany({
    where: {
      organizationId: input.organizationId,
      startAt: { gte: from, lt: to },
      status: { in: ["BOOKED", "CONFIRMED", "IN_PROGRESS"] },
      staffId: { not: null },
      ...(input.branchId && { branchId: input.branchId }),
    },
    select: {
      staffId: true,
      startAt: true,
      endAt: true,
      staff: { select: { id: true, name: true } },
    },
  });

  const byStaff = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      appointmentCount: number;
      bookedMinutes: number;
    }
  >();

  for (const row of appointments) {
    if (!row.staffId || !row.staff) continue;
    const minutes = Math.max(
      0,
      Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000)
    );
    const existing = byStaff.get(row.staffId) ?? {
      staffId: row.staffId,
      staffName: row.staff.name,
      appointmentCount: 0,
      bookedMinutes: 0,
    };
    existing.appointmentCount += 1;
    existing.bookedMinutes += minutes;
    byStaff.set(row.staffId, existing);
  }

  return [...byStaff.values()].sort((a, b) => b.bookedMinutes - a.bookedMinutes);
}

export async function getServiceDashboardRevenueByService(input: {
  organizationId: string;
  from: Date;
  to: Date;
  branchId?: string;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const appointments = await prisma.serviceAppointment.findMany({
    where: {
      organizationId: input.organizationId,
      status: "COMPLETED",
      startAt: { gte: input.from, lte: input.to },
      ...(input.branchId && { branchId: input.branchId }),
    },
    select: { itemsJson: true },
  });

  const totals = new Map<string, { name: string; qty: number; revenuePaise: bigint }>();

  for (const appointment of appointments) {
    for (const line of parseServiceLines(appointment.itemsJson)) {
      const key = line.name.trim().toLowerCase();
      const revenuePaise = BigInt(Math.round(line.priceRupees * line.qty * 100));
      const existing = totals.get(key) ?? {
        name: line.name,
        qty: 0,
        revenuePaise: BigInt(0),
      };
      existing.qty += line.qty;
      existing.revenuePaise += revenuePaise;
      totals.set(key, existing);
    }
  }

  return [...totals.values()]
    .map((row) => ({
      name: row.name,
      qty: row.qty,
      revenuePaise: row.revenuePaise.toString(),
    }))
    .sort((a, b) => Number(BigInt(b.revenuePaise) - BigInt(a.revenuePaise)));
}

export async function getServiceDashboardRenewals(input: {
  organizationId: string;
  withinDays?: number;
}) {
  await requireModule(input.organizationId, "service_contracts");
  return detectContractRenewals({
    organizationId: input.organizationId,
    withinDays: input.withinDays ?? 30,
  });
}

export async function getServiceDashboardSummary(input: {
  organizationId: string;
  branchId?: string;
  timezone?: string;
  revenueFrom?: Date;
  revenueTo?: Date;
}) {
  const dayKey = orgTodayKey(input.timezone);
  const defaultFrom = dayKeyToUtcDate(dayKey);
  const defaultTo = new Date(defaultFrom);
  defaultTo.setUTCDate(defaultTo.getUTCDate() + 1);

  const [todayBookings, staffLoad, renewals, revenueByService] = await Promise.all([
    getServiceDashboardTodayBookings(input),
    getServiceDashboardStaffLoad(input),
    getServiceDashboardRenewals({
      organizationId: input.organizationId,
      withinDays: 30,
    }),
    getServiceDashboardRevenueByService({
      organizationId: input.organizationId,
      branchId: input.branchId,
      from: input.revenueFrom ?? defaultFrom,
      to: input.revenueTo ?? defaultTo,
    }),
  ]);

  const completedToday = todayBookings.filter((row) => row.status === "COMPLETED").length;
  const pendingToday = todayBookings.length - completedToday;

  return {
    dayKey: utcDateToDayKey(defaultFrom),
    todayBookings,
    stats: {
      totalBookingsToday: todayBookings.length,
      completedToday,
      pendingToday,
      staffActiveCount: staffLoad.length,
      renewalsDue: renewals.length,
    },
    staffLoad,
    revenueByService,
    renewals,
  };
}
