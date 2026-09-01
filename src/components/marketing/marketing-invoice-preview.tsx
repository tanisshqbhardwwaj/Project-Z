"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopInvoicePrint } from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { buildDraftInvoice } from "@/components/shop/invoice-live-preview";
import { computeInvoicePricing } from "@/lib/shop/invoices/invoice-pricing";
import { resolveShopInvoiceTemplate } from "@/lib/org/shop-settings";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
import { mk } from "@/components/marketing/marketing-theme";

const DEMO_CART = [
  { name: "Premium Cotton Shirt", qty: 2, priceRupees: 899, size: "M", sku: "SH-001" },
  { name: "Formal Trousers", qty: 1, priceRupees: 1299, size: "32", sku: "TR-042" },
  { name: "Leather Belt", qty: 1, priceRupees: 450, sku: "AC-118" },
];

/** Fixed timestamp so SSR and client hydration match (buildDraftInvoice uses Date.now()). */
const DEMO_CREATED_AT = "2026-01-15T10:30:00.000Z";

const DEMO_PRICING = computeInvoicePricing({
  items: DEMO_CART,
  taxRatePercent: 18,
  taxIncluded: false,
});

const DEMO_INVOICE = {
  ...buildDraftInvoice({
    orgName: "Demo Store",
    cashierName: "Priya",
    customerName: "Ravi Kumar",
    customerPhone: "9876543210",
    customerGstin: "",
    salesBoyName: "",
    paymentMethod: "CASH",
    cart: DEMO_CART,
    billNumber: "INV-2026-0042",
    pricing: DEMO_PRICING,
    taxRatePercent: 18,
    taxIncluded: false,
  }),
  createdAt: DEMO_CREATED_AT,
};

const DEMO_TEMPLATE = resolveShopInvoiceTemplate("Demo Store", null);
const DEMO_LAYOUT = resolvePaperLayout(DEMO_TEMPLATE.paperSize, DEMO_TEMPLATE.printMarginMm);

export function MarketingInvoicePreview() {
  return (
    <div className="relative w-full lg:justify-self-stretch xl:justify-self-end">
      <div
        className={cn(
          "overflow-hidden rounded-3xl border bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]",
          "border-slate-200 dark:border-slate-700 dark:bg-slate-900",
          "dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)]",
          "xl:max-w-2xl xl:justify-self-end 2xl:max-w-3xl"
        )}
      >
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", mk.muted)}>Invoice preview</p>
        </div>
        <div className="max-h-[420px] overflow-hidden bg-neutral-50/80 py-4 dark:bg-slate-800/50 xl:max-h-[520px] 2xl:max-h-[580px]">
          <div className="flex justify-center px-2">
            <InvoicePreviewRoot
              paperSize={DEMO_TEMPLATE.paperSize}
              printMarginMm={DEMO_TEMPLATE.printMarginMm}
              framed
            >
              <ShopInvoicePrint
                invoice={DEMO_INVOICE}
                template={DEMO_TEMPLATE}
                compact={DEMO_LAYOUT.compact}
                barcodeHeight={DEMO_LAYOUT.barcodeHeight}
              />
            </InvoicePreviewRoot>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-lg sm:left-6",
          mk.card
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className={cn("text-sm font-medium", mk.heading)}>PDF ready</p>
          <p className={cn("text-xs", mk.muted)}>GST included · print & share</p>
        </div>
      </div>
    </div>
  );
}
