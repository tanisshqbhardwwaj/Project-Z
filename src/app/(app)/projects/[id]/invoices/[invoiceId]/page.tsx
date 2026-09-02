"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/finance/money-display";
import { InvoiceLivePreview } from "@/components/shop/invoice-live-preview";
import { projectInvoiceToShopInvoice } from "@/lib/project/project-invoice-mapper";
import type { NormalizedProjectInvoice } from "@/lib/project/project-invoice-mapper";
import { useShopInvoicePrint } from "@/hooks/use-shop-invoice-print";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { getProjectDisplayName } from "@/lib/project/display-name";
import type { InvoicePaperSize } from "@/lib/org/shop-settings";
import { previewRailWidthClass } from "@/lib/shop/print/invoice-print-layout";
import { cn } from "@/lib/utils";

type ProjectInvoiceDetail = {
  id: string;
  billNumber: string;
  clientName: string | null;
  clientPhone: string | null;
  clientGstin: string | null;
  totalPaise: string;
  gstPaise: string;
  paymentMethod: string;
  notes: string | null;
  itemsJson: unknown;
  pricingJson: unknown;
  createdAt: string;
  organization: { name: string };
  createdBy: { name: string };
  project: {
    id: string;
    name: string;
    nickname?: string | null;
  };
};

function ProjectInvoiceDetailContent() {
  const params = useParams();
  const projectId = params.id as string;
  const invoiceId = params.invoiceId as string;
  const { activeOrganizationName } = useAuthStore();
  const template = useShopInvoiceTemplate();
  const [paperSize, setPaperSize] = useState<InvoicePaperSize>(template.paperSize);
  const [printMarginMm, setPrintMarginMm] = useState(template.printMarginMm);

  const { data: invoice, loading, error } = useFetch(
    `project:${projectId}:invoice:${invoiceId}`,
    () =>
      apiFetch<ProjectInvoiceDetail>(
        `/api/v1/projects/${projectId}/invoices/${invoiceId}`
      )
  );

  const { printInvoice, PrintLayer } = useShopInvoicePrint({ paperSize, printMarginMm });

  const printData = useMemo(() => {
    if (!invoice) return null;
    return projectInvoiceToShopInvoice(invoice as NormalizedProjectInvoice, {
      orgName: invoice.organization?.name ?? activeOrganizationName,
    });
  }, [invoice, activeOrganizationName]);

  if (loading) return <PageLoader label="Loading invoice…" />;
  if (error || !invoice || !printData) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "Invoice not found"}</p>
        <Link href={`/projects/${projectId}?tab=invoices`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/projects/${projectId}?tab=invoices`} className="hover:underline">
              {getProjectDisplayName(invoice.project)}
            </Link>
            {" · "}Client invoice
          </p>
          <h1 className="text-2xl font-bold">{invoice.billNumber}</h1>
          <p className="text-muted-foreground">
            {invoice.clientName ?? "—"} ·{" "}
            {new Date(invoice.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 rounded-xl" onClick={() => void printInvoice()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Link href={`/projects/${projectId}?tab=invoices`}>
            <Button variant="outline" className="h-11 rounded-xl">
              Back to list
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <MoneyDisplay paise={invoice.totalPaise} className="text-xl font-semibold" />
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">GST</p>
          <MoneyDisplay paise={invoice.gstPaise} className="text-xl font-semibold" />
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payment</p>
          <p className="text-xl font-semibold">
            {String(invoice.paymentMethod).replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div className={cn("w-fit max-w-full", previewRailWidthClass(paperSize))}>
        <InvoiceLivePreview
          invoice={printData}
          paperSize={paperSize}
          printMarginMm={printMarginMm}
          showPaperSizeControls
          onPaperSizeChange={setPaperSize}
          onPrintMarginChange={setPrintMarginMm}
        />
      </div>

      <PrintLayer />
    </div>
  );
}

export default function ProjectInvoiceDetailPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <ProjectInvoiceDetailContent />
    </Suspense>
  );
}
