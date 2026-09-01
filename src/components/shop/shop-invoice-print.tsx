"use client";

import { BarcodeSvg } from "@/components/shop/barcode-svg";
import type { ResolvedInvoiceTemplate } from "@/lib/org/shop-settings";
import { DEFAULT_INVOICE_SETTINGS } from "@/lib/org/shop-settings";
import type { StoredInvoicePricing } from "@/lib/shop/invoices/invoice-pricing";
import {
  allocateLineDiscounts,
  formatInvoiceMoney,
  formatLineDiscountHint,
  resolveInvoiceLineAllocations,
  shouldShowLineDiscountHints,
} from "@/lib/shop/invoices/invoice-pricing";
import { variantSubtitle } from "@/lib/shop/inventory/variant-display";

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

export type ShopInvoiceDocumentKind =
  | "TAX_INVOICE"
  | "CREDIT_NOTE"
  | "EXCHANGE_INVOICE";

function formatPaymentLabel(invoice: ShopInvoiceData): string {
  const splits = invoice.pricing?.splitPayments;
  if (splits?.length) {
    return splits
      .map(
        (s) =>
          `${String(s.method).replace(/_/g, " ")} ₹${Number(s.amountRupees).toFixed(2)}`
      )
      .join(" + ");
  }
  return String(invoice.paymentMethod).replace(/_/g, " ");
}

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
  documentKind?: ShopInvoiceDocumentKind;
  originalBillNumber?: string | null;
  replacementItems?: InvoiceLine[];
  returnMeta?: {
    returnValueRupees: number;
    exchangeValueRupees?: number;
    refundRupees: number;
    additionalPaidRupees: number;
    refundMethod: string;
    reason?: string;
    netLabel?: string;
  };
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
  /** Marks this print as a reissued duplicate copy of the original bill. */
  duplicateCopy?: boolean;
};

export function ShopInvoicePrint({
  invoice,
  template,
  compact,
  cashTender,
  barcodeHeight = 32,
  duplicateCopy = false,
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
    paperSize: DEFAULT_INVOICE_SETTINGS.paperSize,
    printMarginMm: DEFAULT_INVOICE_SETTINGS.printMarginMm,
    defaultCopies: DEFAULT_INVOICE_SETTINGS.defaultCopies,
    useDecimalPlaces: DEFAULT_INVOICE_SETTINGS.useDecimalPlaces,
  };

  const fmt = (n: number) => formatInvoiceMoney(n, t);
  const p = invoice.pricing;
  const lineDiscountMode = shouldShowLineDiscountHints(p);
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
  const documentKind = invoice.documentKind ?? "TAX_INVOICE";
  const isReturnDoc =
    documentKind === "CREDIT_NOTE" || documentKind === "EXCHANGE_INVOICE";
  const documentTitle =
    documentKind === "CREDIT_NOTE"
      ? "Credit Note"
      : documentKind === "EXCHANGE_INVOICE"
        ? "Exchange Invoice"
        : t.headerTitle;
  const documentNumberLabel =
    documentKind === "CREDIT_NOTE"
      ? "Return"
      : documentKind === "EXCHANGE_INVOICE"
        ? "Exchange"
        : "Bill";

  const allocatedLines = !isReturnDoc
    ? resolveInvoiceLineAllocations(invoice.items, {
        showLineHints: lineDiscountMode,
        totalDiscountRupees: discount,
        storedLineDiscountRupees: p?.lineDiscountRupees,
        manualDiscountRupees: manualDiscount,
        manualDiscountMode: p?.manualDiscountMode,
        offerLineDiscountRupees:
          offerDiscount > 0 && p?.lineDiscountRupees?.length === invoice.items.length
            ? p.lineDiscountRupees
            : undefined,
      })
    : null;
  const showRoundOff = t.useDecimalPlaces && roundOff < -0.004;

  const discountLines =
    discount > 0 ? (
      <>
        {showSplitDiscount ? (
          <>
            <div className="flex justify-between text-emerald-700">
              <span>Store discount</span>
              <span className="tabular-nums">− {fmt(manualDiscount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>
                Offer
                {p?.appliedOffers?.[0]?.name ? ` (${p.appliedOffers[0].name})` : ""}
              </span>
              <span className="tabular-nums">− {fmt(offerDiscount)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-emerald-700">
            <span>
              {offerDiscount > 0 && manualDiscount <= 0
                ? "Discount"
                : "Store discount"}
              {p?.discountPercent ? ` (${p.discountPercent}%)` : ""}
              {offerDiscount > 0 && manualDiscount <= 0 && p?.appliedOffers?.[0]?.name
                ? ` · ${p.appliedOffers[0].name}`
                : ""}
            </span>
            <span className="tabular-nums">− {fmt(discount)}</span>
          </div>
        )}
      </>
    ) : null;

  const taxBlock =
    gst > 0 ? (
      <>
        <div className="flex justify-between">
          <span>Taxable value</span>
          <span className="tabular-nums">{fmt(taxable)}</span>
        </div>
        {p?.taxRatePercent ? (
          <>
            <div className="flex justify-between">
              <span>
                CGST ({halfRate.toFixed(2)}%)
                {p?.taxIncluded ? " incl." : ""}
              </span>
              <span className="tabular-nums">{fmt(cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                SGST ({halfRate.toFixed(2)}%)
                {p?.taxIncluded ? " incl." : ""}
              </span>
              <span className="tabular-nums">{fmt(sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>GST{p?.taxIncluded ? " incl." : ""}</span>
            <span className="tabular-nums">{fmt(gst)}</span>
          </div>
        )}
      </>
    ) : null;

  return (
    <article
      className={`box-border w-full bg-white font-sans text-black ${
        compact ? "p-3 text-[11px] leading-snug" : "mx-auto max-w-[210mm] p-6 text-sm leading-normal"
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
        <h1 className="text-base font-bold uppercase tracking-[0.12em]">{t.displayName}</h1>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
          {documentTitle}
        </p>
        {duplicateCopy ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-700">
            Duplicate copy
          </p>
        ) : null}
        {t.gstin ? (
          <p className="mt-2 font-mono text-[10px] text-neutral-600">GSTIN {t.gstin}</p>
        ) : null}
        {t.address ? (
          <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-neutral-600">
            {t.address}
          </p>
        ) : null}
        {t.phone || t.email ? (
          <p className="mt-1 text-[10px] text-neutral-600">
            {[t.phone, t.email].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {invoice.billNumber ? (
          <p className="mt-2 font-mono text-sm font-semibold">
            {documentNumberLabel} #{invoice.billNumber}
          </p>
        ) : null}
        {invoice.originalBillNumber ? (
          <p className="mt-1 text-[11px] text-neutral-600">
            Against bill #{invoice.originalBillNumber}
          </p>
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
            <span className="text-right">{formatPaymentLabel(invoice)}</span>
          </div>
        ) : null}
        {t.showCashier && invoice.cashierName ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Cashier</span>
            <span>{invoice.cashierName}</span>
          </div>
        ) : null}
      </section>

      <table className="mt-3 w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[12%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-neutral-800">
            <th className="py-1.5 text-left text-[10px] font-bold uppercase tracking-wide">
              Item
            </th>
            <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
              Qty
            </th>
            <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
              Rate
            </th>
            <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
              Amt
            </th>
          </tr>
        </thead>
        <tbody>
          {(isReturnDoc ? invoice.items : invoice.items).map((line, idx) => {
            const allocated = allocatedLines?.[idx];
            const hasLineDiscount =
              allocated != null && allocated.lineDiscountRupees > 0.004;
            const unitRate = line.priceRupees;
            const lineTotal = hasLineDiscount
              ? allocated.discountedLineRupees
              : lineAmount(line);
            const hint = hasLineDiscount
              ? formatLineDiscountHint(allocated, t)
              : null;
            return (
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
                  {hint ? (
                    <span className="block text-[0.92em] text-emerald-700">{hint}</span>
                  ) : null}
                </td>
                <td className="py-1.5 text-right tabular-nums align-top">{line.qty}</td>
                <td className="py-1.5 text-right tabular-nums align-top">{fmt(unitRate)}</td>
                <td className="py-1.5 text-right tabular-nums align-top">{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {documentKind === "EXCHANGE_INVOICE" &&
      invoice.replacementItems &&
      invoice.replacementItems.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Replacement items
          </p>
          <table className="mt-2 w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[44%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-neutral-800">
                <th className="py-1.5 text-left text-[10px] font-bold uppercase tracking-wide">
                  Item
                </th>
                <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
                  Qty
                </th>
                <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
                  Rate
                </th>
                <th className="py-1.5 text-right text-[10px] font-bold uppercase tracking-wide">
                  Amt
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.replacementItems.map((line, idx) => (
                <tr
                  key={`replacement-${line.name}-${idx}`}
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
                    {fmt(line.priceRupees)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums align-top">
                    {fmt(lineAmount(line))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <footer className="invoice-totals mt-3 space-y-1 border-t-2 border-neutral-800 pt-2 text-[11px]">
        {isReturnDoc && invoice.returnMeta ? (
          <>
            <div className="flex justify-between">
              <span>Returned value</span>
              <span className="tabular-nums">
                {fmt(invoice.returnMeta.returnValueRupees)}
              </span>
            </div>
            {invoice.returnMeta.exchangeValueRupees != null ? (
              <div className="flex justify-between">
                <span>Replacement value</span>
                <span className="tabular-nums">
                  {fmt(invoice.returnMeta.exchangeValueRupees)}
                </span>
              </div>
            ) : null}
            {invoice.returnMeta.refundRupees > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Refund / credit</span>
                <span className="tabular-nums">
                  {fmt(invoice.returnMeta.refundRupees)}
                </span>
              </div>
            ) : null}
            {invoice.returnMeta.additionalPaidRupees > 0 ? (
              <div className="flex justify-between">
                <span>Additional paid</span>
                <span className="tabular-nums">
                  {fmt(invoice.returnMeta.additionalPaidRupees)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold">
              <span>{invoice.returnMeta.netLabel ?? "Net amount"}</span>
              <span className="tabular-nums">
                {fmt(Number(invoice.totalPaise) / 100)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>Settlement</span>
              <span>{formatPaymentLabel(invoice)}</span>
            </div>
            {invoice.returnMeta.reason ? (
              <div className="flex justify-between text-[11px] text-neutral-600">
                <span>Reason</span>
                <span className="capitalize">
                  {invoice.returnMeta.reason.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
        {t.showSubtotal ? (
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
        ) : null}
        {!discountAfterTax ? discountLines : null}
        {taxBlock}
        {discountAfterTax ? discountLines : null}
        {showRoundOff ? (
          <div className="flex justify-between text-[11px] text-neutral-600">
            <span>Round off</span>
            <span className="tabular-nums">− {fmt(Math.abs(roundOff))}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-1 text-sm font-bold">
          <span>Total</span>
          <span className="tabular-nums">{fmt(Number(invoice.totalPaise) / 100)}</span>
        </div>
        {cashTender && invoice.paymentMethod === "CASH" ? (
          <div className="invoice-payment">
            <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2">
              <span>Cash received</span>
              <span className="tabular-nums">{fmt(cashTender.receivedRupees)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Change</span>
              <span className="tabular-nums">{fmt(cashTender.changeRupees)}</span>
            </div>
          </div>
        ) : null}
          </>
        )}
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
          <p className="mt-1 font-mono text-[10px] font-medium">{invoice.billNumber}</p>
          <p className="text-[9px] text-neutral-500">Scan for bill reference</p>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[10px] font-medium tracking-wide text-neutral-600">
        {t.footerText}
      </p>
    </article>
  );
}
