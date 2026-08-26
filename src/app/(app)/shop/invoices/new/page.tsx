"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { useSearchParams } from "next/navigation";
=======
>>>>>>> origin/master
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { InvoiceEntryForm } from "@/components/shop/invoice-entry-form";
import { InvoiceLivePreview, buildDraftInvoice } from "@/components/shop/invoice-live-preview";
import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { computeInvoicePricing } from "@/lib/shop/invoice-pricing";
<<<<<<< HEAD
import {
  buildInvoiceWhatsAppMessage,
  shareInvoiceOnWhatsApp,
} from "@/lib/shop/invoice-share";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
=======
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
>>>>>>> origin/master
import {
  useShopInvoicePrint,
  type CashTender,
} from "@/hooks/use-shop-invoice-print";

<<<<<<< HEAD
type SavedSale = {
  id: string;
  billNumber: string | null;
  customerPhone: string | null;
};

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const duplicateSaleId = searchParams.get("duplicate");
=======
export default function NewInvoicePage() {
>>>>>>> origin/master
  const { activeBusinessType, activeOrganizationName, enabledModules, user } =
    useAuthStore();
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");

  const [draft, setDraft] = useState<ShopInvoiceData>(() =>
    buildDraftInvoice({
      orgName: activeOrganizationName ?? "Shop",
      cashierName: user?.name,
      customerName: "",
      customerPhone: "",
      customerGstin: "",
      salesBoyName: "",
      paymentMethod: "CASH",
      cart: [],
      pricing: computeInvoicePricing({ items: [] }),
    })
  );
  const [resetKey, setResetKey] = useState(0);
  const [printCashTender, setPrintCashTender] = useState<CashTender | null>(null);
<<<<<<< HEAD
  const [lastSaved, setLastSaved] = useState<{
    sale: SavedSale;
    invoice: ShopInvoiceData;
  } | null>(null);

  const { toast } = useToast();
=======
>>>>>>> origin/master

  const { printInvoice, PrintLayer } = useShopInvoicePrint({
    onComplete: () => {
      setPrintCashTender(null);
      setResetKey((k) => k + 1);
<<<<<<< HEAD
      setLastSaved(null);
=======
>>>>>>> origin/master
    },
  });

  const onDraftChange = useCallback((next: ShopInvoiceData) => {
    setDraft(next);
  }, []);

  function handleSaved(
<<<<<<< HEAD
    sale: SavedSale,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null,
    options?: { print?: boolean }
  ) {
    setDraft(invoice);
    setLastSaved({ sale, invoice });
    if (options?.print === false) {
      setResetKey((k) => k + 1);
      return;
    }
=======
    _sale: unknown,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null
  ) {
    setDraft(invoice);
>>>>>>> origin/master
    setPrintCashTender(cashTender ?? null);
    window.setTimeout(() => {
      void printInvoice();
    }, 80);
  }

<<<<<<< HEAD
  function shareWhatsApp() {
    if (!lastSaved) return;
    const { invoice } = lastSaved;
    const msg = buildInvoiceWhatsAppMessage({
      orgName: invoice.orgName,
      billNumber: invoice.billNumber,
      customerName: invoice.customerName,
      totalPaise: invoice.totalPaise,
      paymentMethod: invoice.pricing?.splitPayments?.length
        ? invoice.pricing.splitPayments
            .map((s) => `${s.method} ₹${s.amountRupees}`)
            .join(" + ")
        : invoice.paymentMethod,
    });
    shareInvoiceOnWhatsApp(msg, invoice.customerPhone);
  }

=======
>>>>>>> origin/master
  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

  return (
    <>
      <PrintLayer />
      <div className="min-w-0 space-y-4">
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">New invoice</h1>
            <p className="text-sm text-muted-foreground">
              Live preview updates as you add items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop/invoices/settings">
              <Button variant="outline" className="rounded-xl">
                <Settings className="mr-2 h-4 w-4" />
                Invoice settings
              </Button>
            </Link>
            <Link href="/shop/invoices">
              <Button variant="outline" className="rounded-xl">
                Recent invoices
              </Button>
            </Link>
          </div>
        </div>

<<<<<<< HEAD
        {lastSaved ? (
          <div className="print-hidden flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="w-full text-sm font-medium text-emerald-900 dark:text-emerald-100 sm:w-auto sm:flex-1">
              Saved {lastSaved.invoice.billNumber ?? "invoice"} — share or print again
            </p>
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={shareWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => {
                void printInvoice();
                toast({
                  title: "Save as PDF",
                  description: "Choose Save as PDF in the print dialog.",
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Link href={`/shop/invoices/${lastSaved.sale.id}`}>
              <Button type="button" variant="outline" size="sm" className="rounded-lg">
                View invoice
              </Button>
            </Link>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[2fr_3fr]">
          <div className="order-2 hidden min-w-0 xl:order-1 xl:sticky xl:top-4 xl:block xl:self-start">
            <InvoiceLivePreview invoice={draft} cashTender={printCashTender} />
          </div>
          <div className="order-1 min-w-0 xl:order-2">
            <InvoiceEntryForm
              resetKey={resetKey}
              duplicateSaleId={duplicateSaleId}
=======
        <div className="grid min-w-0 gap-4 xl:grid-cols-[2fr_3fr]">
          <div className="order-1 min-w-0 xl:sticky xl:top-4 xl:self-start">
            <InvoiceLivePreview invoice={draft} cashTender={printCashTender} />
          </div>
          <div className="order-2 min-w-0">
            <InvoiceEntryForm
              resetKey={resetKey}
>>>>>>> origin/master
              onDraftChange={onDraftChange}
              onSaved={handleSaved}
            />
          </div>
        </div>
      </div>
    </>
  );
}
