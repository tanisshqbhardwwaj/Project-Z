"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR, paiseToRupees } from "@/lib/finance/money";
import {
  formatStockLabel,
  isInfiniteStock,
} from "@/lib/shop/inventory";
import { cn } from "@/lib/utils";
import { PauseCircle, Printer, ScanLine, Trash2 } from "lucide-react";

type SaleLine = {
  id: string;
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  barcode?: string;
};

type HeldBill = {
  id: string;
  label: string;
  customerName: string;
  salesBoyName: string;
  issueInvoice: boolean;
  customerPhone: string;
  customerGstin: string;
  cart: SaleLine[];
  heldAt: number;
};

type ShopSale = {
  id: string;
  billNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerGstin: string | null;
  salesBoyName: string | null;
  issueInvoice: boolean;
  totalPaise: string;
  paymentMethod: string;
  createdAt: string;
  itemsJson: { name: string; qty: number; priceRupees: number }[];
};

type StaffOption = {
  id: string;
  name: string;
  roleTitle: string;
};

type InventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  quantity: number;
  sellPaise: string | null;
  unit: string;
};

const PAYMENT_METHODS = ["CASH", "UPI", "BANK", "CARD"] as const;

function lineTotal(line: SaleLine) {
  return line.qty * line.priceRupees;
}

function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeLineIntoCart(cart: SaleLine[], line: Omit<SaleLine, "id">): SaleLine[] {
  const existingIdx = cart.findIndex((l) =>
    line.inventoryItemId
      ? l.inventoryItemId === line.inventoryItemId && l.priceRupees === line.priceRupees
      : l.name === line.name && l.priceRupees === line.priceRupees && !l.inventoryItemId
  );
  if (existingIdx >= 0) {
    return cart.map((l, i) =>
      i === existingIdx ? { ...l, qty: l.qty + line.qty } : l
    );
  }
  return [...cart, { ...line, id: newLineId() }];
}

function mergeCarts(base: SaleLine[], incoming: SaleLine[]): SaleLine[] {
  return incoming.reduce<SaleLine[]>(
    (acc, line) =>
      mergeLineIntoCart(acc, {
        name: line.name,
        qty: line.qty,
        priceRupees: line.priceRupees,
        inventoryItemId: line.inventoryItemId,
        barcode: line.barcode,
      }),
    base
  );
}

export default function ShopSalesPage() {
  const router = useRouter();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const staffEnabled = isModuleEnabled(enabledModules, "staff");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [salesBoyName, setSalesBoyName] = useState("");
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("CASH");

  const salesQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.sales(orgId) : ["disabled"],
    queryFn: () => apiFetch<ShopSale[]>("/api/v1/shop/sales"),
    enabled: !!orgId && moduleEnabled,
  });

  const inventoryQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && moduleEnabled && inventoryEnabled,
  });

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && moduleEnabled && staffEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ShopSale>("/api/v1/shop/sales", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (sale) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.sales(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
      }
      if (sale.issueInvoice || sale.billNumber) {
        router.push(`/shop/sales/invoice/${sale.id}`);
      }
    },
  });

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + lineTotal(line), 0),
    [cart]
  );

  if (!moduleEnabled) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{title} is optional</h1>
        <p className="text-sm text-muted-foreground">
          Turn on {title.toLowerCase()} in Manage Organization → Features.
        </p>
        <Link href="/settings/organization">
          <Button className="rounded-xl">Manage Organization</Button>
        </Link>
      </div>
    );
  }

  function inventoryQtyInCart(inventoryItemId: string, excludeLineId?: string) {
    return cart
      .filter(
        (line) =>
          line.inventoryItemId === inventoryItemId && line.id !== excludeLineId
      )
      .reduce((sum, line) => sum + line.qty, 0);
  }

  function checkStock(inventoryItemId: string, addQty: number, itemNameForError: string) {
    const inv = (inventoryQuery.data ?? []).find((i) => i.id === inventoryItemId);
    if (!inv || isInfiniteStock(inv.quantity)) return true;
    const alreadyInCart = inventoryQtyInCart(inventoryItemId);
    const remaining = inv.quantity - alreadyInCart;
    if (addQty > remaining) {
      showWarning(
        remaining <= 0
          ? `No stock left for ${itemNameForError}`
          : `Only ${remaining} ${inv.unit} left for ${itemNameForError}`
      );
      return false;
    }
    return true;
  }

  function addInventoryToCart(item: InventoryItem, qtyNum: number) {
    if (!checkStock(item.id, qtyNum, item.name)) return;
    const priceRupees = item.sellPaise
      ? paiseToRupees(BigInt(item.sellPaise))
      : 0;
    setCart((prev) =>
      mergeLineIntoCart(prev, {
        name: item.name,
        qty: qtyNum,
        priceRupees,
        inventoryItemId: item.id,
        barcode: item.barcode ?? undefined,
      })
    );
  }

  function pickInventoryItem(itemId: string) {
    setSelectedInventoryId(itemId);
    const item = (inventoryQuery.data ?? []).find((i) => i.id === itemId);
    if (!item) return;
    setItemName(item.name);
    if (item.sellPaise) {
      setPrice(String(paiseToRupees(BigInt(item.sellPaise))));
    }
  }

  function addLineToCart() {
    clear();
    if (!itemName.trim()) return showWarning("Item name is required");
    const priceNum = Number(price);
    const qtyNum = Number(qty);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return showWarning("Enter a valid price");
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return showWarning("Enter a valid quantity");
    }

    if (selectedInventoryId && !checkStock(selectedInventoryId, qtyNum, itemName.trim())) {
      return;
    }

    setCart((prev) =>
      mergeLineIntoCart(prev, {
        name: itemName.trim(),
        qty: qtyNum,
        priceRupees: priceNum,
        inventoryItemId: selectedInventoryId || undefined,
      })
    );
    setItemName("");
    setPrice("");
    setQty("1");
    setSelectedInventoryId("");
  }

  async function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed || !inventoryEnabled) return;
    clear();
    try {
      const item = await apiFetch<InventoryItem>(
        `/api/v1/shop/inventory/lookup?barcode=${encodeURIComponent(trimmed)}`
      );
      addInventoryToCart(item, 1);
      setScanInput("");
      scanRef.current?.focus();
    } catch (err) {
      applyError(err, "No product for this barcode");
      setScanInput("");
    }
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }

  function holdCurrentBill() {
    clear();
    if (cart.length === 0) return showWarning("Nothing on the bill to hold");
    const label =
      customerName.trim() ||
      `Bill ${heldBills.length + 1} · ₹${cartTotal.toFixed(0)}`;
    setHeldBills((prev) => [
      ...prev,
      {
        id: newLineId(),
        label,
        customerName,
        salesBoyName,
        issueInvoice,
        customerPhone,
        customerGstin,
        cart: [...cart],
        heldAt: Date.now(),
      },
    ]);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setIssueInvoice(false);
    setSalesBoyName("");
  }

  function mergeHeldBill(heldId: string) {
    clear();
    const held = heldBills.find((b) => b.id === heldId);
    if (!held) return;
    setCart((prev) => mergeCarts(prev, held.cart));
    if (!customerName.trim() && held.customerName.trim()) {
      setCustomerName(held.customerName);
    }
    if (!salesBoyName.trim() && held.salesBoyName.trim()) {
      setSalesBoyName(held.salesBoyName);
    }
    if (held.issueInvoice) setIssueInvoice(true);
    if (!customerPhone.trim() && held.customerPhone.trim()) {
      setCustomerPhone(held.customerPhone);
    }
    if (!customerGstin.trim() && held.customerGstin.trim()) {
      setCustomerGstin(held.customerGstin);
    }
    setHeldBills((prev) => prev.filter((b) => b.id !== heldId));
  }

  function discardHeldBill(heldId: string) {
    setHeldBills((prev) => prev.filter((b) => b.id !== heldId));
  }

  async function completeSale(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (cart.length === 0) {
      return showWarning("Add at least one item to the bill");
    }
    const totalRupees = cart.reduce((s, l) => s + lineTotal(l), 0);
    if (totalRupees <= 0) {
      return showWarning("Bill total must be greater than zero");
    }
    try {
      await createMutation.mutateAsync({
        customerName: customerName.trim() || null,
        customerPhone: issueInvoice ? customerPhone.trim() || null : null,
        customerGstin: issueInvoice ? customerGstin.trim() || null : null,
        salesBoyName: salesBoyName.trim() || null,
        issueInvoice,
        totalRupees,
        paymentMethod,
        items: cart.map(({ name, qty: q, priceRupees, inventoryItemId, barcode }) => ({
          name,
          qty: q,
          priceRupees,
          ...(inventoryItemId ? { inventoryItemId } : {}),
          ...(barcode ? { barcode } : {}),
        })),
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerGstin("");
      setIssueInvoice(false);
      setSalesBoyName("");
    } catch (err) {
      applyError(err, "Failed to record sale");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Scan barcodes, merge held bills, and print invoices for customers who need a bill
        </p>
      </div>

      <FormFeedback warning={warning} error={error} />

      {inventoryEnabled && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScanLine className="h-5 w-5" />
              Scan barcode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              ref={scanRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleBarcodeScan(scanInput);
                }
              }}
              className="h-12 rounded-xl font-mono"
              placeholder="Scan or type barcode, press Enter"
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              USB scanners work here — each scan adds the product to the current bill.
            </p>
          </CardContent>
        </Card>
      )}

      {heldBills.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Held bills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {heldBills.map((held) => (
              <div
                key={held.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
              >
                <div>
                  <p className="font-medium">{held.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {held.cart.length} item{held.cart.length === 1 ? "" : "s"} · ₹
                    {held.cart.reduce((s, l) => s + lineTotal(l), 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => mergeHeldBill(held.id)}
                  >
                    Merge into bill
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-destructive"
                    onClick={() => discardHeldBill(held.id)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Current bill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Walk-in"
              />
            </div>
            <div className="space-y-2">
              <Label>Sales boy (optional)</Label>
              {staffEnabled && (staffQuery.data ?? []).length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setSalesBoyName(e.target.value);
                  }}
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">Pick from staff…</option>
                  {(staffQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} · {s.roleTitle}
                    </option>
                  ))}
                </select>
              )}
              <Input
                value={salesBoyName}
                onChange={(e) => setSalesBoyName(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Who served the customer?"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base">Customer needs printed bill?</Label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setIssueInvoice(false)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium",
                    !issueInvoice ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  Quick receipt
                </button>
                <button
                  type="button"
                  onClick={() => setIssueInvoice(true)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium",
                    issueInvoice ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  Full invoice
                </button>
              </div>
            </div>
            {issueInvoice && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="For invoice"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN (optional)</Label>
                  <Input
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="h-11 rounded-xl font-mono uppercase"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>
            )}
          </div>

          {inventoryEnabled && (inventoryQuery.data ?? []).length > 0 && (
            <div className="space-y-2">
              <Label>Pick from stock (optional)</Label>
              <select
                value={selectedInventoryId}
                onChange={(e) => pickInventoryItem(e.target.value)}
                className="h-12 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Type manually or select item…</option>
                {(inventoryQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.sellPaise ? ` — ${formatINR(item.sellPaise)}` : ""}{" "}
                    ({formatStockLabel(item.quantity, item.unit)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-12">
            <div className="space-y-2 sm:col-span-5">
              <Label>Item name</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="e.g. Parle-G"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLineToCart();
                  }
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Qty</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>Rate (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="0"
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl"
                onClick={addLineToCart}
              >
                Add item
              </Button>
            </div>
          </div>

          {cart.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              No items on this bill yet. Scan a barcode or add items above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Item</th>
                    <th className="p-2 font-medium">Qty</th>
                    <th className="p-2 font-medium">Rate</th>
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2 font-medium">{line.name}</td>
                      <td className="p-2 tabular-nums">{line.qty}</td>
                      <td className="p-2 tabular-nums">₹{line.priceRupees}</td>
                      <td className="p-2 tabular-nums font-medium">
                        ₹{lineTotal(line).toFixed(2)}
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${line.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="p-2" colSpan={3}>
                      Total ({cart.length} line{cart.length === 1 ? "" : "s"})
                    </td>
                    <td className="p-2 tabular-nums" colSpan={2}>
                      ₹{cartTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment</Label>
            <div className="grid grid-cols-4 gap-1">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-medium",
                    paymentMethod === m
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-xl"
              onClick={holdCurrentBill}
              disabled={cart.length === 0}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              Hold bill
            </Button>
            <form onSubmit={completeSale} className="flex-[2]">
              <Button
                type="submit"
                className="h-12 w-full rounded-xl"
                disabled={createMutation.isPending || cart.length === 0}
              >
                {createMutation.isPending
                  ? "Saving..."
                  : issueInvoice
                    ? `Complete & print · ₹${cartTotal.toFixed(2)}`
                    : `Complete sale · ₹${cartTotal.toFixed(2)}`}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Recent sales</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {salesQuery.isLoading ? (
            <PageLoader label="Loading sales..." />
          ) : (salesQuery.data ?? []).length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            (salesQuery.data ?? []).map((sale) => (
              <div key={sale.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {sale.customerName ?? "Walk-in"}
                    {sale.salesBoyName ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        · {sale.salesBoyName}
                      </span>
                    ) : null}
                    {sale.billNumber ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{sale.billNumber}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleString()} · {sale.paymentMethod}
                  </p>
                  <ul className="mt-1 text-sm text-muted-foreground">
                    {(sale.itemsJson ?? []).map((i, idx) => (
                      <li key={`${sale.id}-${idx}`}>
                        {i.name} × {i.qty} @ ₹{i.priceRupees}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-semibold">{formatINR(sale.totalPaise)}</p>
                  {(sale.issueInvoice || sale.billNumber) && (
                    <Link href={`/shop/sales/invoice/${sale.id}`}>
                      <Button variant="outline" size="sm" className="rounded-xl">
                        <Printer className="mr-1 h-3.5 w-3.5" />
                        Reprint
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
