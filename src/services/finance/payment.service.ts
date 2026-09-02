import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "../shared/audit.service";
import type { PaymentMethod, PaymentType } from "@prisma/client";

export async function createPayment(input: {
  organizationId: string;
  projectId?: string;
  vendorId?: string;
  paidByUserId: string;
  recipientUserId?: string;
  amountPaise: bigint;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  paymentDate: Date;
  paymentType: PaymentType;
  notes?: string;
  userId: string;
  allocations?: Array<{ expenseId: string; amountPaise: bigint }>;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        vendorId: input.vendorId,
        paidByUserId: input.paidByUserId,
        recipientUserId: input.recipientUserId,
        amountPaise: input.amountPaise,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        paymentDate: input.paymentDate,
        paymentType: input.paymentType,
        notes: input.notes,
        createdById: input.userId,
      },
    });

    if (input.allocations?.length) {
      let totalAllocated = BigInt(0);
      for (const alloc of input.allocations) {
        totalAllocated += alloc.amountPaise;
        const expense = await tx.expense.findFirst({
          where: { id: alloc.expenseId, organizationId: input.organizationId },
        });
        if (!expense) throw new Error("Expense not found");

        const newPaid = expense.paidAmountPaise + alloc.amountPaise;
        if (newPaid > expense.amountPaise) {
          throw new Error("Allocation exceeds expense outstanding");
        }

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            expenseId: alloc.expenseId,
            amountPaise: alloc.amountPaise,
          },
        });

        await tx.expense.update({
          where: { id: alloc.expenseId },
          data: {
            paidAmountPaise: newPaid,
            outstandingPaise: expense.amountPaise - newPaid,
          },
        });
      }

      if (totalAllocated > input.amountPaise) {
        throw new Error("Total allocations exceed payment amount");
      }
    }

    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      after: payment,
    });

    return payment;
  });
}

export async function allocatePayment(input: {
  paymentId: string;
  organizationId: string;
  userId: string;
  allocations: Array<{ expenseId: string; amountPaise: bigint }>;
}) {
  const payment = await prisma.payment.findFirst({
    where: { id: input.paymentId, organizationId: input.organizationId, deletedAt: null },
  });
  if (!payment) throw new Error("Payment not found");

  const existing = await prisma.paymentAllocation.aggregate({
    where: { paymentId: input.paymentId },
    _sum: { amountPaise: true },
  });
  const alreadyAllocated = existing._sum.amountPaise ?? BigInt(0);

  let newTotal = alreadyAllocated;
  for (const a of input.allocations) {
    newTotal += a.amountPaise;
  }
  if (newTotal > payment.amountPaise) {
    throw new Error("Total allocations exceed payment amount");
  }

  return prisma.$transaction(async (tx) => {
    for (const alloc of input.allocations) {
      const expense = await tx.expense.findFirst({
        where: { id: alloc.expenseId, organizationId: input.organizationId },
      });
      if (!expense) throw new Error("Expense not found");

      const newPaid = expense.paidAmountPaise + alloc.amountPaise;
      if (newPaid > expense.amountPaise) {
        throw new Error("Allocation exceeds expense amount");
      }

      await tx.paymentAllocation.create({
        data: {
          paymentId: input.paymentId,
          expenseId: alloc.expenseId,
          amountPaise: alloc.amountPaise,
        },
      });

      await tx.expense.update({
        where: { id: alloc.expenseId },
        data: {
          paidAmountPaise: newPaid,
          outstandingPaise: expense.amountPaise - newPaid,
        },
      });
    }

    return tx.payment.findUnique({
      where: { id: input.paymentId },
      include: { allocations: { include: { expense: true } } },
    });
  });
}
