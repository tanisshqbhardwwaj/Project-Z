"use client";

import { BarcodeSvg } from "@/components/shop/barcode-svg";
import type { ResolvedInvoiceTemplate } from "@/lib/org/shop-settings";
import { DEFAULT_INVOICE_SETTINGS } from "@/lib/org/shop-settings";
import type { StoredInvoicePricing } from "@/lib/shop/invoice-pricing";
import { formatInvoiceRupees } from "@/lib/shop/invoice-pricing";
import { variantSubtitle } from "@/lib/shop/variant-display";

export type CashTenderInfo = {
  receivedRupees: number;
  changeRupees: number;
};

export type InvoiceLine = {
  name: string;
  qty: number;
  priceRupees: number;
  /** Variant attributes, printed under the name so the size is on the bill. */
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  sku?: string | null;
  barcode?: string | null;
};

export type ShopInvoiceData = {
  orgName: string;
  billNumber: string | null;
  customerName: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  salesBoyName?: string | null;
  paymentMethod: string;
  items: InvoiceLine[];
  totalPaise: string;
  gstPaise?: string;
  createdAt: string;
  cashierName?: string | null;
  notes?: string | null;
  pricing?: StoredInvoicePricing | null;
};

function lineAmount(line: InvoiceLine) {
  return line.qty * line.priceRupees;
}

type ShopInvoicePrintProps = {
  invoice: ShopInvoiceData;
  template?: ResolvedInvoiceTemplate;
  compact?: boolean;
  cashTender?: CashTenderInfo | null;
  /** Barcode height in px — smaller on 58mm paper. */
  barcodeHeight?: number;
};

export function ShopInvoicePrint({
  invoice,
  template,
  compact,
  cashTender,
  barcodeHeight = 32,
}: ShopInvoicePrintProps) {
  const t = template ?? {
    displayName: invoice.orgName,
    headerTitle: DEFAULT_INVOICE_SETTINGS.headerTitle,
    logoUrl: null,
    address: null,
    phone: null,
    email: null,
    gstin: null,
    footerText: DEFAULT_INVOICE_SETTINGS.footerText,
    termsText: null,
    showLogo: DEFAULT_INVOICE_SETTINGS.showLogo,
    showBarcode: DEFAULT_INVOICE_SETTINGS.showBarcode,
    showCashier: DEFAULT_INVOICE_SETTINGS.showCashier,
    showSalesStaff: DEFAULT_INVOICE_SETTINGS.showSalesStaff,
    showCustomerPhone: DEFAULT_INVOICE_SETTINGS.showCustomerPhone,
    showCustomerGstin: DEFAULT_INVOICE_SETTINGS.showCustomerGstin,
    showPaymentMethod: DEFAULT_INVOICE_SETTINGS.showPaymentMethod,
    showSubtotal: DEFAULT_INVOICE_SETTINGS.showSubtotal,
    billPrefix: DEFAULT_INVOICE_SETTINGS.billPrefix,
    defaultTaxRatePercent: 0,
    discountBasis: "subtotal" as const,
    defaultStaffMonthlyTargetRupees: 0,
    staffMonthlyTargets: {},
  };

  const p = invoice.pricing;
  const subtotal =
    p?.subtotalRupees ??
    invoice.items.reduce((s, l) => s + lineAmount(l), 0);
  const discount = p?.discountRupees ?? 0;
  const gst = p?.gstRupees ?? (invoice.gstPaise ? Number(invoice.gstPaise) / 100 : 0);
  const cgst = p?.cgstRupees ?? gst / 2;
  const sgst = p?.sgstRupees ?? gst - cgst;
  const taxable = p?.taxableRupees ?? subtotal - discount;
  const roundOff = p?.roundOffRupees ?? 0;
  const halfRate = p?.taxRatePercent ? p.taxRatePercent / 2 : 0;
  const discountAfterTax = p?.discountBasis === "total";
  const manualDiscount = p?.manualDiscountRupees ?? 0;
  const offerDiscount = p?.offerDiscountRupees ?? 0;
  const showSplitDiscount = manualDiscount > 0 && offerDiscount > 0;

  const discountLines =
    discount > 0 ? (
      <>
        {showSplitDiscount ? (
          <>
            <div className="flex justify-between text-emerald-700">
              <span>Manual discount</span>
              <span className="tabular-nums">− {formatInvoiceRupees(manualDiscount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>
                Offer
                {p?.appliedOffers?.[0]?.name ? ` (${p.appliedOffers[0].name})` : ""}
              </span>
              <span className="tabular-nums">− {formatInvoiceRupees(offerDiscount)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-emerald-700">
            <span>
              Discount
              {p?.discountPercent ? ` (${p.discountPercent}%)` : ""}
              {offerDiscount > 0 && manualDiscount <= 0 && p?.appliedOffers?.[0]?.name
                ? ` · ${p.appliedOffers[0].name}`
                : ""}
            </span>
            <span className="tabular-nums">− {formatInvoiceRupees(discount)}</span>
          </div>
        )}
      </>
    ) : null;

  const taxBlock =
    gst > 0 ? (
      <>
        <div className="flex justify-between">
          <span>Taxable value</span>
          <span className="tabular-nums">{formatInvoiceRupees(taxable)}</span>
        </div>
        {p?.taxRatePercent ? (
          <>
            <div className="flex justify-between">
              <span>
                CGST ({halfRate.toFixed(2)}%)
                {p?.taxIncluded ? " incl." : ""}
              </span>
              <span className="tabular-nums">{formatInvoiceRupees(cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                SGST ({halfRate.toFixed(2)}%)
                {p?.taxIncluded ? " incl." : ""}
              </span>
              <span className="tabular-nums">{formatInvoiceRupees(sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>GST{p?.taxIncluded ? " incl." : ""}</span>
            <span className="tabular-nums">{formatInvoiceRupees(gst)}</span>
          </div>
        )}
      </>
    ) : null;

  return (
    <article
      className={`box-border w-full bg-white text-black ${
        compact ? "p-3 text-[11px]" : "mx-auto max-w-[210mm] p-6 text-sm"
      }`}
    >
      <div className="invoice-header border-b border-neutral-300 pb-3 text-center">
        {t.showLogo && t.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.logoUrl}
            alt=""
            className="mx-auto mb-2 h-12 max-w-[160px] object-contain"
          />
        ) : null}
        <h1 className="text-lg font-bold uppercase tracking-wide">{t.displayName}</h1>
        <p className="mt-1 text-xs text-neutral-600">{t.headerTitle}</p>
        {t.gstin ? (
          <p className="mt-1 font-mono text-[11px] text-neutral-600">GSTIN: {t.gstin}</p>
        ) : null}
        {t.address ? (
          <p className="mt-1 whitespace-pre-line text-[11px] text-neutral-600">{t.address}</p>
        ) : null}
        {t.phone || t.email ? (
          <p className="mt-1 text-[11px] text-neutral-600">
            {[t.phone, t.email].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {invoice.billNumber ? (
          <p className="mt-2 font-mono text-sm font-semibold">Bill #{invoice.billNumber}</p>
        ) : null}
      </div>

      <section className="invoice-customer mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Date</span>
          <span>{new Date(invoice.createdAt).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Customer</span>
          <span className="text-right">{invoice.customerName?.trim() || "Walk-in"}</span>
        </div>
        {t.showCustomerPhone && invoice.customerPhone ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Phone</span>
            <span>{invoice.customerPhone}</span>
          </div>
        ) : null}
        {t.showCustomerGstin && invoice.customerGstin ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Customer GSTIN</span>
            <span className="font-mono">{invoice.customerGstin}</span>
          </div>
        ) : null}
        {t.showSalesStaff && invoice.salesBoyName ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Sales</span>
            <span>{invoice.salesBoyName}</span>
          </div>
        ) : null}
        {t.showPaymentMethod ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Payment</span>
            <span>{invoice.paymentMethod}</span>
          </div>
        ) : null}
        {t.showCashier && invoice.cashierName ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Cashier</span>
            <span>{invoice.cashierName}</span>
          </div>
        ) : null}
      </section>

      <table className="mt-4 w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[12%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-1 text-left font-semibold">Item</th>
            <th className="py-1 text-right font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Rate</th>
            <th className="py-1 text-right font-semibold">Amt</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((line, idx) => (
            <tr
              key={`${line.name}-${idx}`}
              className="invoice-line-row border-b border-neutral-100"
            >
              <td className="break-words py-1.5 pr-1 align-top">
                {line.name}
                {variantSubtitle(line) ? (
                  <span className="block text-[0.92em] text-neutral-600">
                    {variantSubtitle(line)}
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums align-top">{line.qty}</td>
              <td className="py-1.5 text-right tabular-nums align-top">
                ₹{line.priceRupees.toFixed(2)}
              </td>
              <td className="py-1.5 text-right tabular-nums align-top">
                ₹{lineAmount(line).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="invoice-totals mt-4 space-y-1 border-t border-neutral-300 pt-3 text-xs">
        {t.showSubtotal ? (
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
          </div>
        ) : null}
        {!discountAfterTax ? discountLines : null}
        {taxBlock}
        {discountAfterTax ? discountLines : null}
        {roundOff < 0 ? (
          <div className="flex justify-between text-[11px] text-neutral-600">
            <span>Round off</span>
            <span className="tabular-nums">− {formatInvoiceRupees(Math.abs(roundOff))}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatInvoiceRupees(Number(invoice.totalPaise) / 100)}</span>
        </div>
        {cashTender && invoice.paymentMethod === "CASH" ? (
          <div className="invoice-payment">
            <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2">
              <span>Cash received</span>
              <span className="tabular-nums">{formatInvoiceRupees(cashTender.receivedRupees)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Change</span>
              <span className="tabular-nums">{formatInvoiceRupees(cashTender.changeRupees)}</span>
            </div>
          </div>
        ) : null}
      </footer>

      {t.termsText ? (
        <p className="mt-3 whitespace-pre-line border-t border-dashed border-neutral-200 pt-2 text-[11px] text-neutral-600">
          {t.termsText}
        </p>
      ) : null}

      {t.showBarcode && invoice.billNumber ? (
        <div className="invoice-barcode mt-4 flex max-w-full flex-col items-center border-t border-dashed border-neutral-300 pt-3">
          <BarcodeSvg
            value={invoice.billNumber.replace(/\D/g, "").slice(-12).padStart(12, "0")}
            height={barcodeHeight}
          />
          <p className="mt-1 text-[10px] text-neutral-500">Scan for bill reference</p>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[10px] text-neutral-500">{t.footerText}</p>
    </article>
  );
}
