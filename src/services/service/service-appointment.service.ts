import { prisma } from "@/lib/db/prisma";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../audit.service";
import { createShopSale, type ShopSaleItem } from "../shop.service";
import { redeemCustomerPackage } from "./service-package.service";

export type ServiceAppointmentItem = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  productId?: string;
  staffId?: string;
  durationMinutes?: number;
};

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "BOOKED",
  "CONFIRMED",
  "IN_PROGRESS",
];

function parseAppointmentItems(raw: unknown): ServiceAppointmentItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const o = row as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        qty: Number(o.qty ?? 1),
        priceRupees: Number(o.priceRupees ?? 0),
        inventoryItemId:
          typeof o.inventoryItemId === "string" ? o.inventoryItemId : undefined,
        productId: typeof o.productId === "string" ? o.productId : undefined,
        staffId: typeof o.staffId === "string" ? o.staffId : undefined,
        durationMinutes:
          typeof o.durationMinutes === "number" ? o.durationMinutes : undefined,
      };
    })
    .filter((item) => item.name.length > 0 && item.qty > 0);
}

export async function listServiceAppointments(input: {
  organizationId: string;
  branchId?: string;
  staffId?: string;
  customerId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  await requireModule(input.organizationId, "service_appointments");

  return prisma.serviceAppointment.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.branchId && { branchId: input.branchId }),
      ...(input.staffId && { staffId: input.staffId }),
      ...(input.customerId && { customerId: input.customerId }),
      ...(input.status && { status: input.status }),
      ...(input.from || input.to
        ? {
            startAt: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }
        : {}),
    },
    include: {
      staff: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      customerPackage: {
        select: { id: true, remainingSessions: true, remainingValuePaise: true },
      },
    },
    orderBy: { startAt: "asc" },
    take: input.limit ?? 200,
  });
}

export async function listAppointmentsForCalendar(input: {
  organizationId: string;
  from: Date;
  to: Date;
  branchId?: string;
  staffId?: string;
  status?: AppointmentStatus;
}) {
  await requireModule(input.organizationId, "service_appointments");

  if (input.to <= input.from) throw new Error("Invalid calendar range");

  return prisma.serviceAppointment.findMany({
    where: {
      organizationId: input.organizationId,
      startAt: { lt: input.to },
      endAt: { gt: input.from },
      ...(input.branchId && { branchId: input.branchId }),
      ...(input.staffId && { staffId: input.staffId }),
      ...(input.status && { status: input.status }),
    },
    include: {
      staff: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getServiceAppointment(
  organizationId: string,
  appointmentId: string
) {
  await requireModule(organizationId, "service_appointments");

  const row = await prisma.serviceAppointment.findFirst({
    where: { id: appointmentId, organizationId },
    include: {
      staff: { select: { id: true, name: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      customerPackage: {
        include: { package: { select: { id: true, name: true, type: true } } },
      },
      sale: { select: { id: true, billNumber: true, totalPaise: true } },
      contractVisits: true,
      followUps: true,
    },
  });
  if (!row) throw new Error("Appointment not found");
  return row;
}

export async function checkStaffAppointmentConflict(input: {
  organizationId: string;
  staffId: string;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}) {
  await requireModule(input.organizationId, "service_appointments");

  if (input.endAt <= input.startAt) throw new Error("Invalid time range");

  const conflict = await prisma.serviceAppointment.findFirst({
    where: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      status: { in: ACTIVE_STATUSES },
      ...(input.excludeAppointmentId && { NOT: { id: input.excludeAppointmentId } }),
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      customerName: true,
      status: true,
    },
  });

  return {
    conflict: !!conflict,
    conflicting: conflict ?? undefined,
  };
}

export async function createServiceAppointment(input: {
  organizationId: string;
  createdById: string;
  branchId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  staffId?: string | null;
  items: ServiceAppointmentItem[];
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  source?: string | null;
  customerPackageId?: string | null;
  status?: AppointmentStatus;
}) {
  await requireModule(input.organizationId, "service_appointments");

  if (input.endAt <= input.startAt) throw new Error("End time must be after start time");
  if (input.items.length === 0) throw new Error("Add at least one service line");

  if (input.staffId) {
    const { conflict, conflicting } = await checkStaffAppointmentConflict({
      organizationId: input.organizationId,
      staffId: input.staffId,
      startAt: input.startAt,
      endAt: input.endAt,
    });
    if (conflict) {
      throw new Error(
        `Staff is already booked ${conflicting?.startAt.toISOString()} – ${conflicting?.endAt.toISOString()}`
      );
    }
  }

  const appointment = await prisma.serviceAppointment.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      staffId: input.staffId ?? null,
      itemsJson: input.items as unknown as Prisma.InputJsonValue,
      startAt: input.startAt,
      endAt: input.endAt,
      notes: input.notes?.trim() || null,
      source: input.source?.trim() || null,
      customerPackageId: input.customerPackageId ?? null,
      status: input.status ?? "BOOKED",
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.appointment.created",
    entityType: "ServiceAppointment",
    entityId: appointment.id,
    after: appointment,
  });

  return appointment;
}

export async function updateServiceAppointment(input: {
  organizationId: string;
  appointmentId: string;
  userId: string;
  branchId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  staffId?: string | null;
  items?: ServiceAppointmentItem[];
  startAt?: Date;
  endAt?: Date;
  notes?: string | null;
  source?: string | null;
  customerPackageId?: string | null;
  status?: AppointmentStatus;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const existing = await prisma.serviceAppointment.findFirst({
    where: { id: input.appointmentId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Appointment not found");
  if (existing.status === "COMPLETED") {
    throw new Error("Completed appointments cannot be edited");
  }

  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  if (endAt <= startAt) throw new Error("End time must be after start time");

  const staffId =
    input.staffId !== undefined ? input.staffId : existing.staffId;
  if (staffId) {
    const { conflict, conflicting } = await checkStaffAppointmentConflict({
      organizationId: input.organizationId,
      staffId,
      startAt,
      endAt,
      excludeAppointmentId: existing.id,
    });
    if (conflict) {
      throw new Error(
        `Staff is already booked ${conflicting?.startAt.toISOString()} – ${conflicting?.endAt.toISOString()}`
      );
    }
  }

  const appointment = await prisma.serviceAppointment.update({
    where: { id: existing.id },
    data: {
      ...(input.branchId !== undefined && { branchId: input.branchId }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
      ...(input.customerName !== undefined && {
        customerName: input.customerName?.trim() || null,
      }),
      ...(input.customerPhone !== undefined && {
        customerPhone: input.customerPhone?.trim() || null,
      }),
      ...(input.staffId !== undefined && { staffId: input.staffId }),
      ...(input.items && { itemsJson: input.items as unknown as Prisma.InputJsonValue }),
      ...(input.startAt && { startAt: input.startAt }),
      ...(input.endAt && { endAt: input.endAt }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.source !== undefined && { source: input.source?.trim() || null }),
      ...(input.customerPackageId !== undefined && {
        customerPackageId: input.customerPackageId,
      }),
      ...(input.status && { status: input.status }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.appointment.updated",
    entityType: "ServiceAppointment",
    entityId: appointment.id,
    before: existing,
    after: appointment,
  });

  return appointment;
}

export async function cancelServiceAppointment(input: {
  organizationId: string;
  appointmentId: string;
  userId: string;
  status?: Extract<AppointmentStatus, "CANCELLED" | "NO_SHOW">;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const existing = await prisma.serviceAppointment.findFirst({
    where: { id: input.appointmentId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Appointment not found");
  if (existing.status === "COMPLETED") throw new Error("Completed appointments cannot be cancelled");

  const appointment = await prisma.serviceAppointment.update({
    where: { id: existing.id },
    data: { status: input.status ?? "CANCELLED" },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.appointment.cancelled",
    entityType: "ServiceAppointment",
    entityId: appointment.id,
    before: existing,
    after: appointment,
  });

  return appointment;
}

export async function completeServiceAppointment(input: {
  organizationId: string;
  appointmentId: string;
  branchId: string;
  createdById: string;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "BANK" | "OTHER" | "CREDIT";
  paidRupees?: number;
  issueInvoice?: boolean;
  redeemPackage?: boolean;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const appointment = await prisma.serviceAppointment.findFirst({
    where: { id: input.appointmentId, organizationId: input.organizationId },
    include: {
      customerPackage: {
        include: { package: true },
      },
    },
  });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.status === "COMPLETED") throw new Error("Appointment already completed");
  if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
    throw new Error("Cannot complete a cancelled appointment");
  }

  const items = parseAppointmentItems(appointment.itemsJson);
  if (items.length === 0) throw new Error("Appointment has no billable items");

  const saleItems: ShopSaleItem[] = items.map((item) => ({
    name: item.name,
    qty: item.qty,
    priceRupees: item.priceRupees,
    inventoryItemId: item.inventoryItemId,
    productId: item.productId,
    staffId: item.staffId ?? appointment.staffId ?? undefined,
  }));

  const totalRupees = saleItems.reduce(
    (sum, line) => sum + line.priceRupees * line.qty,
    0
  );

  const sale = await createShopSale({
    organizationId: input.organizationId,
    branchId: input.branchId,
    createdById: input.createdById,
    customerId: appointment.customerId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    staffId: appointment.staffId,
    items: saleItems,
    totalRupees,
    paidRupees: input.paidRupees ?? totalRupees,
    paymentMethod: input.paymentMethod ?? "CASH",
    issueInvoice: input.issueInvoice ?? true,
    notes: input.notes ?? appointment.notes,
  });

  const updated = await prisma.serviceAppointment.update({
    where: { id: appointment.id },
    data: {
      status: "COMPLETED",
      saleId: sale.id,
      branchId: appointment.branchId ?? input.branchId,
    },
  });

  if (input.redeemPackage !== false && appointment.customerPackageId) {
    await redeemCustomerPackage({
      organizationId: input.organizationId,
      customerPackageId: appointment.customerPackageId,
      userId: input.createdById,
      sessionsUsed: 1,
    }).catch(() => null);
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.appointment.completed",
    entityType: "ServiceAppointment",
    entityId: updated.id,
    after: { appointment: updated, saleId: sale.id },
  });

  return { appointment: updated, sale };
}

export async function deleteServiceAppointment(input: {
  organizationId: string;
  appointmentId: string;
  userId: string;
}) {
  return cancelServiceAppointment({
    organizationId: input.organizationId,
    appointmentId: input.appointmentId,
    userId: input.userId,
    status: "CANCELLED",
  });
}
