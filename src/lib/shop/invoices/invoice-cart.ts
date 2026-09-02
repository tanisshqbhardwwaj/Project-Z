import { variantDisplayName } from "@/lib/shop/inventory/variant-display";

/**
 * A line on the bill. Variant attributes travel with the line so the cart, the
 * printed receipt and the stored invoice all identify the exact size that was
 * sold rather than just the parent product name.
 */
export type SaleLine = {
  id: string;
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
  staffId?: string;
  staffName?: string;
  itemKind?: import("@/lib/shop/branch/sector-mode").ShopItemKind;
};

export type HeldBill = {
  id: string;
  label: string;
  customerName: string;
  salesBoyName: string;
  customerPhone: string;
  customerGstin: string;
  cart: SaleLine[];
  heldAt: number;
};

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD"] as const;
export type PaymentMethodOption = (typeof PAYMENT_METHODS)[number];

export function lineTotal(line: SaleLine) {
  return line.qty * line.priceRupees;
}

export function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "Premium T-Shirt — Black — Size M", or just the name for simple products. */
export function saleLineDisplayName(line: SaleLine): string {
  return variantDisplayName(line);
}

export function mergeLineIntoCart(
  cart: SaleLine[],
  line: Omit<SaleLine, "id">
): SaleLine[] {
  // Different sizes are different inventory items, so they never merge together.
  const existingIdx = cart.findIndex((l) =>
    line.inventoryItemId
      ? l.inventoryItemId === line.inventoryItemId &&
        l.priceRupees === line.priceRupees &&
        (l.staffId ?? "") === (line.staffId ?? "")
      : l.name === line.name &&
        l.priceRupees === line.priceRupees &&
        !l.inventoryItemId &&
        (l.staffId ?? "") === (line.staffId ?? "")
  );
  if (existingIdx >= 0) {
    return cart.map((l, i) =>
      i === existingIdx ? { ...l, qty: l.qty + line.qty } : l
    );
  }
  return [...cart, { ...line, id: newLineId() }];
}

export function mergeCarts(base: SaleLine[], incoming: SaleLine[]): SaleLine[] {
  return incoming.reduce<SaleLine[]>(
    (acc, line) =>
      mergeLineIntoCart(acc, {
        name: line.name,
        qty: line.qty,
        priceRupees: line.priceRupees,
        inventoryItemId: line.inventoryItemId,
        productId: line.productId,
        barcode: line.barcode,
        sku: line.sku,
        size: line.size,
        color: line.color,
        variantLabel: line.variantLabel,
        unit: line.unit,
        staffId: line.staffId,
        staffName: line.staffName,
        itemKind: line.itemKind,
      }),
    base
  );
}
