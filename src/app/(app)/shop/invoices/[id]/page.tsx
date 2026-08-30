"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShopInvoicePrint,
  type ShopInvoiceData,
} from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { formatINR } from "@/lib/finance/money";
import { saleToShopInvoice, type NormalizedSaleRecord } from "@/lib/shop/sale-invoice-mapper";
import { InvoiceReturnPanel } from "@/components/shop/invoice-return-panel";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { useShopInvoicePrint } from "@/hooks/use-shop-invoice-print";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
import {
  buildInvoiceWhatsAppMessage,
  downloadInvoiceViaPrint,
  shareInvoiceOnWhatsAppWithPdf,
} from "@/lib/shop/invoice-share";
import { generateInvoicePdfBlob } from "@/lib/shop/invoice-pdf";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  History,
  Copy,
  Download,
  MessageCircle,
  Printer,
  RotateCcw,
} from "lucide-react";

type SaleDetail = NormalizedSaleRecord & {
  id: string;
  issueInvoice: boolean;
  paidAmountPaise?: string;
  paymentStatus?: string;
};

export default function ShopInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const activeOrganizationName = useAuthStore((s) => s.activeOrganizationName);
  const userName = useAuthStore((s) => s.user?.name);
  const template = useShopInvoiceTemplate();
  const layout = resolvePaperLayout(template.paperSize, template.printMarginMm);
  const [duplicateCopy, setDuplicateCopy] = useState(false);
  const { printInvoice, printing, PrintLayer } = useShopInvoicePrint({
    onComplete: () => setDuplicateCopy(false),
  });
  const { toast } = useToast();
  const [returnOpen, setReturnOpen] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  const printDuplicateCopy = useCallback(async () => {
    setDuplicateCopy(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await printInvoice();
  }, [printInvoice]);

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.invoices(orgId), "detail", id] : ["disabled"],
    queryFn: () => apiFetch<SaleDetail>(`/api/v1/shop/sales/${id}`),
    enabled: !!orgId && !!id,
  });

  if (isLoading) return <PageLoader label="Loading invoice..." />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Failed to load invoice"}
        </p>
        <Link href="/shop/invoices" className="inline-block">
          <Button variant="outline" className="rounded-xl">
            Back to invoices
          </Button>
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-8 text-center">
        <p>Invoice not found</p>
        <Link href="/shop/invoices" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-xl">
            Back to invoices
          </Button>
        </Link>
      </div>
    );
  }

  const sale = data;
  const invoice = saleToShopInvoice(sale, {
    orgName: activeOrganizationName,
    cashierName: userName,
  });
  const orgDisplayName = invoice.orgName;

  async function shareWhatsApp() {
    if (sharingWhatsApp) return;
    const msg = buildInvoiceWhatsAppMessage({
      orgName: orgDisplayName,
      billNumber: sale.billNumber ?? null,
      customerName: sale.customerName,
      totalPaise: sale.totalPaise ?? invoice.totalPaise,
      paymentMethod: sale.paymentMethod,
    });
    setSharingWhatsApp(true);
    try {
      const { blob, fileName } = await generateInvoicePdfBlob({
        fileName: sale.billNumber ?? "invoice",
      });
      const result = await shareInvoiceOnWhatsAppWithPdf({
        message: msg,
        phone: sale.customerPhone,
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
            ? `Chat opened for ${sale.customerPhone?.trim() || "customer"}. Attach the downloaded PDF.`
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

  function savePdf() {
    void downloadInvoiceViaPrint(printInvoice);
    toast({
      title: "Save as PDF",
      description: "Choose Save as PDF in the print dialog.",
    });
  }

  return (
    <>
      <PrintLayer />
      <div className="mx-auto max-w-lg space-y-3 p-3 pb-8 sm:p-4 print-hidden">
        <div className="space-y-1">
          <Link
            href="/shop/invoices"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Invoices
          </Link>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="font-mono text-lg font-bold">{sale.billNumber ?? "Invoice"}</h1>
            {sale.paymentStatus && sale.paymentStatus !== "PAID" ? (
              <Badge variant="secondary" className="h-5 rounded-full text-[10px] capitalize">
                {sale.paymentStatus.replace(/_/g, " ").toLowerCase()}
              </Badge>
            ) : null}
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatINR(sale.totalPaise ?? invoice.totalPaise)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(sale.createdAt ?? invoice.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {sale.customerName?.trim() || "Walk-in"}
            {" · "}
            {String(sale.paymentMethod).replace(/_/g, " ")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            onClick={() => void printInvoice()}
          >
            <Printer className="mr-1 h-3.5 w-3.5 shrink-0" />
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            onClick={savePdf}
          >
            <Download className="mr-1 h-3.5 w-3.5 shrink-0" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            disabled={sharingWhatsApp}
            onClick={() => void shareWhatsApp()}
          >
            <MessageCircle className="mr-1 h-3.5 w-3.5 shrink-0" />
            {sharingWhatsApp ? "…" : "WhatsApp"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            disabled={printing}
            onClick={() => void printDuplicateCopy()}
          >
            <Copy className="mr-1 h-3.5 w-3.5 shrink-0" />
            {printing && duplicateCopy ? "…" : "Duplicate"}
          </Button>
          <Button
            size="sm"
            className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            onClick={() => setReturnOpen(true)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5 shrink-0" />
            Return
          </Button>
          <Link href="/shop/returns" className="min-w-0">
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full justify-center rounded-lg px-2 text-xs sm:text-sm"
            >
              <History className="mr-1 h-3.5 w-3.5 shrink-0" />
              History
            </Button>
          </Link>
        </div>

        <InvoiceReturnPanel
          saleId={sale.id}
          billNumber={sale.billNumber ?? null}
          customerName={sale.customerName}
          hideActions
          returnOpen={returnOpen}
          onReturnOpenChange={setReturnOpen}
        />

        {sale.paymentStatus && sale.paymentStatus !== "PAID" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            Paid {formatINR(sale.paidAmountPaise ?? 0)} of {formatINR(sale.totalPaise ?? invoice.totalPaise)}
          </div>
        ) : null}
      </div>

      <div className="shop-invoice-print-mount mx-auto flex max-w-lg justify-center px-3 pb-8 sm:px-4">
        <div className="flex justify-center rounded-lg bg-muted/40 py-3">
          <InvoicePreviewRoot
            paperSize={template.paperSize}
            printMarginMm={template.printMarginMm}
            framed
          >
            <ShopInvoicePrint
              invoice={invoice}
              template={template}
              compact={layout.compact}
              barcodeHeight={layout.barcodeHeight}
              duplicateCopy={duplicateCopy}
            />
          </InvoicePreviewRoot>
        </div>
      </div>
    </>
  );
}
