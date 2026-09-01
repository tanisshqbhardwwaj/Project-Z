import { prisma } from "@/lib/db/prisma";
import type { FollowUpStatus } from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";

export async function createServiceFollowUp(input: {
  organizationId: string;
  createdById: string;
  customerId: string;
  appointmentId?: string | null;
  dueDate: Date;
  note?: string | null;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const customer = await prisma.shopCustomer.findFirst({
    where: { id: input.customerId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!customer) throw new Error("Customer not found");

  if (input.appointmentId) {
    const appointment = await prisma.serviceAppointment.findFirst({
      where: {
        id: input.appointmentId,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (!appointment) throw new Error("Appointment not found");
  }

  const followUp = await prisma.serviceFollowUp.create({
    data: {
      organizationId: input.organizationId,
      customerId: input.customerId,
      appointmentId: input.appointmentId ?? null,
      dueDate: input.dueDate,
      note: input.note?.trim() || null,
      status: "PENDING",
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.followup.created",
    entityType: "ServiceFollowUp",
    entityId: followUp.id,
    after: followUp,
  });

  return followUp;
}

export async function listServiceFollowUps(input: {
  organizationId: string;
  customerId?: string;
  appointmentId?: string;
  status?: FollowUpStatus;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  await requireModule(input.organizationId, "service_appointments");

  return prisma.serviceFollowUp.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.customerId && { customerId: input.customerId }),
      ...(input.appointmentId && { appointmentId: input.appointmentId }),
      ...(input.status && { status: input.status }),
      ...(input.from || input.to
        ? {
            dueDate: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }
        : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      appointment: {
        select: { id: true, startAt: true, status: true, customerName: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: input.limit ?? 200,
  });
}

export async function getServiceFollowUp(organizationId: string, followUpId: string) {
  await requireModule(organizationId, "service_appointments");

  const row = await prisma.serviceFollowUp.findFirst({
    where: { id: followUpId, organizationId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      appointment: true,
    },
  });
  if (!row) throw new Error("Follow-up not found");
  return row;
}

export async function updateServiceFollowUp(input: {
  organizationId: string;
  followUpId: string;
  userId: string;
  dueDate?: Date;
  note?: string | null;
  status?: FollowUpStatus;
}) {
  await requireModule(input.organizationId, "service_appointments");

  const existing = await prisma.serviceFollowUp.findFirst({
    where: { id: input.followUpId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Follow-up not found");

  const followUp = await prisma.serviceFollowUp.update({
    where: { id: existing.id },
    data: {
      ...(input.dueDate && { dueDate: input.dueDate }),
      ...(input.note !== undefined && { note: input.note?.trim() || null }),
      ...(input.status && { status: input.status }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.followup.updated",
    entityType: "ServiceFollowUp",
    entityId: followUp.id,
    before: existing,
    after: followUp,
  });

  return followUp;
}

export async function completeServiceFollowUp(input: {
  organizationId: string;
  followUpId: string;
  userId: string;
  note?: string | null;
}) {
  return updateServiceFollowUp({
    organizationId: input.organizationId,
    followUpId: input.followUpId,
    userId: input.userId,
    status: "DONE",
    note: input.note,
  });
}

export async function dismissServiceFollowUp(input: {
  organizationId: string;
  followUpId: string;
  userId: string;
}) {
  return updateServiceFollowUp({
    organizationId: input.organizationId,
    followUpId: input.followUpId,
    userId: input.userId,
    status: "DISMISSED",
  });
}
