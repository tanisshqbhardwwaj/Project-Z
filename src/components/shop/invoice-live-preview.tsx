"use client";

import {
  ShopInvoicePrint,
  type ShopInvoiceData,
  type CashTenderInfo,
} from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
import type { DiscountBasis } from "@/lib/org/shop-settings";
import {
  computeInvoicePricing,
  resolveInvoiceLineAllocations,
  type InvoicePricingResult,
  type StoredInvoicePricing,
} from "@/lib/shop/invoices/invoice-pricing";

type InvoiceLivePreviewProps = {
  invoice: ShopInvoiceData;
  className?: string;
  /** Shown on preview when printing cash sales so print matches screen. */
  cashTender?: CashTenderInfo | null;
};

export function InvoiceLivePreview({
  invoice,
  className,
  cashTender,
}: InvoiceLivePreviewProps) {
  const template = useShopInvoiceTemplate();
  const layout = resolvePaperLayout(template.paperSize, template.printMarginMm);

  return (
    <div
      className={`shop-invoice-print-mount min-w-0 max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="print-hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        Invoice preview
        {!invoice.billNumber || invoice.billNumber === "DRAFT" ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
            Draft
          </span>
        ) : null}
      </div>
      <div className="max-w-full bg-neutral-50/80 py-4">
        <div className="flex min-w-min justify-center px-3">
        <InvoicePreviewRoot
          paperSize={template.paperSize}
          printMarginMm={template.printMarginMm}
          framed
        >
          <ShopInvoicePrint
            invoice={invoice}
            template={template}
            compact={layout.compact}
            cashTender={cashTender ?? null}
            barcodeHeight={layout.barcodeHeight}
          />
        </InvoicePreviewRoot>
        </div>
      </div>
    </div>
  );
}

export function buildDraftInvoice(input: {
  orgName: string;
  cashierName?: string | null;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  salesBoyName: string;
  paymentMethod: string;
  cart: Array<{
    name: string;
    qty: number;
    priceRupees: number;
    size?: string | null;
    color?: string | null;
    variantLabel?: string | null;
    sku?: string | null;
    barcode?: string | null;
  }>;
  billNumber?: string | null;
  pricing: InvoicePricingResult;
  manualDiscountRupees?: number;
  manualDiscountMode?: "percent" | "rupees";
  manualDiscountPercent?: number;
  offerDiscountRupees?: number;
  offerLineDiscountRupees?: number[];
  appliedOffers?: { offerId: string; name: string; discountRupees: number }[];
  /** @deprecated Prefer passing `pricing` from the billing form. */
  discountRupees?: number;
  discountPercent?: number;
  discountBasis?: DiscountBasis;
  taxRatePercent?: number;
  taxIncluded?: boolean;
}): ShopInvoiceData {
  const pricing =
    input.pricing ??
    computeInvoicePricing({
      items: input.cart,
      discountRupees: input.discountRupees,
      discountPercent: input.discountPercent,
      discountBasis: input.discountBasis,
      taxRatePercent: input.taxRatePercent,
      taxIncluded: input.taxIncluded,
    });

  const stored: StoredInvoicePricing = {
    subtotalRupees: pricing.subtotalRupees,
    discountRupees: pricing.discountRupees,
    discountPercent:
      input.manualDiscountMode === "percent"
        ? input.manualDiscountPercent ?? pricing.discountPercent
        : pricing.discountPercent,
    discountBasis: pricing.discountBasis,
    taxableRupees: pricing.taxableRupees,
    gstRupees: pricing.gstRupees,
    cgstRupees: pricing.cgstRupees,
    sgstRupees: pricing.sgstRupees,
    taxIncluded: pricing.taxIncluded,
    taxRatePercent: pricing.taxRatePercent,
    roundOffRupees: pricing.roundOffRupees,
    ...(input.manualDiscountRupees != null && input.manualDiscountRupees > 0
      ? {
          manualDiscountRupees: input.manualDiscountRupees,
          ...(input.manualDiscountMode ? { manualDiscountMode: input.manualDiscountMode } : {}),
          ...(input.manualDiscountPercent != null && input.manualDiscountPercent > 0
            ? { manualDiscountPercent: input.manualDiscountPercent }
            : {}),
        }
      : {}),
    ...(input.offerDiscountRupees != null && input.offerDiscountRupees > 0
      ? { offerDiscountRupees: input.offerDiscountRupees }
      : {}),
    ...(input.appliedOffers?.length ? { appliedOffers: input.appliedOffers } : {}),
  };

  const lineDiscountRupees = resolveInvoiceLineAllocations(input.cart, {
    showLineHints:
      (input.offerDiscountRupees ?? 0) > 0 || input.manualDiscountMode === "percent",
    totalDiscountRupees: pricing.discountRupees,
    manualDiscountRupees: input.manualDiscountRupees,
    manualDiscountMode: input.manualDiscountMode,
    offerLineDiscountRupees: input.offerLineDiscountRupees,
  })?.map((line) => line.lineDiscountRupees);

  if (lineDiscountRupees?.length) {
    stored.lineDiscountRupees = lineDiscountRupees;
  }

  return {
    orgName: input.orgName,
    billNumber: input.billNumber ?? "DRAFT",
    customerName: input.customerName.trim() || null,
    customerPhone: input.customerPhone.trim() || null,
    customerGstin: input.customerGstin.trim() || null,
    salesBoyName: input.salesBoyName.trim() || null,
    paymentMethod: input.paymentMethod,
    items: input.cart.map((line) => ({
      name: line.name,
      qty: line.qty,
      priceRupees: line.priceRupees,
      size: line.size ?? null,
      color: line.color ?? null,
      variantLabel: line.variantLabel ?? null,
      sku: line.sku ?? null,
      barcode: line.barcode ?? null,
    })),
    totalPaise: String(pricing.totalPaise),
    gstPaise: String(pricing.gstPaise),
    pricing: stored,
    createdAt: new Date().toISOString(),
    cashierName: input.cashierName ?? null,
  };
}
