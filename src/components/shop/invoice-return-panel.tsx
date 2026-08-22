"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR, rupeesToPaise } from "@/lib/finance/money";

type ReturnableLine = {
  lineKey: string;
  productName: string;
  barcode: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPriceRupees: number;
};

const REASONS = [
  { id: "DAMAGED", label: "Damaged" },
  { id: "DEFECTIVE", label: "Defective" },
  { id: "WRONG_PRODUCT", label: "Wrong product" },
  { id: "CUSTOMER_CHANGED_MIND", label: "Customer changed mind" },
  { id: "OTHER", label: "Other" },
] as const;

const REFUND_METHODS = ["CASH", "UPI", "BANK", "CARD", "CREDIT", "OTHER"] as const;

export function InvoiceReturnPanel({
  saleId,
  billNumber,
}: {
  saleId: string;
  billNumber: string | null;
}) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [open, setOpen] = useState(false);
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>("CUSTOMER_CHANGED_MIND");
  const [notes, setNotes] = useState("");
  const [refundMethod, setRefundMethod] =
    useState<(typeof REFUND_METHODS)[number]>("CASH");
  const [mode, setMode] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [exchangeItems, setExchangeItems] = useState<
    { name: string; qty: number; priceRupees: number; inventoryItemId?: string }[]
  >([]);
  const [exchangeInvId, setExchangeInvId] = useState("");
  const [exchangeQty, setExchangeQty] = useState("1");

  const inventoryQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ id: string; name: string; sellPaise: string | null }[]>(
        "/api/v1/shop/inventory"
      ),
    enabled: !!orgId && open && mode === "EXCHANGE",
  });

  const linesQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.returns(orgId), "returnable", saleId] : ["disabled"],
    queryFn: () =>
      apiFetch<ReturnableLine[]>(`/api/v1/shop/returns/returnable/${saleId}`),
    enabled: !!orgId && open,
  });

  const returnMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/returns", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.returns(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.invoices(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
      }
      setOpen(false);
      setQtyByLine({});
    },
    onError: applyError,
  });

  async function submitReturn() {
    clear();
    const lines = (linesQuery.data ?? [])
      .map((line) => ({
        lineKey: line.lineKey,
        returnQty: Number(qtyByLine[line.lineKey] ?? 0),
      }))
      .filter((l) => l.returnQty > 0);
    if (lines.length === 0) return showWarning("Enter quantity to return");
    await returnMutation.mutateAsync({
      shopSaleId: saleId,
      type: mode,
      reason,
      notes: notes.trim() || undefined,
      refundMethod,
      lines,
      ...(mode === "EXCHANGE" && exchangeItems.length
        ? {
            exchangeItems,
            exchangePaymentMethod: refundMethod,
          }
        : {}),
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
          Return / Exchange
        </Button>
        <Link href="/shop/returns">
          <Button variant="ghost" className="rounded-xl">
            Return history
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border p-4 print:hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Return — {billNumber ?? saleId.slice(0, 8)}</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <FormFeedback warning={warning} error={error} />

      {linesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading items…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-2">Product</th>
                <th className="pb-2 pr-2">Sold</th>
                <th className="pb-2 pr-2">Returned</th>
                <th className="pb-2 pr-2">Remaining</th>
                <th className="pb-2 pr-2">Rate</th>
                <th className="pb-2">Return qty</th>
              </tr>
            </thead>
            <tbody>
              {(linesQuery.data ?? []).map((line) => (
                <tr key={line.lineKey} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <p className="font-medium">{line.productName}</p>
                    {line.barcode && (
                      <p className="text-xs text-muted-foreground">{line.barcode}</p>
                    )}
                  </td>
                  <td className="py-2 pr-2">{line.originalQty}</td>
                  <td className="py-2 pr-2">{line.returnedQty}</td>
                  <td className="py-2 pr-2">{line.remainingQty}</td>
                  <td className="py-2 pr-2">{formatINR(rupeesToPaise(line.unitPriceRupees))}</td>
                  <td className="py-2">
                    <Input
                      type="number"
                      min={0}
                      max={line.remainingQty}
                      step="0.01"
                      disabled={line.remainingQty <= 0}
                      value={qtyByLine[line.lineKey] ?? ""}
                      onChange={(e) =>
                        setQtyByLine((prev) => ({
                          ...prev,
                          [line.lineKey]: e.target.value,
                        }))
                      }
                      className="h-9 w-20 rounded-lg"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        {(["RETURN", "EXCHANGE"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setMode(m)}
          >
            {m === "RETURN" ? "Return" : "Exchange"}
          </Button>
        ))}
      </div>

      {mode === "EXCHANGE" && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-sm font-medium">Replacement products</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={exchangeInvId}
              onChange={(e) => setExchangeInvId(e.target.value)}
              className="h-9 min-w-[160px] flex-1 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">Select product</option>
              {(inventoryQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              value={exchangeQty}
              onChange={(e) => setExchangeQty(e.target.value)}
              className="h-9 w-16 rounded-lg"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => {
                const item = inventoryQuery.data?.find((i) => i.id === exchangeInvId);
                if (!item) return;
                const priceRupees = item.sellPaise
                  ? Number(item.sellPaise) / 100
                  : 0;
                setExchangeItems((prev) => [
                  ...prev,
                  {
                    name: item.name,
                    qty: Number(exchangeQty) || 1,
                    priceRupees,
                    inventoryItemId: item.id,
                  },
                ]);
                setExchangeInvId("");
              }}
            >
              Add
            </Button>
          </div>
          {exchangeItems.length > 0 && (
            <ul className="text-sm text-muted-foreground">
              {exchangeItems.map((e, i) => (
                <li key={`${e.inventoryItemId}-${i}`}>
                  {e.name} × {e.qty} @ ₹{e.priceRupees}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Reason</Label>
          <select
            value={reason}
            onChange={(e) =>
              setReason(e.target.value as (typeof REASONS)[number]["id"])
            }
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Refund method</Label>
          <select
            value={refundMethod}
            onChange={(e) =>
              setRefundMethod(e.target.value as (typeof REFUND_METHODS)[number])
            }
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
          >
            {REFUND_METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "CREDIT" ? "Store credit" : m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-10 rounded-xl"
            placeholder="Optional details"
          />
        </div>
      </div>

      <Button
        className="rounded-xl"
        disabled={returnMutation.isPending}
        onClick={submitReturn}
      >
        {returnMutation.isPending ? "Processing…" : mode === "EXCHANGE" ? "Complete exchange" : "Complete return"}
      </Button>
    </div>
  );
}
