"use client";

import { formatINR } from "@/lib/finance/money";
import { BarcodeSvg } from "@/components/shop/barcode-svg";

export type InvoiceLine = {
  name: string;
  qty: number;
  priceRupees: number;
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
};

function lineAmount(line: InvoiceLine) {
  return line.qty * line.priceRupees;
}

export function ShopInvoicePrint({ invoice }: { invoice: ShopInvoiceData }) {
  const subtotal = invoice.items.reduce((s, l) => s + lineAmount(l), 0);
  const gst = invoice.gstPaise ? Number(invoice.gstPaise) / 100 : 0;

  return (
    <article className="mx-auto max-w-md bg-white p-6 text-sm text-black print:max-w-none print:p-4 print:shadow-none">
      <header className="border-b border-neutral-300 pb-3 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">{invoice.orgName}</h1>
        <p className="mt-1 text-xs text-neutral-600">Tax Invoice / Retail Bill</p>
        {invoice.billNumber ? (
          <p className="mt-2 font-mono text-sm font-semibold">Bill #{invoice.billNumber}</p>
        ) : null}
      </header>

      <section className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Date</span>
          <span>{new Date(invoice.createdAt).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Customer</span>
          <span className="text-right">{invoice.customerName?.trim() || "Walk-in"}</span>
        </div>
        {invoice.customerPhone ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Phone</span>
            <span>{invoice.customerPhone}</span>
          </div>
        ) : null}
        {invoice.customerGstin ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">GSTIN</span>
            <span className="font-mono">{invoice.customerGstin}</span>
          </div>
        ) : null}
        {invoice.salesBoyName ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Sales</span>
            <span>{invoice.salesBoyName}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">Payment</span>
          <span>{invoice.paymentMethod}</span>
        </div>
        {invoice.cashierName ? (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Cashier</span>
            <span>{invoice.cashierName}</span>
          </div>
        ) : null}
      </section>

      <table className="mt-4 w-full border-collapse text-xs">
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
            <tr key={`${line.name}-${idx}`} className="border-b border-neutral-100">
              <td className="py-1.5 pr-2">{line.name}</td>
              <td className="py-1.5 text-right tabular-nums">{line.qty}</td>
              <td className="py-1.5 text-right tabular-nums">₹{line.priceRupees.toFixed(2)}</td>
              <td className="py-1.5 text-right tabular-nums">₹{lineAmount(line).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-4 space-y-1 border-t border-neutral-300 pt-3 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
        </div>
        {gst > 0 ? (
          <div className="flex justify-between">
            <span>GST</span>
            <span className="tabular-nums">₹{gst.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatINR(invoice.totalPaise)}</span>
        </div>
      </footer>

      {invoice.billNumber ? (
        <div className="mt-4 flex flex-col items-center border-t border-dashed border-neutral-300 pt-3">
          <BarcodeSvg value={invoice.billNumber.replace(/\D/g, "").slice(-12).padStart(12, "0")} height={32} />
          <p className="mt-1 text-[10px] text-neutral-500">Scan for bill reference</p>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[10px] text-neutral-500">
        Thank you for your purchase
      </p>
    </article>
  );
}
