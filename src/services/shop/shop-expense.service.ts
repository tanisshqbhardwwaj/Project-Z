import type { PaymentMethod, ShopExpenseType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { ensureShopExtendedSchema } from "@/lib/shop/schema/ensure-shop-extended-schema";
import { createAuditLog } from "../shared/audit.service";
import { toCursorPage } from "@/lib/api/cursor-page";

const DEFAULT_CATEGORIES = [
  "Electricity",
  "Rent",
  "Internet",
  "Transportation",
  "Packaging",
  "Cleaning",
  "Maintenance",
  "Staff",
  "Food & Tea",
  "Delivery",
  "Miscellaneous",
];

export async function ensureDefaultShopExpenseCategories(organizationId: string) {
  await ensureShopExtendedSchema();
  const existing = await prisma.shopExpenseCategory.findMany({
    where: { organizationId },
    select: { name: true },
  });
  const names = new Set(existing.map((c) => c.name.toLowerCase()));
  for (const name of DEFAULT_CATEGORIES) {
    if (!names.has(name.toLowerCase())) {
      await prisma.shopExpenseCategory.create({
        data: { organizationId, name, isDefault: true },
      });
    }
  }
}

export async function listShopExpenseCategories(organizationId: string) {
  await ensureDefaultShopExpenseCategories(organizationId);
  return prisma.shopExpenseCategory.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createShopExpenseCategory(input: {
  organizationId: string;
  userId: string;
  name: string;
}) {
  await ensureShopExtendedSchema();
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Category name is required");

  const category = await prisma.shopExpenseCategory.create({
    data: { organizationId: input.organizationId, name },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.expense_category.created",
    entityType: "ShopExpenseCategory",
    entityId: category.id,
    after: category,
  });

  return category;
}

export async function listShopExpenses(input: {
  organizationId: string;
  search?: string;
  categoryId?: string;
  expenseType?: ShopExpenseType;
  from?: Date;
  to?: Date;
  sort?: "newest" | "oldest";
  cursor?: string;
  limit?: number;
}) {
  await ensureShopExtendedSchema();
  const pageSize = Math.min(100, Math.max(1, input.limit ?? 25));

  const where = {
    organizationId: input.organizationId,
    deletedAt: null,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.expenseType ? { expenseType: input.expenseType } : {}),
    ...(input.from || input.to
      ? {
          expenseDate: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
    ...(input.search?.trim()
      ? {
          OR: [
            { title: { contains: input.search.trim() } },
            { description: { contains: input.search.trim() } },
          ],
        }
      : {}),
  };

  const items = await prisma.shopExpense.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { expenseDate: input.sort === "oldest" ? "asc" : "desc" },
    take: pageSize + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  return toCursorPage(items, pageSize);
}

export async function getShopExpense(organizationId: string, expenseId: string) {
  await ensureShopExtendedSchema();
  const expense = await prisma.shopExpense.findFirst({
    where: { id: expenseId, organizationId, deletedAt: null },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!expense) throw new Error("Expense not found");
  return expense;
}

export async function createShopExpense(input: {
  organizationId: string;
  userId: string;
  categoryId: string;
  expenseDate: Date;
  title: string;
  description?: string | null;
  amountRupees: number;
  paymentMethod?: PaymentMethod;
  paidBy?: string | null;
  expenseType?: ShopExpenseType;
  notes?: string | null;
}) {
  await ensureShopExtendedSchema();
  if (input.amountRupees <= 0) throw new Error("Amount must be greater than zero");

  const category = await prisma.shopExpenseCategory.findFirst({
    where: { id: input.categoryId, organizationId: input.organizationId },
  });
  if (!category) throw new Error("Category not found");

  const expense = await prisma.shopExpense.create({
    data: {
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      expenseDate: input.expenseDate,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      amountPaise: rupeesToPaise(input.amountRupees),
      paymentMethod: input.paymentMethod ?? "CASH",
      paidBy: input.paidBy?.trim() || null,
      expenseType: input.expenseType ?? "DAILY",
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    },
    include: { category: true },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.expense.created",
    entityType: "ShopExpense",
    entityId: expense.id,
    after: expense,
  });

  return expense;
}

export async function updateShopExpense(input: {
  organizationId: string;
  userId: string;
  expenseId: string;
  categoryId?: string;
  expenseDate?: Date;
  title?: string;
  description?: string | null;
  amountRupees?: number;
  paymentMethod?: PaymentMethod;
  paidBy?: string | null;
  expenseType?: ShopExpenseType;
  notes?: string | null;
}) {
  await ensureShopExtendedSchema();
  const existing = await getShopExpense(input.organizationId, input.expenseId);

  const updated = await prisma.shopExpense.update({
    where: { id: existing.id },
    data: {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.expenseDate ? { expenseDate: input.expenseDate } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.amountRupees != null
        ? { amountPaise: rupeesToPaise(input.amountRupees) }
        : {}),
      ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.paidBy !== undefined ? { paidBy: input.paidBy?.trim() || null } : {}),
      ...(input.expenseType ? { expenseType: input.expenseType } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
    include: { category: true },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.expense.updated",
    entityType: "ShopExpense",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function deleteShopExpense(input: {
  organizationId: string;
  userId: string;
  expenseId: string;
}) {
  await ensureShopExtendedSchema();
  const existing = await getShopExpense(input.organizationId, input.expenseId);

  const deleted = await prisma.shopExpense.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.expense.deleted",
    entityType: "ShopExpense",
    entityId: deleted.id,
    before: existing,
    after: deleted,
  });

  return deleted;
}

export async function getExpenseSummary(
  organizationId: string,
  from: Date,
  to: Date
) {
  await ensureShopExtendedSchema();
  const [grouped, recurringAgg] = await Promise.all([
    prisma.shopExpense.groupBy({
      by: ["categoryId"],
      where: {
        organizationId,
        deletedAt: null,
        expenseDate: { gte: from, lte: to },
      },
      _sum: { amountPaise: true },
      _count: { _all: true },
    }),
    prisma.shopRecurringExpense.aggregate({
      where: { organizationId, isActive: true, deletedAt: null },
      _sum: { monthlyAmountPaise: true },
    }),
  ]);

  const categories =
    grouped.length === 0
      ? []
      : await prisma.shopExpenseCategory.findMany({
          where: { id: { in: grouped.map((row) => row.categoryId) } },
          select: { id: true, name: true },
        });
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  let totalPaise = BigInt(0);
  let expenseCount = 0;
  const byCategory = grouped.map((row) => {
    const amount = row._sum.amountPaise ?? BigInt(0);
    totalPaise += amount;
    expenseCount += row._count._all;
    return {
      categoryId: row.categoryId,
      name: nameById.get(row.categoryId) ?? "Unknown",
      totalPaise: amount.toString(),
    };
  });

  return {
    expenseCount,
    totalPaise: totalPaise.toString(),
    byCategory,
    monthlyFixedPaise: (recurringAgg._sum.monthlyAmountPaise ?? BigInt(0)).toString(),
  };
}
