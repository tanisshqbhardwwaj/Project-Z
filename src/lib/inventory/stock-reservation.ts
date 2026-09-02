import type { Prisma } from "@prisma/client";
import type { SaleLine } from "@/lib/shop/invoices/invoice-cart";
import { isInfiniteStock } from "@/lib/shop/inventory/inventory";

type Tx = Prisma.TransactionClient;

/** Aggregate cart lines by inventory item for reservation rows. */
export function reservationsFromCart(cartJson: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(cartJson)) return map;
  for (const raw of cartJson) {
    const line = raw as Partial<SaleLine>;
    const id = line.inventoryItemId?.trim();
    const qty = Number(line.qty);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return map;
}

export async function sumActiveReservedQty(
  tx: Tx,
  organizationId: string,
  inventoryItemId: string,
  excludeHeldBillId?: string
): Promise<number> {
  const now = new Date();
  const rows = await tx.inventoryStockReservation.groupBy({
    by: ["inventoryItemId"],
    where: {
      organizationId,
      inventoryItemId,
      expiresAt: { gt: now },
      heldBill: { status: "ACTIVE" },
      ...(excludeHeldBillId ? { heldBillId: { not: excludeHeldBillId } } : {}),
    },
    _sum: { quantity: true },
  });
  return rows[0]?._sum.quantity ?? 0;
}

export async function releaseReservationsForHeldBill(tx: Tx, heldBillId: string) {
  await tx.inventoryStockReservation.deleteMany({ where: { heldBillId } });
}

export async function createReservationsForHeldBill(input: {
  tx: Tx;
  organizationId: string;
  heldBillId: string;
  expiresAt: Date;
  cartJson: unknown;
}) {
  const needs = reservationsFromCart(input.cartJson);
  if (needs.size === 0) return;

  const inventoryIds = [...needs.keys()];
  const items = await input.tx.inventoryItem.findMany({
    where: {
      id: { in: inventoryIds },
      organizationId: input.organizationId,
    },
  });
  if (items.length !== inventoryIds.length) {
    throw new Error("One or more held items were not found in inventory");
  }

  for (const inv of items) {
    const qty = needs.get(inv.id)!;
    if (isInfiniteStock(inv.quantity)) continue;

    const reservedElsewhere = await sumActiveReservedQty(
      input.tx,
      input.organizationId,
      inv.id
    );
    const available = inv.quantity - reservedElsewhere;
    if (available < qty) {
      throw new Error(
        `Not enough stock to hold "${inv.name}" (available ${Math.max(0, available)}, need ${qty})`
      );
    }
  }

  await input.tx.inventoryStockReservation.createMany({
    data: inventoryIds.map((inventoryItemId) => ({
      organizationId: input.organizationId,
      inventoryItemId,
      quantity: needs.get(inventoryItemId)!,
      heldBillId: input.heldBillId,
      expiresAt: input.expiresAt,
    })),
  });
}

/** Purge reservation rows for expired or non-active held bills. */
export async function purgeStaleStockReservations(tx: Tx, organizationId: string) {
  const now = new Date();
  await tx.inventoryStockReservation.deleteMany({
    where: {
      organizationId,
      OR: [
        { expiresAt: { lte: now } },
        { heldBill: { status: { not: "ACTIVE" } } },
      ],
    },
  });
}

/**
 * Decrement inventory only when physical stock covers the sale plus active holds.
 * Returns false when another register sold or held the last units first.
 */
export async function atomicDeductInventory(input: {
  tx: Tx;
  organizationId: string;
  inventoryItemId: string;
  deductQty: number;
  branchId?: string | null;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  if (input.branchId != null) {
    const result = await input.tx.$executeRaw`
      UPDATE "InventoryItem"
      SET "quantity" = "quantity" - ${input.deductQty},
          "updatedAt" = ${now}
      WHERE "id" = ${input.inventoryItemId}
        AND "organizationId" = ${input.organizationId}
        AND "branchId" = ${input.branchId}
        AND "quantity" >= ${input.deductQty} + COALESCE((
          SELECT SUM(r."quantity")
          FROM "InventoryStockReservation" r
          INNER JOIN "ShopHeldBill" h ON h."id" = r."heldBillId"
          WHERE r."inventoryItemId" = ${input.inventoryItemId}
            AND h."status" = 'ACTIVE'
            AND r."expiresAt" > ${now}
        ), 0)
    `;
    return result > 0;
  }
  const result = await input.tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantity" = "quantity" - ${input.deductQty},
        "updatedAt" = ${now}
    WHERE "id" = ${input.inventoryItemId}
      AND "organizationId" = ${input.organizationId}
      AND "quantity" >= ${input.deductQty} + COALESCE((
        SELECT SUM(r."quantity")
        FROM "InventoryStockReservation" r
        INNER JOIN "ShopHeldBill" h ON h."id" = r."heldBillId"
        WHERE r."inventoryItemId" = ${input.inventoryItemId}
          AND h."status" = 'ACTIVE'
          AND r."expiresAt" > ${now}
      ), 0)
  `;
  return result > 0;
}
