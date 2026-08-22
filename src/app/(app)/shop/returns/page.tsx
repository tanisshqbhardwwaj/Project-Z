"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/finance/money";

type ReturnRow = {
  id: string;
  returnNumber: string;
  type: string;
  refundAmountPaise: string;
  refundMethod: string;
  reason: string;
  createdAt: string;
  shopSale: { id: string; billNumber: string | null; customerName: string | null };
  lines: { productName: string; returnQty: number }[];
  createdBy: { name: string };
};

export default function ShopReturnsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.returns(orgId) : ["disabled"],
    queryFn: () => apiFetch<ReturnRow[]>("/api/v1/shop/returns"),
    enabled: !!orgId,
  });

  if (isLoading) return <PageLoader label="Loading returns..." />;
  if (error) {
    return (
      <p className="p-8 text-destructive">
        {error instanceof Error ? error.message : "Failed to load returns"}
      </p>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Return history</h1>
          <p className="text-sm text-muted-foreground">
            Returns and exchanges processed from invoices
          </p>
        </div>
        <Link href="/shop/invoices">
          <Button variant="outline" className="rounded-xl">
            Invoices
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {(data ?? []).length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">
              No returns yet. Open an invoice and use Return / Exchange.
            </CardContent>
          </Card>
        ) : (
          (data ?? []).map((row) => (
            <Card key={row.id} className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span>{row.returnNumber}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {row.type} · {row.shopSale.billNumber ?? "Invoice"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Customer: {row.shopSale.customerName ?? "Walk-in"} · Refund{" "}
                  {formatINR(row.refundAmountPaise)} via {row.refundMethod}
                </p>
                <p className="text-muted-foreground">
                  {row.lines.map((l) => `${l.productName} × ${l.returnQty}`).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.reason.replace(/_/g, " ")} · {new Date(row.createdAt).toLocaleString()} ·{" "}
                  {row.createdBy.name}
                </p>
                <Link
                  href={`/shop/invoices/${row.shopSale.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View invoice
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
