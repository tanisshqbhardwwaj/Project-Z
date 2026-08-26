"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/finance/money";
import { ReturnExchangeWizard } from "@/components/shop/return-exchange-wizard";
<<<<<<< HEAD
import { History, Repeat, RotateCcw } from "lucide-react";
=======
import { Repeat, RotateCcw } from "lucide-react";
>>>>>>> origin/master

type ReturnRow = {
  id: string;
  returnNumber: string;
  type: string;
  returnValuePaise: string;
  exchangeValuePaise: string;
  refundAmountPaise: string;
  additionalPaidPaise: string;
  createdAt: string;
  lines: { productName: string; size: string | null; returnQty: number; isExchangeIn: boolean }[];
};

/**
 * Return / exchange entry point on an invoice, plus the receipts already raised
 * against it. The invoice itself is read-only history.
 */
export function InvoiceReturnPanel({
  saleId,
  billNumber,
  customerName,
}: {
  saleId: string;
  billNumber: string | null;
  customerName?: string | null;
}) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [open, setOpen] = useState(false);

  const historyQuery = useQuery({
    queryKey: orgId
      ? [...queryKeys.modules.shop.returns(orgId), "for-sale", saleId]
      : ["disabled"],
    queryFn: () =>
      apiFetch<ReturnRow[]>(`/api/v1/shop/returns?shopSaleId=${saleId}`),
    enabled: !!orgId,
  });

  const history = historyQuery.data ?? [];

<<<<<<< HEAD
  const actions = (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" className="h-8 rounded-lg" onClick={() => setOpen(true)}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Return
      </Button>
      <Link href="/shop/returns">
        <Button size="sm" variant="outline" className="h-8 rounded-lg">
          <History className="mr-1.5 h-3.5 w-3.5" />
          History
        </Button>
      </Link>
    </div>
  );

  const historyBlock =
    history.length > 0 ? (
      <div className="space-y-1.5 rounded-lg border px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Returns on this bill
        </p>
        <ul className="space-y-2">
          {history.map((row) => {
            const returned = row.lines.filter((l) => !l.isExchangeIn);
            const replacements = row.lines.filter((l) => l.isExchangeIn);
            return (
              <li key={row.id} className="rounded-md bg-muted/30 px-2 py-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/shop/returns/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.returnNumber}
                  </Link>
                  <Badge
                    variant={row.type === "EXCHANGE" ? "default" : "secondary"}
                    className="rounded-full text-[10px]"
                  >
                    {row.type === "EXCHANGE" ? (
                      <>
                        <Repeat className="mr-1 h-3 w-3" />
                        Exchange
                      </>
                    ) : (
                      "Return"
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Returned:{" "}
                  {returned
                    .map(
                      (l) =>
                        `${l.productName}${l.size ? ` (Size ${l.size})` : ""} × ${l.returnQty}`
                    )
                    .join(", ") || "—"}
                </p>
                {replacements.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Replacement:{" "}
                    {replacements
=======
  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-xl" onClick={() => setOpen(true)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Return / Exchange
        </Button>
        <Link href="/shop/returns">
          <Button variant="outline" className="rounded-xl">
            Return history
          </Button>
        </Link>
      </div>

      {history.length > 0 ? (
        <div className="space-y-2 rounded-2xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Already raised against this bill
          </p>
          <ul className="space-y-2">
            {history.map((row) => {
              const returned = row.lines.filter((l) => !l.isExchangeIn);
              const replacements = row.lines.filter((l) => l.isExchangeIn);
              return (
                <li key={row.id} className="rounded-xl bg-muted/30 p-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/shop/returns/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.returnNumber}
                    </Link>
                    <Badge
                      variant={row.type === "EXCHANGE" ? "default" : "secondary"}
                      className="rounded-full text-[10px]"
                    >
                      {row.type === "EXCHANGE" ? (
                        <>
                          <Repeat className="mr-1 h-3 w-3" />
                          Exchange
                        </>
                      ) : (
                        "Return"
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Returned:{" "}
                    {returned
>>>>>>> origin/master
                      .map(
                        (l) =>
                          `${l.productName}${l.size ? ` (Size ${l.size})` : ""} × ${l.returnQty}`
                      )
<<<<<<< HEAD
                      .join(", ")}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs">
                  {BigInt(row.refundAmountPaise) > BigInt(0)
                    ? `Refunded ${formatINR(row.refundAmountPaise)}`
                    : BigInt(row.additionalPaidPaise) > BigInt(0)
                      ? `Customer paid ${formatINR(row.additionalPaidPaise)}`
                      : "Even exchange"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <div className="space-y-2 print:hidden">
      {actions}
      {historyBlock}
=======
                      .join(", ") || "—"}
                  </p>
                  {replacements.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Replacement:{" "}
                      {replacements
                        .map(
                          (l) =>
                            `${l.productName}${l.size ? ` (Size ${l.size})` : ""} × ${l.returnQty}`
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs">
                    {BigInt(row.refundAmountPaise) > BigInt(0)
                      ? `Refunded ${formatINR(row.refundAmountPaise)}`
                      : BigInt(row.additionalPaidPaise) > BigInt(0)
                        ? `Customer paid ${formatINR(row.additionalPaidPaise)}`
                        : "Even exchange"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
>>>>>>> origin/master

      <ReturnExchangeWizard
        saleId={saleId}
        billNumber={billNumber}
        customerName={customerName}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
