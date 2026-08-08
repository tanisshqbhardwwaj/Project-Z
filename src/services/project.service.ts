import { prisma } from "@/lib/db/prisma";
import { calculateBudgetSummary } from "@/lib/finance/budget";
import { generateToken } from "@/lib/utils";
import { sendEmail, inviteEmailHtml, projectPartnerInviteEmailHtml } from "@/lib/email";
import { createAuditLog } from "./audit.service";
import { createNotification } from "./notification.service";
import { getPartnerContributions } from "./settlement.service";
import type { ProjectStatus, SplitType } from "@prisma/client";

export async function createProject(input: {
  organizationId: string;
  userId: string;
  name: string;
  contractAmountPaise: bigint;
  budgetAmountPaise?: bigint;
  location?: string;
  description?: string;
  expectedStartDate?: Date;
  expectedCompletionDate?: Date;
  status?: ProjectStatus;
  workOrder?: {
    workOrderNumber: string;
    workOrderDate: Date;
    clientName: string;
    headOfAccount?: string;
    timeOfCompletion?: string;
    paymentTerms?: string;
    notes?: string;
  };
  memberIds?: string[];
  splitType?: SplitType;
  splits?: Array<{ userId: string; percent?: number }>;
}) {
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        contractAmountPaise: input.contractAmountPaise,
        budgetAmountPaise: input.budgetAmountPaise,
        location: input.location,
        description: input.description,
        expectedStartDate: input.expectedStartDate,
        expectedCompletionDate: input.expectedCompletionDate,
        status: input.status ?? "ACTIVE",
        createdById: input.userId,
      },
    });

    if (input.workOrder) {
      await tx.workOrder.create({
        data: {
          organizationId: input.organizationId,
          projectId: p.id,
          workOrderNumber: input.workOrder.workOrderNumber,
          workOrderDate: input.workOrder.workOrderDate,
          clientName: input.workOrder.clientName,
          headOfAccount: input.workOrder.headOfAccount,
          timeOfCompletion: input.workOrder.timeOfCompletion,
          paymentTerms: input.workOrder.paymentTerms,
          notes: input.workOrder.notes,
          status: input.status ?? "ACTIVE",
          createdById: input.userId,
        },
      });
    }

    const memberIds = input.memberIds ?? [input.userId];
    for (const userId of memberIds) {
      await tx.projectMember.create({
        data: { projectId: p.id, userId },
      });
    }

    await tx.projectSplitConfig.create({
      data: {
        projectId: p.id,
        splitType: input.splitType ?? "EQUAL",
        splits: input.splits ?? [],
      },
    });

    return p;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "project.created",
    entityType: "Project",
    entityId: project.id,
    after: project,
  });

  return project;
}

export async function getProjectSummary(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    include: {
      workOrder: true,
      splitConfig: true,
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!project) return null;

  const expenses = await prisma.expense.aggregate({
    where: { projectId, organizationId, deletedAt: null },
    _sum: { amountPaise: true, outstandingPaise: true, paidAmountPaise: true },
  });

  const summary = calculateBudgetSummary({
    contractAmountPaise: project.contractAmountPaise,
    budgetAmountPaise: project.budgetAmountPaise,
    totalExpensesPaise: expenses._sum.amountPaise ?? BigInt(0),
    vendorOutstandingPaise: expenses._sum.outstandingPaise ?? BigInt(0),
    totalPaidPaise: expenses._sum.paidAmountPaise ?? BigInt(0),
  });

  const partnerSpending = await getPartnerContributions(projectId, organizationId);

  return { project, summary, partnerSpending };
}

export async function listProjects(
  organizationId: string,
  userId: string,
  role: string,
  options?: { status?: ProjectStatus; cursor?: string; limit?: number }
) {
  const isOwnerOrAccountant = role === "OWNER" || role === "ACCOUNTANT";

  return prisma.project.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(options?.status && { status: options.status }),
      ...(!isOwnerOrAccountant && {
        members: { some: { userId } },
      }),
    },
    include: {
      workOrder: { select: { clientName: true, workOrderNumber: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: options?.limit ?? 50,
    ...(options?.cursor && { cursor: { id: options.cursor }, skip: 1 }),
  });
}

export async function listProjectMembers(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
  });
  if (!project) throw new Error("Project not found");

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function canApproveProjectPartners(
  userId: string,
  organizationId: string,
  project: { createdById: string }
) {
  if (project.createdById === userId) return true;
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  return member?.role === "OWNER";
}

export async function getProjectPartnersOverview(
  projectId: string,
  organizationId: string,
  viewerId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true, createdById: true },
  });
  if (!project) throw new Error("Project not found");

  const canApprove = await canApproveProjectPartners(viewerId, organizationId, project);

  const members = await listProjectMembers(projectId, organizationId);

  let pendingRequests: Awaited<
    ReturnType<typeof prisma.projectPartnerRequest.findMany>
  > = [];
  if (canApprove) {
    try {
      pendingRequests = await prisma.projectPartnerRequest.findMany({
        where: { projectId, status: "PENDING" },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      console.error("Could not load partner requests:", error);
    }
  }

  return { members, pendingRequests, canApprove };
}

async function ensureOrgPartnerMembership(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizationId: string,
  userId: string
) {
  const orgMember = await tx.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });

  if (orgMember?.status === "ACTIVE") return;

  const orgCount = await tx.organizationMember.count({
    where: { userId, status: "ACTIVE" },
  });
  if (orgCount >= 3) {
    throw new Error("User can belong to at most 3 organizations");
  }

  await tx.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: {
      organizationId,
      userId,
      role: "PARTNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    update: { status: "ACTIVE", role: "PARTNER" },
  });
}

export async function createProjectInviteLink(input: {
  projectId: string;
  organizationId: string;
  invitedById: string;
  email?: string;
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId, deletedAt: null },
    include: { workOrder: { select: { workOrderNumber: true } } },
  });
  if (!project) throw new Error("Project not found");

  const token = generateToken(48);
  const invite = await prisma.projectInvite.create({
    data: {
      projectId: input.projectId,
      organizationId: input.organizationId,
      email: input.email?.toLowerCase() ?? `invite-${token}@placeholder.local`,
      token,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: { project: { select: { name: true } } },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/project-invite/${token}`;
  return { invite, url, projectName: project.name, workOrderNumber: project.workOrder?.workOrderNumber };
}

export async function inviteProjectPartner(input: {
  projectId: string;
  organizationId: string;
  email: string;
  invitedById: string;
}) {
  const { invite, url, projectName, workOrderNumber } = await createProjectInviteLink(input);

  await sendEmail({
    to: input.email,
    subject: `Partner invite: ${projectName}${workOrderNumber ? ` (WO #${workOrderNumber})` : ""}`,
    html: projectPartnerInviteEmailHtml(projectName, workOrderNumber ?? null, url),
    devLink: url,
  });

  return invite;
}

export async function acceptProjectInvite(token: string, userId: string) {
  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, deletedAt: true, createdById: true } },
      organization: true,
    },
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation");
  }
  if (invite.project.deletedAt) {
    throw new Error("This work order is no longer active");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const isLinkInvite = invite.email.endsWith("@placeholder.local");
  if (!isLinkInvite && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: invite.projectId, userId } },
  });
  if (existingMember) {
    throw new Error("You are already a partner on this work order");
  }

  const existingRequest = await prisma.projectPartnerRequest.findUnique({
    where: { projectId_userId: { projectId: invite.projectId, userId } },
  });
  if (existingRequest?.status === "PENDING") {
    return {
      status: "PENDING" as const,
      request: existingRequest,
      project: invite.project,
      organization: invite.organization,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.projectPartnerRequest.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId } },
      create: {
        projectId: invite.projectId,
        organizationId: invite.organizationId,
        userId,
        inviteId: invite.id,
        status: "PENDING",
      },
      update: {
        status: "PENDING",
        inviteId: invite.id,
        reviewedById: null,
        reviewedAt: null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return {
      status: "PENDING" as const,
      request,
      project: invite.project,
      organization: invite.organization,
    };
  });

  if (invite.project.createdById !== userId) {
    await createNotification({
      organizationId: invite.organizationId,
      userId: invite.project.createdById,
      type: "PARTNER_REQUEST",
      title: "Partner approval needed",
      body: `${user.name} requested to join ${invite.project.name}`,
      metadata: { projectId: invite.projectId, requestId: result.request.id },
    });
  }

  return result;
}

export async function approvePartnerRequest(input: {
  requestId: string;
  projectId: string;
  organizationId: string;
  reviewerId: string;
}) {
  const request = await prisma.projectPartnerRequest.findFirst({
    where: {
      id: input.requestId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      status: "PENDING",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, createdById: true } },
    },
  });
  if (!request) throw new Error("Partner request not found");

  const canApprove = await canApproveProjectPartners(
    input.reviewerId,
    input.organizationId,
    request.project
  );
  if (!canApprove) throw new Error("Only the work order owner can approve partners");

  const member = await prisma.$transaction(async (tx) => {
    await ensureOrgPartnerMembership(tx, input.organizationId, request.userId);

    const projectMember = await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: input.projectId, userId: request.userId } },
      create: { projectId: input.projectId, userId: request.userId },
      update: {},
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    await tx.projectPartnerRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
      },
    });

    return projectMember;
  });

  await createNotification({
    organizationId: input.organizationId,
    userId: request.userId,
    type: "PARTNER_APPROVED",
    title: "Partner request approved",
    body: `You can now access ${request.project.name} as a partner`,
    metadata: { projectId: input.projectId },
  });

  return member;
}

export async function rejectPartnerRequest(input: {
  requestId: string;
  projectId: string;
  organizationId: string;
  reviewerId: string;
}) {
  const request = await prisma.projectPartnerRequest.findFirst({
    where: {
      id: input.requestId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      status: "PENDING",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, createdById: true } },
    },
  });
  if (!request) throw new Error("Partner request not found");

  const canApprove = await canApproveProjectPartners(
    input.reviewerId,
    input.organizationId,
    request.project
  );
  if (!canApprove) throw new Error("Only the work order owner can reject partner requests");

  await prisma.projectPartnerRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
    },
  });

  await createNotification({
    organizationId: input.organizationId,
    userId: request.userId,
    type: "PARTNER_REJECTED",
    title: "Partner request declined",
    body: `Your request to join ${request.project.name} was declined`,
    metadata: { projectId: input.projectId },
  });

  return { id: request.id, status: "REJECTED" as const };
}

export async function mergeProjects(input: {
  targetProjectId: string;
  sourceProjectId: string;
  organizationId: string;
  userId: string;
}) {
  if (input.targetProjectId === input.sourceProjectId) {
    throw new Error("Select a different work order to merge");
  }

  const merged = await prisma.$transaction(async (tx) => {
    const [target, source] = await Promise.all([
      tx.project.findFirst({
        where: { id: input.targetProjectId, organizationId: input.organizationId, deletedAt: null },
        include: { workOrder: true },
      }),
      tx.project.findFirst({
        where: { id: input.sourceProjectId, organizationId: input.organizationId, deletedAt: null },
        include: { workOrder: true, members: true },
      }),
    ]);

    if (!target || !source) throw new Error("Work order not found");

    await tx.expense.updateMany({
      where: { projectId: source.id, organizationId: input.organizationId },
      data: { projectId: target.id },
    });
    await tx.payment.updateMany({
      where: { projectId: source.id, organizationId: input.organizationId },
      data: { projectId: target.id },
    });
    await tx.document.updateMany({
      where: { projectId: source.id, organizationId: input.organizationId },
      data: { projectId: target.id },
    });

    for (const member of source.members) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: target.id, userId: member.userId } },
        create: {
          projectId: target.id,
          userId: member.userId,
          splitType: member.splitType,
          splitValue: member.splitValue,
        },
        update: {},
      });
    }

    const mergeNote = source.workOrder
      ? `Merged WO #${source.workOrder.workOrderNumber} (${source.name})`
      : `Merged work order: ${source.name}`;

    const updatedTarget = await tx.project.update({
      where: { id: target.id },
      data: {
        contractAmountPaise: target.contractAmountPaise + source.contractAmountPaise,
        budgetAmountPaise:
          (target.budgetAmountPaise ?? target.contractAmountPaise) +
          (source.budgetAmountPaise ?? source.contractAmountPaise),
        description: [target.description, source.description, mergeNote].filter(Boolean).join("\n"),
      },
    });

    if (target.workOrder && source.workOrder) {
      await tx.workOrder.update({
        where: { id: target.workOrder.id },
        data: {
          notes: [target.workOrder.notes, `Also includes merged WO #${source.workOrder.workOrderNumber}`]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }

    await tx.project.update({
      where: { id: source.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    return { target: updatedTarget, sourceName: source.name };
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "project.merged",
    entityType: "Project",
    entityId: input.targetProjectId,
    after: { sourceProjectId: input.sourceProjectId, sourceName: merged.sourceName },
  });

  return merged.target;
}

export async function hardDeleteProject(input: {
  projectId: string;
  organizationId: string;
  userId: string;
  confirmName: string;
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId },
    include: { workOrder: { select: { id: true } } },
  });
  if (!project) throw new Error("Work order not found");

  const canDelete = await canApproveProjectPartners(input.userId, input.organizationId, project);
  if (!canDelete) throw new Error("Only the work order owner can delete this work order");

  if (input.confirmName.trim() !== project.name.trim()) {
    throw new Error("Work order name does not match. Type the exact name to confirm deletion.");
  }

  const expenseIds = (
    await prisma.expense.findMany({
      where: { projectId: input.projectId },
      select: { id: true },
    })
  ).map((e) => e.id);

  const documentFilters: Array<Record<string, unknown>> = [{ projectId: input.projectId }];
  if (project.workOrder) documentFilters.push({ workOrderId: project.workOrder.id });
  if (expenseIds.length) documentFilters.push({ expenseId: { in: expenseIds } });

  const documents = await prisma.document.findMany({
    where: { OR: documentFilters },
    select: { id: true, storageKey: true },
  });

  await prisma.$transaction(async (tx) => {
    const linkedPayments = await tx.payment.findMany({
      where: {
        OR: [
          { projectId: input.projectId },
          ...(expenseIds.length
            ? [{ allocations: { some: { expenseId: { in: expenseIds } } } }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (linkedPayments.length) {
      await tx.payment.deleteMany({
        where: { id: { in: linkedPayments.map((p) => p.id) } },
      });
    }

    if (documents.length) {
      await tx.document.deleteMany({
        where: { id: { in: documents.map((d) => d.id) } },
      });
    }

    await tx.project.delete({ where: { id: input.projectId } });
  });

  const { deleteFile } = await import("@/lib/storage");
  await Promise.allSettled(documents.map((doc) => deleteFile(doc.storageKey)));

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "project.hard_deleted",
    entityType: "Project",
    entityId: input.projectId,
    before: { name: project.name },
  });

  return { deleted: true, projectName: project.name };
}
