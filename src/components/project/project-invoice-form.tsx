"use client";

import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import {
  InvoiceLivePreview,
  buildDraftInvoice,
} from "@/components/shop/invoice-live-preview";
import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { computeInvoicePricing } from "@/lib/shop/invoice-pricing";
import { projectInvoiceToShopInvoice } from "@/lib/project/project-invoice-mapper";
import {
  useShopInvoicePrint,
} from "@/hooks/use-shop-invoice-print";

type LineItem = {
  name: string;
  qty: number;
  priceRupees: number;
  unit: string;
};

type SavedInvoice = {
  id: string;
  billNumber: string;
  clientPhone: string | null;
};

type ProjectInvoiceFormProps = {
  projectId: string;
  orgName: string;
  cashierName?: string | null;
  defaultClientName?: string | null;
  defaultClientPhone?: string | null;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
] as const;

function emptyLine(): LineItem {
  return { name: "", qty: 1, priceRupees: 0, unit: "" };
}

export function ProjectInvoiceForm({
  projectId,
  orgName,
  cashierName,
  defaultClientName,
  defaultClientPhone,
}: ProjectInvoiceFormProps) {
  const template = useShopInvoiceTemplate();
  const { toast } = useToast();
  const [clientName, setClientName] = useState(defaultClientName ?? "");
  const [clientPhone, setClientPhone] = useState(defaultClientPhone ?? "");
  const [clientGstin, setClientGstin] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [taxRatePercent, setTaxRatePercent] = useState(
    String(template.defaultTaxRatePercent || 18)
  );
  const [taxIncluded, setTaxIncluded] = useState(template.taxIncluded ?? false);
  const [discountRupees, setDiscountRupees] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{
    invoice: SavedInvoice;
    printData: ShopInvoiceData;
  } | null>(null);

  const { printInvoice, PrintLayer } = useShopInvoicePrint({
    onComplete: () => {
      setLastSaved(null);
      setLines([emptyLine()]);
      setNotes("");
      setDiscountRupees("");
    },
  });

  const cartItems = useMemo(
    () =>
      lines
        .filter((l) => l.name.trim())
        .map((l) => ({
          name: l.name.trim(),
          qty: l.qty,
          priceRupees: l.priceRupees,
          unit: l.unit.trim() || undefined,
        })),
    [lines]
  );

  const pricing = useMemo(
    () =>
      computeInvoicePricing({
        items: cartItems,
        discountRupees: Number(discountRupees) || 0,
        taxRatePercent: Number(taxRatePercent) || 0,
        taxIncluded,
      }),
    [cartItems, discountRupees, taxRatePercent, taxIncluded]
  );

  const draft = useMemo(
    () =>
      buildDraftInvoice({
        orgName,
        cashierName,
        customerName: clientName,
        customerPhone: clientPhone,
        customerGstin: clientGstin,
        salesBoyName: "",
        paymentMethod,
        cart: cartItems,
        pricing,
        taxRatePercent: Number(taxRatePercent) || 0,
        taxIncluded,
      }),
    [
      orgName,
      cashierName,
      clientName,
      clientPhone,
      clientGstin,
      paymentMethod,
      cartItems,
      pricing,
      taxRatePercent,
      taxIncluded,
    ]
  );

  const updateLine = useCallback((index: number, patch: Partial<LineItem>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }, []);

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  async function handleSave(printAfter = true) {
    const items = cartItems;
    if (!items.length) {
      toast({
        title: "Add line items",
        description: "Enter at least one item with a description and amount.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const invoice = await apiFetch<SavedInvoice & Record<string, unknown>>(
        `/api/v1/projects/${projectId}/invoices`,
        {
          method: "POST",
          body: JSON.stringify({
            clientName: clientName.trim() || null,
            clientPhone: clientPhone.trim() || null,
            clientGstin: clientGstin.trim() || null,
            paymentMethod,
            notes: notes.trim() || null,
            discountRupees: Number(discountRupees) || 0,
            taxRatePercent: Number(taxRatePercent) || 0,
            taxIncluded,
            items: items.map(({ name, qty, priceRupees, unit }) => ({
              name,
              qty,
              priceRupees,
              ...(unit ? { unit } : {}),
            })),
          }),
        }
      );

      const printData = projectInvoiceToShopInvoice(
        {
          ...invoice,
          clientName: clientName.trim() || defaultClientName,
          clientPhone: clientPhone.trim() || null,
          clientGstin: clientGstin.trim() || null,
          paymentMethod,
          notes: notes.trim() || null,
          itemsJson: items,
          organization: { name: orgName },
          createdBy: cashierName ? { name: cashierName } : undefined,
        },
        { orgName, cashierName }
      );

      toast({
        title: "Invoice saved",
        description: `Bill ${invoice.billNumber} created for this project.`,
      });

      if (printAfter) {
        flushSync(() => {
          setLastSaved({ invoice, printData });
        });
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            void printInvoice();
          });
        });
      } else {
        setLines([emptyLine()]);
        setNotes("");
        setDiscountRupees("");
      }
    } catch (err) {
      toast({
        title: "Could not save invoice",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const previewInvoice = lastSaved?.printData ?? draft;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clientName">Client name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client or company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientGstin">GSTIN</Label>
              <Input
                id="clientGstin"
                value={clientGstin}
                onChange={(e) => setClientGstin(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" />
                Add line
              </Button>
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_72px_96px_72px_auto]"
                >
                  <Input
                    value={line.name}
                    onChange={(e) => updateLine(index, { name: e.target.value })}
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    min={0.01}
                    step="any"
                    value={line.qty}
                    onChange={(e) =>
                      updateLine(index, { qty: Number(e.target.value) || 0 })
                    }
                    placeholder="Qty"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.priceRupees || ""}
                    onChange={(e) =>
                      updateLine(index, {
                        priceRupees: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="Rate ₹"
                  />
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    placeholder="Unit"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="taxRate">GST %</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount ₹</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step="0.01"
                value={discountRupees}
                onChange={(e) => setDiscountRupees(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={taxIncluded}
              onChange={(e) => setTaxIncluded(e.target.checked)}
              className="rounded border"
            />
            Rates are tax-inclusive
          </label>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, scope, etc."
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-xl"
              disabled={saving}
              onClick={() => void handleSave(true)}
            >
              {saving ? "Saving…" : "Save & print"}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              disabled={saving}
              onClick={() => void handleSave(false)}
            >
              Save only
            </Button>
            <Link href={`/projects/${projectId}?tab=invoices`}>
              <Button variant="ghost" className="h-11 rounded-xl">
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        <InvoiceLivePreview invoice={previewInvoice} />
      </div>

      <PrintLayer />
    </div>
  );
}
