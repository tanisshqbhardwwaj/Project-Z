import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { parsePricingJson } from "@/lib/shop/invoice-pricing";

export type SaleLineJson = {
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  productId?: string;
  barcode?: string;
  sku?: string;
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  unit?: string;
};

export type NormalizedSaleRecord = {
  id?: string;
  billNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  salesBoyName?: string | null;
  paymentMethod?: string;
  notes?: string | null;
  totalPaise?: string | number | null;
  gstPaise?: string | number | null;
  createdAt?: string;
  pricingJson?: unknown;
  itemsJson?: SaleLineJson[];
  items?: SaleLineJson[];
  organization?: { name: string } | null;
  createdBy?: { name: string } | null;
};

export function saleLineItems(sale: NormalizedSaleRecord): SaleLineJson[] {
  const raw = sale.itemsJson ?? sale.items;
  return Array.isArray(raw) ? raw : [];
}

/** Align local IndexedDB / local-first API rows with server sale shape. */
export function normalizeLocalSaleRecord(
  sale: Record<string, unknown>
): Record<string, unknown> {
  const items = sale.itemsJson ?? sale.items;
  return {
    ...sale,
    itemsJson: items,
    items,
  };
}

function resolveTotalPaise(sale: NormalizedSaleRecord): string {
  if (sale.totalPaise != null && sale.totalPaise !== "") {
    return String(sale.totalPaise);
  }
  const pricing = parsePricingJson(sale.pricingJson);
  if (pricing?.totalPaise != null) {
    return String(pricing.totalPaise);
  }
  if (pricing?.totalRupees != null) {
    return String(Math.round(pricing.totalRupees * 100));
  }
  const subtotal = saleLineItems(sale).reduce(
    (sum, line) => sum + line.qty * line.priceRupees,
    0
  );
  return String(Math.round(subtotal * 100));
}

function resolveGstPaise(sale: NormalizedSaleRecord): string | undefined {
  if (sale.gstPaise != null && sale.gstPaise !== "") {
    return String(sale.gstPaise);
  }
  const pricing = parsePricingJson(sale.pricingJson);
  if (pricing?.gstPaise != null) {
    return String(pricing.gstPaise);
  }
  return undefined;
}

export function saleToShopInvoice(
  sale: NormalizedSaleRecord,
  fallbacks: {
    orgName?: string | null;
    cashierName?: string | null;
  } = {}
): ShopInvoiceData {
  return {
    orgName: sale.organization?.name ?? fallbacks.orgName ?? "Shop",
    billNumber: sale.billNumber ?? null,
    customerName: sale.customerName ?? null,
    customerPhone: sale.customerPhone ?? null,
    customerGstin: sale.customerGstin ?? null,
    salesBoyName: sale.salesBoyName ?? null,
    paymentMethod: sale.paymentMethod ?? "CASH",
    items: saleLineItems(sale),
    totalPaise: resolveTotalPaise(sale),
    gstPaise: resolveGstPaise(sale),
    notes: sale.notes ?? null,
    pricing: parsePricingJson(sale.pricingJson),
    createdAt: sale.createdAt ?? new Date().toISOString(),
    cashierName: sale.createdBy?.name ?? fallbacks.cashierName ?? null,
  };
}

export function saleLinesToDraftCart(lines: SaleLineJson[]) {
  return lines.map((line) => ({
    name: line.name,
    qty: line.qty,
    priceRupees: line.priceRupees,
    size: line.size,
    color: line.color,
    variantLabel: line.variantLabel,
    sku: line.sku,
    barcode: line.barcode,
  }));
}
