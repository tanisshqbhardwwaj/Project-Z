import { prisma } from "@/lib/db/prisma";
import type { DeliveryStatus } from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "./audit.service";

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  "PENDING",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
];

export async function createDelivery(input: {
  organizationId: string;
  createdById?: string;
  userId?: string;
  branchId?: string | null;
  saleId?: string | null;
  appointmentId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  address: string;
  scheduledAt?: Date | null;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "deliveries");

  const createdById = input.createdById ?? input.userId;
  if (!createdById) throw new Error("User is required");

  if (!input.customerName.trim()) throw new Error("Customer name is required");
  if (!input.address.trim()) throw new Error("Delivery address is required");

  const delivery = await prisma.delivery.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId ?? null,
      saleId: input.saleId ?? null,
      appointmentId: input.appointmentId ?? null,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone?.trim() || null,
      address: input.address.trim(),
      scheduledAt: input.scheduledAt ?? null,
      notes: input.notes?.trim() || null,
      status: "PENDING",
      createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: createdById,
    action: "delivery.created",
    entityType: "Delivery",
    entityId: delivery.id,
    after: delivery,
  });

  return delivery;
}

export async function assignDelivery(input: {
  organizationId: string;
  deliveryId: string;
  assignedStaffId: string;
  userId: string;
  scheduledAt?: Date | null;
}) {
  await requireModule(input.organizationId, "deliveries");

  const existing = await prisma.delivery.findFirst({
    where: { id: input.deliveryId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Delivery not found");
  if (existing.status === "DELIVERED" || existing.status === "CANCELLED") {
    throw new Error("Delivery is already closed");
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.assignedStaffId, organizationId: input.organizationId },
    select: { id: true, name: true, status: true },
  });
  if (!staff || staff.status !== "ACTIVE") throw new Error("Staff member not found");

  const delivery = await prisma.delivery.update({
    where: { id: existing.id },
    data: {
      assignedStaffId: input.assignedStaffId,
      status: "ASSIGNED",
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "delivery.assigned",
    entityType: "Delivery",
    entityId: delivery.id,
    before: existing,
    after: delivery,
  });

  return delivery;
}

export async function listDeliveries(input: {
  organizationId: string;
  branchId?: string | import("@/lib/shop/branch/branch-context").BranchScope;
  status?: DeliveryStatus | DeliveryStatus[];
  assignedStaffId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  await requireModule(input.organizationId, "deliveries");

  const statuses = input.status
    ? Array.isArray(input.status)
      ? input.status
      : [input.status]
    : undefined;

  return prisma.delivery.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.branchId && { branchId: input.branchId }),
      ...(statuses && { status: { in: statuses } }),
      ...(input.assignedStaffId && { assignedStaffId: input.assignedStaffId }),
      ...(input.from || input.to
        ? {
            scheduledAt: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }
        : {}),
    },
    include: {
      assignedStaff: { select: { id: true, name: true, phone: true } },
      sale: { select: { id: true, billNumber: true } },
      appointment: { select: { id: true, startAt: true } },
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    take: input.limit ?? 200,
  });
}

export async function listOwnDeliveries(input: {
  organizationId: string;
  assignedStaffId: string;
  status?: DeliveryStatus | DeliveryStatus[];
  limit?: number;
}) {
  await requireModule(input.organizationId, "deliveries");

  const statuses =
    input.status != null
      ? Array.isArray(input.status)
        ? input.status
        : [input.status]
      : ACTIVE_DELIVERY_STATUSES;

  return listDeliveries({
    organizationId: input.organizationId,
    assignedStaffId: input.assignedStaffId,
    status: statuses,
    limit: input.limit ?? 100,
  });
}

export async function getDelivery(organizationId: string, deliveryId: string) {
  await requireModule(organizationId, "deliveries");

  const row = await prisma.delivery.findFirst({
    where: { id: deliveryId, organizationId },
    include: {
      assignedStaff: { select: { id: true, name: true, phone: true } },
      sale: true,
      appointment: true,
    },
  });
  if (!row) throw new Error("Delivery not found");
  return row;
}

export async function updateDeliveryStatus(input: {
  organizationId: string;
  deliveryId: string;
  userId: string;
  status: DeliveryStatus;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "deliveries");

  const existing = await prisma.delivery.findFirst({
    where: { id: input.deliveryId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Delivery not found");

  if (input.status === "OUT_FOR_DELIVERY" && !existing.assignedStaffId) {
    throw new Error("Assign a delivery staff member first");
  }

  const deliveredAt =
    input.status === "DELIVERED" ? new Date() : existing.deliveredAt;

  const delivery = await prisma.delivery.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      deliveredAt,
      ...(input.notes !== undefined && {
        notes: input.notes?.trim() || existing.notes,
      }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "delivery.status_updated",
    entityType: "Delivery",
    entityId: delivery.id,
    before: existing,
    after: delivery,
  });

  return delivery;
}

export async function cancelDelivery(input: {
  organizationId: string;
  deliveryId: string;
  userId: string;
  notes?: string | null;
}) {
  return updateDeliveryStatus({
    organizationId: input.organizationId,
    deliveryId: input.deliveryId,
    userId: input.userId,
    status: "CANCELLED",
    notes: input.notes,
  });
}

export async function updateDelivery(input: {
  organizationId: string;
  deliveryId: string;
  userId: string;
  assignedStaffId?: string | null;
  status?: DeliveryStatus;
  scheduledAt?: Date | null;
  notes?: string | null;
  address?: string;
  customerName?: string;
  customerPhone?: string | null;
}) {
  if (input.assignedStaffId) {
    return assignDelivery({
      organizationId: input.organizationId,
      deliveryId: input.deliveryId,
      assignedStaffId: input.assignedStaffId,
      userId: input.userId,
      scheduledAt: input.scheduledAt,
    });
  }

  if (input.status) {
    return updateDeliveryStatus({
      organizationId: input.organizationId,
      deliveryId: input.deliveryId,
      userId: input.userId,
      status: input.status,
      notes: input.notes,
    });
  }

  const existing = await getDelivery(input.organizationId, input.deliveryId);
  const delivery = await prisma.delivery.update({
    where: { id: existing.id },
    data: {
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.address !== undefined && { address: input.address.trim() }),
      ...(input.customerName !== undefined && {
        customerName: input.customerName.trim(),
      }),
      ...(input.customerPhone !== undefined && {
        customerPhone: input.customerPhone?.trim() || null,
      }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "delivery.updated",
    entityType: "Delivery",
    entityId: delivery.id,
    before: existing,
    after: delivery,
  });

  return delivery;
}

export async function deleteDelivery(
  organizationId: string,
  userId: string,
  deliveryId: string
) {
  return cancelDelivery({
    organizationId,
    deliveryId,
    userId,
  });
}

export async function listMyDeliveries(input: {
  organizationId: string;
  userId: string;
  branchId?: string | import("@/lib/shop/branch/branch-context").BranchScope;
  status?: DeliveryStatus | string;
  cursor?: string;
  limit?: number;
}) {
  await requireModule(input.organizationId, "deliveries");

  const staff = await prisma.staffMember.findFirst({
    where: { organizationId: input.organizationId, userId: input.userId },
    select: { id: true },
  });
  if (!staff) {
    return { items: [], nextCursor: null as string | null };
  }

  const rows = await listDeliveries({
    organizationId: input.organizationId,
    branchId:
      input.branchId && input.branchId !== "all" ? input.branchId : undefined,
    assignedStaffId: staff.id,
    status: input.status as DeliveryStatus | undefined,
    limit: input.limit,
  });

  return Array.isArray(rows) ? { items: rows, nextCursor: null } : rows;
}
