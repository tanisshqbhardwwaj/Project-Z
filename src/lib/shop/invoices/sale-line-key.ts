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

/**
 * A sold line. Variant attributes are denormalised onto the line so that an
 * invoice printed today still says "Size M" after the product is renamed or the
 * variant is deleted, and so returns can never bring back the wrong size.
 */
import type { ShopItemKind } from "@/lib/shop/branch/sector-mode";

export type SaleItemJson = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  productId?: string;
  barcode?: string;
  sku?: string;
  size?: string;
  color?: string;
  variantLabel?: string;
  unit?: string;
  costPaisePerUnit?: number;
  staffId?: string;
  staffName?: string;
  itemKind?: ShopItemKind;
};

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

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
        inventoryItemId: optionalString(o.inventoryItemId),
        productId: optionalString(o.productId),
        barcode: optionalString(o.barcode),
        sku: optionalString(o.sku),
        size: optionalString(o.size),
        color: optionalString(o.color),
        variantLabel: optionalString(o.variantLabel),
        unit: optionalString(o.unit),
        staffId: optionalString(o.staffId),
        staffName: optionalString(o.staffName),
        itemKind:
          o.itemKind === "PRODUCT" ||
          o.itemKind === "SERVICE" ||
          o.itemKind === "MENU_ITEM"
            ? (o.itemKind as ShopItemKind)
            : undefined,
        costPaisePerUnit:
          typeof o.costPaisePerUnit === "number" ? o.costPaisePerUnit : undefined,
      };
    })
    .filter((i) => i.name && i.qty > 0);
}
