import { prisma, serializeBigInt } from "@/lib/db/prisma";

export async function createAuditLog(input: {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ? serializeBigInt(input.before) : undefined,
      after: input.after ? serializeBigInt(input.after) : undefined,
      ipAddress: input.ipAddress,
    },
  });
}

export async function getAuditLogs(
  organizationId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    projectId?: string;
    limit?: number;
    cursor?: string;
  }
) {
  let projectFilter: { OR: Array<{ entityType: string; entityId: string | { in: string[] } }> } | undefined;

  if (options?.projectId) {
    const [expenses, payments, workOrder] = await Promise.all([
      prisma.expense.findMany({
        where: { projectId: options.projectId, organizationId },
        select: { id: true },
      }),
      prisma.payment.findMany({
        where: { projectId: options.projectId, organizationId },
        select: { id: true },
      }),
      prisma.workOrder.findUnique({
        where: { projectId: options.projectId },
        select: { id: true },
      }),
    ]);

    projectFilter = {
      OR: [
        { entityType: "Project", entityId: options.projectId },
        ...(expenses.length
          ? [{ entityType: "Expense", entityId: { in: expenses.map((e) => e.id) } }]
          : []),
        ...(payments.length
          ? [{ entityType: "Payment", entityId: { in: payments.map((p) => p.id) } }]
          : []),
        ...(workOrder ? [{ entityType: "WorkOrder", entityId: workOrder.id }] : []),
      ],
    };
  }

  return prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(options?.entityType && { entityType: options.entityType }),
      ...(options?.entityId && { entityId: options.entityId }),
      ...(projectFilter && projectFilter),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    ...(options?.cursor && { cursor: { id: options.cursor }, skip: 1 }),
  });
}
