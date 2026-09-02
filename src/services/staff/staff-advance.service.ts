import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";
import {
  createShopExpenseWithLinks,
  setStaffAdvanceShopExpenseId,
} from "@/lib/shop/shared/staff-expense-links";
import {
  ensureDefaultShopExpenseCategories,
} from "../shop/shop-expense.service";

async function staffCategoryId(organizationId: string) {
  await ensureDefaultShopExpenseCategories(organizationId);
  const cat = await prisma.shopExpenseCategory.findFirst({
    where: { organizationId, name: "Staff" },
  });
  if (!cat) throw new Error("Staff expense category not found");
  return cat.id;
}

export async function listStaffAdvances(
  organizationId: string,
  options?: { staffId?: string; status?: "OPEN" | "CLOSED" }
) {
  await requireModule(organizationId, "staff");
  return prisma.staffAdvance.findMany({
    where: {
      organizationId,
      ...(options?.staffId ? { staffId: options.staffId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    include: {
      staff: { select: { id: true, name: true, roleTitle: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaffAdvance(input: {
  organizationId: string;
  userId: string;
  staffId: string;
  amountRupees: number;
  notes?: string | null;
  givenDate?: Date;
  paymentMethod?: PaymentMethod;
}) {
  await requireModule(input.organizationId, "staff");
  if (input.amountRupees <= 0) throw new Error("Amount must be greater than zero");

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId, status: "ACTIVE" },
  });
  if (!staff) throw new Error("Staff member not found");

  const amountPaise = rupeesToPaise(input.amountRupees);
  const reason = input.notes?.trim() || "Staff advance";
  const categoryId = await staffCategoryId(input.organizationId);

  const result = await prisma.$transaction(async (tx) => {
    const advance = await tx.staffAdvance.create({
      data: {
        organizationId: input.organizationId,
        staffId: staff.id,
        amountPaise,
        notes: reason,
        createdById: input.userId,
      },
    });

    const expense = await createShopExpenseWithLinks(
      tx,
      {
        organizationId: input.organizationId,
        categoryId,
        expenseDate: input.givenDate ?? new Date(),
        title: `Advance — ${staff.name}`,
        description: reason,
        amountPaise,
        paymentMethod: input.paymentMethod ?? "CASH",
        paidBy: staff.name,
        expenseType: "DAILY",
        notes: reason,
        createdById: input.userId,
      },
      { staffId: staff.id, staffAdvanceId: advance.id }
    );

    await setStaffAdvanceShopExpenseId(tx, advance.id, expense.id);

    return tx.staffAdvance.findUniqueOrThrow({
      where: { id: advance.id },
      include: {
        staff: { select: { id: true, name: true, roleTitle: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "staff.advance.created",
    entityType: "StaffAdvance",
    entityId: result.id,
    after: result,
  });

  return result;
}

/** Apply advance repayments when payroll is marked paid. */
export async function applyAdvanceRepayments(input: {
  organizationId: string;
  staffId: string;
  repayPaise: bigint;
}) {
  if (input.repayPaise <= BigInt(0)) return;

  const advances = await prisma.staffAdvance.findMany({
    where: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      status: "OPEN",
    },
    orderBy: { createdAt: "asc" },
  });

  let remaining = input.repayPaise;
  for (const adv of advances) {
    if (remaining <= BigInt(0)) break;
    const owed = adv.amountPaise - adv.repaidPaise;
    if (owed <= BigInt(0)) continue;
    const pay = remaining > owed ? owed : remaining;
    const newRepaid = adv.repaidPaise + pay;
    remaining -= pay;
    await prisma.staffAdvance.update({
      where: { id: adv.id },
      data: {
        repaidPaise: newRepaid,
        status: newRepaid >= adv.amountPaise ? "CLOSED" : "OPEN",
      },
    });
  }
}

export async function getOpenAdvanceDeductionPaise(
  organizationId: string,
  staffId: string
): Promise<bigint> {
  const advances = await prisma.staffAdvance.findMany({
    where: { organizationId, staffId, status: "OPEN" },
  });
  let total = BigInt(0);
  for (const adv of advances) {
    const remaining = adv.amountPaise - adv.repaidPaise;
    if (remaining <= BigInt(0)) continue;
    const deduct = adv.monthlyDeductionPaise ?? remaining;
    total += deduct > remaining ? remaining : deduct;
  }
  return total;
}

export async function createSalaryShopExpense(input: {
  organizationId: string;
  userId: string;
  payrollId: string;
  staffId: string;
  staffName: string;
  amountPaise: bigint;
  month: number;
  year: number;
  notes?: string | null;
  paymentMethod?: PaymentMethod;
}) {
  if (input.amountPaise <= BigInt(0)) return null;

  const categoryId = await staffCategoryId(input.organizationId);
  return createShopExpenseWithLinks(
    prisma,
    {
      organizationId: input.organizationId,
      categoryId,
      expenseDate: new Date(),
      title: `Salary — ${input.staffName} (${input.month}/${input.year})`,
      description: input.notes?.trim() || `Payroll payment`,
      amountPaise: input.amountPaise,
      paymentMethod: input.paymentMethod ?? "CASH",
      paidBy: input.staffName,
      expenseType: "MONTHLY",
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    },
    { staffId: input.staffId, payrollId: input.payrollId }
  );
}
