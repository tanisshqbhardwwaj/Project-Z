/** Stock qty at or above this value is treated as unlimited (not deducted on sale). */
export const INFINITE_STOCK_QTY = 9999;

export function isInfiniteStock(quantity: number): boolean {
  return quantity >= INFINITE_STOCK_QTY;
}

<<<<<<< HEAD
export type StockCheckLine = {
  id?: string;
  inventoryItemId?: string;
  qty: number;
  name?: string;
};

export type StockCheckItem = {
  id: string;
  quantity: number;
  unit?: string;
  name?: string;
};

/** Units still available for one cart line after other lines for the same SKU. */
export function availableQtyForInventoryLine(
  inventoryItemId: string,
  cart: StockCheckLine[],
  inventory: StockCheckItem[],
  excludeLineId?: string
): number | "infinite" | "unknown" {
  const inv = inventory.find((i) => i.id === inventoryItemId);
  if (!inv) return "unknown";
  if (isInfiniteStock(inv.quantity)) return "infinite";
  const inCartOthers = cart
    .filter((l) => l.inventoryItemId === inventoryItemId && l.id !== excludeLineId)
    .reduce((s, l) => s + l.qty, 0);
  return Math.max(0, inv.quantity - inCartOthers);
}

export function stockLimitMessage(
  name: string,
  available: number,
  unit = "pcs"
): string {
  if (available <= 0) return `No stock left for ${name}`;
  return `Only ${available} ${unit} left for ${name}`;
}

export function validateCartStock(
  cart: StockCheckLine[],
  inventory: StockCheckItem[]
): { ok: true } | { ok: false; message: string } {
  const totals = new Map<string, number>();
  for (const line of cart) {
    if (!line.inventoryItemId) continue;
    totals.set(
      line.inventoryItemId,
      (totals.get(line.inventoryItemId) ?? 0) + line.qty
    );
  }
  for (const [id, qty] of totals) {
    const inv = inventory.find((i) => i.id === id);
    const label =
      inv?.name ??
      cart.find((l) => l.inventoryItemId === id)?.name ??
      "Item";
    if (!inv) {
      return { ok: false, message: `${label} is no longer in inventory` };
    }
    if (isInfiniteStock(inv.quantity)) continue;
    if (qty > inv.quantity) {
      return {
        ok: false,
        message: stockLimitMessage(label, inv.quantity, inv.unit ?? "pcs"),
      };
    }
  }
  return { ok: true };
}

=======
>>>>>>> origin/master
export function formatStockLabel(quantity: number, unit = "pcs"): string {
  if (isInfiniteStock(quantity)) return "∞ unlimited";
  return `${quantity} ${unit} left`;
}

export function formatStockDisplay(quantity: number, unit = "pcs"): string {
  if (isInfiniteStock(quantity)) return "∞";
  return `${quantity} ${unit}`;
}
