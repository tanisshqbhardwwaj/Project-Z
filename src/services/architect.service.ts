import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { dayKeyToUtcDate } from "@/lib/date/org-day";
import { createAuditLog } from "./audit.service";

type DesignStageStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED";

async function requireProject(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function listDesignStages(organizationId: string, projectId: string) {
  await requireModule(organizationId, "architect_stages");
  await requireProject(organizationId, projectId);
  return prisma.designStage.findMany({
    where: { organizationId, projectId },
    orderBy: { sortOrder: "asc" },
    include: {
      revisions: {
        orderBy: { revisionNo: "desc" },
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function createDesignStage(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  name: string;
  sortOrder?: number;
  feeRupees?: number | null;
  dueDate?: string | null;
}) {
  await requireModule(input.organizationId, "architect_stages");
  await requireProject(input.organizationId, input.projectId);

  const name = input.name.trim();
  if (!name) throw new Error("Stage name is required");

  const maxOrder = await prisma.designStage.aggregate({
    where: { organizationId: input.organizationId, projectId: input.projectId },
    _max: { sortOrder: true },
  });

  const stage = await prisma.designStage.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      name,
      sortOrder: input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      feePaise:
        input.feeRupees != null && input.feeRupees > 0
          ? rupeesToPaise(input.feeRupees)
          : null,
      dueDate: input.dueDate ? dayKeyToUtcDate(input.dueDate) : null,
    },
    include: { revisions: true },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "architect.stage.created",
    entityType: "DesignStage",
    entityId: stage.id,
    after: stage,
  });

  return stage;
}

export async function updateDesignStage(input: {
  organizationId: string;
  stageId: string;
  userId: string;
  name?: string;
  status?: DesignStageStatus;
  feeRupees?: number | null;
  dueDate?: string | null;
}) {
  await requireModule(input.organizationId, "architect_stages");

  const existing = await prisma.designStage.findFirst({
    where: { id: input.stageId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Design stage not found");

  const data: {
    name?: string;
    status?: DesignStageStatus;
    feePaise?: bigint | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Stage name is required");
    data.name = name;
  }
  if (input.status !== undefined) {
    data.status = input.status;
    data.completedAt =
      input.status === "APPROVED" ? new Date() : existing.completedAt;
  }
  if (input.feeRupees !== undefined) {
    data.feePaise =
      input.feeRupees != null && input.feeRupees > 0
        ? rupeesToPaise(input.feeRupees)
        : null;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? dayKeyToUtcDate(input.dueDate) : null;
  }

  const updated = await prisma.designStage.update({
    where: { id: input.stageId },
    data,
    include: {
      revisions: {
        orderBy: { revisionNo: "desc" },
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "architect.stage.updated",
    entityType: "DesignStage",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function createDrawingRevision(input: {
  organizationId: string;
  stageId: string;
  userId: string;
  title: string;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "architect_stages");

  const stage = await prisma.designStage.findFirst({
    where: { id: input.stageId, organizationId: input.organizationId },
  });
  if (!stage) throw new Error("Design stage not found");

  const title = input.title.trim();
  if (!title) throw new Error("Revision title is required");

  const maxRev = await prisma.drawingRevision.aggregate({
    where: { stageId: input.stageId },
    _max: { revisionNo: true },
  });

  const revision = await prisma.drawingRevision.create({
    data: {
      organizationId: input.organizationId,
      stageId: input.stageId,
      revisionNo: (maxRev._max.revisionNo ?? 0) + 1,
      title,
      notes: input.notes?.trim() || null,
      submittedAt: new Date(),
      createdById: input.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "architect.revision.created",
    entityType: "DrawingRevision",
    entityId: revision.id,
    after: revision,
  });

  return revision;
}
