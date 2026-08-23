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
  type InvoicePricingResult,
  type StoredInvoicePricing,
} from "@/lib/shop/invoice-pricing";

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
      className={`min-w-0 max-w-full overflow-hidden rounded-2xl border bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="print-hidden border-b bg-muted/40 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
        Preview
        {!invoice.billNumber || invoice.billNumber === "DRAFT" ? (
          <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-800">
            Draft
          </span>
        ) : null}
      </div>
      <div className="max-w-full overflow-x-auto bg-neutral-50/80 py-3">
        <div className="flex min-w-min justify-center px-2">
        <InvoicePreviewRoot
          paperSize={template.paperSize}
          printMarginMm={template.printMarginMm}
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
  offerDiscountRupees?: number;
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
    discountPercent: pricing.discountPercent,
    discountBasis: pricing.discountBasis,
    taxableRupees: pricing.taxableRupees,
    gstRupees: pricing.gstRupees,
    cgstRupees: pricing.cgstRupees,
    sgstRupees: pricing.sgstRupees,
    taxIncluded: pricing.taxIncluded,
    taxRatePercent: pricing.taxRatePercent,
    roundOffRupees: pricing.roundOffRupees,
    ...(input.manualDiscountRupees != null && input.manualDiscountRupees > 0
      ? { manualDiscountRupees: input.manualDiscountRupees }
      : {}),
    ...(input.offerDiscountRupees != null && input.offerDiscountRupees > 0
      ? { offerDiscountRupees: input.offerDiscountRupees }
      : {}),
    ...(input.appliedOffers?.length ? { appliedOffers: input.appliedOffers } : {}),
  };

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
