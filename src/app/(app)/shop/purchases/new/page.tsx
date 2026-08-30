"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import { newLineId } from "@/lib/shop/invoice-cart";
import {
  VariantSelect,
  variantOptionText,
} from "@/components/shop/variant-picker";

type Supplier = { id: string; name: string };
type InventoryItem = {
  id: string;
  name: string;
  costPaise: string | null;
  sellPaise: string | null;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  quantity: number;
  product?: { id: string; name: string; brand: string | null } | null;
};

type PurchaseLine = {
  id: string;
  inventoryItemId: string;
  productName: string;
  quantity: string;
  rateRupees: string;
};

const PAYMENT_METHODS = ["CASH", "UPI", "BANK", "CARD"] as const;

export default function NewPurchasePage() {
  const router = useRouter();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules, role } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "shop_purchases");
  const canManage = hasPermission(role as OrgRole, "shop.purchase.manage");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();
  const submitLock = useRef(false);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [billNumber, setBillNumber] = useState("");
  const [discountRupees, setDiscountRupees] = useState("");
  const [taxRupees, setTaxRupees] = useState("");
  const [extraChargesRupees, setExtraChargesRupees] = useState("");
  const [paidRupees, setPaidRupees] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: newLineId(), inventoryItemId: "", productName: "", quantity: "1", rateRupees: "" },
  ]);

  const suppliersQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.suppliers(orgId) : ["disabled"],
    queryFn: () => apiFetch<Supplier[]>("/api/v1/shop/suppliers"),
    enabled: !!orgId && enabled,
  });

  const inventoryQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && enabled,
  });

  const createSupplierMutation = useMutation({
    mutationFn: (body: { name: string }) =>
      apiFetch<Supplier>("/api/v1/shop/suppliers", { method: "POST", body: JSON.stringify(body) }),
  });

  const createPurchaseMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/purchases", { method: "POST", body: JSON.stringify(body) }),
  });

  const lineSubtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const q = Number(line.quantity);
      const r = Number(line.rateRupees);
      if (!Number.isFinite(q) || !Number.isFinite(r)) return sum;
      return sum + q * r;
    }, 0);
  }, [lines]);

  const totalRupees = useMemo(() => {
    const d = Number(discountRupees) || 0;
    const t = Number(taxRupees) || 0;
    const e = Number(extraChargesRupees) || 0;
    return Math.max(0, lineSubtotal - d + t + e);
  }, [lineSubtotal, discountRupees, taxRupees, extraChargesRupees]);

  if (!enabled || !canManage) {
    return <p className="text-muted-foreground">Purchase entry is available to the store owner only.</p>;
  }

  if (suppliersQuery.isLoading || inventoryQuery.isLoading) {
    return <PageLoader label="Loading purchase form..." />;
  }

  function updateLine(id: string, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function pickProduct(lineId: string, itemId: string) {
    const item = (inventoryQuery.data ?? []).find((i) => i.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      inventoryItemId: itemId,
      // Stock goes onto a specific variant, so the line records which size.
      productName: variantOptionText(item),
      rateRupees: item.costPaise ? String(Number(item.costPaise) / 100) : "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (submitLock.current) return;
    if (!supplierId && !newSupplierName.trim()) {
      return showWarning("Select or create a supplier");
    }
    const validLines = lines.filter(
      (l) => l.productName.trim() && Number(l.quantity) > 0 && Number(l.rateRupees) >= 0
    );
    if (validLines.length === 0) return showWarning("Add at least one product line");

    submitLock.current = true;
    try {
      let resolvedSupplierId = supplierId;
      if (!resolvedSupplierId) {
        const supplier = await createSupplierMutation.mutateAsync({
          name: newSupplierName.trim(),
        });
        resolvedSupplierId = supplier.id;
        if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.suppliers(orgId) });
      }

      const idempotencyKey = `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await createPurchaseMutation.mutateAsync({
        supplierId: resolvedSupplierId,
        purchaseDate,
        billNumber: billNumber.trim() || null,
        lines: validLines.map((l) => ({
          inventoryItemId: l.inventoryItemId || null,
          productName: l.productName.trim(),
          quantity: Number(l.quantity),
          rateRupees: Number(l.rateRupees),
        })),
        discountRupees: Number(discountRupees) || 0,
        taxRupees: Number(taxRupees) || 0,
        extraChargesRupees: Number(extraChargesRupees) || 0,
        paidRupees: paidRupees ? Number(paidRupees) : totalRupees,
        paymentMethod,
        notes: notes.trim() || null,
        idempotencyKey,
      }) as { id: string };

      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.purchases(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
      }
      router.push(result?.id ? `/shop/purchases/${result.id}` : "/shop/purchases");
    } catch (err) {
      applyError(err, "Failed to save purchase");
      submitLock.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">New purchase</h1>
          <p className="text-sm text-muted-foreground">Stock received from supplier</p>
        </div>
        <Link href="/shop/purchases">
          <Button variant="outline" className="rounded-xl">Back</Button>
        </Link>
      </div>

      <FormFeedback warning={warning} error={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Supplier & bill</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Select supplier…</option>
                {(suppliersQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {!supplierId && (
              <div className="space-y-2">
                <Label>Or new supplier name</Label>
                <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} className="h-11 rounded-xl" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Purchase date</Label>
                <DatePicker value={purchaseDate} onChange={setPurchaseDate} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Bill / invoice number</Label>
                <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <VariantSelect
                    options={inventoryQuery.data ?? []}
                    value={line.inventoryItemId}
                    onChange={(itemId) => pickProduct(line.id, itemId)}
                    placeholder="Select product / size…"
                    showPrice={false}
                  />
                </div>
                <Input
                  value={line.productName}
                  onChange={(e) => updateLine(line.id, { productName: e.target.value })}
                  placeholder="Product name"
                  className="h-10 rounded-lg sm:col-span-3"
                />
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                  placeholder="Qty"
                  className="h-10 rounded-lg sm:col-span-2"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.rateRupees}
                  onChange={(e) => updateLine(line.id, { rateRupees: e.target.value })}
                  placeholder="Rate ₹"
                  className="h-10 rounded-lg sm:col-span-2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="sm:col-span-1"
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                  disabled={lines.length <= 1}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { id: newLineId(), inventoryItemId: "", productName: "", quantity: "1", rateRupees: "" },
                ])
              }
            >
              Add line
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Amounts & payment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Discount ₹</Label>
                <Input type="number" min="0" value={discountRupees} onChange={(e) => setDiscountRupees(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Tax/GST ₹</Label>
                <Input type="number" min="0" value={taxRupees} onChange={(e) => setTaxRupees(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Extra charges ₹</Label>
                <Input type="number" min="0" value={extraChargesRupees} onChange={(e) => setExtraChargesRupees(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Paid ₹</Label>
                <Input type="number" min="0" value={paidRupees} onChange={(e) => setPaidRupees(e.target.value)} placeholder={String(totalRupees)} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Payment method</Label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-lg font-semibold">Total: ₹{totalRupees.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="h-12 w-full rounded-xl" disabled={createPurchaseMutation.isPending}>
          {createPurchaseMutation.isPending ? "Saving…" : "Save purchase"}
        </Button>
      </form>
    </div>
  );
}
