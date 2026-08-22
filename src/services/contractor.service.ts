import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { dayKeyToUtcDate } from "@/lib/date/org-day";
import { createAuditLog } from "./audit.service";

async function requireProject(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function listBoqItems(organizationId: string, projectId: string) {
  await requireModule(organizationId, "contractor_boq");
  await requireProject(organizationId, projectId);
  return prisma.boqItem.findMany({
    where: { organizationId, projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createBoqItem(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  itemCode?: string | null;
  description: string;
  unit: string;
  quantity: number;
  rateRupees: number;
}) {
  await requireModule(input.organizationId, "contractor_boq");
  await requireProject(input.organizationId, input.projectId);

  const description = input.description.trim();
  const unit = input.unit.trim();
  if (!description) throw new Error("Description is required");
  if (!unit) throw new Error("Unit is required");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero");

  const item = await prisma.boqItem.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      itemCode: input.itemCode?.trim() || null,
      description,
      unit,
      quantity: input.quantity,
      ratePaise: rupeesToPaise(input.rateRupees),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "contractor.boq.created",
    entityType: "BoqItem",
    entityId: item.id,
    after: item,
  });

  return item;
}

export async function updateBoqItem(input: {
  organizationId: string;
  itemId: string;
  userId: string;
  description?: string;
  quantity?: number;
  rateRupees?: number;
}) {
  await requireModule(input.organizationId, "contractor_boq");

  const existing = await prisma.boqItem.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("BOQ item not found");

  const data: { description?: string; quantity?: number; ratePaise?: bigint } = {};
  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) throw new Error("Description is required");
    data.description = description;
  }
  if (input.quantity !== undefined) {
    if (input.quantity <= 0) throw new Error("Quantity must be greater than zero");
    data.quantity = input.quantity;
  }
  if (input.rateRupees !== undefined) data.ratePaise = rupeesToPaise(input.rateRupees);

  const updated = await prisma.boqItem.update({
    where: { id: input.itemId },
    data,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "contractor.boq.updated",
    entityType: "BoqItem",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function listMeasurements(organizationId: string, projectId: string) {
  await requireModule(organizationId, "contractor_boq");
  await requireProject(organizationId, projectId);
  return prisma.measurementEntry.findMany({
    where: { organizationId, projectId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createMeasurement(input: {
  organizationId: string;
  projectId: string;
  createdById: string;
  description: string;
  quantity: number;
  unit: string;
  date: string | Date;
  boqItemId?: string | null;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "contractor_boq");
  await requireProject(input.organizationId, input.projectId);

  const description = input.description.trim();
  const unit = input.unit.trim();
  if (!description) throw new Error("Description is required");
  if (!unit) throw new Error("Unit is required");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero");

  const date =
    typeof input.date === "string" ? dayKeyToUtcDate(input.date) : input.date;

  const entry = await prisma.measurementEntry.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      createdById: input.createdById,
      description,
      quantity: input.quantity,
      unit,
      date,
      boqItemId: input.boqItemId || null,
      notes: input.notes?.trim() || null,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "contractor.measurement.created",
    entityType: "MeasurementEntry",
    entityId: entry.id,
    after: entry,
  });

  return entry;
}

export async function listMaterialIssues(organizationId: string, projectId: string) {
  await requireModule(organizationId, "contractor_material");
  await requireProject(organizationId, projectId);
  return prisma.materialIssue.findMany({
    where: { organizationId, projectId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createMaterialIssue(input: {
  organizationId: string;
  projectId: string;
  createdById: string;
  itemName: string;
  quantity: number;
  unit: string;
  date: string | Date;
  issuedTo?: string | null;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "contractor_material");
  await requireProject(input.organizationId, input.projectId);

  const itemName = input.itemName.trim();
  const unit = input.unit.trim();
  if (!itemName) throw new Error("Item name is required");
  if (!unit) throw new Error("Unit is required");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero");

  const date =
    typeof input.date === "string" ? dayKeyToUtcDate(input.date) : input.date;

  const issue = await prisma.materialIssue.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      createdById: input.createdById,
      itemName,
      quantity: input.quantity,
      unit,
      date,
      issuedTo: input.issuedTo?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "contractor.material.created",
    entityType: "MaterialIssue",
    entityId: issue.id,
    after: issue,
  });

  return issue;
}
