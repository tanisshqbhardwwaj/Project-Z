/** Encode bill number the same way as invoice receipt barcode (ShopInvoicePrint). */
export function billNumberToBarcodeValue(billNumber: string): string {
  return billNumber.replace(/\D/g, "").slice(-12).padStart(12, "0");
}

export function normalizeBillScan(scanned: string): string {
  return scanned.replace(/\D/g, "").slice(-12).padStart(12, "0");
}
