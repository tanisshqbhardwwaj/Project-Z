import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod, ShopExpenseType } from "@prisma/client";
import { ensureShopExtendedSchema } from "@/lib/shop/ensure-shop-extended-schema";

type DbClient = Pick<typeof prisma, "$executeRawUnsafe">;

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
  const parts: string[] = [];
  const values: unknown[] = [];

  if (links.staffId !== undefined) {
    parts.push(`"staffId" = ?`);
    values.push(links.staffId);
  }
  if (links.staffAdvanceId !== undefined) {
    parts.push(`"staffAdvanceId" = ?`);
    values.push(links.staffAdvanceId);
  }
  if (links.payrollId !== undefined) {
    parts.push(`"payrollId" = ?`);
    values.push(links.payrollId);
  }
  if (parts.length === 0) return;

  values.push(expenseId);
  await client.$executeRawUnsafe(
    `UPDATE "ShopExpense" SET ${parts.join(", ")} WHERE "id" = ?`,
    ...values
  );
}

export async function setStaffAdvanceShopExpenseId(
  client: DbClient,
  advanceId: string,
  shopExpenseId: string
) {
  await ensureShopExtendedSchema();
  await client.$executeRawUnsafe(
    `UPDATE "StaffAdvance" SET "shopExpenseId" = ? WHERE "id" = ?`,
    shopExpenseId,
    advanceId
  );
}

export async function setPayrollShopExpenseId(
  client: DbClient,
  payrollId: string,
  shopExpenseId: string | null
) {
  await ensureShopExtendedSchema();
  await client.$executeRawUnsafe(
    `UPDATE "StaffPayroll" SET "shopExpenseId" = ? WHERE "id" = ?`,
    shopExpenseId,
    payrollId
  );
}

export async function getPayrollShopExpenseId(payrollId: string): Promise<string | null> {
  await ensureShopExtendedSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ shopExpenseId: string | null }>>(
    `SELECT "shopExpenseId" FROM "StaffPayroll" WHERE "id" = ? LIMIT 1`,
    payrollId
  );
  return rows[0]?.shopExpenseId ?? null;
}

export async function createShopExpenseWithLinks(
  client: DbClient & {
    shopExpense: {
      create: (args: {
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
        };
      }) => Promise<{ id: string }>;
    };
  },
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
  client: DbClient & {
    shopPurchasePayment?: {
      create: (args: {
        data: {
          organizationId: string;
          purchaseId: string;
          amountPaise: bigint;
          paymentMethod: PaymentMethod;
          notes: string | null;
          createdById: string;
        };
      }) => Promise<{ id: string }>;
    };
  },
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

  if (client.shopPurchasePayment?.create) {
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

  const id = crypto.randomUUID();
  await client.$executeRawUnsafe(
    `INSERT INTO "ShopPurchasePayment" ("id", "organizationId", "purchaseId", "amountPaise", "paymentMethod", "notes", "createdById", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    id,
    data.organizationId,
    data.purchaseId,
    data.amountPaise,
    data.paymentMethod,
    data.notes,
    data.createdById
  );
  return { id };
}
