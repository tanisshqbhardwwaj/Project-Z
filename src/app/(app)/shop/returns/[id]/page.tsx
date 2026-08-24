"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopInvoicePrint } from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { returnReceiptToShopInvoice } from "@/lib/shop/return-invoice-mapper";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { useShopInvoicePrint } from "@/hooks/use-shop-invoice-print";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
import { ArrowRight, Printer, Repeat, RotateCcw } from "lucide-react";

type ReturnLine = {
  id: string;
  productName: string;
  size: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unitLabel: string | null;
  originalQty: number;
  returnQty: number;
  unitPricePaise: string;
  lineRefundPaise: string;
  isExchangeIn: boolean;
};

type ReturnReceipt = {
  id: string;
  returnNumber: string;
  type: "RETURN" | "EXCHANGE";
  returnValuePaise: string;
  exchangeValuePaise: string;
  additionalPaidPaise: string;
  refundAmountPaise: string;
  refundMethod: string;
  reason: string;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  staffName: string | null;
  createdAt: string;
  lines: ReturnLine[];
  shopSale: {
    id: string;
    billNumber: string | null;
    customerName: string | null;
    totalPaise: string;
    createdAt: string;
  };
  createdBy: { name: string };
  staff: { id: string; name: string; roleTitle: string } | null;
  organization: { name: string };
  exchangeSale: { id: string; billNumber: string | null } | null;
};

function LineList({
  title,
  lines,
  emptyLabel,
}: {
  title: string;
  lines: ReturnLine[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{line.productName}</p>
                {line.variantLabel || line.size ? (
                  <p className="text-sm font-medium text-primary">
                    {line.variantLabel ?? `Size ${line.size}`}
                  </p>
                ) : null}
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {line.returnQty} {line.unitLabel ?? "pcs"} @{" "}
                    {formatINR(line.unitPricePaise)}
                  </span>
                  {line.barcode ? (
                    <code className="font-mono text-[10px]">{line.barcode}</code>
                  ) : line.sku ? (
                    <code className="font-mono text-[10px]">{line.sku}</code>
                  ) : null}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatINR(line.lineRefundPaise)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReturnReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const template = useShopInvoiceTemplate();
  const layout = resolvePaperLayout(template.paperSize, template.printMarginMm);
  const { printInvoice, PrintLayer } = useShopInvoicePrint();

  const { data, isLoading, error } = useQuery({
    queryKey: orgId
      ? [...queryKeys.modules.shop.returns(orgId), "receipt", id]
      : ["disabled"],
    queryFn: () => apiFetch<ReturnReceipt>(`/api/v1/shop/returns/${id}`),
    enabled: !!orgId && !!id,
  });

  if (isLoading) return <PageLoader label="Loading receipt..." />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Receipt not found"}
        </p>
        <Link href="/shop/returns">
          <Button variant="outline" className="rounded-xl">
            Back to return history
          </Button>
        </Link>
      </div>
    );
  }

  const returned = data.lines.filter((l) => !l.isExchangeIn);
  const replacements = data.lines.filter((l) => l.isExchangeIn);
  const isExchange = data.type === "EXCHANGE";
  const refund = BigInt(data.refundAmountPaise);
  const extra = BigInt(data.additionalPaidPaise);
  const printInvoiceData = returnReceiptToShopInvoice(data);

  return (
    <>
      <PrintLayer />
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/shop/returns">
          <Button variant="outline" className="rounded-xl">
            Back
          </Button>
        </Link>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => void printInvoice()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print {isExchange ? "exchange invoice" : "credit note"}
        </Button>
      </div>

      <div className="print:hidden flex justify-center">
        <InvoicePreviewRoot
          paperSize={template.paperSize}
          printMarginMm={template.printMarginMm}
        >
          <ShopInvoicePrint
            invoice={printInvoiceData}
            template={template}
            compact={layout.compact}
            barcodeHeight={layout.barcodeHeight}
          />
        </InvoicePreviewRoot>
      </div>

      <Card className="rounded-2xl border-0 shadow-md print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {isExchange ? (
                  <Repeat className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
                {data.returnNumber}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.organization.name} ·{" "}
                {new Date(data.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
            <Badge
              variant={isExchange ? "default" : "secondary"}
              className="rounded-full"
            >
              {isExchange ? "Exchange receipt" : "Return receipt"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Original bill → returned → replacement → difference */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
            <span className="font-medium">
              Original bill {data.shopSale.billNumber ?? "—"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Returned {returned.length} item{returned.length === 1 ? "" : "s"}</span>
            {isExchange ? (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Replaced with {replacements.length} item
                  {replacements.length === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {extra > BigInt(0)
                ? `Customer paid ${formatINR(data.additionalPaidPaise)}`
                : refund > BigInt(0)
                  ? `Refunded ${formatINR(data.refundAmountPaise)}`
                  : "No amount due"}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">
                {data.customerName ?? data.shopSale.customerName ?? "Walk-in"}
              </p>
              {data.customerPhone ? (
                <p className="text-xs text-muted-foreground">{data.customerPhone}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Processed by</p>
              <p className="font-medium">
                {data.staff?.name ?? data.staffName ?? data.createdBy.name}
              </p>
              {data.staff?.roleTitle ? (
                <p className="text-xs text-muted-foreground">
                  {data.staff.roleTitle}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Original bill</p>
              <Link
                href={`/shop/invoices/${data.shopSale.id}`}
                className="font-medium text-primary hover:underline"
              >
                {data.shopSale.billNumber ?? data.shopSale.id.slice(0, 8)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatINR(data.shopSale.totalPaise)} on{" "}
                {new Date(data.shopSale.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reason</p>
              <p className="font-medium capitalize">
                {data.reason.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
          </div>

          <LineList
            title="Returned items"
            lines={returned}
            emptyLabel="No items returned"
          />

          {isExchange ? (
            <LineList
              title="Replacement items"
              lines={replacements}
              emptyLabel="No replacement recorded"
            />
          ) : null}

          <div className="space-y-1.5 rounded-xl border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Original item value</span>
              <span className="tabular-nums">
                {formatINR(data.returnValuePaise)}
              </span>
            </div>
            {isExchange ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Replacement value</span>
                <span className="tabular-nums">
                  {formatINR(data.exchangeValuePaise)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Additional paid</span>
              <span className="tabular-nums">
                {formatINR(data.additionalPaidPaise)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Refund / credit</span>
              <span className="tabular-nums">
                {formatINR(data.refundAmountPaise)}
              </span>
            </div>
            <div
              className={cn(
                "mt-1 flex items-center justify-between rounded-lg border-t px-2 py-2 text-base font-semibold",
                extra > BigInt(0)
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              )}
            >
              <span>
                {extra > BigInt(0)
                  ? "Collected from customer"
                  : refund > BigInt(0)
                    ? "Given to customer"
                    : "Settled — nothing due"}
              </span>
              <span className="tabular-nums">
                {formatINR(extra > BigInt(0) ? data.additionalPaidPaise : data.refundAmountPaise)}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Payment method: {data.refundMethod === "CREDIT" ? "Store credit" : data.refundMethod}
            </p>
          </div>

          {data.notes ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-0.5">{data.notes}</p>
            </div>
          ) : null}

          {data.exchangeSale ? (
            <p className="text-xs text-muted-foreground">
              Linked exchange invoice:{" "}
              <Link
                href={`/shop/invoices/${data.exchangeSale.id}`}
                className="text-primary hover:underline"
              >
                {data.exchangeSale.billNumber ?? data.exchangeSale.id.slice(0, 8)}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
