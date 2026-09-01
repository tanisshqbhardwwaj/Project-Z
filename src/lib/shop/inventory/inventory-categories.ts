import type { ShopSector } from "@prisma/client";
import {
  categoriesForSectors,
  catalogCategoryLabel,
  catalogSubCategoryLabel,
  type CatalogCategory,
} from "@/lib/shop/inventory/category-catalog";

export type InventorySubCategory = {
  id: string;
  label: string;
};

export type InventoryCategory = {
  id: string;
  label: string;
  subcategories: InventorySubCategory[];
};

/**
 * Every category helper accepts either a single business type or the full list
 * an org selected, so a Clothing + Footwear shop sees categories from both.
 */
export type SectorInput = ShopSector | string | null | undefined;
export type SectorsInput = SectorInput | readonly SectorInput[];

function toSectorList(input: SectorsInput): string[] {
  if (Array.isArray(input)) {
    const list = input.filter((s): s is string => typeof s === "string" && !!s);
    return list.length > 0 ? list : ["GENERAL"];
  }
  return typeof input === "string" && input ? [input] : ["GENERAL"];
}

function toInventoryCategory(category: CatalogCategory): InventoryCategory {
  return {
    id: category.key,
    label: category.label,
    subcategories: category.subcategories.map((s) => ({
      id: s.key,
      label: s.label,
    })),
  };
}

const FALLBACK_SUB: InventorySubCategory[] = [
  { id: "general", label: "General" },
  { id: "misc", label: "Miscellaneous" },
];

export function inventoryCategoriesForSector(
  sectors: SectorsInput
): InventoryCategory[] {
  return categoriesForSectors(toSectorList(sectors)).map(toInventoryCategory);
}

export function inventorySubcategoriesForCategory(
  sectors: SectorsInput,
  categoryId: string | null | undefined
): InventorySubCategory[] {
  if (!categoryId) return FALLBACK_SUB;
  const category = findInventoryCategory(sectors, categoryId);
  return category?.subcategories ?? FALLBACK_SUB;
}

export function findInventoryCategory(
  sectors: SectorsInput,
  categoryId: string | null | undefined
): InventoryCategory | undefined {
  if (!categoryId) return undefined;
  const scoped = inventoryCategoriesForSector(sectors).find(
    (c) => c.id === categoryId
  );
  if (scoped) return scoped;
  // Category may come from another business type or a legacy key — still resolve it.
  const label = catalogCategoryLabel(categoryId);
  if (!label) return undefined;
  const global = categoriesForSectors([]).find((c) => c.key === categoryId);
  return global ? toInventoryCategory(global) : { id: categoryId, label, subcategories: FALLBACK_SUB };
}

export function inventoryCategoryLabel(
  sectors: SectorsInput,
  categoryId: string | null | undefined
): string {
  if (!categoryId) return "Uncategorized";
  return (
    findInventoryCategory(sectors, categoryId)?.label ??
    catalogCategoryLabel(categoryId) ??
    categoryId
  );
}

export function inventorySubcategoryLabel(
  sectors: SectorsInput,
  categoryId: string | null | undefined,
  subCategoryId: string | null | undefined
): string {
  if (!subCategoryId) return "";
  const subs = inventorySubcategoriesForCategory(sectors, categoryId);
  return (
    subs.find((s) => s.id === subCategoryId)?.label ??
    catalogSubCategoryLabel(categoryId, subCategoryId) ??
    subCategoryId
  );
}

function readMetaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseInventoryCategory(sectorMeta: unknown): string | null {
  if (!sectorMeta || typeof sectorMeta !== "object") return null;
  return readMetaString(sectorMeta as Record<string, unknown>, "category");
}

export function parseInventorySubcategory(sectorMeta: unknown): string | null {
  if (!sectorMeta || typeof sectorMeta !== "object") return null;
  return readMetaString(sectorMeta as Record<string, unknown>, "subCategory");
}

export function defaultSubcategoryForCategory(
  sectors: SectorsInput,
  categoryId: string
): string {
  return inventorySubcategoriesForCategory(sectors, categoryId)[0]?.id ?? "general";
}

export function mergeInventorySectorMeta(
  existing: unknown,
  patch: { category?: string | null; subCategory?: string | null }
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (patch.category !== undefined) {
    if (patch.category) {
      base.category = patch.category;
    } else {
      delete base.category;
    }
  }

  if (patch.subCategory !== undefined) {
    if (patch.subCategory) {
      base.subCategory = patch.subCategory;
    } else {
      delete base.subCategory;
    }
  }

  return base;
}
