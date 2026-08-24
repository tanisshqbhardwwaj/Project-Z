"use client";

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { formatINR } from "@/lib/finance/money";
import { formatStockDisplay } from "@/lib/shop/inventory";
import {
  matchesVariantSearch,
  variantSearchHaystack,
} from "@/lib/shop/variant-display";
import { variantSubtitle } from "@/lib/shop/variant-display";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Barcode,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
} from "lucide-react";

export type ProductVariantRow = {
  id: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  displayName: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  sellPaise: string | null;
  costPaise: string | null;
  expiryDate: string | null;
  supplierName: string | null;
  batchNo: string | null;
  isLowStock: boolean;
  isUnlimited: boolean;
};

export type ProductRow = {
  id: string | null;
  key: string;
  name: string;
  description: string | null;
  brand: string | null;
  categoryKey: string | null;
  subCategoryKey: string | null;
  unit: string;
  hasVariants: boolean;
  variantAxis: string | null;
  supplierName: string | null;
  batchNo: string | null;
  createdAt: string;
  variants: ProductVariantRow[];
  totalQuantity: number;
  lowStockCount: number;
  isLegacy: boolean;
};

type StockFilter = "all" | "low" | "no-barcode" | "variants";

export type CategoryLookup = {
  categoryLabel: (key: string | null) => string;
  subCategoryLabel: (categoryKey: string | null, key: string | null) => string;
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function VariantRow({
  variant,
  productName,
  variantAxis,
  onAdjustQty,
  onEditVariant,
  onPrintLabel,
  onDeleteVariant,
  isUpdating,
}: {
  variant: ProductVariantRow;
  productName: string;
  variantAxis?: string | null;
  onAdjustQty: (variantId: string, nextQty: number) => void;
  onEditVariant: (variant: ProductVariantRow) => void;
  onPrintLabel: (variant: ProductVariantRow) => void;
  onDeleteVariant: (variant: ProductVariantRow) => void;
  isUpdating: boolean;
}) {
  const qualifier =
    variant.variantLabel ??
    variantSubtitle({
      size: variant.size,
      color: variant.color,
      variantLabel: variant.variantLabel,
      variantAxis,
    });

  return (
    <tr className="border-t bg-muted/[0.04] text-sm">
      <td className="py-2 pl-8 pr-3">
        <span className="block font-medium">{qualifier || productName}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {variant.barcode ? (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {variant.barcode}
            </code>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              No barcode
            </span>
          )}
          {variant.sku ? (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {variant.sku}
            </code>
          ) : null}
          {variant.isLowStock ? (
            <Badge className="rounded-full bg-destructive/10 text-[10px] text-destructive hover:bg-destructive/10">
              Low
            </Badge>
          ) : null}
        </span>
      </td>
      <td className="py-2 pr-3">
        {variant.isUnlimited ? (
          <Badge variant="secondary" className="rounded-full text-[10px]">
            Unlimited
          </Badge>
        ) : (
          <div className="inline-flex items-center rounded-lg border bg-background">
            <button
              type="button"
              disabled={isUpdating || variant.quantity <= 0}
              onClick={() =>
                onAdjustQty(variant.id, Math.max(0, variant.quantity - 1))
              }
              className="px-2 py-1 text-sm disabled:opacity-40"
              aria-label={`Reduce stock for ${variant.displayName}`}
            >
              −
            </button>
            <span className="min-w-[2.25rem] text-center text-sm font-semibold tabular-nums">
              {variant.quantity}
            </span>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onAdjustQty(variant.id, variant.quantity + 1)}
              className="px-2 py-1 text-sm disabled:opacity-40"
              aria-label={`Increase stock for ${variant.displayName}`}
            >
              +
            </button>
          </div>
        )}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {variant.sellPaise ? (
          formatINR(variant.sellPaise)
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        <div className="flex justify-end gap-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-lg px-0"
            onClick={() => onEditVariant(variant)}
            title={`Edit ${variant.displayName}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-lg px-0"
            onClick={() => onPrintLabel(variant)}
            title={`Print label for ${variant.displayName}`}
          >
            {variant.barcode ? (
              <Printer className="h-3.5 w-3.5" />
            ) : (
              <Barcode className="h-3.5 w-3.5" />
            )}
          </Button>
          <DeleteIconButton
            onClick={() => onDeleteVariant(variant)}
            title={`Delete ${variant.displayName}`}
            aria-label={`Delete ${variant.displayName}`}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Stock list keyed by PRODUCT. A T-shirt in five sizes reads as one row that
 * expands to show its five barcoded variants.
 */
export function ProductStockList({
  products,
  categories,
  lookup,
  isLoading,
  isUpdating,
  onAddVariant,
  onEditProduct,
  onDeleteProduct,
  onAdjustQty,
  onEditVariant,
  onPrintLabel,
  onDeleteVariant,
}: {
  products: ProductRow[];
  categories: Array<{ key: string; label: string }>;
  lookup: CategoryLookup;
  isLoading: boolean;
  isUpdating: boolean;
  onAddVariant: (product: ProductRow) => void;
  onEditProduct: (product: ProductRow) => void;
  onDeleteProduct: (product: ProductRow) => void;
  onAdjustQty: (variantId: string, nextQty: number) => void;
  onEditVariant: (product: ProductRow, variant: ProductVariantRow) => void;
  onPrintLabel: (product: ProductRow, variant: ProductVariantRow) => void;
  onDeleteVariant: (product: ProductRow, variant: ProductVariantRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const indexed = useMemo(
    () =>
      products.map((product) => ({
        product,
        // Searching includes every variant, so "t-shirt m" finds the product
        // and expanding it reveals the M row.
        haystack: [
          product.name,
          product.brand ?? "",
          product.description ?? "",
          lookup.categoryLabel(product.categoryKey),
          lookup.subCategoryLabel(product.categoryKey, product.subCategoryKey),
          product.supplierName ?? "",
          ...product.variants.map((v) =>
            variantSearchHaystack({
              productName: product.name,
              size: v.size,
              color: v.color,
              variantLabel: v.variantLabel,
              sku: v.sku,
              barcode: v.barcode,
              unit: v.unit,
            })
          ),
        ]
          .join(" ")
          .toLowerCase(),
      })),
    [products, lookup]
  );

  const filtered = useMemo(() => {
    return indexed
      .filter(({ product, haystack }) => {
        if (search.trim() && !matchesVariantSearch(haystack, search)) return false;
        if (categoryFilter !== "all" && product.categoryKey !== categoryFilter) {
          return false;
        }
        if (filter === "low" && product.lowStockCount === 0) return false;
        if (
          filter === "no-barcode" &&
          !product.variants.some((v) => !v.barcode)
        ) {
          return false;
        }
        if (filter === "variants" && product.variants.length < 2) return false;
        return true;
      })
      .map((entry) => entry.product);
  }, [indexed, search, categoryFilter, filter]);

  const stats = useMemo(() => {
    const variantCount = products.reduce((sum, p) => sum + p.variants.length, 0);
    return {
      products: products.length,
      variants: variantCount,
      low: products.filter((p) => p.lowStockCount > 0).length,
      noBarcode: products.filter((p) => p.variants.some((v) => !v.barcode)).length,
      multiVariant: products.filter((p) => p.variants.length > 1).length,
    };
  }, [products]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (isLoading) return <PageLoader label="Loading stock..." />;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, size, colour, brand, SKU, barcode or category…"
            className="h-10 rounded-xl pl-9"
          />
        </div>

        {categories.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              All categories ({products.length})
            </FilterChip>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryKey === cat.key).length;
              if (count === 0 && categoryFilter !== cat.key) return null;
              return (
                <FilterChip
                  key={cat.key}
                  active={categoryFilter === cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                >
                  {cat.label} ({count})
                </FilterChip>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All products (${stats.products})`],
              ["variants", `With sizes (${stats.multiVariant})`],
              ["low", `Low stock (${stats.low})`],
              ["no-barcode", `Missing barcode (${stats.noBarcode})`],
            ] as const
          ).map(([key, label]) => (
            <FilterChip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">
            {products.length === 0
              ? "No products yet"
              : "No product matches your search"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {products.length === 0
              ? "Add your first product above. If it comes in several sizes, add them all in one go and each size gets its own barcode."
              : "Try a different search term or clear the filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-foreground/70">
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 text-right font-medium">Price</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isOpen =
                    expanded.has(product.key) ||
                    (product.variants.length === 1 && !product.hasVariants);
                  const showVariants =
                    product.variants.length > 1 || product.hasVariants;
                  const priceRange = (() => {
                    const prices = product.variants
                      .map((v) => (v.sellPaise ? Number(v.sellPaise) : null))
                      .filter((p): p is number => p != null);
                    if (prices.length === 0) return null;
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    return min === max
                      ? formatINR(String(min))
                      : `${formatINR(String(min))} – ${formatINR(String(max))}`;
                  })();

                  return (
                    <Fragment key={product.key}>
                      <tr
                        className={cn(
                          "border-t transition-colors hover:bg-muted/30",
                          product.lowStockCount > 0 && "bg-destructive/[0.03]"
                        )}
                      >
                        <td className="p-3 align-middle">
                          <div className="flex items-start gap-2">
                            {showVariants ? (
                              <button
                                type="button"
                                onClick={() => toggle(product.key)}
                                className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted"
                                aria-label={
                                  expanded.has(product.key)
                                    ? `Collapse ${product.name}`
                                    : `Show sizes of ${product.name}`
                                }
                              >
                                {expanded.has(product.key) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">
                                {product.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {product.brand ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full text-[10px]"
                                  >
                                    {product.brand}
                                  </Badge>
                                ) : null}
                                {product.categoryKey ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full text-[10px]"
                                  >
                                    {lookup.categoryLabel(product.categoryKey)}
                                  </Badge>
                                ) : null}
                                {showVariants ? (
                                  <Badge className="rounded-full bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                                    {product.variants.length}{" "}
                                    {product.variantAxis ?? "variant"}
                                    {product.variants.length === 1 ? "" : "s"}
                                  </Badge>
                                ) : null}
                                {product.lowStockCount > 0 ? (
                                  <Badge className="rounded-full bg-destructive/10 text-[10px] text-destructive hover:bg-destructive/10">
                                    {product.lowStockCount} low
                                  </Badge>
                                ) : null}
                                {product.isLegacy ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full text-[10px] text-muted-foreground"
                                  >
                                    Imported
                                  </Badge>
                                ) : null}
                              </div>
                              {!expanded.has(product.key) && showVariants ? (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {product.variants
                                    .slice(0, 6)
                                    .map(
                                      (v) =>
                                        `${v.variantLabel ?? v.size ?? "—"}${
                                          v.isUnlimited ? "" : ` (${v.quantity})`
                                        }`
                                    )
                                    .join(" · ")}
                                  {product.variants.length > 6 ? " …" : ""}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-middle">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatStockDisplay(product.totalQuantity, product.unit)}
                          </span>
                          {showVariants ? (
                            <span className="block text-[11px] text-muted-foreground">
                              across {product.variants.length} variants
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3 text-right align-middle tabular-nums">
                          {priceRange ?? (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 align-middle">
                          <div className="flex justify-end gap-0.5">
                            {product.id ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg px-2 text-xs"
                                onClick={() => onAddVariant(product)}
                                title={`Add another size to ${product.name}`}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Size
                              </Button>
                            ) : null}
                            {product.id ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-lg px-0"
                                onClick={() => onEditProduct(product)}
                                title={`Edit ${product.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            {product.id ? (
                              <DeleteIconButton
                                onClick={() => onDeleteProduct(product)}
                                title={`Delete ${product.name}`}
                                aria-label={`Delete ${product.name}`}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isOpen
                        ? product.variants.map((variant) => (
                            <VariantRow
                              key={variant.id}
                              variant={variant}
                              productName={product.name}
                              variantAxis={product.variantAxis}
                              isUpdating={isUpdating}
                              onAdjustQty={onAdjustQty}
                              onEditVariant={(v) => onEditVariant(product, v)}
                              onPrintLabel={(v) => onPrintLabel(product, v)}
                              onDeleteVariant={(v) => onDeleteVariant(product, v)}
                            />
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {filtered.length} product{filtered.length === 1 ? "" : "s"} ·{" "}
            {filtered.reduce((sum, p) => sum + p.variants.length, 0)} sellable
            variants
          </div>
        </div>
      )}
    </div>
  );
}
