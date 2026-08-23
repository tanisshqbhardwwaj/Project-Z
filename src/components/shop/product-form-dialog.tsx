"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/finance/money";
import { INFINITE_STOCK_QTY } from "@/lib/shop/inventory";
import { attributeLabel } from "@/lib/shop/variant-display";
import { cn } from "@/lib/utils";
import { AlertTriangle, Plus, Sparkles, Trash2, X } from "lucide-react";

export type CategoryOption = {
  key: string;
  label: string;
  isCustom: boolean;
  subcategories: Array<{ key: string; label: string; isCustom: boolean }>;
};

export type SimilarProduct = {
  productId: string | null;
  name: string;
  brand: string | null;
  supplierName: string | null;
  variantCount: number;
  totalQuantity: number;
  sellPaise: string | null;
  createdAt: string;
  variantSummary: string[];
};

type VariantRow = {
  rowId: string;
  size: string;
  color: string;
  barcode: string;
  sku: string;
  quantity: string;
  sellRupees: string;
  costRupees: string;
};

/** Size presets per business type — a starting point, always editable. */
const SIZE_PRESETS: Array<{ label: string; sizes: string[] }> = [
  { label: "Apparel S–XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Apparel XS–3XL", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { label: "Waist 28–40", sizes: ["28", "30", "32", "34", "36", "38", "40"] },
  { label: "Shoes 6–11", sizes: ["6", "7", "8", "9", "10", "11"] },
  { label: "Kids 2–12y", sizes: ["2y", "4y", "6y", "8y", "10y", "12y"] },
];

function newRow(size = ""): VariantRow {
  return {
    rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    size,
    color: "",
    barcode: "",
    sku: "",
    quantity: "0",
    sellRupees: "",
    costRupees: "",
  };
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  orgId,
  categories,
  attributeFields,
  variantsByDefault,
  onCreated,
  onViewExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  categories: CategoryOption[];
  /** Attributes the selected business types care about (material, model, …). */
  attributeFields: string[];
  variantsByDefault: boolean;
  onCreated: (productName: string, variantCount: number) => void;
  onViewExisting?: (productId: string | null, name: string) => void;
}) {
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKey, setCategoryKey] = useState("");
  const [subCategoryKey, setSubCategoryKey] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [supplierName, setSupplierName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [notes, setNotes] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [hasVariants, setHasVariants] = useState(variantsByDefault);
  const [variantAxis, setVariantAxis] = useState("size");
  const [rows, setRows] = useState<VariantRow[]>([newRow()]);
  const [defaultSell, setDefaultSell] = useState("");
  const [defaultCost, setDefaultCost] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [singleQuantity, setSingleQuantity] = useState("0");
  const [singleBarcode, setSingleBarcode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [duplicatePrompt, setDuplicatePrompt] = useState<SimilarProduct[] | null>(
    null
  );

  const showExpiry = attributeFields.includes("expiryDate");
  const freeAttributes = attributeFields.filter(
    (f) => f !== "expiryDate" && f !== "size" && f !== "color" && f !== "brand"
  );

  // Categories arrive asynchronously; fall back to the first one until the user
  // picks, rather than syncing it into state from an effect.
  const effectiveCategoryKey = categoryKey || categories[0]?.key || "";

  const subcategories = useMemo(
    () => categories.find((c) => c.key === effectiveCategoryKey)?.subcategories ?? [],
    [categories, effectiveCategoryKey]
  );

  function reset() {
    setName("");
    setBrand("");
    setDescription("");
    setUnit("pcs");
    setSupplierName("");
    setBatchNo("");
    setNotes("");
    setAttributes({});
    setHasVariants(variantsByDefault);
    setVariantAxis("size");
    setRows([newRow()]);
    setDefaultSell("");
    setDefaultCost("");
    setReorderLevel("5");
    setSingleQuantity("0");
    setSingleBarcode("");
    setExpiryDate("");
    setDuplicatePrompt(null);
    clear();
  }

  // Warn about look-alikes while the user types. Duplicate names are allowed —
  // the same shirt can arrive from a different supplier at a different cost.
  const [debouncedName, setDebouncedName] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedName(name.trim()), 400);
    return () => clearTimeout(handle);
  }, [name]);

  const similarQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "similar-products", debouncedName] : ["disabled"],
    queryFn: () =>
      apiFetch<SimilarProduct[]>(
        `/api/v1/shop/products/similar?name=${encodeURIComponent(debouncedName)}`
      ),
    enabled: !!orgId && open && debouncedName.length >= 2,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ id: string; name: string; variants: unknown[] }>(
        "/api/v1/shop/products",
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: (product) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({ queryKey: ["shop", orgId, "products"] });
        qc.invalidateQueries({
          queryKey: [...queryKeys.org(orgId), "shop", "inventory", "analytics"],
        });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
      onCreated(product.name, product.variants?.length ?? 1);
      reset();
      onOpenChange(false);
    },
    onError: (err) => applyError(err, "Could not save the product"),
  });

  function buildPayload() {
    const variants = hasVariants
      ? rows
          .filter((row) => row.size.trim() || row.color.trim())
          .map((row) => ({
            size: row.size.trim() || null,
            color: row.color.trim() || null,
            barcode: row.barcode.trim() || null,
            sku: row.sku.trim() || null,
            quantity: Number(row.quantity) || 0,
            reorderLevel: Number(reorderLevel) || 0,
            sellRupees: numberOrNull(row.sellRupees) ?? numberOrNull(defaultSell),
            costRupees: numberOrNull(row.costRupees) ?? numberOrNull(defaultCost),
            expiryDate: showExpiry && expiryDate ? expiryDate : null,
          }))
      : [
          {
            barcode: singleBarcode.trim() || null,
            quantity: Number(singleQuantity) || 0,
            reorderLevel: Number(reorderLevel) || 0,
            sellRupees: numberOrNull(defaultSell),
            costRupees: numberOrNull(defaultCost),
            expiryDate: showExpiry && expiryDate ? expiryDate : null,
          },
        ];

    return {
      name: name.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      categoryKey: effectiveCategoryKey || null,
      subCategoryKey: subCategoryKey || null,
      unit: unit.trim() || "pcs",
      hasVariants,
      variantAxis: hasVariants ? variantAxis : null,
      supplierName: supplierName.trim() || null,
      batchNo: batchNo.trim() || null,
      attributes,
      notes: notes.trim() || null,
      defaultSellRupees: numberOrNull(defaultSell),
      defaultCostRupees: numberOrNull(defaultCost),
      defaultReorderLevel: Number(reorderLevel) || 0,
      variants,
      autoBarcode: true,
      autoSku: true,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return "Product name is required";
    if (hasVariants) {
      const filled = rows.filter((r) => r.size.trim() || r.color.trim());
      if (filled.length === 0) {
        return "Add at least one size — or turn off multiple sizes";
      }
      const seen = new Set<string>();
      for (const row of filled) {
        const key = `${row.size.trim().toLowerCase()}|${row.color.trim().toLowerCase()}`;
        if (seen.has(key)) {
          return `"${[row.color.trim(), row.size.trim()].filter(Boolean).join(" ")}" is listed twice`;
        }
        seen.add(key);
      }
      const codes = filled.map((r) => r.barcode.trim()).filter(Boolean);
      const duplicateCode = codes.find((c, i) => codes.indexOf(c) !== i);
      if (duplicateCode) {
        return `Barcode ${duplicateCode} is used for more than one size`;
      }
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    const problem = validate();
    if (problem) return showWarning(problem);

    const similar = similarQuery.data ?? [];
    if (similar.length > 0 && !duplicatePrompt) {
      setDuplicatePrompt(similar);
      return;
    }
    void createMutation.mutateAsync(buildPayload());
  }

  const filledRowCount = rows.filter((r) => r.size.trim() || r.color.trim()).length;
  const totalUnits = hasVariants
    ? rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    : Number(singleQuantity) || 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            One product, one row in your stock list. If it comes in several sizes,
            each size gets its own barcode and stock count.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label>Product name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="e.g. Premium Cotton T-Shirt"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand (optional)</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="e.g. Nike"
                />
              </div>
            </div>

            {(similarQuery.data ?? []).length > 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="font-medium">A similar product already exists</p>
                  <p className="text-xs text-muted-foreground">
                    {(similarQuery.data ?? [])
                      .slice(0, 2)
                      .map(
                        (m) =>
                          `${m.name}${m.supplierName ? ` (${m.supplierName})` : ""} — ${m.variantCount} variant${m.variantCount === 1 ? "" : "s"}`
                      )
                      .join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can still add this one — different supplier, batch or cost
                    is a separate product.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={effectiveCategoryKey}
                  onChange={(e) => {
                    setCategoryKey(e.target.value);
                    setSubCategoryKey("");
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                      {cat.isCustom ? " (custom)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Sub-category</Label>
                <select
                  value={subCategoryKey}
                  onChange={(e) => setSubCategoryKey(e.target.value)}
                  disabled={subcategories.length === 0}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50"
                >
                  <option value="">None</option>
                  {subcategories.map((sub) => (
                    <option key={sub.key} value={sub.key}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[64px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder="Printed on the full-size price tag"
                maxLength={500}
              />
            </div>
          </section>

          {/* Variants */}
          <section className="space-y-3 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  Does this product have multiple sizes or variants?
                </p>
                <p className="text-xs text-muted-foreground">
                  One product, one row in the list — each size gets its own
                  barcode and stock.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {hasVariants ? "Yes" : "No"}
                </span>
                <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
              </div>
            </div>

            {hasVariants ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Variants vary by</Label>
                    <Input
                      value={variantAxis}
                      onChange={(e) => setVariantAxis(e.target.value)}
                      className="h-10 rounded-xl"
                      placeholder="size"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quick add sizes</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setRows((prev) => {
                              const existing = new Set(
                                prev
                                  .map((r) => r.size.trim().toLowerCase())
                                  .filter(Boolean)
                              );
                              const additions = preset.sizes
                                .filter((s) => !existing.has(s.toLowerCase()))
                                .map((s) => newRow(s));
                              const kept = prev.filter((r) => r.size.trim());
                              return [...kept, ...additions];
                            })
                          }
                          className="rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                        >
                          <Sparkles className="mr-1 inline h-3 w-3" />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium">Size</th>
                        <th className="pb-2 pr-2 font-medium">Colour</th>
                        <th className="pb-2 pr-2 font-medium">Stock</th>
                        <th className="pb-2 pr-2 font-medium">Sell ₹</th>
                        <th className="pb-2 pr-2 font-medium">Barcode</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.rowId} className="border-b last:border-0">
                          <td className="py-1.5 pr-2">
                            <Input
                              value={row.size}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, size: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="h-9 w-20 rounded-lg"
                              placeholder="M"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              value={row.color}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, color: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="h-9 w-24 rounded-lg"
                              placeholder="optional"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, quantity: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="h-9 w-20 rounded-lg"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.sellRupees}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, sellRupees: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="h-9 w-24 rounded-lg"
                              placeholder={defaultSell || "same"}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              value={row.barcode}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, barcode: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="h-9 w-32 rounded-lg font-mono text-xs"
                              placeholder="auto"
                            />
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setRows((prev) =>
                                  prev.length === 1
                                    ? [newRow()]
                                    : prev.filter((r) => r.rowId !== row.rowId)
                                )
                              }
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Remove variant"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setRows((prev) => [...prev, newRow()])}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add size
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {filledRowCount} variant{filledRowCount === 1 ? "" : "s"} ·{" "}
                    {totalUnits} units · barcodes auto-generated where blank
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Stock quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use {INFINITE_STOCK_QTY} for unlimited
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Barcode</Label>
                  <Input
                    value={singleBarcode}
                    onChange={(e) => setSingleBarcode(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Pricing and stock defaults */}
          <section className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sell price ₹</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={defaultSell}
                onChange={(e) => setDefaultSell(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase price ₹</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={defaultCost}
                onChange={(e) => setDefaultCost(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reorder at</Label>
              <Input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="pcs"
              />
            </div>
          </section>

          {/* Business-type specific attributes */}
          {freeAttributes.length > 0 || showExpiry ? (
            <section className="space-y-3 rounded-2xl border p-4">
              <p className="text-sm font-medium">Extra details</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {freeAttributes.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{attributeLabel(field)}</Label>
                    <Input
                      value={attributes[field] ?? ""}
                      onChange={(e) =>
                        setAttributes((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
                {showExpiry ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expiry date</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier (optional)</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="Who did you buy from?"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Batch / lot (optional)</Label>
              <Input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </section>

          <FormFeedback warning={warning} error={error} />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Saving…"
                : hasVariants
                  ? `Save product with ${filledRowCount || 0} variant${filledRowCount === 1 ? "" : "s"}`
                  : "Save product"}
            </Button>
          </div>
        </form>

        {/* Duplicate confirmation */}
        <Dialog
          open={!!duplicatePrompt}
          onOpenChange={(next) => !next && setDuplicatePrompt(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>A similar product already exists</DialogTitle>
              <DialogDescription>
                Do you want to continue? Duplicate names are fine when the
                supplier, batch, cost or barcode is different.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2">
              {(duplicatePrompt ?? []).map((match) => (
                <li
                  key={`${match.productId ?? match.name}`}
                  className="rounded-xl border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{match.name}</span>
                    {match.sellPaise ? (
                      <span className="tabular-nums">
                        {formatINR(match.sellPaise)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {match.variantCount} variant
                    {match.variantCount === 1 ? "" : "s"} · {match.totalQuantity}{" "}
                    in stock
                    {match.supplierName ? ` · ${match.supplierName}` : ""}
                    {" · added "}
                    {new Date(match.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  {match.variantSummary.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {match.variantSummary.slice(0, 6).map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="rounded-full text-[10px]"
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {onViewExisting ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDuplicatePrompt(null);
                        onOpenChange(false);
                        onViewExisting(match.productId, match.name);
                      }}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      View existing product
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end")}>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setDuplicatePrompt(null)}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={createMutation.isPending}
                onClick={() => {
                  setDuplicatePrompt(null);
                  void createMutation.mutateAsync(buildPayload());
                }}
              >
                Continue and save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
