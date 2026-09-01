"use client";

import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { InvoiceEntryForm } from "@/components/shop/invoice-entry-form";
import { InvoiceLivePreview, buildDraftInvoice } from "@/components/shop/invoice-live-preview";
import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { computeInvoicePricing } from "@/lib/shop/invoices/invoice-pricing";
import {
  buildInvoiceWhatsAppMessage,
  shareInvoiceOnWhatsAppWithPdf,
} from "@/lib/shop/invoices/invoice-share";
import { generateInvoicePdfBlob } from "@/lib/shop/invoices/invoice-pdf";
import { previewRailWidthClass } from "@/lib/shop/print/invoice-print-layout";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useShopInvoicePrint,
  type CashTender,
} from "@/hooks/use-shop-invoice-print";
import { useShopStaffUi } from "@/hooks/use-shop-staff-ui";

type SavedSale = {
  id: string;
  billNumber: string | null;
  customerPhone: string | null;
};

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const duplicateSaleId = searchParams.get("duplicate");
  const { activeBusinessType, activeOrganizationName, enabledModules, user } =
    useAuthStore();
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");
  const { canEditInvoiceSettings } = useShopStaffUi();

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
  const [lastSaved, setLastSaved] = useState<{
    sale: SavedSale;
    invoice: ShopInvoiceData;
  } | null>(null);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  const { toast } = useToast();
  const template = useShopInvoiceTemplate();

  const { printInvoice, PrintLayer } = useShopInvoicePrint({
    onComplete: () => {
      setPrintCashTender(null);
      setResetKey((k) => k + 1);
      setLastSaved(null);
    },
  });

  const onDraftChange = useCallback((next: ShopInvoiceData) => {
    setDraft(next);
  }, []);

  function handleSaved(
    sale: SavedSale,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null,
    options?: { print?: boolean }
  ) {
    flushSync(() => {
      setDraft(invoice);
      setLastSaved({ sale, invoice });
      setPrintCashTender(cashTender ?? null);
    });
    if (options?.print === false) {
      setResetKey((k) => k + 1);
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void printInvoice();
      });
    });
  }

  async function shareWhatsApp() {
    if (!lastSaved || sharingWhatsApp) return;
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
    setSharingWhatsApp(true);
    try {
      const { blob, fileName } = await generateInvoicePdfBlob({
        fileName: invoice.billNumber ?? "invoice",
      });
      const result = await shareInvoiceOnWhatsAppWithPdf({
        message: msg,
        phone: invoice.customerPhone,
        pdfBlob: blob,
        fileName,
      });
      toast({
        title:
          result === "direct"
            ? "Opening WhatsApp"
            : result === "shared"
              ? "Share on WhatsApp"
              : "PDF ready",
        description:
          result === "direct"
            ? `Chat opened for ${invoice.customerPhone?.trim() || "customer"}. Attach the downloaded PDF.`
            : result === "shared"
              ? "Pick WhatsApp in the share sheet — PDF is attached."
              : "PDF downloaded. WhatsApp opened — pick a contact and attach the file.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Could not share invoice",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSharingWhatsApp(false);
    }
  }

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
              Live preview and billing form side by side — preview sized to your paper
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditInvoiceSettings ? (
              <Link href="/shop/invoices/settings">
                <Button variant="outline" className="rounded-xl">
                  <Settings className="mr-2 h-4 w-4" />
                  Invoice settings
                </Button>
              </Link>
            ) : null}
            <Link href="/shop/invoices">
              <Button variant="outline" className="rounded-xl">
                Recent invoices
              </Button>
            </Link>
          </div>
        </div>

        {lastSaved ? (
          <div className="print-hidden grid grid-cols-3 gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900 dark:bg-emerald-950/30 sm:grid-cols-4">
            <p className="col-span-3 text-sm font-medium text-emerald-900 dark:text-emerald-100 sm:col-span-4">
              Saved {lastSaved.invoice.billNumber ?? "invoice"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg px-2 text-xs sm:text-sm"
              disabled={sharingWhatsApp}
              onClick={() => void shareWhatsApp()}
            >
              <MessageCircle className="mr-1 h-3.5 w-3.5 shrink-0" />
              {sharingWhatsApp ? "…" : "WhatsApp"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg px-2 text-xs sm:text-sm"
              onClick={() => {
                void printInvoice();
                toast({
                  title: "Save as PDF",
                  description: "Choose Save as PDF in the print dialog.",
                });
              }}
            >
              <Download className="mr-1 h-3.5 w-3.5 shrink-0" />
              PDF
            </Button>
            <Link href={`/shop/invoices/${lastSaved.sale.id}`} className="min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full rounded-lg px-2 text-xs sm:text-sm"
              >
                View
              </Button>
            </Link>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside
            className={cn(
              "shop-invoice-print-mount order-2 shrink-0 lg:order-1 lg:sticky lg:top-4 lg:self-start",
              previewRailWidthClass(template.paperSize),
              "max-lg:pointer-events-none max-lg:fixed max-lg:left-[-9999px] max-lg:top-0 max-lg:z-0 max-lg:opacity-0"
            )}
          >
            <InvoiceLivePreview invoice={draft} cashTender={printCashTender} />
          </aside>
          <div className="order-1 min-w-0 lg:order-2">
            <InvoiceEntryForm
              resetKey={resetKey}
              duplicateSaleId={duplicateSaleId}
              onDraftChange={onDraftChange}
              onSaved={handleSaved}
            />
          </div>
        </div>
      </div>
    </>
  );
}
