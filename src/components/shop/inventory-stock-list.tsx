"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { formatINR } from "@/lib/finance/money";
import { isInfiniteStock } from "@/lib/shop/inventory";
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
  Trash2,
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
};

type StockFilter = "all" | "low" | "no-barcode";

type InventoryStockListProps = {
  items: InventoryStockItem[];
  isLoading: boolean;
  isUpdating: boolean;
  onAdjustQty: (item: InventoryStockItem, delta: number) => void;
  onAddSize: (item: InventoryStockItem) => void;
  onEditDetails: (item: InventoryStockItem) => void;
  onGenerateBarcode: (item: InventoryStockItem) => void;
  onPrintLabel: (item: InventoryStockItem) => void;
  onDelete: (item: InventoryStockItem) => void;
};

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

function matchesSearch(item: InventoryStockItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    (item.size?.toLowerCase().includes(q) ?? false) ||
    (item.barcode?.includes(q) ?? false) ||
    (item.description?.toLowerCase().includes(q) ?? false)
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
  isUpdating,
  showProductName,
  isVariant,
  onAdjustQty,
  onAddSize,
  onEditDetails,
  onGenerateBarcode,
  onPrintLabel,
  onDelete,
}: {
  item: InventoryStockItem;
  isUpdating: boolean;
  showProductName: boolean;
  isVariant: boolean;
  onAdjustQty: (item: InventoryStockItem, delta: number) => void;
  onAddSize: (item: InventoryStockItem) => void;
  onEditDetails: (item: InventoryStockItem) => void;
  onGenerateBarcode: (item: InventoryStockItem) => void;
  onPrintLabel: (item: InventoryStockItem) => void;
  onDelete: (item: InventoryStockItem) => void;
}) {
  const infinite = isInfiniteStock(item.quantity);
  const low = !infinite && item.quantity <= item.reorderLevel;

  return (
    <tr
      className={cn(
        "border-t transition-colors hover:bg-muted/30",
        low && "bg-destructive/[0.03]",
        isVariant && "bg-muted/10"
      )}
    >
      <td className="p-3 align-middle">
        <div className={cn(isVariant && "pl-4 border-l-2 border-primary/20")}>
          {showProductName ? (
            <>
              <p className="font-semibold leading-tight">{item.name}</p>
              {item.description ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </>
          ) : isVariant ? (
            <p className="text-sm font-medium text-muted-foreground">Another size</p>
          ) : null}
          {item.size ? (
            <Badge variant="outline" className="mt-1 rounded-full text-[10px]">
              Size {item.size}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="hidden p-3 align-middle sm:table-cell">
        <StockQtyControl
          item={item}
          disabled={isUpdating}
          onAdjust={(delta) => onAdjustQty(item, delta)}
        />
        {!infinite ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Reorder at {item.reorderLevel}
          </p>
        ) : null}
      </td>
      <td className="p-3 align-middle text-right">
        {item.sellPaise ? (
          <span className="font-semibold tabular-nums">{formatINR(item.sellPaise)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden p-3 align-middle md:table-cell">
        {item.barcode ? (
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">{item.barcode}</code>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Missing
          </span>
        )}
      </td>
      <td className="p-3 align-middle">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {low ? (
            <Badge className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/10">
              Low
            </Badge>
          ) : null}
          <div className="flex flex-wrap gap-1 sm:hidden">
            <StockQtyControl
              item={item}
              disabled={isUpdating}
              onAdjust={(delta) => onAdjustQty(item, delta)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={() => onAddSize(item)}
          >
            <Copy className="mr-1 h-3 w-3" />
            Size
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={() => onEditDetails(item)}
          >
            <Pencil className="h-3 w-3" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
          </Button>
          {!item.barcode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs"
              disabled={isUpdating}
              onClick={() => onGenerateBarcode(item)}
            >
              <Barcode className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs"
              onClick={() => onPrintLabel(item)}
            >
              <Printer className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-lg px-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(item)}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function InventoryStockList({
  items,
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

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearch(item, search)) return false;
      const infinite = isInfiniteStock(item.quantity);
      const low = !infinite && item.quantity <= item.reorderLevel;
      if (filter === "low" && !low) return false;
      if (filter === "no-barcode" && item.barcode) return false;
      return true;
    });
  }, [items, search, filter]);

  const groups = useMemo(() => groupItems(filtered), [filtered]);

  const stats = useMemo(() => {
    const lowCount = items.filter(
      (i) => !isInfiniteStock(i.quantity) && i.quantity <= i.reorderLevel
    ).length;
    const noBarcode = items.filter((i) => !i.barcode).length;
    return { total: items.length, lowCount, noBarcode };
  }, [items]);

  if (isLoading) {
    return <PageLoader label="Loading stock..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, size, barcode…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", `All (${stats.total})`],
              ["low", `Low stock (${stats.lowCount})`],
              ["no-barcode", `No barcode (${stats.noBarcode})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
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
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Product</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Stock</th>
                  <th className="p-3 font-medium text-right">Price</th>
                  <th className="hidden p-3 font-medium md:table-cell">Barcode</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) =>
                  group.items.map((item, index) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      isUpdating={isUpdating}
                      showProductName={index === 0}
                      isVariant={group.items.length > 1 && index > 0}
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
