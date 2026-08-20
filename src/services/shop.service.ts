import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod } from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory";
import { generateShopBarcode, normalizeBarcode } from "@/lib/shop/barcode";
import { nextShopBillNumber } from "@/lib/shop/bill-number";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "./audit.service";

export type ShopSaleItem = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  barcode?: string;
};

export async function getShopSale(organizationId: string, saleId: string) {
  await requireModule(organizationId, "shop_sales");
  const sale = await prisma.shopSale.findFirst({
    where: { id: saleId, organizationId },
    include: {
      organization: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!sale) throw new Error("Sale not found");
  return sale;
}

export async function lookupInventoryByBarcode(
  organizationId: string,
  barcode: string
) {
  await requireModule(organizationId, "shop_inventory");
  const code = normalizeBarcode(barcode);
  if (!code) throw new Error("Barcode is required");

  const item = await prisma.inventoryItem.findFirst({
    where: { organizationId, barcode: code },
  });
  if (!item) throw new Error(`No product found for barcode ${code}`);
  return item;
}

export async function listShopSales(organizationId: string) {
  await requireModule(organizationId, "shop_sales");
  return prisma.shopSale.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createShopSale(input: {
  organizationId: string;
  createdById: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  salesBoyName?: string | null;
  billNumber?: string | null;
  issueInvoice?: boolean;
  totalRupees: number;
  gstRupees?: number;
  paymentMethod?: PaymentMethod;
  items: ShopSaleItem[];
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_sales");

  const totalPaise = rupeesToPaise(input.totalRupees);
  if (totalPaise <= BigInt(0)) throw new Error("Sale total must be greater than zero");

  const deductions = new Map<string, number>();
  for (const item of input.items) {
    if (item.inventoryItemId) {
      deductions.set(
        item.inventoryItemId,
        (deductions.get(item.inventoryItemId) ?? 0) + item.qty
      );
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    if (deductions.size > 0) {
      const inventoryIds = [...deductions.keys()];
      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          id: { in: inventoryIds },
          organizationId: input.organizationId,
        },
      });

      if (inventoryItems.length !== inventoryIds.length) {
        throw new Error("One or more inventory items were not found");
      }

      for (const inv of inventoryItems) {
        const deductQty = deductions.get(inv.id)!;
        if (isInfiniteStock(inv.quantity)) continue;
        if (inv.quantity < deductQty) {
          throw new Error(
            `Not enough stock for "${inv.name}" (have ${inv.quantity}, need ${deductQty})`
          );
        }
      }

      for (const inv of inventoryItems) {
        const deductQty = deductions.get(inv.id)!;
        if (isInfiniteStock(inv.quantity)) continue;
        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - deductQty },
        });
      }
    }

    return tx.shopSale.create({
      data: {
        organizationId: input.organizationId,
        createdById: input.createdById,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        customerGstin: input.customerGstin?.trim() || null,
        salesBoyName: input.salesBoyName?.trim() || null,
        billNumber: input.issueInvoice
          ? input.billNumber?.trim() || (await nextShopBillNumber(tx, input.organizationId))
          : input.billNumber?.trim() || null,
        issueInvoice: Boolean(input.issueInvoice),
        totalPaise,
        gstPaise: rupeesToPaise(input.gstRupees ?? 0),
        paymentMethod: input.paymentMethod ?? "CASH",
        itemsJson: input.items,
        notes: input.notes?.trim() || null,
      },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "shop.sale.created",
    entityType: "ShopSale",
    entityId: sale.id,
    after: sale,
  });

  return sale;
}

export async function listInventoryItems(organizationId: string) {
  await requireModule(organizationId, "shop_inventory");
  return prisma.inventoryItem.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createInventoryItem(input: {
  organizationId: string;
  name: string;
  description?: string | null;
  size?: string | null;
  barcode?: string | null;
  unit?: string;
  quantity?: number;
  reorderLevel?: number;
  costRupees?: number | null;
  sellRupees?: number | null;
  autoBarcode?: boolean;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const name = input.name.trim();
  if (name.length < 1) throw new Error("Item name is required");

  let barcode = input.barcode ? normalizeBarcode(input.barcode) : null;
  if (!barcode && input.autoBarcode !== false) {
    barcode = generateShopBarcode(input.organizationId.slice(-6));
  }
  if (barcode) {
    const clash = await prisma.inventoryItem.findFirst({
      where: { organizationId: input.organizationId, barcode },
    });
    if (clash) throw new Error("This barcode is already used by another product");
  }

  return prisma.inventoryItem.create({
    data: {
      organizationId: input.organizationId,
      name,
      description: input.description?.trim() || null,
      size: input.size?.trim() || null,
      barcode,
      unit: input.unit?.trim() || "pcs",
      quantity: input.quantity ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
      costPaise:
        input.costRupees != null && input.costRupees > 0
          ? rupeesToPaise(input.costRupees)
          : null,
      sellPaise:
        input.sellRupees != null && input.sellRupees > 0
          ? rupeesToPaise(input.sellRupees)
          : null,
    },
  });
}

export async function updateInventoryItem(input: {
  organizationId: string;
  itemId: string;
  userId: string;
  name?: string;
  description?: string | null;
  size?: string | null;
  barcode?: string | null;
  quantity?: number;
  reorderLevel?: number;
  costRupees?: number | null;
  sellRupees?: number | null;
  generateBarcode?: boolean;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Inventory item not found");

  const data: {
    name?: string;
    description?: string | null;
    size?: string | null;
    barcode?: string | null;
    quantity?: number;
    reorderLevel?: number;
    costPaise?: bigint | null;
    sellPaise?: bigint | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Item name is required");
    data.name = name;
  }
  if (input.size !== undefined) {
    data.size = input.size?.trim() || null;
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.generateBarcode) {
    let barcode = generateShopBarcode(input.organizationId.slice(-6));
    for (let attempt = 0; attempt < 3; attempt++) {
      const clash = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: input.organizationId,
          barcode,
          NOT: { id: input.itemId },
        },
      });
      if (!clash) break;
      barcode = generateShopBarcode(input.organizationId.slice(-6));
    }
    data.barcode = barcode;
  } else if (input.barcode !== undefined) {
    const barcode = input.barcode ? normalizeBarcode(input.barcode) : null;
    if (barcode) {
      const clash = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: input.organizationId,
          barcode,
          NOT: { id: input.itemId },
        },
      });
      if (clash) throw new Error("This barcode is already used by another product");
    }
    data.barcode = barcode;
  }
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.reorderLevel !== undefined) data.reorderLevel = input.reorderLevel;
  if (input.costRupees !== undefined) {
    data.costPaise =
      input.costRupees != null && input.costRupees > 0
        ? rupeesToPaise(input.costRupees)
        : null;
  }
  if (input.sellRupees !== undefined) {
    data.sellPaise =
      input.sellRupees != null && input.sellRupees > 0
        ? rupeesToPaise(input.sellRupees)
        : null;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: input.itemId },
    data,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.updated",
    entityType: "InventoryItem",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function deleteInventoryItem(input: {
  organizationId: string;
  itemId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "shop_inventory");

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Inventory item not found");

  await prisma.inventoryItem.delete({
    where: { id: input.itemId },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.inventory.deleted",
    entityType: "InventoryItem",
    entityId: input.itemId,
    before: existing,
  });
}

export async function listCustomerCredits(organizationId: string) {
  await requireModule(organizationId, "shop_udhaar");
  return prisma.customerCredit.findMany({
    where: { organizationId },
    orderBy: { customerName: "asc" },
  });
}

export async function createCustomerCredit(input: {
  organizationId: string;
  customerName: string;
  phone?: string | null;
  balanceRupees?: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_udhaar");

  const customerName = input.customerName.trim();
  if (customerName.length < 2) throw new Error("Customer name must be at least 2 characters");

  return prisma.customerCredit.create({
    data: {
      organizationId: input.organizationId,
      customerName,
      phone: input.phone?.trim() || null,
      balancePaise: rupeesToPaise(input.balanceRupees ?? 0),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function adjustCustomerCredit(input: {
  organizationId: string;
  creditId: string;
  userId: string;
  deltaRupees: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_udhaar");

  const existing = await prisma.customerCredit.findFirst({
    where: { id: input.creditId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Customer credit not found");

  const deltaPaise = rupeesToPaise(input.deltaRupees);
  const updated = await prisma.customerCredit.update({
    where: { id: input.creditId },
    data: {
      balancePaise: existing.balancePaise + deltaPaise,
      notes: input.notes?.trim() ?? existing.notes,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.udhaar.adjusted",
    entityType: "CustomerCredit",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}
