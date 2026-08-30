import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod, Prisma, ShopExpenseType } from "@prisma/client";
import { ensureShopExtendedSchema } from "@/lib/shop/ensure-shop-extended-schema";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type ShopExpenseStaffLinks = {
  staffId?: string | null;
  staffAdvanceId?: string | null;
  payrollId?: string | null;
};

export async function applyShopExpenseStaffLinks(
  client: DbClient,
  expenseId: string,
  links: ShopExpenseStaffLinks
) {
  await ensureShopExtendedSchema();
  const data: Prisma.ShopExpenseUpdateInput = {};
  if (links.staffId !== undefined) data.staffId = links.staffId;
  if (links.staffAdvanceId !== undefined) data.staffAdvanceId = links.staffAdvanceId;
  if (links.payrollId !== undefined) data.payrollId = links.payrollId;
  if (Object.keys(data).length === 0) return;

  await client.shopExpense.update({
    where: { id: expenseId },
    data,
  });
}

export async function setStaffAdvanceShopExpenseId(
  client: DbClient,
  advanceId: string,
  shopExpenseId: string
) {
  await ensureShopExtendedSchema();
  await client.staffAdvance.update({
    where: { id: advanceId },
    data: { shopExpenseId },
  });
}

export async function setPayrollShopExpenseId(
  client: DbClient,
  payrollId: string,
  shopExpenseId: string | null
) {
  await ensureShopExtendedSchema();
  await client.staffPayroll.update({
    where: { id: payrollId },
    data: { shopExpenseId },
  });
}

export async function getPayrollShopExpenseId(payrollId: string): Promise<string | null> {
  await ensureShopExtendedSchema();
  const row = await prisma.staffPayroll.findUnique({
    where: { id: payrollId },
    select: { shopExpenseId: true },
  });
  return row?.shopExpenseId ?? null;
}

export async function createShopExpenseWithLinks(
  client: DbClient,
  data: {
    organizationId: string;
    categoryId: string;
    expenseDate: Date;
    title: string;
    description: string | null;
    amountPaise: bigint;
    paymentMethod: PaymentMethod;
    paidBy: string | null;
    expenseType: ShopExpenseType;
    notes: string | null;
    createdById: string;
  },
  links?: ShopExpenseStaffLinks
) {
  const expense = await client.shopExpense.create({ data });
  if (links) {
    await applyShopExpenseStaffLinks(client, expense.id, links);
  }
  return expense;
}

export async function createShopPurchasePaymentRecord(
  client: DbClient,
  data: {
    organizationId: string;
    purchaseId: string;
    amountPaise: bigint;
    paymentMethod: PaymentMethod;
    notes: string | null;
    createdById: string;
  }
) {
  await ensureShopExtendedSchema();
  return client.shopPurchasePayment.create({
    data: {
      organizationId: data.organizationId,
      purchaseId: data.purchaseId,
      amountPaise: data.amountPaise,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      createdById: data.createdById,
    },
  });
}
