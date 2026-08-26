"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

type PurchasePayment = {
  id: string;
  amountPaise: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
};

type PurchaseDetail = {
  id: string;
  purchaseDate: string;
  billNumber: string | null;
  subtotalPaise: string;
  discountPaise: string;
  taxPaise: string;
  extraChargesPaise: string;
  totalPaise: string;
  paidAmountPaise: string;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  supplier: { name: string; phone: string | null };
  createdBy: { name: string };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    ratePaise: string;
    lineTotalPaise: string;
  }>;
  payments?: PurchasePayment[];
};

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK", "OTHER"] as const;

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const role = useAuthStore((s) => s.role);
  const canManage = hasPermission(role as OrgRole, "shop.purchase.manage");
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [payNotes, setPayNotes] = useState("");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.purchases(orgId), id] : ["disabled"],
    queryFn: () => apiFetch<PurchaseDetail>(`/api/v1/shop/purchases/${id}`),
    enabled: !!orgId && !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiFetch(`/api/v1/shop/purchases/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.purchases(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
      }
      router.push("/shop/purchases");
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      apiFetch<PurchaseDetail>(`/api/v1/shop/purchases/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountRupees: Number(payAmount),
          paymentMethod: payMethod,
          notes: payNotes.trim() || undefined,
        }),
      }),
    onSuccess: (updated) => {
      if (orgId) {
        qc.setQueryData([...queryKeys.modules.shop.purchases(orgId), id], updated);
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.purchases(orgId) });
      }
      setPayAmount("");
      setPayNotes("");
      clear();
    },
    onError: (err) => applyError(err, "Failed to add payment"),
  });

  if (isLoading) return <PageLoader label="Loading purchase..." />;
  if (loadError || !data) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-destructive">{loadError instanceof Error ? loadError.message : "Not found"}</p>
        <Link href="/shop/purchases"><Button variant="outline" className="rounded-xl">Back</Button></Link>
      </div>
    );
  }

  const totalPaise = BigInt(data.totalPaise);
  const paidPaise = BigInt(data.paidAmountPaise);
  const duePaise = totalPaise - paidPaise;
  const canAddPayment =
    canManage && data.status === "ACTIVE" && duePaise > BigInt(0);
  const payments = data.payments ?? [];

  async function handleCancel() {
    if (!confirm("Cancel this purchase? Stock quantities will be reversed.")) return;
    await cancelMutation.mutateAsync();
  }

  async function handleAddPayment() {
    clear();
    if (!payAmount || Number(payAmount) <= 0) {
      showWarning("Enter a valid payment amount");
      return;
    }
    await payMutation.mutateAsync();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase details</h1>
          <p className="text-sm text-muted-foreground">
            {data.supplier.name} · {new Date(data.purchaseDate).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Link href="/shop/purchases"><Button variant="outline" className="rounded-xl">Back</Button></Link>
      </div>

      <FormFeedback warning={warning} error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Bill number:</span> {data.billNumber ?? "—"}</p>
          <p><span className="text-muted-foreground">Status:</span> {data.status}</p>
          <p><span className="text-muted-foreground">Payment:</span> {data.paymentStatus} · {data.paymentMethod}</p>
          <p><span className="text-muted-foreground">Created by:</span> {data.createdBy.name}</p>
          {data.notes && <p><span className="text-muted-foreground">Notes:</span> {data.notes}</p>}
          <div className="mt-3 space-y-1 border-t pt-3">
            <p>Subtotal: {formatINR(data.subtotalPaise)}</p>
            {Number(data.discountPaise) > 0 && <p>Discount: −{formatINR(data.discountPaise)}</p>}
            {Number(data.taxPaise) > 0 && <p>Tax: {formatINR(data.taxPaise)}</p>}
            {Number(data.extraChargesPaise) > 0 && <p>Extra: {formatINR(data.extraChargesPaise)}</p>}
            <p className="text-lg font-semibold">Total: {formatINR(data.totalPaise)}</p>
            <p>Paid: {formatINR(data.paidAmountPaise)}</p>
            {duePaise > BigInt(0) && (
              <p className="font-medium text-amber-800">Due: {formatINR(duePaise)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {(canAddPayment || payments.length > 0) && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Payment history</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium tabular-nums">{formatINR(p.amountPaise)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paymentMethod} · {p.createdBy.name}
                      </p>
                      {p.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {canAddPayment && (
              <div className="space-y-3 rounded-xl border border-dashed p-4">
                <p className="text-sm font-medium">Add payment</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="h-10 rounded-xl"
                      placeholder={String(Number(duePaise) / 100)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Method</Label>
                    <select
                      value={payMethod}
                      onChange={(e) =>
                        setPayMethod(e.target.value as (typeof PAYMENT_METHODS)[number])
                      }
                      className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Note (optional)</Label>
                    <Input
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="h-10 rounded-xl"
                      placeholder="e.g. UPI ref / cheque no."
                    />
                  </div>
                </div>
                <Button
                  className="rounded-xl"
                  disabled={payMutation.isPending}
                  onClick={handleAddPayment}
                >
                  {payMutation.isPending ? "Saving…" : "Record payment"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Rate</th>
                <th className="pb-2 font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">{formatINR(item.ratePaise)}</td>
                  <td className="py-2">{formatINR(item.lineTotalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {canManage && data.status === "ACTIVE" && (
        <Button
          variant="destructive"
          className="rounded-xl"
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? "Cancelling…" : "Cancel purchase"}
        </Button>
      )}
    </div>
  );
}
