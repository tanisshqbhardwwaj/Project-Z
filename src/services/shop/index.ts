/** Shop domain services — sales lists, purchases, inventory, returns, etc. */
export {
  listShopSales,
  listShopCustomers,
  searchShopCustomers,
  getShopCustomer,
  type ShopCustomerWithCount,
} from "./sales-list.service";

export * from "../shop-purchase.service";
export * from "../shop-expense.service";
export * from "../shop-return.service";
export * from "../shop-product.service";
export * from "../shop-credit.service";
export * from "../shop-activity.service";
export * from "../shop-offer.service";
export * from "../shop-profit.service";
export * from "../shop-held-bill.service";
export * from "../shop-category.service";
export * from "../shop-recurring-expense.service";
export * from "../shop-customer-analytics.service";
export * from "../shop-notification.service";
export * from "../shop-payment-terminal.service";
// shop-sync and shop.service are orchestration roots — import directly to avoid cycles.
