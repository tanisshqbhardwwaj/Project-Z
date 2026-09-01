"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { formatINR } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory/inventory";
import {
  inventoryCategoriesForSector,
  inventoryCategoryLabel,
  inventorySubcategoriesForCategory,
  inventorySubcategoryLabel,
  parseInventoryCategory,
  parseInventorySubcategory,
} from "@/lib/shop/inventory/inventory-categories";
import type { ShopSector } from "@/lib/org/shop-sector";
import { getShopSectorConfig } from "@/lib/org/shop-sector";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Barcode,
  Copy,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
} from "lucide-react";

export type InventoryStockItem = {
  id: string;
  name: string;
  description: string | null;
  size: string | null;
  barcode: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  sellPaise: string | null;
  expiryDate?: string | null;
  sectorMeta?: unknown;
};

type StockFilter = "all" | "low" | "no-barcode" | "expiring";

type InventoryStockListProps = {
  items: InventoryStockItem[];
  shopSector: ShopSector | null;
  isLoading: boolean;
  isUpdating: boolean;
  onAdjustQty: (item: InventoryStockItem, delta: number) => void;
  onAddSize: (item: InventoryStockItem) => void;
  onEditDetails: (item: InventoryStockItem) => void;
  onGenerateBarcode: (item: InventoryStockItem) => void;
  onPrintLabel: (item: InventoryStockItem) => void;
  onDelete: (item: InventoryStockItem) => void;
};

function isExpiringSoon(expiryDate: string | null | undefined, withinDays = 30): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return exp >= now && exp <= limit;
}

function formatExpiryShort(expiryDate: string | null | undefined): string | null {
  if (!expiryDate) return null;
  const d = new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function groupItems(items: InventoryStockItem[]) {
  const groups = new Map<string, InventoryStockItem[]>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([, group]) => ({
    name: group[0]!.name,
    items: group.sort((a, b) => (a.size ?? "").localeCompare(b.size ?? "")),
  }));
}

function matchesSearch(item: InventoryStockItem, query: string, shopSector: ShopSector | null) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const category = parseInventoryCategory(item.sectorMeta);
  const subCategory = parseInventorySubcategory(item.sectorMeta);
  const categoryLabel = category
    ? inventoryCategoryLabel(shopSector, category).toLowerCase()
    : "";
  const subCategoryLabel = subCategory
    ? inventorySubcategoryLabel(shopSector, category, subCategory).toLowerCase()
    : "";
  return (
    item.name.toLowerCase().includes(q) ||
    (item.size?.toLowerCase().includes(q) ?? false) ||
    (item.barcode?.includes(q) ?? false) ||
    (item.description?.toLowerCase().includes(q) ?? false) ||
    categoryLabel.includes(q) ||
    subCategoryLabel.includes(q)
  );
}

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

function StockQtyControl({
  item,
  disabled,
  onAdjust,
}: {
  item: InventoryStockItem;
  disabled: boolean;
  onAdjust: (delta: number) => void;
}) {
  const infinite = isInfiniteStock(item.quantity);

  if (infinite) {
    return (
      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
        Unlimited
      </Badge>
    );
  }

  return (
    <div className="inline-flex items-center rounded-xl border bg-background">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-l-xl rounded-r-none px-0"
        disabled={disabled || item.quantity <= 0}
        onClick={() => onAdjust(-1)}
        aria-label="Decrease stock"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[2.5rem] px-1 text-center text-sm font-semibold tabular-nums">
        {item.quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-l-none rounded-r-xl px-0"
        disabled={disabled}
        onClick={() => onAdjust(1)}
        aria-label="Increase stock"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function StockRow({
  item,
  groupName,
  isUpdating,
  showGroupMeta,
  isVariant,
  isLastInGroup,
  shopSector,
  onAdjustQty,
  onAddSize,
  onEditDetails,
  onGenerateBarcode,
  onPrintLabel,
  onDelete,
}: {
  item: InventoryStockItem;
  groupName: string;
  isUpdating: boolean;
  showGroupMeta: boolean;
  isVariant: boolean;
  isLastInGroup: boolean;
  shopSector: ShopSector | null;
  onAdjustQty: (item: InventoryStockItem, delta: number) => void;
  onAddSize: (item: InventoryStockItem) => void;
  onEditDetails: (item: InventoryStockItem) => void;
  onGenerateBarcode: (item: InventoryStockItem) => void;
  onPrintLabel: (item: InventoryStockItem) => void;
  onDelete: (item: InventoryStockItem) => void;
}) {
  const infinite = isInfiniteStock(item.quantity);
  const low = !infinite && item.quantity <= item.reorderLevel;
  const expiring = isExpiringSoon(item.expiryDate);
  const expiryLabel = formatExpiryShort(item.expiryDate);
  const categoryId = parseInventoryCategory(item.sectorMeta);
  const subCategoryId = parseInventorySubcategory(item.sectorMeta);

  return (
    <tr
      className={cn(
        "border-t transition-colors hover:bg-muted/30",
        low && "bg-destructive/[0.03]",
        isVariant && "bg-muted/[0.06]",
        isLastInGroup && "border-b-2 border-border/50"
      )}
    >
      <td className="max-w-[12rem] p-3 align-middle sm:max-w-none">
        <div
          className={cn(
            "min-h-[2.5rem]",
            isVariant && "border-l-2 border-primary/25 pl-3"
          )}
        >
          {isVariant ? (
            <p className="font-semibold leading-tight">
              {item.size ? `Size ${item.size}` : groupName}
            </p>
          ) : (
            <>
              <p className="font-semibold leading-tight">{groupName}</p>
              {showGroupMeta && item.description ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {!isVariant && item.size ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Size {item.size}
              </Badge>
            ) : null}
            {showGroupMeta && categoryId ? (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {inventoryCategoryLabel(shopSector, categoryId)}
              </Badge>
            ) : null}
            {showGroupMeta && subCategoryId ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                {inventorySubcategoryLabel(shopSector, categoryId, subCategoryId)}
              </Badge>
            ) : null}
            {expiryLabel ? (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-[10px]",
                  expiring && "border-amber-500 text-amber-700"
                )}
              >
                Exp {expiryLabel}
              </Badge>
            ) : null}
            {low ? (
              <Badge className="rounded-full bg-destructive/10 text-[10px] text-destructive hover:bg-destructive/10">
                Low
              </Badge>
            ) : null}
            {expiring ? (
              <Badge className="rounded-full bg-amber-500/10 text-[10px] text-amber-700 hover:bg-amber-500/10">
                Expiring
              </Badge>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden w-[1%] whitespace-nowrap p-3 align-middle sm:table-cell">
        <div className="flex w-max flex-col items-start gap-1">
          <StockQtyControl
            item={item}
            disabled={isUpdating}
            onAdjust={(delta) => onAdjustQty(item, delta)}
          />
          {!infinite ? (
            <p className="text-[10px] leading-none text-muted-foreground">
              Reorder at {item.reorderLevel}
            </p>
          ) : null}
        </div>
      </td>
      <td className="w-[1%] whitespace-nowrap p-3 pl-4 align-middle text-right">
        <span
          className={cn(
            "tabular-nums",
            item.sellPaise ? "font-semibold" : "text-xs text-muted-foreground"
          )}
        >
          {item.sellPaise ? formatINR(item.sellPaise) : "—"}
        </span>
      </td>
      <td className="hidden w-[1%] whitespace-nowrap p-3 pl-4 align-middle md:table-cell">
        {item.barcode ? (
          <code className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none">
            {item.barcode}
          </code>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Missing
          </span>
        )}
      </td>
      <td className="w-[1%] p-3 pl-2 align-middle">
        <div className="flex flex-col items-end gap-2">
          <div className="sm:hidden">
            <StockQtyControl
              item={item}
              disabled={isUpdating}
              onAdjust={(delta) => onAdjustQty(item, delta)}
            />
          </div>
          <div className="flex w-max flex-nowrap items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-lg px-0"
            onClick={() => onAddSize(item)}
            title="Add another size"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="sr-only">Add size</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-lg px-0"
            onClick={() => onEditDetails(item)}
            title="Edit details"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          {!item.barcode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 rounded-lg px-0"
              disabled={isUpdating}
              onClick={() => onGenerateBarcode(item)}
              title="Generate barcode"
            >
              <Barcode className="h-3.5 w-3.5" />
              <span className="sr-only">Generate barcode</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 rounded-lg px-0"
              onClick={() => onPrintLabel(item)}
              title="Print label"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="sr-only">Print label</span>
            </Button>
          )}
          <DeleteIconButton
            className="shrink-0"
            onClick={() => onDelete(item)}
            title={`Delete ${item.name}`}
            aria-label={`Delete ${item.name}`}
          />
        </div>
        </div>
      </td>
    </tr>
  );
}

export function InventoryStockList({
  items,
  shopSector,
  isLoading,
  isUpdating,
  onAdjustQty,
  onAddSize,
  onEditDetails,
  onGenerateBarcode,
  onPrintLabel,
  onDelete,
}: InventoryStockListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");

  const categories = useMemo(
    () => inventoryCategoriesForSector(shopSector),
    [shopSector]
  );
  const subcategories = useMemo(
    () =>
      categoryFilter === "all"
        ? []
        : inventorySubcategoriesForCategory(shopSector, categoryFilter),
    [shopSector, categoryFilter]
  );
  const sectorLabel = getShopSectorConfig(shopSector).label;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearch(item, search, shopSector)) return false;
      const infinite = isInfiniteStock(item.quantity);
      const low = !infinite && item.quantity <= item.reorderLevel;
      if (filter === "low" && !low) return false;
      if (filter === "no-barcode" && item.barcode) return false;
      if (filter === "expiring" && !isExpiringSoon(item.expiryDate)) return false;
      if (categoryFilter !== "all") {
        const cat = parseInventoryCategory(item.sectorMeta);
        if (cat !== categoryFilter) return false;
      }
      if (subCategoryFilter !== "all") {
        const sub = parseInventorySubcategory(item.sectorMeta);
        if (sub !== subCategoryFilter) return false;
      }
      return true;
    });
  }, [items, search, filter, categoryFilter, subCategoryFilter, shopSector]);

  const groups = useMemo(() => groupItems(filtered), [filtered]);

  const stats = useMemo(() => {
    const lowCount = items.filter(
      (i) => !isInfiniteStock(i.quantity) && i.quantity <= i.reorderLevel
    ).length;
    const noBarcode = items.filter((i) => !i.barcode).length;
    const expiringCount = items.filter((i) => isExpiringSoon(i.expiryDate)).length;
    return { total: items.length, lowCount, noBarcode, expiringCount };
  }, [items]);

  if (isLoading) {
    return <PageLoader label="Loading stock..." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, size, category, sub-category, barcode…"
            className="h-10 rounded-xl border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Categories · {sectorLabel}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterChip
              active={categoryFilter === "all"}
              onClick={() => {
                setCategoryFilter("all");
                setSubCategoryFilter("all");
              }}
            >
              All ({items.length})
            </FilterChip>
            {categories.map((cat) => {
              const count = items.filter(
                (i) => parseInventoryCategory(i.sectorMeta) === cat.id
              ).length;
              if (count === 0 && categoryFilter !== cat.id) return null;
              return (
                <FilterChip
                  key={cat.id}
                  active={categoryFilter === cat.id}
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setSubCategoryFilter("all");
                  }}
                >
                  {cat.label} ({count})
                </FilterChip>
              );
            })}
          </div>
        </div>

        {categoryFilter !== "all" && subcategories.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sub-categories</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <FilterChip
                active={subCategoryFilter === "all"}
                onClick={() => setSubCategoryFilter("all")}
              >
                All in {inventoryCategoryLabel(shopSector, categoryFilter)}
              </FilterChip>
              {subcategories.map((sub) => {
                const count = items.filter((i) => {
                  if (parseInventoryCategory(i.sectorMeta) !== categoryFilter) return false;
                  return parseInventorySubcategory(i.sectorMeta) === sub.id;
                }).length;
                if (count === 0 && subCategoryFilter !== sub.id) return null;
                return (
                  <FilterChip
                    key={sub.id}
                    active={subCategoryFilter === sub.id}
                    onClick={() => setSubCategoryFilter(sub.id)}
                  >
                    {sub.label} ({count})
                  </FilterChip>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All items (${stats.total})`],
              ["low", `Low stock (${stats.lowCount})`],
              ["no-barcode", `No barcode (${stats.noBarcode})`],
              ["expiring", `Expiring 30d (${stats.expiringCount})`],
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
            {items.length === 0 ? "No products in stock yet" : "No items match your search"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {items.length === 0
              ? "Tap Add product above to add your first item."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-foreground/70">
                  <th className="p-3 font-medium">Product</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Stock</th>
                  <th className="p-3 pl-4 font-medium text-right">Price</th>
                  <th className="hidden p-3 pl-4 font-medium md:table-cell">Barcode</th>
                  <th className="p-3 pl-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) =>
                  group.items.map((item, index) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      groupName={group.name}
                      isUpdating={isUpdating}
                      showGroupMeta={index === 0}
                      isVariant={group.items.length > 1 && index > 0}
                      isLastInGroup={index === group.items.length - 1}
                      shopSector={shopSector}
                      onAdjustQty={onAdjustQty}
                      onAddSize={onAddSize}
                      onEditDetails={onEditDetails}
                      onGenerateBarcode={onGenerateBarcode}
                      onPrintLabel={onPrintLabel}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
            {groups.length < filtered.length
              ? ` · ${groups.length} product${groups.length === 1 ? "" : "s"}`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}
