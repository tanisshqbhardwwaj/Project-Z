import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export async function getDefaultCategoryId(organizationId: string) {
  const existing = await prisma.expenseCategory.findFirst({
    where: { organizationId, name: "Miscellaneous" },
  });
  if (existing) return existing.id;

  const created = await prisma.expenseCategory.create({
    data: { organizationId, name: "Miscellaneous", isDefault: true },
  });
  return created.id;
}

export async function checkDuplicateExpense(input: {
  organizationId: string;
  vendorId?: string | null;
  amountPaise: bigint;
  expenseDate: Date;
}) {
  const dayBefore = new Date(input.expenseDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(input.expenseDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const duplicate = await prisma.expense.findFirst({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      vendorId: input.vendorId ?? undefined,
      amountPaise: input.amountPaise,
      expenseDate: { gte: dayBefore, lte: dayAfter },
    },
  });

  return duplicate;
}

export async function createExpense(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  vendorId?: string;
  categoryId: string;
  amountPaise: bigint;
  expenseDate: Date;
  description?: string;
  paidByUserId?: string;
  paymentMethod?: string;
  skipDuplicateCheck?: boolean;
}) {
  if (!input.skipDuplicateCheck) {
    const dup = await checkDuplicateExpense({
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      amountPaise: input.amountPaise,
      expenseDate: input.expenseDate,
    });
    if (dup) {
      return { expense: null, duplicate: dup };
    }
  }

  const expense = await prisma.$transaction(async (tx) => {
    const exp = await tx.expense.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        vendorId: input.vendorId,
        categoryId: input.categoryId,
        amountPaise: input.amountPaise,
        paidAmountPaise: BigInt(0),
        outstandingPaise: input.amountPaise,
        expenseDate: input.expenseDate,
        description: input.description,
        createdById: input.userId,
      },
      include: {
        category: true,
        vendor: true,
        project: { select: { name: true } },
      },
    });

    if (input.amountPaise > BigInt(0)) {
      const payment = await tx.payment.create({
        data: {
          organizationId: input.organizationId,
          projectId: input.projectId,
          vendorId: input.vendorId,
          paidByUserId: input.userId,
          amountPaise: input.amountPaise,
          paymentMethod: (input.paymentMethod as "CASH") ?? "CASH",
          paymentDate: input.expenseDate,
          paymentType: "VENDOR",
          createdById: input.userId,
        },
      });

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          expenseId: exp.id,
          amountPaise: input.amountPaise,
        },
      });

      await tx.expense.update({
        where: { id: exp.id },
        data: {
          paidAmountPaise: input.amountPaise,
          outstandingPaise: BigInt(0),
        },
      });
    }

    return exp;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "expense.created",
    entityType: "Expense",
    entityId: expense.id,
    after: expense,
  });

  const members = await prisma.projectMember.findMany({
    where: { projectId: input.projectId, userId: { not: input.userId } },
    include: { user: true },
  });

  for (const m of members) {
    await createNotification({
      organizationId: input.organizationId,
      userId: m.userId,
      type: "expense.created",
      title: "New expense added",
      body: `₹${Number(input.amountPaise) / 100} expense added to project`,
      metadata: { expenseId: expense.id, projectId: input.projectId },
    });
  }

  return { expense, duplicate: null };
}

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function updateOwnExpense(input: {
  expenseId: string;
  organizationId: string;
  userId: string;
  amountPaise: bigint;
  description: string;
  expenseDate: Date;
}) {
  const expense = await prisma.expense.findFirst({
    where: {
      id: input.expenseId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    include: {
      allocations: { include: { payment: true } },
    },
  });

  if (!expense) throw new Error("Expense not found");
  if (expense.createdById !== input.userId) {
    throw new Error("You can only edit your own expenses");
  }

  const ageMs = Date.now() - expense.createdAt.getTime();
  if (ageMs > EDIT_WINDOW_MS) {
    throw new Error("Edit window expired — you can only edit within 24 hours of creating an expense");
  }

  const latestOwn = await prisma.expense.findFirst({
    where: {
      projectId: expense.projectId,
      organizationId: input.organizationId,
      createdById: input.userId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestOwn?.id !== expense.id) {
    throw new Error("You can only edit your most recent expense on this work order");
  }

  const before = { ...expense };
  const originalAmount =
    expense.originalAmountPaise ?? (expense.isEdited ? null : expense.amountPaise);

  const updated = await prisma.$transaction(async (tx) => {
    const allocation = expense.allocations[0];
    const hadPayment = Boolean(allocation?.payment && expense.paidAmountPaise > BigInt(0));
    let paidAmount = expense.paidAmountPaise;
    if (hadPayment) {
      paidAmount =
        expense.paidAmountPaise >= input.amountPaise
          ? input.amountPaise
          : expense.paidAmountPaise;
    }

    const exp = await tx.expense.update({
      where: { id: expense.id },
      data: {
        amountPaise: input.amountPaise,
        description: input.description,
        expenseDate: input.expenseDate,
        isEdited: true,
        editedAt: new Date(),
        editedById: input.userId,
        originalAmountPaise: originalAmount ?? expense.amountPaise,
        paidAmountPaise: paidAmount,
        outstandingPaise: input.amountPaise - paidAmount,
      },
      include: {
        category: true,
        vendor: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (hadPayment && allocation?.payment) {
      await tx.payment.update({
        where: { id: allocation.payment.id },
        data: {
          amountPaise: paidAmount,
          paymentDate: input.expenseDate,
        },
      });
      await tx.paymentAllocation.update({
        where: { id: allocation.id },
        data: { amountPaise: paidAmount },
      });
    }

    return exp;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "expense.updated",
    entityType: "Expense",
    entityId: expense.id,
    before,
    after: updated,
  });

  return updated;
}

export async function listExpenses(
  organizationId: string,
  filters?: {
    projectId?: string;
    vendorId?: string;
    categoryId?: string;
    fromDate?: Date;
    toDate?: Date;
    cursor?: string;
    limit?: number;
  }
) {
  return prisma.expense.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.fromDate &&
        filters?.toDate && {
          expenseDate: { gte: filters.fromDate, lte: filters.toDate },
        }),
    },
    include: {
      category: true,
      vendor: true,
      project: { select: { id: true, name: true, nickname: true } },
      createdBy: { select: { id: true, name: true } },
      editedBy: { select: { id: true, name: true } },
      allocations: {
        take: 1,
        orderBy: { amountPaise: "desc" },
        include: {
          payment: {
            include: { paidBy: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { expenseDate: "desc" }],
    take: filters?.limit ?? 50,
    ...(filters?.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
  });
}
