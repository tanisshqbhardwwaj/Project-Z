/** Stock qty at or above this value is treated as unlimited (not deducted on sale). */
export const INFINITE_STOCK_QTY = 9999;

export function isInfiniteStock(quantity: number): boolean {
  return quantity >= INFINITE_STOCK_QTY;
}

export function formatStockLabel(quantity: number, unit = "pcs"): string {
  if (isInfiniteStock(quantity)) return "∞ unlimited";
  return `${quantity} ${unit} left`;
}

export function formatStockDisplay(quantity: number, unit = "pcs"): string {
  if (isInfiniteStock(quantity)) return "∞";
  return `${quantity} ${unit}`;
}
