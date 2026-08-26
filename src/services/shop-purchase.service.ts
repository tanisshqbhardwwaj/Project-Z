import type {
  PaymentMethod,
  PurchasePaymentStatus,
  PurchaseRecordStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory";
import {
  computeWeightedAverageCostPaise,
  reverseWeightedAverageCostPaise,
} from "@/lib/shop/inventory-costing";
import { ensureShopExtendedSchema } from "@/lib/shop/ensure-shop-extended-schema";
import { createShopPurchasePaymentRecord } from "@/lib/shop/staff-expense-links";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "./audit.service";
import { scheduleShopInventoryAlertSync } from "./shop-notification.service";
import { toCursorPage, type CursorPage } from "@/lib/api/cursor-page";

export type PurchaseLineInput = {
  inventoryItemId?: string | null;
  productName: string;
  quantity: number;
  rateRupees: number;
};

function derivePaymentStatus(
  totalPaise: bigint,
  paidPaise: bigint
): PurchasePaymentStatus {
  if (paidPaise <= BigInt(0)) return "UNPAID";
  if (paidPaise >= totalPaise) return "PAID";
  return "PARTIAL";
}

function computePurchaseTotals(input: {
  lines: PurchaseLineInput[];
  discountRupees?: number;
  taxRupees?: number;
  extraChargesRupees?: number;
}) {
  let subtotalPaise = BigInt(0);
  const lineTotals = input.lines.map((line) => {
    const lineTotalPaise = rupeesToPaise(line.rateRupees * line.quantity);
    subtotalPaise += lineTotalPaise;
    return { ...line, lineTotalPaise };
  });
  const discountPaise = rupeesToPaise(input.discountRupees ?? 0);
  const taxPaise = rupeesToPaise(input.taxRupees ?? 0);
  const extraChargesPaise = rupeesToPaise(input.extraChargesRupees ?? 0);
  const totalPaise = subtotalPaise - discountPaise + taxPaise + extraChargesPaise;
  if (totalPaise <= BigInt(0)) throw new Error("Purchase total must be greater than zero");
  return { lineTotals, subtotalPaise, discountPaise, taxPaise, extraChargesPaise, totalPaise };
}

async function applyPurchaseInventoryEffects(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizationId: string,
  lines: Array<{ inventoryItemId?: string | null; quantity: number; ratePaise: bigint }>,
  direction: 1 | -1
) {
  for (const line of lines) {
    if (!line.inventoryItemId || line.quantity <= 0) continue;
    const item = await tx.inventoryItem.findFirst({
      where: { id: line.inventoryItemId, organizationId },
    });
    if (!item) throw new Error("Inventory item not found");

    const deltaQty = direction * line.quantity;
    if (direction === -1) {
      if (!isInfiniteStock(item.quantity) && item.quantity < line.quantity) {
        throw new Error(`Not enough stock to reverse purchase for "${item.name}"`);
      }
      const newQty = isInfiniteStock(item.quantity)
        ? item.quantity
        : item.quantity - line.quantity;
      const newCost = reverseWeightedAverageCostPaise({
        currentQty: item.quantity,
        currentCostPaise: item.costPaise,
        removeQty: line.quantity,
        removedRatePaise: line.ratePaise,
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: newQty,
          ...(newCost != null ? { costPaise: newCost } : {}),
        },
      });
    } else {
      const newQty = isInfiniteStock(item.quantity)
        ? item.quantity
        : item.quantity + line.quantity;
      const newCost = computeWeightedAverageCostPaise({
        currentQty: item.quantity,
        currentCostPaise: item.costPaise,
        addQty: line.quantity,
        purchaseRatePaise: line.ratePaise,
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: newQty, costPaise: newCost },
      });
    }
  }
}

export async function listShopSuppliers(organizationId: string, search?: string) {
  await ensureShopExtendedSchema();
  return prisma.shopSupplier.findMany({
    where: {
      organizationId,
      ...(search?.trim()
        ? { name: { contains: search.trim() } }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function createShopSupplier(input: {
  organizationId: string;
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  notes?: string | null;
}) {
  await ensureShopExtendedSchema();
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Supplier name is required");

  const supplier = await prisma.shopSupplier.create({
    data: {
      organizationId: input.organizationId,
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      gstNumber: input.gstNumber?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.supplier.created",
    entityType: "ShopSupplier",
    entityId: supplier.id,
    after: supplier,
  });

  return supplier;
}

export async function listShopPurchases(input: {
  organizationId: string;
  search?: string;
  supplierId?: string;
  paymentStatus?: PurchasePaymentStatus;
  status?: PurchaseRecordStatus;
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
    status: input.status ?? "ACTIVE",
    ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
    ...(input.from || input.to
      ? {
          purchaseDate: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
    ...(input.search?.trim()
      ? {
          OR: [
            { billNumber: { contains: input.search.trim() } },
            { supplier: { name: { contains: input.search.trim() } } },
          ],
        }
      : {}),
  };

  const items = await prisma.shopPurchase.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { purchaseDate: input.sort === "oldest" ? "asc" : "desc" },
    take: pageSize + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  return toCursorPage(items, pageSize);
}

export async function getShopPurchase(organizationId: string, purchaseId: string) {
  await ensureShopExtendedSchema();
  const purchase = await prisma.shopPurchase.findFirst({
    where: { id: purchaseId, organizationId },
    include: {
      supplier: true,
      items: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!purchase) throw new Error("Purchase not found");
  const payments = await listPurchasePayments(organizationId, purchaseId);
  return { ...purchase, payments };
}

export async function createShopPurchase(input: {
  organizationId: string;
  userId: string;
  supplierId: string;
  purchaseDate: Date;
  billNumber?: string | null;
  lines: PurchaseLineInput[];
  discountRupees?: number;
  taxRupees?: number;
  extraChargesRupees?: number;
  paidRupees?: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  idempotencyKey?: string | null;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureShopExtendedSchema();

  if (input.lines.length === 0) throw new Error("Add at least one product");

  if (input.idempotencyKey?.trim()) {
    const existing = await prisma.shopPurchase.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey.trim(),
      },
    });
    if (existing) return getShopPurchase(input.organizationId, existing.id);
  }

  const supplier = await prisma.shopSupplier.findFirst({
    where: { id: input.supplierId, organizationId: input.organizationId },
  });
  if (!supplier) throw new Error("Supplier not found");

  const totals = computePurchaseTotals(input);
  const paidPaise = rupeesToPaise(input.paidRupees ?? Number(totals.totalPaise) / 100);
  const paymentStatus = derivePaymentStatus(totals.totalPaise, paidPaise);

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.shopPurchase.create({
      data: {
        organizationId: input.organizationId,
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate,
        billNumber: input.billNumber?.trim() || null,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        taxPaise: totals.taxPaise,
        extraChargesPaise: totals.extraChargesPaise,
        totalPaise: totals.totalPaise,
        paidAmountPaise: paidPaise,
        paymentStatus,
        paymentMethod: input.paymentMethod ?? "CASH",
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey?.trim() || null,
        createdById: input.userId,
        items: {
          create: totals.lineTotals.map((line) => ({
            inventoryItemId: line.inventoryItemId || null,
            productName: line.productName.trim(),
            quantity: line.quantity,
            ratePaise: rupeesToPaise(line.rateRupees),
            lineTotalPaise: line.lineTotalPaise,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    await applyPurchaseInventoryEffects(
      tx,
      input.organizationId,
      totals.lineTotals.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        quantity: l.quantity,
        ratePaise: rupeesToPaise(l.rateRupees),
      })),
      1
    );

    if (paidPaise > BigInt(0)) {
      await createShopPurchasePaymentRecord(tx, {
        organizationId: input.organizationId,
        purchaseId: created.id,
        amountPaise: paidPaise,
        paymentMethod: input.paymentMethod ?? "CASH",
        notes: "Initial payment on purchase entry",
        createdById: input.userId,
      });
    }

    return created;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.purchase.created",
    entityType: "ShopPurchase",
    entityId: purchase.id,
    after: purchase,
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return purchase;
}

export async function updateShopPurchase(input: {
  organizationId: string;
  userId: string;
  purchaseId: string;
  supplierId?: string;
  purchaseDate?: Date;
  billNumber?: string | null;
  lines?: PurchaseLineInput[];
  discountRupees?: number;
  taxRupees?: number;
  extraChargesRupees?: number;
  paidRupees?: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureShopExtendedSchema();

  const existing = await getShopPurchase(input.organizationId, input.purchaseId);
  if (existing.status === "CANCELLED") throw new Error("Cannot edit a cancelled purchase");

  const lines = input.lines ?? existing.items.map((i) => ({
    inventoryItemId: i.inventoryItemId,
    productName: i.productName,
    quantity: i.quantity,
    rateRupees: Number(i.ratePaise) / 100,
  }));

  const totals = computePurchaseTotals({
    lines,
    discountRupees: input.discountRupees ?? Number(existing.discountPaise) / 100,
    taxRupees: input.taxRupees ?? Number(existing.taxPaise) / 100,
    extraChargesRupees:
      input.extraChargesRupees ?? Number(existing.extraChargesPaise) / 100,
  });

  const paidPaise =
    input.paidRupees != null
      ? rupeesToPaise(input.paidRupees)
      : existing.paidAmountPaise;
  const paymentStatus = derivePaymentStatus(totals.totalPaise, paidPaise);

  const updated = await prisma.$transaction(async (tx) => {
    await applyPurchaseInventoryEffects(
      tx,
      input.organizationId,
      existing.items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        quantity: i.quantity,
        ratePaise: i.ratePaise,
      })),
      -1
    );

    await tx.shopPurchaseItem.deleteMany({ where: { purchaseId: existing.id } });

    const purchase = await tx.shopPurchase.update({
      where: { id: existing.id },
      data: {
        ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        ...(input.purchaseDate ? { purchaseDate: input.purchaseDate } : {}),
        billNumber:
          input.billNumber !== undefined
            ? input.billNumber?.trim() || null
            : existing.billNumber,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        taxPaise: totals.taxPaise,
        extraChargesPaise: totals.extraChargesPaise,
        totalPaise: totals.totalPaise,
        paidAmountPaise: paidPaise,
        paymentStatus,
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        items: {
          create: totals.lineTotals.map((line) => ({
            inventoryItemId: line.inventoryItemId || null,
            productName: line.productName.trim(),
            quantity: line.quantity,
            ratePaise: rupeesToPaise(line.rateRupees),
            lineTotalPaise: line.lineTotalPaise,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    await applyPurchaseInventoryEffects(
      tx,
      input.organizationId,
      totals.lineTotals.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        quantity: l.quantity,
        ratePaise: rupeesToPaise(l.rateRupees),
      })),
      1
    );

    return purchase;
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.purchase.updated",
    entityType: "ShopPurchase",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return updated;
}

export async function cancelShopPurchase(input: {
  organizationId: string;
  userId: string;
  purchaseId: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureShopExtendedSchema();

  const existing = await getShopPurchase(input.organizationId, input.purchaseId);
  if (existing.status === "CANCELLED") throw new Error("Purchase already cancelled");

  const cancelled = await prisma.$transaction(async (tx) => {
    await applyPurchaseInventoryEffects(
      tx,
      input.organizationId,
      existing.items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        quantity: i.quantity,
        ratePaise: i.ratePaise,
      })),
      -1
    );

    return tx.shopPurchase.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
      include: { items: true, supplier: true },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.purchase.cancelled",
    entityType: "ShopPurchase",
    entityId: cancelled.id,
    before: existing,
    after: cancelled,
  });

  scheduleShopInventoryAlertSync(input.organizationId);
  return cancelled;
}

export async function getPurchaseSummary(
  organizationId: string,
  from: Date,
  to: Date
) {
  await ensureShopExtendedSchema();
  const agg = await prisma.shopPurchase.aggregate({
    where: {
      organizationId,
      status: "ACTIVE",
      purchaseDate: { gte: from, lte: to },
    },
    _sum: { totalPaise: true },
    _count: true,
  });
  return {
    purchaseCount: agg._count,
    totalPaise: (agg._sum.totalPaise ?? BigInt(0)).toString(),
  };
}

export async function listPurchasePayments(organizationId: string, purchaseId: string) {
  await ensureShopExtendedSchema();
  const delegate = (
    prisma as unknown as {
      shopPurchasePayment?: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            amountPaise: bigint;
            paymentMethod: string;
            notes: string | null;
            createdAt: Date;
            createdBy: { id: string; name: string };
          }>
        >;
      };
    }
  ).shopPurchasePayment;

  if (delegate?.findMany) {
    return delegate.findMany({
      where: { organizationId, purchaseId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      amountPaise: bigint;
      paymentMethod: string;
      notes: string | null;
      createdAt: Date;
      createdById: string;
      createdByName: string;
    }>
  >(
    `SELECT p."id", p."amountPaise", p."paymentMethod", p."notes", p."createdAt", p."createdById", u."name" AS "createdByName"
     FROM "ShopPurchasePayment" p
     JOIN "User" u ON u."id" = p."createdById"
     WHERE p."organizationId" = ? AND p."purchaseId" = ?
     ORDER BY p."createdAt" DESC`,
    organizationId,
    purchaseId
  ).then((rows) =>
    rows.map((row) => ({
      id: row.id,
      amountPaise: row.amountPaise,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      createdAt: row.createdAt,
      createdBy: { id: row.createdById, name: row.createdByName },
    }))
  );
}

export async function recordPurchasePayment(input: {
  organizationId: string;
  userId: string;
  purchaseId: string;
  amountRupees: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureShopExtendedSchema();

  if (input.amountRupees <= 0) throw new Error("Payment amount must be greater than zero");

  const purchase = await getShopPurchase(input.organizationId, input.purchaseId);
  if (purchase.status === "CANCELLED") throw new Error("Cannot pay a cancelled purchase");

  const paymentPaise = rupeesToPaise(input.amountRupees);
  const newPaid = purchase.paidAmountPaise + paymentPaise;
  if (newPaid > purchase.totalPaise) {
    throw new Error("Payment exceeds purchase total");
  }

  const paymentStatus = derivePaymentStatus(purchase.totalPaise, newPaid);

  const updated = await prisma.$transaction(async (tx) => {
    await createShopPurchasePaymentRecord(tx, {
      organizationId: input.organizationId,
      purchaseId: purchase.id,
      amountPaise: paymentPaise,
      paymentMethod: input.paymentMethod ?? purchase.paymentMethod,
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    });

    const purchaseRow = await tx.shopPurchase.update({
      where: { id: purchase.id },
      data: {
        paidAmountPaise: newPaid,
        paymentStatus,
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    const payments = await listPurchasePayments(input.organizationId, purchase.id);
    return { ...purchaseRow, payments };
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.purchase.payment_recorded",
    entityType: "ShopPurchase",
    entityId: purchase.id,
    after: { paymentPaise: paymentPaise.toString(), paidTotal: newPaid.toString() },
  });

  return updated;
}
