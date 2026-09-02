import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { lineCostPaise } from "@/lib/shop/inventory/inventory-costing";
import { parseInventoryCategory } from "@/lib/shop/inventory/inventory-categories";
import type { ShopSaleItem } from "@/services/shop/shop.service";

/** Fields needed across pricing, offers, variants, cost, and stock deduction. */
export const SALE_INVENTORY_SELECT = {
  id: true,
  name: true,
  sellPaise: true,
  costPaise: true,
  productId: true,
  size: true,
  color: true,
  variantLabel: true,
  sku: true,
  barcode: true,
  unit: true,
  quantity: true,
  sectorMeta: true,
  branchId: true,
  product: { select: { itemKind: true } },
} as const;

export type SaleInventoryRow = {
  id: string;
  name: string;
  sellPaise: bigint | null;
  costPaise: bigint | null;
  productId: string | null;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  quantity: number;
  sectorMeta: unknown;
  branchId: string | null;
  product: { itemKind: string | null } | null;
};

export async function loadSaleInventoryMap(
  organizationId: string,
  inventoryIds: string[],
  branchId?: string
): Promise<Map<string, SaleInventoryRow>> {
  const unique = [...new Set(inventoryIds.filter(Boolean))];
  const map = new Map<string, SaleInventoryRow>();
  if (unique.length === 0) return map;

  const rows = await prisma.inventoryItem.findMany({
    where: {
      id: { in: unique },
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    select: SALE_INVENTORY_SELECT,
  });
  for (const row of rows) {
    map.set(row.id, row as SaleInventoryRow);
  }
  return map;
}

export function applyAuthoritativePrices(
  items: ShopSaleItem[],
  byId: Map<string, SaleInventoryRow>
): ShopSaleItem[] {
  return items.map((item) => {
    if (!item.inventoryItemId) return item;
    const row = byId.get(item.inventoryItemId);
    if (!row) {
      throw new Error(`Inventory item not found for "${item.name}"`);
    }
    const catalogRupees =
      row.sellPaise != null ? Number(row.sellPaise) / 100 : item.priceRupees;
    return {
      ...item,
      name: item.name.trim() || row.name,
      priceRupees: catalogRupees,
    };
  });
}

export function enrichItemsWithVariantRows(
  items: ShopSaleItem[],
  byId: Map<string, SaleInventoryRow>
): ShopSaleItem[] {
  return items.map((item) => {
    if (!item.inventoryItemId) return item;
    const row = byId.get(item.inventoryItemId);
    if (!row) return item;
    return {
      ...item,
      productId: item.productId ?? row.productId ?? undefined,
      size: item.size ?? row.size ?? undefined,
      color: item.color ?? row.color ?? undefined,
      variantLabel: item.variantLabel ?? row.variantLabel ?? undefined,
      sku: item.sku ?? row.sku ?? undefined,
      barcode: item.barcode ?? row.barcode ?? undefined,
      unit: item.unit ?? row.unit ?? undefined,
      itemKind:
        item.itemKind ??
        (row.product?.itemKind as ShopSaleItem["itemKind"]) ??
        undefined,
    };
  });
}

export function computeCostFromInventoryMap(
  items: ShopSaleItem[],
  byId: Map<string, SaleInventoryRow>
): {
  totalCostPaise: bigint;
  itemsWithCost: Array<ShopSaleItem & { costPaisePerUnit?: number }>;
} {
  let totalCostPaise = BigInt(0);
  const itemsWithCost: Array<ShopSaleItem & { costPaisePerUnit?: number }> = [];

  for (const item of items) {
    const row = item.inventoryItemId ? byId.get(item.inventoryItemId) : undefined;
    const costPaise =
      row?.costPaise ??
      (item.costPaisePerUnit != null ? rupeesToPaise(item.costPaisePerUnit) : BigInt(0));
    totalCostPaise += lineCostPaise(costPaise, item.qty);
    itemsWithCost.push({
      ...item,
      costPaisePerUnit: Number(costPaise) / 100,
    });
  }

  return { totalCostPaise, itemsWithCost };
}

export function categoryKeyFromInventoryMap(
  byId: Map<string, SaleInventoryRow>,
  inventoryItemId: string
): string | null {
  const row = byId.get(inventoryItemId);
  if (!row) return null;
  return parseInventoryCategory(row.sectorMeta);
}
