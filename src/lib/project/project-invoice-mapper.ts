import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import {
  parsePricingJson,
  type StoredInvoicePricing,
} from "@/lib/shop/invoice-pricing";

export type ProjectInvoiceLineJson = {
  name: string;
  qty: number;
  priceRupees: number;
  unit?: string;
};

export type NormalizedProjectInvoice = {
  id?: string;
  billNumber?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientGstin?: string | null;
  paymentMethod?: string;
  notes?: string | null;
  totalPaise?: string | number | null;
  gstPaise?: string | number | null;
  createdAt?: string;
  pricingJson?: unknown;
  itemsJson?: ProjectInvoiceLineJson[];
  organization?: { name: string } | null;
  createdBy?: { name: string } | null;
};

function invoiceLineItems(invoice: NormalizedProjectInvoice): ProjectInvoiceLineJson[] {
  const raw = invoice.itemsJson;
  return Array.isArray(raw) ? raw : [];
}

function storedInvoiceTotalRupees(pricing: StoredInvoicePricing): number {
  const discount = pricing.discountRupees;
  const roundOff = pricing.roundOffRupees;
  const beforeRound =
    pricing.discountBasis === "total"
      ? Math.max(
          0,
          (pricing.taxIncluded
            ? pricing.subtotalRupees
            : pricing.taxableRupees + pricing.gstRupees) - discount
        )
      : pricing.taxIncluded
        ? Math.max(0, pricing.subtotalRupees - discount)
        : pricing.taxableRupees + pricing.gstRupees;
  return Math.max(0, Math.round((beforeRound + roundOff) * 100) / 100);
}

function resolveTotalPaise(invoice: NormalizedProjectInvoice): string {
  if (invoice.totalPaise != null && invoice.totalPaise !== "") {
    return String(invoice.totalPaise);
  }
  const pricing = parsePricingJson(invoice.pricingJson);
  if (pricing) {
    return String(Math.round(storedInvoiceTotalRupees(pricing) * 100));
  }
  const subtotal = invoiceLineItems(invoice).reduce(
    (sum, line) => sum + line.qty * line.priceRupees,
    0
  );
  return String(Math.round(subtotal * 100));
}

function resolveGstPaise(invoice: NormalizedProjectInvoice): string | undefined {
  if (invoice.gstPaise != null && invoice.gstPaise !== "") {
    return String(invoice.gstPaise);
  }
  const pricing = parsePricingJson(invoice.pricingJson);
  if (pricing) {
    return String(Math.round(pricing.gstRupees * 100));
  }
  return undefined;
}

/** Map a project client invoice to the shared shop print component shape. */
export function projectInvoiceToShopInvoice(
  invoice: NormalizedProjectInvoice,
  fallbacks: {
    orgName?: string | null;
    cashierName?: string | null;
  } = {}
): ShopInvoiceData {
  return {
    orgName: invoice.organization?.name ?? fallbacks.orgName ?? "Organization",
    billNumber: invoice.billNumber ?? null,
    customerName: invoice.clientName ?? null,
    customerPhone: invoice.clientPhone ?? null,
    customerGstin: invoice.clientGstin ?? null,
    paymentMethod: invoice.paymentMethod ?? "CASH",
    items: invoiceLineItems(invoice),
    totalPaise: resolveTotalPaise(invoice),
    gstPaise: resolveGstPaise(invoice),
    notes: invoice.notes ?? null,
    pricing: parsePricingJson(invoice.pricingJson),
    createdAt: invoice.createdAt ?? new Date().toISOString(),
    cashierName: invoice.createdBy?.name ?? fallbacks.cashierName ?? null,
  };
}
