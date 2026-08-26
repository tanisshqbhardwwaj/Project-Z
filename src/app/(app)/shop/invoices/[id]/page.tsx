"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Badge } from "@/components/ui/badge";
=======
>>>>>>> origin/master
import {
  ShopInvoicePrint,
  type ShopInvoiceData,
} from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { formatINR } from "@/lib/finance/money";
import { parsePricingJson } from "@/lib/shop/invoice-pricing";
import { InvoiceReturnPanel } from "@/components/shop/invoice-return-panel";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { useShopInvoicePrint } from "@/hooks/use-shop-invoice-print";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
<<<<<<< HEAD
import {
  buildInvoiceWhatsAppMessage,
  downloadInvoiceViaPrint,
  shareInvoiceOnWhatsApp,
} from "@/lib/shop/invoice-share";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Copy,
  Download,
  MessageCircle,
  Printer,
} from "lucide-react";
=======
>>>>>>> origin/master

type SaleDetail = ShopInvoiceData & {
  id: string;
  issueInvoice: boolean;
  notes: string | null;
  pricingJson?: unknown;
  paidAmountPaise?: string;
  paymentStatus?: string;
  organization: { name: string };
  createdBy: { name: string };
  itemsJson: {
    name: string;
    qty: number;
    priceRupees: number;
    size?: string | null;
    color?: string | null;
    variantLabel?: string | null;
    sku?: string | null;
    barcode?: string | null;
  }[];
};

export default function ShopInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const template = useShopInvoiceTemplate();
  const layout = resolvePaperLayout(template.paperSize, template.printMarginMm);
  const { printInvoice, PrintLayer } = useShopInvoicePrint();
<<<<<<< HEAD
  const { toast } = useToast();
=======
>>>>>>> origin/master

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

<<<<<<< HEAD
  const sale = data;

  const invoice: ShopInvoiceData = {
    orgName: sale.organization.name,
    billNumber: sale.billNumber,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerGstin: sale.customerGstin,
    salesBoyName: sale.salesBoyName,
    paymentMethod: sale.paymentMethod,
    items: sale.itemsJson ?? [],
    totalPaise: sale.totalPaise,
    gstPaise: sale.gstPaise,
    notes: sale.notes,
    pricing: parsePricingJson(sale.pricingJson),
    createdAt: sale.createdAt,
    cashierName: sale.createdBy?.name,
  };

  function shareWhatsApp() {
    const msg = buildInvoiceWhatsAppMessage({
      orgName: sale.organization.name,
      billNumber: sale.billNumber,
      customerName: sale.customerName,
      totalPaise: sale.totalPaise,
      paymentMethod: sale.paymentMethod,
    });
    shareInvoiceOnWhatsApp(msg, sale.customerPhone);
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
      <div className="mx-auto max-w-lg space-y-3 p-3 pb-8 print-hidden sm:p-4">
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
              {formatINR(sale.totalPaise)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(sale.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {sale.customerName?.trim() || "Walk-in"}
            {" · "}
            {String(sale.paymentMethod).replace(/_/g, " ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" className="h-8 rounded-lg" onClick={() => void printInvoice()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={savePdf}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={shareWhatsApp}>
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp
          </Button>
          <Link href={`/shop/invoices/new?duplicate=${sale.id}`}>
            <Button size="sm" variant="outline" className="h-8 rounded-lg">
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
          </Link>
        </div>

        <InvoiceReturnPanel
          saleId={sale.id}
          billNumber={sale.billNumber}
          customerName={sale.customerName}
        />

        {sale.paymentStatus && sale.paymentStatus !== "PAID" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            Paid {formatINR(sale.paidAmountPaise ?? 0)} of {formatINR(sale.totalPaise)}
          </div>
        ) : null}

        <div className="flex justify-center rounded-lg bg-muted/40 py-3">
          <InvoicePreviewRoot
            paperSize={template.paperSize}
            printMarginMm={template.printMarginMm}
            framed
=======
  const invoice: ShopInvoiceData = {
    orgName: data.organization.name,
    billNumber: data.billNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerGstin: data.customerGstin,
    salesBoyName: data.salesBoyName,
    paymentMethod: data.paymentMethod,
    items: data.itemsJson ?? [],
    totalPaise: data.totalPaise,
    gstPaise: data.gstPaise,
    notes: data.notes,
    pricing: parsePricingJson(data.pricingJson),
    createdAt: data.createdAt,
    cashierName: data.createdBy?.name,
  };

  return (
    <>
      <PrintLayer />
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="print-hidden flex items-center justify-between">
          <Link href="/shop/invoices">
            <Button variant="outline" className="rounded-xl">
              Back
            </Button>
          </Link>
          <Button className="rounded-xl" onClick={() => void printInvoice()}>
            PRINT INVOICE
          </Button>
        </div>
        {data.paymentStatus && data.paymentStatus !== "PAID" ? (
          <div className="print-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium">Payment: {data.paymentStatus.replace("_", " ")}</p>
            <p>
              Paid {formatINR(data.paidAmountPaise ?? 0)} of{" "}
              {formatINR(data.totalPaise)}
            </p>
          </div>
        ) : null}
        <div className="print-hidden">
          <InvoiceReturnPanel
            saleId={data.id}
            billNumber={data.billNumber}
            customerName={data.customerName}
          />
        </div>
        <div className="flex justify-center">
          <InvoicePreviewRoot
            paperSize={template.paperSize}
            printMarginMm={template.printMarginMm}
>>>>>>> origin/master
          >
            <ShopInvoicePrint
              invoice={invoice}
              template={template}
              compact={layout.compact}
              barcodeHeight={layout.barcodeHeight}
            />
          </InvoicePreviewRoot>
        </div>
      </div>
    </>
  );
}
