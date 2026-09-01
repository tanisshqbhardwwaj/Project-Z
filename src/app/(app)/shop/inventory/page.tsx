"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { INFINITE_STOCK_QTY } from "@/lib/shop/inventory/inventory";
import { FolderPlus, Plus, Wrench, FileText } from "lucide-react";
import { BarcodeLabelPreview } from "@/components/shop/barcode-label";
import { InventoryInsightsPanel } from "@/components/shop/inventory-insights-panel";
import { useActivePlan } from "@/hooks/use-active-plan";
import {
  canAccessReportFeature,
  minimumPlanLabelForReportFeature,
} from "@/lib/billing/report-entitlements";
import { InventoryToolsDialog } from "@/components/shop/inventory-tools-dialog";
import { LabelCopiesActions } from "@/components/shop/label-copies-actions";
import { LabelHeaderPicker } from "@/components/shop/label-header-picker";
import { buildBarcodeLabelData } from "@/lib/shop/inventory/label-data";
import {
  resolveShopLabelBranding,
  type FullLabelHeaderMode,
} from "@/lib/org/shop-settings";
import { catalogCategoryLabel, catalogSubCategoryLabel } from "@/lib/shop/inventory/category-catalog";
import { getShopSectorConfig, inventoryFieldsForSectors, variantsExpectedForSectors, variantAxisLabel, defaultVariantAxisForSectors } from "@/lib/org/shop-sector";
import { cn } from "@/lib/utils";
import { ModuleGate } from "@/components/org/module-gate";
import { DesktopOnlyNote } from "@/components/layout/desktop-only-note";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProductFormDialog,
  type CategoryOption,
} from "@/components/shop/product-form-dialog";
import {
  ProductStockList,
  type ProductRow,
  type ProductVariantRow,
} from "@/components/shop/product-stock-list";

type CategoriesResponse = {
  categories: CategoryOption[];
  businessTypes: string[];
  primarySector: string | null;
};

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
  const { activeBusinessType, activeShopSector, activeOrgSettings, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const plan = useActivePlan();
  const productAnalyticsEnabled =
    moduleEnabled && canAccessReportFeature(plan, "product-analytics");
  const shopSectors = resolveShopBusinessTypes(activeOrgSettings?.shop, activeShopSector);
  const title = moduleLabel("shop_inventory", activeBusinessType ?? "SHOPKEEPER", shopSectors);

  const { warning, error, clear, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [addSizeTarget, setAddSizeTarget] = useState<ProductRow | null>(null);
  const [newSizes, setNewSizes] = useState("");
  const [newSizeQty, setNewSizeQty] = useState("0");
  const [newSizePrice, setNewSizePrice] = useState("");
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [deleteProduct, setDeleteProduct] = useState<ProductRow | null>(null);
  const [editVariant, setEditVariant] = useState<
    { product: ProductRow; variant: ProductVariantRow } | null
  >(null);
  const [variantSize, setVariantSize] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [variantQty, setVariantQty] = useState("0");
  const [variantSell, setVariantSell] = useState("");
  const [variantCost, setVariantCost] = useState("");
  const [variantReorder, setVariantReorder] = useState("0");
  const [deleteVariant, setDeleteVariant] = useState<
    { product: ProductRow; variant: ProductVariantRow } | null
  >(null);
  const [printTarget, setPrintTarget] = useState<
    { product: ProductRow; variant: ProductVariantRow } | null
  >(null);
  const [labelSize, setLabelSize] = useState<"small" | "full">("full");
  const [labelHeaderMode, setLabelHeaderMode] = useState<FullLabelHeaderMode>("both");
  const [labelCopies, setLabelCopies] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "categories"] : ["disabled"],
    queryFn: () => apiFetch<CategoriesResponse>("/api/v1/shop/categories"),
    enabled: !!orgId && moduleEnabled,
  });

  const productsQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "products"] : ["disabled"],
    queryFn: () => apiFetch<ProductRow[]>("/api/v1/shop/products"),
    enabled: !!orgId && moduleEnabled,
    placeholderData: keepPreviousData,
  });

  const itemsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && moduleEnabled,
  });

  const businessTypes = useMemo(
    () => categoriesQuery.data?.businessTypes ?? [activeShopSector ?? "GENERAL"],
    [categoriesQuery.data?.businessTypes, activeShopSector]
  );
  const categories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data?.categories]
  );
  const attributeFields = useMemo(
    () => inventoryFieldsForSectors(businessTypes),
    [businessTypes]
  );
  const variantsByDefault = useMemo(
    () => variantsExpectedForSectors(businessTypes),
    [businessTypes]
  );
  const sectorLabel = businessTypes
    .map((t) => getShopSectorConfig(t).label)
    .join(" · ");
  const addVariantLabel = variantAxisLabel(
    addSizeTarget?.variantAxis ?? defaultVariantAxisForSectors(businessTypes)
  );

  const customLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.key, category.label);
      for (const sub of category.subcategories) map.set(sub.key, sub.label);
    }
    return map;
  }, [categories]);

  const lookup = useMemo(
    () => ({
      categoryLabel: (key: string | null) =>
        key
          ? customLabelByKey.get(key) ?? catalogCategoryLabel(key) ?? key
          : "Uncategorized",
      subCategoryLabel: (categoryKey: string | null, key: string | null) =>
        key
          ? customLabelByKey.get(key) ??
            catalogSubCategoryLabel(categoryKey, key) ??
            key
          : "",
    }),
    [customLabelByKey]
  );

  function invalidateAll() {
    if (!orgId) return;
    qc.invalidateQueries({ queryKey: ["shop", orgId, "products"] });
    qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
    qc.invalidateQueries({
      queryKey: [...queryKeys.org(orgId), "shop", "inventory", "analytics"],
    });
    qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
  }

  const variantMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/inventory", {
        method: "DELETE",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });

  const productMutation = useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: Record<string, unknown>;
    }) =>
      apiFetch(`/api/v1/shop/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });

  const addVariantsMutation = useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: Record<string, unknown>;
    }) =>
      apiFetch(`/api/v1/shop/products/${productId}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiFetch(`/api/v1/shop/products/${productId}`, { method: "DELETE" }),
    onSuccess: invalidateAll,
  });

  const categoryMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: ["shop", orgId, "categories"] });
    },
  });

  const labelBrandingQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "label-branding"] : ["disabled"],
    queryFn: async () => {
      const org = await apiFetch<{ name: string; settings?: unknown }>(
        "/api/v1/organizations"
      );
      return resolveShopLabelBranding(org.name, org.settings);
    },
    enabled: !!orgId && !!printTarget,
  });

  const printLabelData =
    printTarget?.variant.barcode && labelBrandingQuery.data
      ? {
          ...buildBarcodeLabelData(
            {
              name: printTarget.product.name,
              barcode: printTarget.variant.barcode,
              description: printTarget.product.description,
              size: printTarget.variant.size,
              unit: printTarget.variant.unit,
              sellPaise: printTarget.variant.sellPaise,
              costPaise: printTarget.variant.costPaise,
            },
            labelBrandingQuery.data
          ),
          headerMode: labelHeaderMode,
        }
      : null;

  async function adjustQty(variantId: string, nextQty: number) {
    clear();
    try {
      await variantMutation.mutateAsync({ itemId: variantId, quantity: nextQty });
    } catch (err) {
      applyError(err, "Could not update stock");
    }
  }

  async function submitNewSizes() {
    if (!addSizeTarget?.id) return;
    clear();
    const sizes = newSizes
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length === 0) {
      return applyError(new Error("Enter at least one size"), "Enter at least one size");
    }
    try {
      await addVariantsMutation.mutateAsync({
        productId: addSizeTarget.id,
        body: {
          variants: sizes.map((size) => ({
            size,
            quantity: Number(newSizeQty) || 0,
            sellRupees: newSizePrice ? Number(newSizePrice) : null,
          })),
        },
      });
      setFlash(
        `Added ${sizes.length} variant${sizes.length === 1 ? "" : "s"} to ${addSizeTarget.name}`
      );
      setAddSizeTarget(null);
      setNewSizes("");
      setNewSizeQty("0");
      setNewSizePrice("");
    } catch (err) {
      applyError(err, "Could not add sizes");
    }
  }

  async function saveProduct() {
    if (!editProduct?.id) return;
    clear();
    try {
      await productMutation.mutateAsync({
        productId: editProduct.id,
        body: {
          name: editName.trim(),
          brand: editBrand.trim() || null,
          description: editDescription.trim() || null,
          categoryKey: editCategory || null,
          subCategoryKey: editSubCategory || null,
        },
      });
      setEditProduct(null);
    } catch (err) {
      applyError(err, "Could not save the product");
    }
  }

  async function saveVariant() {
    if (!editVariant) return;
    clear();
    try {
      await variantMutation.mutateAsync({
        itemId: editVariant.variant.id,
        size: variantSize.trim() || null,
        color: variantColor.trim() || null,
        barcode: variantBarcode.trim() || null,
        sku: variantSku.trim() || null,
        quantity: Number(variantQty) || 0,
        reorderLevel: Number(variantReorder) || 0,
        sellRupees: variantSell ? Number(variantSell) : null,
        costRupees: variantCost ? Number(variantCost) : null,
      });
      setEditVariant(null);
    } catch (err) {
      applyError(err, "Could not save the variant");
    }
  }

  async function confirmDeleteVariant() {
    if (!deleteVariant) return;
    clear();
    try {
      await deleteVariantMutation.mutateAsync({
        itemId: deleteVariant.variant.id,
      });
      setDeleteVariant(null);
    } catch (err) {
      applyError(err, "Could not delete the variant");
      setDeleteVariant(null);
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteProduct?.id) return;
    clear();
    try {
      await deleteProductMutation.mutateAsync(deleteProduct.id);
      setDeleteProduct(null);
    } catch (err) {
      applyError(err, "Could not delete the product");
      setDeleteProduct(null);
    }
  }

  const editSubcategories =
    categories.find((c) => c.key === editCategory)?.subcategories ?? [];

  return (
    <ModuleGate moduleKey="shop_inventory">
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            One row per product. Sizes and variants sit inside, each with its own
            barcode and stock count.
          </p>
          <div className="mt-2">
            <DesktopOnlyNote feature="Bulk CSV and inventory tools" />
          </div>
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
            onClick={() => setNewCategoryOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Category
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setToolsOpen(true)}
          >
            <Wrench className="mr-2 h-4 w-4" />
            Tools
          </Button>
          <Button className="h-11 rounded-xl" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <FormFeedback warning={warning} error={error} />
      {flash ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <span>{flash}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,380px)] xl:items-start">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Stock list</CardTitle>
            <p className="text-sm text-muted-foreground">
              Categories for {sectorLabel.toLowerCase()}. Expand a product to see
              every size.
            </p>
          </CardHeader>
          <CardContent>
            {productsQuery.error ? (
              <p className="mb-3 text-sm text-destructive">
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : "Failed to load stock"}
              </p>
            ) : null}
            <ProductStockList
              products={productsQuery.data ?? []}
              categories={categories.map((c) => ({ key: c.key, label: c.label }))}
              lookup={lookup}
              isLoading={productsQuery.isFetching}
              isInitialLoading={productsQuery.isLoading && !productsQuery.data}
              isUpdating={variantMutation.isPending}
              onAddVariant={(product) => {
                setAddSizeTarget(product);
                setNewSizes("");
              }}
              onEditProduct={(product) => {
                setEditProduct(product);
                setEditName(product.name);
                setEditBrand(product.brand ?? "");
                setEditDescription(product.description ?? "");
                setEditCategory(product.categoryKey ?? "");
                setEditSubCategory(product.subCategoryKey ?? "");
              }}
              onDeleteProduct={setDeleteProduct}
              onAdjustQty={adjustQty}
              onEditVariant={(product, variant) => {
                setEditVariant({ product, variant });
                setVariantSize(variant.size ?? "");
                setVariantColor(variant.color ?? "");
                setVariantBarcode(variant.barcode ?? "");
                setVariantSku(variant.sku ?? "");
                setVariantQty(String(variant.quantity));
                setVariantReorder(String(variant.reorderLevel));
                setVariantSell(
                  variant.sellPaise ? String(Number(variant.sellPaise) / 100) : ""
                );
                setVariantCost(
                  variant.costPaise ? String(Number(variant.costPaise) / 100) : ""
                );
              }}
              onPrintLabel={(product, variant) =>
                setPrintTarget({ product, variant })
              }
              onDeleteVariant={(product, variant) =>
                setDeleteVariant({ product, variant })
              }
            />
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          {productAnalyticsEnabled ? (
            <InventoryInsightsPanel orgId={orgId} enabled />
          ) : moduleEnabled ? (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Product analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Top sellers, slow movers, and stock snapshot are on the{" "}
                  {minimumPlanLabelForReportFeature("product-analytics")} plan.
                </p>
                <Link href="/settings/billing">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    View plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <ProductFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        orgId={orgId}
        categories={categories}
        attributeFields={attributeFields}
        variantsByDefault={variantsByDefault}
        businessTypes={businessTypes}
        onCreated={(productName, variantCount) =>
          setFlash(
            `Saved "${productName}" with ${variantCount} variant${variantCount === 1 ? "" : "s"} — barcodes are ready to print.`
          )
        }
        onViewExisting={(_productId, name) => {
          setFlash(`Search the stock list for "${name}" to review it.`);
        }}
      />

      {/* Add variants to an existing product */}
      <Dialog
        open={!!addSizeTarget}
        onOpenChange={(open) => !open && setAddSizeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {addVariantLabel.toLowerCase()}s — {addSizeTarget?.name}</DialogTitle>
            <DialogDescription>
              Each new {addVariantLabel.toLowerCase()} becomes its own variant with a fresh barcode. Existing
              variants are untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{addVariantLabel}s (comma separated)</Label>
              <Input
                value={newSizes}
                onChange={(e) => setNewSizes(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="XL, XXL, 3XL"
                autoFocus
              />
              {addSizeTarget ? (
                <p className="text-xs text-muted-foreground">
                  Already stocked:{" "}
                  {addSizeTarget.variants
                    .map((v) => v.variantLabel ?? v.size ?? "—")
                    .join(", ")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Opening stock per {addVariantLabel.toLowerCase()}</Label>
                <Input
                  type="number"
                  min={0}
                  value={newSizeQty}
                  onChange={(e) => setNewSizeQty(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sell price ₹ (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newSizePrice}
                  onChange={(e) => setNewSizePrice(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Same as existing"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setAddSizeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={submitNewSizes}
              disabled={addVariantsMutation.isPending}
            >
              {addVariantsMutation.isPending ? "Adding…" : `Add ${addVariantLabel.toLowerCase()}s`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit product */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              Changes apply to every size of this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[72px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value);
                    setEditSubCategory("");
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Sub-category</Label>
                <select
                  value={editSubCategory}
                  onChange={(e) => setEditSubCategory(e.target.value)}
                  disabled={editSubcategories.length === 0}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50"
                >
                  <option value="">None</option>
                  {editSubcategories.map((sub) => (
                    <option key={sub.key} value={sub.key}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditProduct(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={saveProduct}
              disabled={productMutation.isPending}
            >
              {productMutation.isPending ? "Saving…" : "Save product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit one variant */}
      <Dialog
        open={!!editVariant}
        onOpenChange={(open) => !open && setEditVariant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVariant?.variant.displayName}</DialogTitle>
            <DialogDescription>
              Barcode, stock and price for this size only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Size</Label>
                <Input
                  value={variantSize}
                  onChange={(e) => setVariantSize(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Colour (optional)</Label>
                <Input
                  value={variantColor}
                  onChange={(e) => setVariantColor(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Barcode</Label>
              <Input
                value={variantBarcode}
                onChange={(e) => setVariantBarcode(e.target.value)}
                className="h-11 rounded-xl font-mono"
                placeholder="Leave blank to clear"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SKU (optional)</Label>
              <Input
                value={variantSku}
                onChange={(e) => setVariantSku(e.target.value)}
                className="h-11 rounded-xl font-mono uppercase"
                placeholder="Auto-generated if blank on create"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={variantQty}
                  onChange={(e) => setVariantQty(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  {INFINITE_STOCK_QTY} = unlimited
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Reorder at</Label>
                <Input
                  type="number"
                  min={0}
                  value={variantReorder}
                  onChange={(e) => setVariantReorder(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Sell price ₹</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={variantSell}
                  onChange={(e) => setVariantSell(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase price ₹</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={variantCost}
                  onChange={(e) => setVariantCost(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditVariant(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={saveVariant}
              disabled={variantMutation.isPending}
            >
              {variantMutation.isPending ? "Saving…" : "Save variant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom category */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom category</DialogTitle>
            <DialogDescription>
              Your own category appears everywhere — products, filters and reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Category name</Label>
            <Input
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="e.g. Oversized Streetwear"
              autoFocus
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setNewCategoryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={categoryMutation.isPending || newCategoryLabel.trim().length < 2}
              onClick={async () => {
                clear();
                try {
                  await categoryMutation.mutateAsync({
                    label: newCategoryLabel.trim(),
                  });
                  setFlash(`Category "${newCategoryLabel.trim()}" added`);
                  setNewCategoryLabel("");
                  setNewCategoryOpen(false);
                } catch (err) {
                  applyError(err, "Could not add the category");
                }
              }}
            >
              {categoryMutation.isPending ? "Adding…" : "Add category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <Dialog
        open={!!deleteVariant}
        onOpenChange={(open) => !open && setDeleteVariant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteVariant?.variant.displayName}?</DialogTitle>
            <DialogDescription>
              This removes only this size. Past sales stay on record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteVariant(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11 rounded-xl px-6 text-base"
              onClick={confirmDeleteVariant}
              disabled={deleteVariantMutation.isPending}
            >
              {deleteVariantMutation.isPending ? "Deleting…" : "Delete variant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteProduct?.name}?</DialogTitle>
            <DialogDescription>
              This removes the product and all{" "}
              {deleteProduct?.variants.length ?? 0} of its variants. Past sales stay
              on record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteProduct(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11 rounded-xl px-6 text-base"
              onClick={confirmDeleteProduct}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Deleting…" : "Delete product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label printing */}
      <Dialog open={!!printTarget} onOpenChange={(open) => !open && setPrintTarget(null)}>
        <DialogContent className="max-w-sm overflow-visible [&>button]:print:hidden">
          <DialogHeader>
            <DialogTitle>Print label</DialogTitle>
            <DialogDescription>
              {printTarget?.variant.displayName}
            </DialogDescription>
          </DialogHeader>
          {printTarget?.variant.barcode ? (
            <div className="flex flex-col items-center gap-4 overflow-visible">
              <div className="grid w-full grid-cols-2 gap-1">
                {(["small", "full"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setLabelSize(size)}
                    className={cn(
                      "rounded-xl border py-2 text-xs font-medium",
                      labelSize === size
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    {size === "small" ? "Small tag" : "Full tag"}
                  </button>
                ))}
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This variant has no barcode yet.
              </p>
              <Button
                className="w-full rounded-xl"
                disabled={variantMutation.isPending}
                onClick={async () => {
                  if (!printTarget) return;
                  clear();
                  try {
                    await variantMutation.mutateAsync({
                      itemId: printTarget.variant.id,
                      generateBarcode: true,
                    });
                    setPrintTarget(null);
                    setFlash(
                      `Barcode generated for ${printTarget.variant.displayName} — open the label again to print.`
                    );
                  } catch (err) {
                    applyError(err, "Could not generate a barcode");
                  }
                }}
              >
                {variantMutation.isPending ? "Generating…" : "Generate barcode"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InventoryToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        orgId={orgId}
        items={itemsQuery.data ?? []}
        businessTypes={businessTypes}
      />
    </div>
    </ModuleGate>
  );
}
