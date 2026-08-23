"use client";

import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/finance/money";
import { formatStockDisplay, isInfiniteStock } from "@/lib/shop/inventory";
import {
  matchesVariantSearch,
  variantDisplayName,
  variantSearchHaystack,
  variantSubtitle,
} from "@/lib/shop/variant-display";
import { cn } from "@/lib/utils";
import { Package, Search } from "lucide-react";

/**
 * The shape every product selector in the app consumes. Only `id` and `name`
 * are required; whatever variant attributes exist get rendered, so a grocery
 * product shows no empty size field while a shirt shows its size.
 */
export type VariantOption = {
  id: string;
  name: string;
  size?: string | null;
  color?: string | null;
  variantLabel?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  quantity?: number;
  reorderLevel?: number;
  sellPaise?: string | null;
  description?: string | null;
  product?: { id: string; name: string; brand: string | null } | null;
};

function descriptorOf(option: VariantOption) {
  return {
    productName: option.product?.name ?? option.name,
    name: option.name,
    size: option.size,
    color: option.color,
    variantLabel: option.variantLabel,
    brand: option.product?.brand ?? null,
    sku: option.sku,
    barcode: option.barcode,
    unit: option.unit,
    description: option.description,
  };
}

export function variantOptionText(option: VariantOption): string {
  return variantDisplayName(descriptorOf(option));
}

export function variantOptionSubtitle(option: VariantOption): string {
  return variantSubtitle(descriptorOf(option));
}

/**
 * Native `<select>` used where a compact control is enough. Every option label
 * carries the variant attributes and price/stock, so cashiers never have to
 * guess which size they picked.
 */
export function VariantSelect({
  options,
  value,
  onChange,
  placeholder = "Pick from stock…",
  className,
  showStock = true,
  showPrice = true,
  disabled,
}: {
  options: VariantOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  showStock?: boolean;
  showPrice?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const price =
          showPrice && option.sellPaise ? ` — ${formatINR(option.sellPaise)}` : "";
        const stock =
          showStock && option.quantity != null
            ? ` (${formatStockDisplay(option.quantity, option.unit ?? "pcs")})`
            : "";
        return (
          <option key={option.id} value={option.id}>
            {variantOptionText(option)}
            {option.barcode ? ` · ${option.barcode}` : ""}
            {price}
            {stock}
          </option>
        );
      })}
    </select>
  );
}

/** Chips describing a variant, hidden entirely for products without variants. */
export function VariantBadges({
  option,
  className,
}: {
  option: VariantOption;
  className?: string;
}) {
  const size = option.size?.trim();
  const color = option.color?.trim();
  const label = option.variantLabel?.trim();
  if (!size && !color && !label) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {color ? (
        <Badge variant="outline" className="rounded-full text-[10px]">
          {color}
        </Badge>
      ) : null}
      {label ? (
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {label}
        </Badge>
      ) : (
        size && (
          <Badge variant="secondary" className="rounded-full text-[10px]">
            Size {size}
          </Badge>
        )
      )}
    </span>
  );
}

/**
 * Searchable list picker for wider surfaces (exchange replacement, purchase
 * entry). Search matches name, SKU, barcode, size, colour and brand, and every
 * term must hit — so "t-shirt m" narrows to the M variants.
 */
export function VariantSearchPicker({
  options,
  onSelect,
  placeholder = "Search product, size, SKU or barcode…",
  emptyLabel = "No matching product",
  maxResults = 40,
  autoFocus,
  className,
}: {
  options: VariantOption[];
  onSelect: (option: VariantOption) => void;
  placeholder?: string;
  emptyLabel?: string;
  maxResults?: number;
  autoFocus?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const indexed = useMemo(
    () =>
      options.map((option) => ({
        option,
        haystack: variantSearchHaystack(descriptorOf(option)),
      })),
    [options]
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    const filtered = trimmed
      ? indexed.filter((entry) => matchesVariantSearch(entry.haystack, trimmed))
      : indexed;
    return filtered.slice(0, maxResults).map((entry) => entry.option);
  }, [indexed, query, maxResults]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length === 1) {
              e.preventDefault();
              onSelect(results[0]!);
              setQuery("");
            }
          }}
          placeholder={placeholder}
          className="h-10 rounded-xl pl-9"
        />
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
          <Package className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-xl border">
          {results.map((option) => {
            const unlimited =
              option.quantity != null && isInfiniteStock(option.quantity);
            const outOfStock =
              option.quantity != null && !unlimited && option.quantity <= 0;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    onSelect(option);
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                    outOfStock
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {variantOptionText(option)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <VariantBadges option={option} />
                      {option.barcode ? (
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                          {option.barcode}
                        </code>
                      ) : null}
                      {option.sku && !option.barcode ? (
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                          {option.sku}
                        </code>
                      ) : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {option.sellPaise ? (
                      <span className="block text-sm font-semibold tabular-nums">
                        {formatINR(option.sellPaise)}
                      </span>
                    ) : null}
                    {option.quantity != null ? (
                      <span
                        className={cn(
                          "block text-[11px]",
                          outOfStock ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {outOfStock
                          ? "Out of stock"
                          : formatStockDisplay(option.quantity, option.unit ?? "pcs")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
