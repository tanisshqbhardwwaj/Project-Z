export function saleLineKey(item: {
  inventoryItemId?: string | null;
  name: string;
  priceRupees: number;
}): string {
  if (item.inventoryItemId) {
    return `inv:${item.inventoryItemId}:${item.priceRupees}`;
  }
  return `name:${item.name.trim().toLowerCase()}:${item.priceRupees}`;
}

export type SaleItemJson = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  barcode?: string;
  costPaisePerUnit?: number;
};

export function parseSaleItems(raw: unknown): SaleItemJson[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        qty: Number(o.qty ?? 0),
        priceRupees: Number(o.priceRupees ?? 0),
        inventoryItemId:
          typeof o.inventoryItemId === "string" ? o.inventoryItemId : undefined,
        barcode: typeof o.barcode === "string" ? o.barcode : undefined,
        costPaisePerUnit:
          typeof o.costPaisePerUnit === "number" ? o.costPaisePerUnit : undefined,
      };
    })
    .filter((i) => i.name && i.qty > 0);
}
