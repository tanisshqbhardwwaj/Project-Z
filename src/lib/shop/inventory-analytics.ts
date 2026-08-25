import { isInfiniteStock } from "@/lib/shop/inventory";
import { paiseToRupees } from "@/lib/finance/money";

export type SaleLineInput = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  costPaisePerUnit?: number;
};

export type InventoryItemInput = {
  id: string;
  name: string;
  size: string | null;
  quantity: number;
  reorderLevel: number;
  sellPaise: bigint | null;
  barcode: string | null;
};

export type SellerInsightRow = {
  itemId: string;
  label: string;
  qtySold: number;
  revenueRupees: number;
  stockQty: number;
};

export type InventorySnapshot = {
  skuCount: number;
  totalUnits: number;
  lowStockCount: number;
  noBarcodeCount: number;
  stockValueRupees: number;
};

export type InventoryAnalytics = {
  salesDays: number;
  snapshot: InventorySnapshot;
  topSellers: SellerInsightRow[];
  bottomSellers: SellerInsightRow[];
};

function itemLabel(name: string, size: string | null): string {
  return size ? `${name} · ${size}` : name;
}

function aggregateSales(lines: SaleLineInput[]) {
  const byId = new Map<string, { qty: number; revenueRupees: number }>();

  for (const line of lines) {
    if (!line.inventoryItemId || line.qty <= 0) continue;
    const prev = byId.get(line.inventoryItemId) ?? { qty: 0, revenueRupees: 0 };
    prev.qty += line.qty;
    prev.revenueRupees += line.qty * line.priceRupees;
    byId.set(line.inventoryItemId, prev);
  }

  return byId;
}

export function computeInventorySnapshot(
  items: Array<
    Pick<InventoryItemInput, "quantity" | "reorderLevel" | "sellPaise" | "barcode">
  >
): InventorySnapshot {
  let totalUnits = 0;
  let lowStockCount = 0;
  let noBarcodeCount = 0;
  let stockValueRupees = 0;

  for (const item of items) {
    if (!isInfiniteStock(item.quantity)) {
      totalUnits += item.quantity;
      if (item.quantity <= item.reorderLevel) lowStockCount++;
    }
    if (!item.barcode) noBarcodeCount++;
    if (item.sellPaise != null && !isInfiniteStock(item.quantity)) {
      stockValueRupees += paiseToRupees(item.sellPaise) * item.quantity;
    }
  }

  return {
    skuCount: items.length,
    totalUnits,
    lowStockCount,
    noBarcodeCount,
    stockValueRupees: Math.round(stockValueRupees * 100) / 100,
  };
}

export function computeInventoryAnalytics(input: {
  items: InventoryItemInput[];
  salesLines: SaleLineInput[];
  salesDays: number;
  topLimit?: number;
  bottomLimit?: number;
}): InventoryAnalytics {
  const topLimit = input.topLimit ?? 5;
  const bottomLimit = input.bottomLimit ?? 5;
  const snapshot = computeInventorySnapshot(input.items);

  const salesById = aggregateSales(input.salesLines);

  const rows: SellerInsightRow[] = input.items
    .filter((item) => !isInfiniteStock(item.quantity) && item.quantity > 0)
    .map((item) => {
      const sold = salesById.get(item.id);
      return {
        itemId: item.id,
        label: itemLabel(item.name, item.size),
        qtySold: sold?.qty ?? 0,
        revenueRupees: sold?.revenueRupees ?? 0,
        stockQty: item.quantity,
      };
    });

  const topSellers = [...rows]
    .filter((r) => r.qtySold > 0)
    .sort((a, b) => b.qtySold - a.qtySold || b.revenueRupees - a.revenueRupees)
    .slice(0, topLimit);

  const bottomSellers = [...rows]
    .sort((a, b) => a.qtySold - b.qtySold || b.stockQty - a.stockQty)
    .slice(0, bottomLimit);

  return {
    salesDays: input.salesDays,
    snapshot,
    topSellers,
    bottomSellers,
  };
}

export function parseSaleItemsJson(raw: unknown): SaleLineInput[] {
  if (!Array.isArray(raw)) return [];
  const lines: SaleLineInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name : "";
    const qty = typeof r.qty === "number" ? r.qty : Number(r.qty);
    const priceRupees =
      typeof r.priceRupees === "number" ? r.priceRupees : Number(r.priceRupees);
    if (!name || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({
      name,
      qty,
      priceRupees: Number.isFinite(priceRupees) ? priceRupees : 0,
      inventoryItemId:
        typeof r.inventoryItemId === "string" ? r.inventoryItemId : undefined,
    });
  }
  return lines;
}
