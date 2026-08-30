"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { catalogLabelForSectors } from "@/lib/shop/sector-mode";

export type CatalogCategory = {
  key: string;
  label: string;
  subcategories: Array<{ key: string; label: string }>;
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

type InvoiceCatalogPickerProps = {
  businessTypes: string[];
  categories: CatalogCategory[];
  categoryKey: string;
  subCategoryKey: string;
  onCategoryChange: (key: string) => void;
  onSubCategoryChange: (key: string) => void;
  hideNonMenuCategories?: boolean;
};

const POS_HIDDEN_CATEGORY_KEYS = new Set(["raw", "packaging"]);

export function InvoiceCatalogPicker({
  businessTypes,
  categories,
  categoryKey,
  subCategoryKey,
  onCategoryChange,
  onSubCategoryChange,
  hideNonMenuCategories = true,
}: InvoiceCatalogPickerProps) {
  const visibleCategories = useMemo(() => {
    if (!hideNonMenuCategories) return categories;
    return categories.filter((c) => !POS_HIDDEN_CATEGORY_KEYS.has(c.key));
  }, [categories, hideNonMenuCategories]);

  const activeCategory = visibleCategories.find((c) => c.key === categoryKey);
  const subcategories = activeCategory?.subcategories ?? [];

  if (visibleCategories.length <= 1) return null;

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {catalogLabelForSectors(businessTypes)} categories
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={!categoryKey} onClick={() => onCategoryChange("")}>
          All
        </FilterChip>
        {visibleCategories.map((cat) => (
          <FilterChip
            key={cat.key}
            active={categoryKey === cat.key}
            onClick={() => onCategoryChange(cat.key)}
          >
            {cat.label}
          </FilterChip>
        ))}
      </div>
      {categoryKey && subcategories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!subCategoryKey}
            onClick={() => onSubCategoryChange("")}
          >
            All {activeCategory?.label}
          </FilterChip>
          {subcategories.map((sub) => (
            <FilterChip
              key={sub.key}
              active={subCategoryKey === sub.key}
              onClick={() => onSubCategoryChange(sub.key)}
            >
              {sub.label}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function filterInventoryForCatalog<
  T extends {
    product?: {
      categoryKey?: string | null;
      subCategoryKey?: string | null;
      itemKind?: string | null;
    } | null;
  },
>(items: T[], categoryKey: string, subCategoryKey: string): T[] {
  if (!categoryKey && !subCategoryKey) return items;
  return items.filter((item) => {
    const cat = item.product?.categoryKey ?? "";
    const sub = item.product?.subCategoryKey ?? "";
    if (categoryKey && cat !== categoryKey) return false;
    if (subCategoryKey && sub !== subCategoryKey) return false;
    return true;
  });
}
