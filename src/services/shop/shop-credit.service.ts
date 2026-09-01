import type { InvoicePaymentStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { ensureShopExtendedSchema } from "@/lib/shop/schema/ensure-shop-extended-schema";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";
import { lineCostPaise } from "@/lib/shop/inventory/inventory-costing";
import type { ShopSaleItem } from "./shop.service";

function deriveInvoicePaymentStatus(
  totalPaise: bigint,
  paidPaise: bigint
): InvoicePaymentStatus {
  if (paidPaise <= BigInt(0)) return "UNPAID";
  if (paidPaise >= totalPaise) return "PAID";
  return "PARTIAL";
}

export async function computeSaleCostPaise(
  organizationId: string,
  items: ShopSaleItem[]
): Promise<{ totalCostPaise: bigint; itemsWithCost: Array<ShopSaleItem & { costPaisePerUnit?: number }> }> {
  let totalCostPaise = BigInt(0);
  const itemsWithCost: Array<ShopSaleItem & { costPaisePerUnit?: number }> = [];

  const inventoryIds = items
    .map((i) => i.inventoryItemId)
    .filter((id): id is string => !!id);

  const inventoryMap = new Map<string, { costPaise: bigint | null }>();
  if (inventoryIds.length > 0) {
    const rows = await prisma.inventoryItem.findMany({
      where: { organizationId, id: { in: inventoryIds } },
      select: { id: true, costPaise: true },
    });
    for (const row of rows) inventoryMap.set(row.id, { costPaise: row.costPaise });
  }

  for (const item of items) {
    const costPaise =
      item.inventoryItemId && inventoryMap.has(item.inventoryItemId)
        ? inventoryMap.get(item.inventoryItemId)!.costPaise ?? BigInt(0)
        : item.costPaisePerUnit != null
          ? rupeesToPaise(item.costPaisePerUnit)
          : BigInt(0);
    const lineCost = lineCostPaise(costPaise, item.qty);
    totalCostPaise += lineCost;
    itemsWithCost.push({
      ...item,
      costPaisePerUnit: Number(costPaise) / 100,
    });
  }

  return { totalCostPaise, itemsWithCost };
}

export async function resolveOrCreateCreditAccount(input: {
  organizationId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  await ensureShopExtendedSchema();
  await requireModule(input.organizationId, "shop_udhaar");
  const db = input.tx ?? prisma;

  const phone = input.customerPhone?.trim() || null;
  const name = input.customerName?.trim() || "Walk-in customer";

  if (input.customerId) {
    const byCustomer = await db.customerCredit.findFirst({
      where: { organizationId: input.organizationId, shopCustomerId: input.customerId },
    });
    if (byCustomer) return byCustomer;
  }

  if (phone) {
    const byPhone = await db.customerCredit.findFirst({
      where: { organizationId: input.organizationId, phone },
    });
    if (byPhone) {
      if (input.customerId && !byPhone.shopCustomerId) {
        return db.customerCredit.update({
          where: { id: byPhone.id },
          data: { shopCustomerId: input.customerId },
        });
      }
      return byPhone;
    }
  }

  return db.customerCredit.create({
    data: {
      organizationId: input.organizationId,
      shopCustomerId: input.customerId ?? null,
      customerName: name,
      phone,
      balancePaise: BigInt(0),
    },
  });
}

export async function recordCreditFromSale(input: {
  organizationId: string;
  userId: string;
  shopSaleId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  totalPaise: bigint;
  paidPaise: bigint;
  paymentMethod?: PaymentMethod;
  /** When provided, writes join the caller's transaction and audit is skipped (caller audits post-commit). */
  tx?: Prisma.TransactionClient;
}) {
  const creditAmount = input.totalPaise - input.paidPaise;
  if (creditAmount <= BigInt(0)) return null;

  const account = await resolveOrCreateCreditAccount({ ...input, tx: input.tx });
  const newBalance = account.balancePaise + creditAmount;
  const newPurchases = account.totalPurchasesPaise + input.totalPaise;

  if (
    account.creditLimitPaise != null &&
    newBalance > account.creditLimitPaise
  ) {
    throw new Error("Credit limit exceeded for this customer");
  }

  if (input.tx) {
    const updated = await input.tx.customerCredit.update({
      where: { id: account.id },
      data: {
        balancePaise: newBalance,
        totalPurchasesPaise: newPurchases,
      },
    });
    await input.tx.customerCreditEntry.create({
      data: {
        organizationId: input.organizationId,
        creditId: account.id,
        shopSaleId: input.shopSaleId,
        type: "SALE",
        amountPaise: creditAmount,
        balanceAfterPaise: newBalance,
        paymentMethod: input.paymentMethod ?? "CREDIT",
        createdById: input.userId,
      },
    });
    return updated;
  }

  const [updated] = await prisma.$transaction([
    prisma.customerCredit.update({
      where: { id: account.id },
      data: {
        balancePaise: newBalance,
        totalPurchasesPaise: newPurchases,
      },
    }),
    prisma.customerCreditEntry.create({
      data: {
        organizationId: input.organizationId,
        creditId: account.id,
        shopSaleId: input.shopSaleId,
        type: "SALE",
        amountPaise: creditAmount,
        balanceAfterPaise: newBalance,
        paymentMethod: input.paymentMethod ?? "CREDIT",
        createdById: input.userId,
      },
    }),
  ]);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.credit.sale_recorded",
    entityType: "CustomerCredit",
    entityId: account.id,
    after: { saleId: input.shopSaleId, creditAmount: creditAmount.toString() },
  });

  return updated;
}

export async function recordCustomerPayment(input: {
  organizationId: string;
  userId: string;
  creditId: string;
  amountRupees: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  shopSaleId?: string | null;
}) {
  await requireModule(input.organizationId, "shop_udhaar");
  await ensureShopExtendedSchema();

  if (input.amountRupees <= 0) throw new Error("Payment amount must be greater than zero");

  const account = await prisma.customerCredit.findFirst({
    where: { id: input.creditId, organizationId: input.organizationId },
  });
  if (!account) throw new Error("Customer credit account not found");

  const paymentPaise = rupeesToPaise(input.amountRupees);
  const newBalance = account.balancePaise - paymentPaise;
  if (newBalance < BigInt(0)) {
    throw new Error("Payment exceeds outstanding balance");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const credit = await tx.customerCredit.update({
      where: { id: account.id },
      data: { balancePaise: newBalance },
    });

    await tx.customerCreditEntry.create({
      data: {
        organizationId: input.organizationId,
        creditId: account.id,
        shopSaleId: input.shopSaleId ?? null,
        type: "PAYMENT",
        amountPaise: -paymentPaise,
        balanceAfterPaise: newBalance,
        paymentMethod: input.paymentMethod ?? "CASH",
        notes: input.notes?.trim() || null,
        createdById: input.userId,
      },
    });

    if (input.shopSaleId) {
      const sale = await tx.shopSale.findFirst({
        where: { id: input.shopSaleId, organizationId: input.organizationId },
      });
      if (sale) {
        const newPaid = sale.paidAmountPaise + paymentPaise;
        await tx.shopSale.update({
          where: { id: sale.id },
          data: {
            paidAmountPaise: newPaid,
            paymentStatus: deriveInvoicePaymentStatus(sale.totalPaise, newPaid),
          },
        });
      }
    }

    return credit;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.credit.payment_recorded",
    entityType: "CustomerCredit",
    entityId: account.id,
    after: { paymentPaise: paymentPaise.toString(), balance: newBalance.toString() },
  });

  return updated;
}

export async function getCustomerLedger(
  organizationId: string,
  creditId: string,
  options?: { from?: Date; to?: Date }
) {
  await requireModule(organizationId, "shop_udhaar");
  await ensureShopExtendedSchema();

  const credit = await prisma.customerCredit.findFirst({
    where: { id: creditId, organizationId },
    include: {
      entries: {
        where: {
          ...(options?.from || options?.to
            ? {
                createdAt: {
                  ...(options.from ? { gte: options.from } : {}),
                  ...(options.to ? { lte: options.to } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          shopSale: {
            select: {
              id: true,
              billNumber: true,
              totalPaise: true,
              paidAmountPaise: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
          createdBy: { select: { name: true } },
        },
      },
    },
  });
  if (!credit) throw new Error("Customer not found");

  const outstandingSales = await prisma.shopSale.findMany({
    where: {
      organizationId,
      customerId: credit.shopCustomerId ?? undefined,
      paymentStatus: { in: ["PARTIAL", "UNPAID"] },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      billNumber: true,
      totalPaise: true,
      paidAmountPaise: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  return {
    credit: {
      id: credit.id,
      customerName: credit.customerName,
      phone: credit.phone,
      balancePaise: credit.balancePaise,
      totalPurchasesPaise: credit.totalPurchasesPaise,
      creditLimitPaise: credit.creditLimitPaise,
    },
    entries: credit.entries,
    outstandingSales,
  };
}

export async function listCustomerCreditsEnhanced(organizationId: string, search?: string) {
  await requireModule(organizationId, "shop_udhaar");
  await ensureShopExtendedSchema();

  return prisma.customerCredit.findMany({
    where: {
      organizationId,
      ...(search?.trim()
        ? {
            OR: [
              { customerName: { contains: search.trim() } },
              { phone: { contains: search.trim() } },
            ],
          }
        : {}),
    },
    orderBy: { customerName: "asc" },
  });
}

export async function getTotalOutstandingCredit(organizationId: string) {
  await ensureShopExtendedSchema();
  const agg = await prisma.customerCredit.aggregate({
    where: { organizationId, balancePaise: { gt: 0 } },
    _sum: { balancePaise: true },
  });
  return (agg._sum.balancePaise ?? BigInt(0)).toString();
}

export { deriveInvoicePaymentStatus };
