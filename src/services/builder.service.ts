import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "./audit.service";

type UnitStatus = "AVAILABLE" | "BOOKED" | "SOLD";
type BookingStatus = "BOOKED" | "CANCELLED" | "HANDED_OVER";

async function requireProject(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function listBuilderUnits(organizationId: string, projectId: string) {
  await requireModule(organizationId, "builder_units");
  await requireProject(organizationId, projectId);
  return prisma.builderUnit.findMany({
    where: { organizationId, projectId },
    orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
    include: {
      bookings: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { bookedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function createBuilderUnit(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  unitNumber: string;
  floor?: string | null;
  areaSqft?: number | null;
  priceRupees?: number | null;
}) {
  await requireModule(input.organizationId, "builder_units");
  await requireProject(input.organizationId, input.projectId);

  const unitNumber = input.unitNumber.trim();
  if (!unitNumber) throw new Error("Unit number is required");

  const duplicate = await prisma.builderUnit.findFirst({
    where: {
      projectId: input.projectId,
      organizationId: input.organizationId,
      unitNumber,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error(`Unit "${unitNumber}" already exists in this project`);
  }

  const unit = await prisma.builderUnit.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      unitNumber,
      floor: input.floor?.trim() || null,
      areaSqft: input.areaSqft ?? null,
      pricePaise:
        input.priceRupees != null && input.priceRupees > 0
          ? rupeesToPaise(input.priceRupees)
          : null,
      status: "AVAILABLE",
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "builder.unit.created",
    entityType: "BuilderUnit",
    entityId: unit.id,
    after: unit,
  });

  return unit;
}

export async function updateBuilderUnit(input: {
  organizationId: string;
  unitId: string;
  userId: string;
  floor?: string | null;
  areaSqft?: number | null;
  priceRupees?: number | null;
  status?: UnitStatus;
}) {
  await requireModule(input.organizationId, "builder_units");

  const existing = await prisma.builderUnit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Unit not found");

  const data: {
    floor?: string | null;
    areaSqft?: number | null;
    pricePaise?: bigint | null;
    status?: UnitStatus;
  } = {};

  if (input.floor !== undefined) data.floor = input.floor?.trim() || null;
  if (input.areaSqft !== undefined) data.areaSqft = input.areaSqft;
  if (input.priceRupees !== undefined) {
    data.pricePaise =
      input.priceRupees != null && input.priceRupees > 0
        ? rupeesToPaise(input.priceRupees)
        : null;
  }
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.builderUnit.update({
    where: { id: input.unitId },
    data,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "builder.unit.updated",
    entityType: "BuilderUnit",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function listUnitBookings(organizationId: string, projectId: string) {
  await requireModule(organizationId, "builder_units");
  await requireProject(organizationId, projectId);
  return prisma.unitBooking.findMany({
    where: { organizationId, projectId },
    orderBy: { bookedAt: "desc" },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createUnitBooking(input: {
  organizationId: string;
  projectId: string;
  unitId: string;
  createdById: string;
  buyerName: string;
  buyerPhone?: string | null;
  bookingRupees: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "builder_units");
  await requireProject(input.organizationId, input.projectId);

  const unit = await prisma.builderUnit.findFirst({
    where: {
      id: input.unitId,
      organizationId: input.organizationId,
      projectId: input.projectId,
    },
  });
  if (!unit) throw new Error("Unit not found");
  if (unit.status !== "AVAILABLE") throw new Error("Unit is not available for booking");

  const buyerName = input.buyerName.trim();
  if (buyerName.length < 2) throw new Error("Buyer name must be at least 2 characters");
  if (input.bookingRupees <= 0) throw new Error("Booking amount must be greater than zero");

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.unitBooking.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        unitId: input.unitId,
        createdById: input.createdById,
        buyerName,
        buyerPhone: input.buyerPhone?.trim() || null,
        bookingPaise: rupeesToPaise(input.bookingRupees),
        notes: input.notes?.trim() || null,
      },
      include: {
        unit: { select: { id: true, unitNumber: true, floor: true } },
      },
    });

    await tx.builderUnit.update({
      where: { id: input.unitId },
      data: { status: "BOOKED" },
    });

    return created;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "builder.booking.created",
    entityType: "UnitBooking",
    entityId: booking.id,
    after: booking,
  });

  return booking;
}

export async function updateUnitBooking(input: {
  organizationId: string;
  bookingId: string;
  userId: string;
  status: BookingStatus;
}) {
  await requireModule(input.organizationId, "builder_units");

  const existing = await prisma.unitBooking.findFirst({
    where: { id: input.bookingId, organizationId: input.organizationId },
    include: { unit: true },
  });
  if (!existing) throw new Error("Booking not found");

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.unitBooking.update({
      where: { id: input.bookingId },
      data: { status: input.status },
      include: {
        unit: { select: { id: true, unitNumber: true, floor: true } },
      },
    });

    if (input.status === "CANCELLED") {
      await tx.builderUnit.update({
        where: { id: existing.unitId },
        data: { status: "AVAILABLE" },
      });
    } else if (input.status === "HANDED_OVER") {
      await tx.builderUnit.update({
        where: { id: existing.unitId },
        data: { status: "SOLD" },
      });
    } else if (input.status === "BOOKED") {
      await tx.builderUnit.update({
        where: { id: existing.unitId },
        data: { status: "BOOKED" },
      });
    }

    return booking;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "builder.booking.updated",
    entityType: "UnitBooking",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}
