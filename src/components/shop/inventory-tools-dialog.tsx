"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  GitMerge,
  PackagePlus,
  Percent,
  Upload,
  Barcode,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  csvRowsToImport,
  downloadCsvTemplate,
  parseCsvText,
} from "@/lib/shop/inventory-bulk-csv";
import { downloadBarcodeExportCsv } from "@/lib/shop/inventory-export";
import {
  inventoryCategoriesForSector,
} from "@/lib/shop/inventory-categories";
<<<<<<< HEAD
import { DesktopOnlyNote } from "@/components/layout/desktop-only-note";
=======
>>>>>>> origin/master
import type { InventoryStockItem } from "@/components/shop/inventory-stock-list";

type ToolTab =
  | "upload"
  | "barcodes"
  | "prices"
  | "receive"
  | "merge"
  | "export";

type DuplicateGroup = {
  key: string;
  name: string;
  items: InventoryStockItem[];
};

function findDuplicateGroups(items: InventoryStockItem[]): DuplicateGroup[] {
  const map = new Map<string, InventoryStockItem[]>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      name: group[0]!.name,
      items: group,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type InventoryToolsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  items: InventoryStockItem[];
  businessTypes: string[];
  initialTab?: ToolTab;
};

export function InventoryToolsDialog({
  open,
  onOpenChange,
  orgId,
  items,
  businessTypes,
  initialTab = "upload",
}: InventoryToolsDialogProps) {
  const role = useAuthStore((s) => s.role);
  const canMerge = role === "OWNER" || role === "PARTNER";
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const [tab, setTab] = useState<ToolTab>(initialTab);
  const [csvText, setCsvText] = useState("");
  const [priceMode, setPriceMode] = useState<
    "set" | "increase_percent" | "decrease_percent" | "add" | "subtract"
  >("increase_percent");
  const [priceValue, setPriceValue] = useState("5");
  const [priceCategory, setPriceCategory] = useState<string>("all");
  const [receiveLines, setReceiveLines] = useState<
    Array<{ itemId: string; addQty: string; costRupees: string }>
  >([{ itemId: "", addQty: "", costRupees: "" }]);
  const [mergeGroupKey, setMergeGroupKey] = useState<string>("");
  const [keepItemId, setKeepItemId] = useState("");
  const [combineStock, setCombineStock] = useState(true);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const duplicateGroups = useMemo(() => findDuplicateGroups(items), [items]);
  const selectedMergeGroup = duplicateGroups.find((g) => g.key === mergeGroupKey);
  const categories = inventoryCategoriesForSector(businessTypes);
  const noBarcodeCount = items.filter((i) => !i.barcode).length;

  const toolsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory/tools", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
      }
    },
  });

  function invalidateAndShow(message: string) {
    setLastResult(message);
    clear();
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    setLastResult(null);
  }

  async function runBulkImport() {
    clear();
    setLastResult(null);
    const text = csvText.trim();
    if (!text) return showWarning("Paste CSV text or choose a file first");

    const preview = csvRowsToImport(parseCsvText(text));
    if (preview.items.length === 0) {
      return showWarning(preview.errors[0] ?? "No valid rows found");
    }

    try {
      const result = await toolsMutation.mutateAsync({
        action: "bulk-import",
        csv: text,
      }) as { created: number; errors: string[]; parseErrors?: string[] };

      const parts = [`Imported ${result.created} product(s).`];
      if (result.errors?.length) {
        parts.push(`${result.errors.length} row(s) failed.`);
      }
      invalidateAndShow(parts.join(" "));
    } catch (err) {
      applyError(err, "Bulk import failed");
    }
  }

  async function runBulkBarcodes() {
    clear();
    setLastResult(null);
    try {
      const result = await toolsMutation.mutateAsync({
        action: "bulk-barcodes",
        onlyMissing: true,
      }) as { updated: number };
      invalidateAndShow(`Generated barcodes for ${result.updated} item(s).`);
    } catch (err) {
      applyError(err, "Bulk barcode generation failed");
    }
  }

  async function runBulkPrices() {
    clear();
    setLastResult(null);
    const value = Number(priceValue);
    if (!Number.isFinite(value) || value < 0) {
      return showWarning("Enter a valid price value");
    }

    try {
      const result = await toolsMutation.mutateAsync({
        action: "bulk-prices",
        mode: priceMode,
        value,
        category: priceCategory === "all" ? null : priceCategory,
      }) as { updated: number };
      invalidateAndShow(`Updated prices on ${result.updated} item(s).`);
    } catch (err) {
      applyError(err, "Bulk price update failed");
    }
  }

  async function runReceiveStock() {
    clear();
    setLastResult(null);
    const lines = receiveLines
      .filter((l) => l.itemId && Number(l.addQty) > 0)
      .map((l) => ({
        itemId: l.itemId,
        addQty: Number(l.addQty),
        costRupees: l.costRupees ? Number(l.costRupees) : null,
      }));

    if (lines.length === 0) {
      return showWarning("Add at least one item with quantity to receive");
    }

    try {
      const result = await toolsMutation.mutateAsync({
        action: "receive-stock",
        lines,
      }) as { updated: number };
      invalidateAndShow(`Received stock for ${result.updated} item(s).`);
      setReceiveLines([{ itemId: "", addQty: "", costRupees: "" }]);
    } catch (err) {
      applyError(err, "Stock receive failed");
    }
  }

  async function runMerge() {
    clear();
    setLastResult(null);
    if (!keepItemId || !selectedMergeGroup) {
      return showWarning("Choose which product to keep");
    }

    const mergeItemIds = selectedMergeGroup.items
      .map((i) => i.id)
      .filter((id) => id !== keepItemId);

    if (mergeItemIds.length === 0) {
      return showWarning("Select a duplicate group with at least two items");
    }

    const confirmed = window.confirm(
      `Permanently merge ${mergeItemIds.length} duplicate row(s) into the kept product? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const result = await toolsMutation.mutateAsync({
        action: "merge",
        keepItemId,
        mergeItemIds,
        combineStock,
      }) as { mergedCount: number; stockAdded: number };

      invalidateAndShow(
        `Merged ${result.mergedCount} duplicate(s).` +
          (combineStock && result.stockAdded > 0
            ? ` Combined ${result.stockAdded} extra units into stock.`
            : "")
      );
      setMergeGroupKey("");
      setKeepItemId("");
    } catch (err) {
      applyError(err, "Merge failed");
    }
  }

  function handleExportBarcodes() {
    clear();
    const withBarcode = items.filter((i) => i.barcode);
    if (withBarcode.length === 0) {
      return showWarning("No items have barcodes yet");
    }
    downloadBarcodeExportCsv(withBarcode, businessTypes);
    setLastResult(`Exported ${withBarcode.length} barcode(s) to CSV.`);
  }

  const tabs: Array<{ id: ToolTab; label: string; icon: React.ReactNode }> = [
    { id: "upload", label: "Upload", icon: <Upload className="h-3.5 w-3.5" /> },
    { id: "barcodes", label: "Barcodes", icon: <Barcode className="h-3.5 w-3.5" /> },
    { id: "prices", label: "Prices", icon: <Percent className="h-3.5 w-3.5" /> },
    { id: "receive", label: "Receive", icon: <PackagePlus className="h-3.5 w-3.5" /> },
    { id: "export", label: "Export", icon: <Download className="h-3.5 w-3.5" /> },
  ];
  if (canMerge) {
    tabs.push({ id: "merge", label: "Merge", icon: <GitMerge className="h-3.5 w-3.5" /> });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          clear();
          setLastResult(null);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Inventory tools</DialogTitle>
          <DialogDescription>
            Bulk upload, barcodes, price updates, stock receive, and exports
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                clear();
                setLastResult(null);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <FormFeedback warning={warning} error={error} />
        {lastResult ? (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            {lastResult}
          </p>
        ) : null}

        {tab === "upload" ? (
          <div className="space-y-3">
<<<<<<< HEAD
            <DesktopOnlyNote feature="Bulk CSV import" />
=======
>>>>>>> origin/master
            <p className="text-sm text-muted-foreground">
              Upload a CSV with product and variant columns for your business type.
              Download the template for the exact headers.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => downloadCsvTemplate(businessTypes)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download template
              </Button>
              <Label className="inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm hover:bg-muted">
                Choose CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCsvFile(file);
                    e.target.value = "";
                  }}
                />
              </Label>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border bg-background px-3 py-2 font-mono text-xs"
              placeholder="Or paste CSV here…"
            />
            <Button
              className="w-full rounded-xl"
              disabled={toolsMutation.isPending}
              onClick={() => void runBulkImport()}
            >
              {toolsMutation.isPending ? "Importing…" : "Import products"}
            </Button>
          </div>
        ) : null}

        {tab === "barcodes" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate barcodes for all products that do not have one yet.
            </p>
            {noBarcodeCount > 0 ? (
              <p className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {noBarcodeCount} item(s) missing a barcode
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">All items already have barcodes.</p>
            )}
            <Button
              className="w-full rounded-xl"
              disabled={toolsMutation.isPending || noBarcodeCount === 0}
              onClick={() => void runBulkBarcodes()}
            >
              {toolsMutation.isPending ? "Generating…" : `Generate ${noBarcodeCount} barcode(s)`}
            </Button>
          </div>
        ) : null}

        {tab === "prices" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Update mode</Label>
              <select
                value={priceMode}
                onChange={(e) =>
                  setPriceMode(e.target.value as typeof priceMode)
                }
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="increase_percent">Increase by %</option>
                <option value="decrease_percent">Decrease by %</option>
                <option value="add">Add ₹ amount</option>
                <option value="subtract">Subtract ₹ amount</option>
                <option value="set">Set fixed price (₹)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <select
                value={priceCategory}
                onChange={(e) => setPriceCategory(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full rounded-xl"
              disabled={toolsMutation.isPending}
              onClick={() => void runBulkPrices()}
            >
              {toolsMutation.isPending ? "Updating…" : "Apply price update"}
            </Button>
          </div>
        ) : null}

        {tab === "receive" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Record incoming stock from a supplier delivery. Quantities are added to current
              stock.
            </p>
            {receiveLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-3">
                  <Label>Product</Label>
                  <select
                    value={line.itemId}
                    onChange={(e) => {
                      const next = [...receiveLines];
                      next[idx] = { ...next[idx]!, itemId: e.target.value };
                      setReceiveLines(next);
                    }}
                    className="h-10 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="">Select item…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.size ? ` · ${item.size}` : ""} (qty {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Add qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.addQty}
                    onChange={(e) => {
                      const next = [...receiveLines];
                      next[idx] = { ...next[idx]!, addQty: e.target.value };
                      setReceiveLines(next);
                    }}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>New cost (₹, optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.costRupees}
                    onChange={(e) => {
                      const next = [...receiveLines];
                      next[idx] = { ...next[idx]!, costRupees: e.target.value };
                      setReceiveLines(next);
                    }}
                    className="h-10 rounded-lg"
                    placeholder="Leave blank to keep current cost"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setReceiveLines((lines) => [
                  ...lines,
                  { itemId: "", addQty: "", costRupees: "" },
                ])
              }
            >
              + Add another line
            </Button>
            <Button
              className="w-full rounded-xl"
              disabled={toolsMutation.isPending}
              onClick={() => void runReceiveStock()}
            >
              {toolsMutation.isPending ? "Saving…" : "Receive stock"}
            </Button>
          </div>
        ) : null}

        {tab === "export" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download a CSV of all products with barcodes — useful for backup or external label
              software.
            </p>
            <Button className="w-full rounded-xl" onClick={handleExportBarcodes}>
              <Download className="mr-2 h-4 w-4" />
              Export barcodes CSV ({items.filter((i) => i.barcode).length} items)
            </Button>
          </div>
        ) : null}

        {tab === "merge" && canMerge ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hard merge duplicate products with the same name. Pick one row to keep; others are
              permanently deleted. Owner/partner only.
            </p>
            {duplicateGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No duplicate product names found.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Duplicate group</Label>
                  <select
                    value={mergeGroupKey}
                    onChange={(e) => {
                      setMergeGroupKey(e.target.value);
                      setKeepItemId("");
                    }}
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {duplicateGroups.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.name} ({g.items.length} rows)
                      </option>
                    ))}
                  </select>
                </div>
                {selectedMergeGroup ? (
                  <div className="space-y-2">
                    <Label>Keep this row</Label>
                    <select
                      value={keepItemId}
                      onChange={(e) => setKeepItemId(e.target.value)}
                      className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="">Select row to keep…</option>
                      {selectedMergeGroup.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.size ? `Size ${item.size}` : "No size"} · qty {item.quantity}
                          {item.barcode ? ` · ${item.barcode}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={combineStock}
                    onChange={(e) => setCombineStock(e.target.checked)}
                  />
                  Add merged rows&apos; stock quantities to the kept product
                </label>
                <Button
                  variant="destructive"
                  className="w-full rounded-xl"
                  disabled={toolsMutation.isPending || !keepItemId}
                  onClick={() => void runMerge()}
                >
                  {toolsMutation.isPending ? "Merging…" : "Hard merge duplicates"}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
