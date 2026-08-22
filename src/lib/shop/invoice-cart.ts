export type SaleLine = {
  id: string;
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  barcode?: string;
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

export function mergeLineIntoCart(
  cart: SaleLine[],
  line: Omit<SaleLine, "id">
): SaleLine[] {
  const existingIdx = cart.findIndex((l) =>
    line.inventoryItemId
      ? l.inventoryItemId === line.inventoryItemId &&
        l.priceRupees === line.priceRupees
      : l.name === line.name &&
        l.priceRupees === line.priceRupees &&
        !l.inventoryItemId
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
        barcode: line.barcode,
      }),
    base
  );
}
