"use client";

/** @deprecated Use @/lib/shop/print/invoice-print-service */
export {
  printShopInvoice,
  type InvoicePrintCallbacks as PrintCallbacks,
} from "@/lib/shop/print/invoice-print-service";

export { SHOP_INVOICE_PREVIEW_ID } from "@/lib/shop/print/invoice-print-layout";

export type CashTender = {
  receivedRupees: number;
  changeRupees: number;
};
