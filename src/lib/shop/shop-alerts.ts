export const SHOP_ALERT = {
  LOW_STOCK: "shop.inventory.low_stock",
  EXPIRING: "shop.inventory.expiring",
  NO_BARCODE: "shop.inventory.no_barcode",
  RECURRING_EXPENSE_DUE: "shop.expense.recurring_due",
} as const;

export const SHOP_INVENTORY_ALERT_HREF = "/shop/inventory";
export const SHOP_RECURRING_EXPENSE_ALERT_HREF = "/shop/expenses?tab=add";
