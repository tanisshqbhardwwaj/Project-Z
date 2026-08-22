"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  INFINITE_STOCK_QTY,
  isInfiniteStock,
} from "@/lib/shop/inventory";
import { Plus, Wrench, FileText } from "lucide-react";
import { BarcodeLabelPreview } from "@/components/shop/barcode-label";
import { InventoryStockList } from "@/components/shop/inventory-stock-list";
import { InventoryInsightsPanel } from "@/components/shop/inventory-insights-panel";
import { InventoryToolsDialog } from "@/components/shop/inventory-tools-dialog";
import { LabelCopiesActions } from "@/components/shop/label-copies-actions";
import { LabelHeaderPicker } from "@/components/shop/label-header-picker";
import { buildBarcodeLabelData } from "@/lib/shop/label-data";
import { resolveShopLabelBranding, type FullLabelHeaderMode } from "@/lib/org/shop-settings";
import {
  defaultSubcategoryForCategory,
  inventoryCategoriesForSector,
  inventorySubcategoriesForCategory,
  parseInventoryCategory,
  parseInventorySubcategory,
} from "@/lib/shop/inventory-categories";
import { getShopSectorConfig } from "@/lib/org/shop-sector";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  size: string | null;
  barcode: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  sellPaise: string | null;
  costPaise?: string | null;
  expiryDate?: string | null;
  sectorMeta?: unknown;
};

export default function ShopInventoryPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, activeShopSector, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const title = moduleLabel("shop_inventory", activeBusinessType ?? "SHOPKEEPER");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [sellPrice, setSellPrice] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [printTarget, setPrintTarget] = useState<InventoryItem | null>(null);
  const [labelSize, setLabelSize] = useState<"small" | "full">("full");
  const [labelHeaderMode, setLabelHeaderMode] = useState<FullLabelHeaderMode>("both");
  const [labelCopies, setLabelCopies] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");

  const sectorCategories = inventoryCategoriesForSector(activeShopSector);
  const sectorConfig = getShopSectorConfig(activeShopSector);
  const showExpiryField = sectorConfig.inventoryFields?.includes("expiryDate") ?? false;
  const sectorLabel = getShopSectorConfig(activeShopSector).label;
  const defaultCategory = sectorCategories[0]?.id ?? "other";
  const addSubcategories = inventorySubcategoriesForCategory(activeShopSector, category || defaultCategory);
  const editSubcategories = inventorySubcategoriesForCategory(activeShopSector, editCategory || defaultCategory);

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setSubCategory(defaultSubcategoryForCategory(activeShopSector, nextCategory));
  }

  function handleEditCategoryChange(nextCategory: string) {
    setEditCategory(nextCategory);
    setEditSubCategory(defaultSubcategoryForCategory(activeShopSector, nextCategory));
  }

  const itemsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && moduleEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({
          queryKey: [...queryKeys.org(orgId), "shop", "inventory", "analytics"],
        });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({
          queryKey: [...queryKeys.org(orgId), "shop", "inventory", "analytics"],
        });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory", { method: "DELETE", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({
          queryKey: [...queryKeys.org(orgId), "shop", "inventory", "analytics"],
        });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
    },
  });

  const labelBrandingQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.inventory(orgId), "branding"] : ["disabled"],
    queryFn: async () => {
      const org = await apiFetch<{ name: string; settings?: unknown }>("/api/v1/organizations");
      return resolveShopLabelBranding(org.name, org.settings);
    },
    enabled: !!orgId && !!printTarget,
  });

  const printLabelData =
    printTarget?.barcode && labelBrandingQuery.data
      ? {
          ...buildBarcodeLabelData(
            {
              name: printTarget.name,
              barcode: printTarget.barcode,
              description: printTarget.description,
              size: printTarget.size,
              unit: printTarget.unit,
              sellPaise: printTarget.sellPaise,
              costPaise: printTarget.costPaise ?? null,
            },
            labelBrandingQuery.data
          ),
          headerMode: labelHeaderMode,
        }
      : null;

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

  function resetAddForm() {
    setName("");
    setDescription("");
    setSize("");
    setBarcode("");
    setQuantity("0");
    setReorderLevel("5");
    setSellPrice("");
    setExpiryDate("");
    setCategory(defaultCategory);
    setSubCategory(defaultSubcategoryForCategory(activeShopSector, defaultCategory));
  }

  function openAddDialog(prefill?: InventoryItem) {
    clear();
    if (prefill) {
      const prefillCategory =
        parseInventoryCategory(prefill.sectorMeta) ?? defaultCategory;
      setName(prefill.name);
      setDescription(prefill.description ?? "");
      setSize("");
      setBarcode("");
      setQuantity("0");
      setReorderLevel(String(prefill.reorderLevel));
      setSellPrice(
        prefill.sellPaise ? String(Number(prefill.sellPaise) / 100) : ""
      );
      setCategory(prefillCategory);
      setSubCategory(
        parseInventorySubcategory(prefill.sectorMeta) ??
          defaultSubcategoryForCategory(activeShopSector, prefillCategory)
      );
    } else {
      resetAddForm();
    }
    setAddDialogOpen(true);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!name.trim()) return showWarning("Item name is required");
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        size: size.trim() || null,
        barcode: barcode.trim() || null,
        quantity: Number(quantity) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        sellRupees: sellPrice ? Number(sellPrice) : null,
        category: category || defaultCategory,
        subCategory:
          subCategory || defaultSubcategoryForCategory(activeShopSector, category || defaultCategory),
        expiryDate: showExpiryField && expiryDate ? expiryDate : null,
      });
      resetAddForm();
      setAddDialogOpen(false);
    } catch (err) {
      applyError(err, "Failed to add item");
    }
  }

  async function adjustQty(item: InventoryItem, delta: number) {
    if (isInfiniteStock(item.quantity)) return;
    clear();
    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        quantity: Math.max(0, item.quantity + delta),
      });
    } catch (err) {
      applyError(err, "Failed to update stock");
    }
  }

  async function generateBarcode(item: InventoryItem) {
    clear();
    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        generateBarcode: true,
      });
    } catch (err) {
      applyError(err, "Failed to generate barcode");
    }
  }

  function startAnotherSize(item: InventoryItem) {
    openAddDialog(item);
  }

  async function saveProductDetails() {
    if (!editTarget) return;
    clear();
    try {
      await updateMutation.mutateAsync({
        itemId: editTarget.id,
        description: editDescription.trim() || null,
        size: editSize.trim() || null,
        category: editCategory || defaultCategory,
        subCategory:
          editSubCategory ||
          defaultSubcategoryForCategory(activeShopSector, editCategory || defaultCategory),
        expiryDate: showExpiryField ? editExpiryDate || null : undefined,
      });
      setEditTarget(null);
    } catch (err) {
      applyError(err, "Failed to update product details");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    clear();
    try {
      await deleteMutation.mutateAsync({ itemId: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      applyError(err, "Failed to delete item");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Stock levels, barcodes for scanning at counter, and printable shelf labels
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/shop/inventory/report">
            <Button variant="outline" className="h-11 rounded-xl">
              <FileText className="mr-2 h-4 w-4" />
              Stock report
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setToolsOpen(true)}
          >
            <Wrench className="mr-2 h-4 w-4" />
            Tools
          </Button>
          <Button className="h-11 rounded-xl" onClick={() => openAddDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <FormFeedback warning={warning} error={error} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,380px)] xl:items-start">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Stock list</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search and filter by category for {sectorLabel.toLowerCase()}. Same product in
              multiple sizes appears grouped.
            </p>
          </CardHeader>
          <CardContent>
            {itemsQuery.error ? (
              <p className="mb-3 text-sm text-destructive">
                {itemsQuery.error instanceof Error
                  ? itemsQuery.error.message
                  : "Failed to load stock"}
              </p>
            ) : null}
            <InventoryStockList
              items={itemsQuery.data ?? []}
              shopSector={activeShopSector}
              isLoading={itemsQuery.isLoading}
              isUpdating={updateMutation.isPending}
              onAdjustQty={adjustQty}
              onAddSize={startAnotherSize}
              onEditDetails={(item) => {
                const itemCategory =
                  parseInventoryCategory(item.sectorMeta) ?? defaultCategory;
                setEditTarget(item);
                setEditDescription(item.description ?? "");
                setEditSize(item.size ?? "");
                setEditCategory(itemCategory);
                setEditSubCategory(
                  parseInventorySubcategory(item.sectorMeta) ??
                    defaultSubcategoryForCategory(activeShopSector, itemCategory)
                );
                setEditExpiryDate(
                  item.expiryDate
                    ? new Date(item.expiryDate).toISOString().slice(0, 10)
                    : ""
                );
              }}
              onGenerateBarcode={generateBarcode}
              onPrintLabel={setPrintTarget}
              onDelete={setDeleteTarget}
            />
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          <InventoryInsightsPanel orgId={orgId} enabled={moduleEnabled} />
        </aside>
      </div>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add product to stock</DialogTitle>
            <DialogDescription>
              Barcode is auto-created if left blank. For another size of the same product,
              use <strong>Add size</strong> on an existing row — only size and qty change.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addItem} className="space-y-3">
            <div className="space-y-2">
              <Label>Product name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (for full tag)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[72px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder="e.g. Cotton slim fit, blue"
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={category || defaultCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {sectorCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sub-category</Label>
                <select
                  value={subCategory || addSubcategories[0]?.id}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {addSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Size (optional)</Label>
                <Input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="e.g. M, 32, 500ml"
                />
              </div>
              <div className="space-y-2">
                <Label>Barcode (optional)</Label>
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="h-11 rounded-xl font-mono"
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Stock qty</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Use {INFINITE_STOCK_QTY} for unlimited
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reorder at</Label>
                <Input
                  type="number"
                  min={0}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Sell price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            {showExpiryField ? (
              <div className="space-y-2">
                <Label>Expiry date (optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            ) : null}
            {(warning || error) && (
              <FormFeedback warning={warning} error={error} />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Save to stock list"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product details — {editTarget?.name}</DialogTitle>
            <DialogDescription>
              Description and size print on full-size tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[88px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder="Material, size, color, pack info…"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Input
                value={editSize}
                onChange={(e) => setEditSize(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="e.g. M, 32, 500ml"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={editCategory || defaultCategory}
                  onChange={(e) => handleEditCategoryChange(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {sectorCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sub-category</Label>
                <select
                  value={editSubCategory || editSubcategories[0]?.id}
                  onChange={(e) => setEditSubCategory(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {editSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {showExpiryField ? (
              <div className="space-y-2">
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={saveProductDetails} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save details"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the product from your stock list. Past sales records are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!printTarget} onOpenChange={(open) => !open && setPrintTarget(null)}>
        <DialogContent className="max-w-sm overflow-visible [&>button]:print:hidden">
          <DialogHeader>
            <DialogTitle>Print label</DialogTitle>
            <DialogDescription>
              Small tag for shelf stickers · Full tag with shop name, logo, and price
            </DialogDescription>
          </DialogHeader>
          {printTarget?.barcode ? (
            <div className="flex flex-col items-center gap-4 overflow-visible">
              <div className="grid w-full grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLabelSize("small")}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-medium",
                    labelSize === "small"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  Small tag
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("full")}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-medium",
                    labelSize === "full"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  Full tag
                </button>
              </div>

              {labelSize === "full" && printLabelData ? (
                <LabelHeaderPicker
                  value={labelHeaderMode}
                  onChange={setLabelHeaderMode}
                  hasLogo={Boolean(printLabelData.branding.logoUrl)}
                />
              ) : null}

              {printLabelData ? (
                <BarcodeLabelPreview
                  key={labelSize}
                  format={labelSize}
                  {...printLabelData}
                />
              ) : (
                <PageLoader label="Loading label..." />
              )}

              {printLabelData ? (
                <LabelCopiesActions
                  size={labelSize}
                  data={printLabelData}
                  copies={labelCopies}
                  onCopiesChange={setLabelCopies}
                />
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <InventoryToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        orgId={orgId}
        items={itemsQuery.data ?? []}
        shopSector={activeShopSector}
      />
    </div>
  );
}
