"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
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

type SaleDetail = ShopInvoiceData & {
  id: string;
  issueInvoice: boolean;
  notes: string | null;
  pricingJson?: unknown;
  paidAmountPaise?: string;
  paymentStatus?: string;
  organization: { name: string };
  createdBy: { name: string };
  itemsJson: { name: string; qty: number; priceRupees: number }[];
};

export default function ShopInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const template = useShopInvoiceTemplate();
  const layout = resolvePaperLayout(template.paperSize, template.printMarginMm);
  const { printInvoice, PrintLayer } = useShopInvoicePrint();

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
          <InvoiceReturnPanel saleId={data.id} billNumber={data.billNumber} />
        </div>
        <div className="flex justify-center">
          <InvoicePreviewRoot
            paperSize={template.paperSize}
            printMarginMm={template.printMarginMm}
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
