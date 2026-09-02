import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isInfiniteStock } from "@/lib/shop/inventory/inventory";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopBranchSchema } from "@/lib/shop/schema/ensure-shop-branch-schema";
import { createAuditLog } from "@/services/shared/audit.service";

export async function transferStockBetweenBranches(input: {
  organizationId: string;
  userId: string;
  fromBranchId: string;
  toBranchId: string;
  inventoryItemId: string;
  quantity: number;
}) {
  await requireModule(input.organizationId, "shop_inventory");
  await ensureShopBranchSchema(input.organizationId);

  const qty = input.quantity;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Transfer quantity must be greater than zero");
  }
  if (input.fromBranchId === input.toBranchId) {
    throw new Error("Source and destination branch must differ");
  }

  const [fromBranch, toBranch] = await Promise.all([
    prisma.shopBranch.findFirst({
      where: {
        id: input.fromBranchId,
        organizationId: input.organizationId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
    prisma.shopBranch.findFirst({
      where: {
        id: input.toBranchId,
        organizationId: input.organizationId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
  ]);
  if (!fromBranch) throw new Error("Source branch not found or inactive");
  if (!toBranch) throw new Error("Destination branch not found or inactive");

  const source = await prisma.inventoryItem.findFirst({
    where: {
      id: input.inventoryItemId,
      organizationId: input.organizationId,
      branchId: input.fromBranchId,
    },
  });
  if (!source) throw new Error("Inventory item not found at source branch");
  if (isInfiniteStock(source.quantity)) {
    throw new Error("Cannot transfer unlimited-stock items");
  }
  if (source.quantity < qty) {
    throw new Error(
      `Insufficient stock at ${fromBranch.name} (available ${source.quantity}, need ${qty})`
    );
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const deducted = await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET "quantity" = "quantity" - ${qty},
          "updatedAt" = ${now}
      WHERE "id" = ${source.id}
        AND "organizationId" = ${input.organizationId}
        AND "branchId" = ${input.fromBranchId}
        AND "quantity" >= ${qty}
    `;
    if (deducted === 0) {
      throw new Error(`Insufficient stock for "${source.name}" at source branch`);
    }

    let dest = await tx.inventoryItem.findFirst({
      where: {
        organizationId: input.organizationId,
        branchId: input.toBranchId,
        ...(source.productId
          ? { productId: source.productId, size: source.size, color: source.color, variantLabel: source.variantLabel }
          : source.barcode
            ? { barcode: source.barcode }
            : { name: source.name, size: source.size, color: source.color, variantLabel: source.variantLabel }),
      },
    });

    if (!dest) {
      dest = await tx.inventoryItem.create({
        data: {
          organizationId: source.organizationId,
          branchId: input.toBranchId,
          productId: source.productId,
          sku: source.sku,
          size: source.size,
          color: source.color,
          variantLabel: source.variantLabel,
          barcode: source.barcode,
          name: source.name,
          description: source.description,
          unit: source.unit,
          quantity: 0,
          reorderLevel: source.reorderLevel,
          costPaise: source.costPaise,
          sellPaise: source.sellPaise,
          supplierName: source.supplierName,
          batchNo: source.batchNo,
          expiryDate: source.expiryDate,
          attributes: source.attributes as Prisma.InputJsonValue,
          sectorMeta: source.sectorMeta as Prisma.InputJsonValue,
        },
      });
    }

    const updatedDest = await tx.inventoryItem.update({
      where: { id: dest.id },
      data: { quantity: { increment: qty } },
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "shop.inventory.branch_transfer",
      entityType: "InventoryItem",
      entityId: source.id,
      after: {
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        inventoryItemId: source.id,
        destinationItemId: updatedDest.id,
        quantity: qty,
      },
    });

    return {
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      sourceItemId: source.id,
      destinationItemId: updatedDest.id,
      quantity: qty,
      sourceQuantity: source.quantity - qty,
      destinationQuantity: updatedDest.quantity,
    };
  });
}
