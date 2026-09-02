import { describe, it, expect } from "vitest";
import {
  CATEGORY_CATALOG,
  categoriesForSectors,
  catalogCategoryLabel,
  catalogSubCategoryLabel,
  customCategoryKey,
  isCustomCategoryKey,
} from "@/lib/shop/inventory/category-catalog";
import { SHOP_SECTORS } from "@/lib/org/shop-sector";
import {
  inventoryCategoriesForSector,
  inventoryCategoryLabel,
  inventorySubcategoryLabel,
  defaultSubcategoryForCategory,
  mergeInventorySectorMeta,
  parseInventoryCategory,
  parseInventorySubcategory,
} from "@/lib/shop/inventory/inventory-categories";

describe("category catalog", () => {
  it("covers every business type", () => {
    for (const sector of SHOP_SECTORS) {
      expect(CATEGORY_CATALOG[sector].length).toBeGreaterThan(0);
    }
  });

  it("gives clothing the garment-type categories a clothing shop expects", () => {
    const labels = CATEGORY_CATALOG.CLOTHING.map((c) => c.label);
    for (const expected of [
      "T-Shirts",
      "Shirts",
      "Jeans",
      "Trousers",
      "Shorts",
      "Jackets",
      "Sweaters",
      "Hoodies",
      "Innerwear",
      "Ethnic Wear",
      "Kids Wear",
      "Accessories",
      "Footwear",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("uses unique keys within a business type", () => {
    for (const sector of SHOP_SECTORS) {
      const keys = CATEGORY_CATALOG[sector].map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("categoriesForSectors", () => {
  it("merges categories from every selected business type", () => {
    const merged = categoriesForSectors(["CLOTHING", "FOOTWEAR"]);
    const labels = merged.map((c) => c.label);
    expect(labels).toContain("T-Shirts");
    expect(labels).toContain("Sports Shoes");
  });

  it("keeps the first selected type's categories first", () => {
    const clothingFirst = categoriesForSectors(["CLOTHING", "FOOTWEAR"]);
    const footwearFirst = categoriesForSectors(["FOOTWEAR", "CLOTHING"]);
    expect(clothingFirst[0]!.sector).toBe("CLOTHING");
    expect(footwearFirst[0]!.sector).toBe("FOOTWEAR");
  });

  it("de-duplicates the shared 'other' key across types", () => {
    const merged = categoriesForSectors(["CLOTHING", "FOOTWEAR", "GROCERY"]);
    expect(merged.filter((c) => c.key === "other")).toHaveLength(1);
  });

  it("falls back to general retail when nothing is selected", () => {
    expect(categoriesForSectors([])[0]!.sector).toBe("GENERAL");
  });

  it("handles a single business type", () => {
    const electronics = categoriesForSectors(["ELECTRONICS"]);
    expect(electronics.every((c) => c.sector === "ELECTRONICS")).toBe(true);
  });
});

describe("label resolution", () => {
  it("resolves catalog labels", () => {
    expect(catalogCategoryLabel("tshirts")).toBe("T-Shirts");
    expect(catalogSubCategoryLabel("tshirts", "men")).toBe("Men");
  });

  it("still resolves keys retired from the catalog", () => {
    expect(catalogCategoryLabel("men")).toBe("Men");
    expect(catalogCategoryLabel("women")).toBe("Women");
  });

  it("returns null for an unknown key", () => {
    expect(catalogCategoryLabel("no-such-key")).toBeNull();
    expect(catalogCategoryLabel(null)).toBeNull();
  });
});

describe("custom categories", () => {
  it("slugs a user-entered name into a stable key", () => {
    expect(customCategoryKey("Oversized Streetwear")).toBe(
      "custom-oversized-streetwear"
    );
    expect(customCategoryKey("Kids' Winter — 2026")).toBe(
      "custom-kids-winter-2026"
    );
  });

  it("recognises its own keys", () => {
    expect(isCustomCategoryKey("custom-oversized-streetwear")).toBe(true);
    expect(isCustomCategoryKey("tshirts")).toBe(false);
    expect(isCustomCategoryKey(null)).toBe(false);
  });
});

describe("inventory category helpers accept one or many business types", () => {
  it("works with a single sector string", () => {
    const labels = inventoryCategoriesForSector("CLOTHING").map((c) => c.label);
    expect(labels).toContain("Jeans");
  });

  it("works with a list of sectors", () => {
    const labels = inventoryCategoriesForSector(["CLOTHING", "GROCERY"]).map(
      (c) => c.label
    );
    expect(labels).toContain("Jeans");
    expect(labels).toContain("Staples & Rice");
  });

  it("resolves a category from a business type that is no longer selected", () => {
    expect(inventoryCategoryLabel(["GROCERY"], "tshirts")).toBe("T-Shirts");
  });

  it("labels sub-categories and falls back to the raw key", () => {
    expect(inventorySubcategoryLabel(["CLOTHING"], "tshirts", "kids")).toBe("Kids");
    expect(inventorySubcategoryLabel(["CLOTHING"], "tshirts", "zzz")).toBe("zzz");
    expect(inventorySubcategoryLabel(["CLOTHING"], "tshirts", null)).toBe("");
  });

  it("reports uncategorized products clearly", () => {
    expect(inventoryCategoryLabel(["CLOTHING"], null)).toBe("Uncategorized");
  });

  it("picks a sensible default sub-category", () => {
    expect(defaultSubcategoryForCategory(["CLOTHING"], "tshirts")).toBe("men");
  });
});

describe("sectorMeta round-trip", () => {
  it("stores and reads back the category keys", () => {
    const meta = mergeInventorySectorMeta({}, {
      category: "tshirts",
      subCategory: "men",
    });
    expect(parseInventoryCategory(meta)).toBe("tshirts");
    expect(parseInventorySubcategory(meta)).toBe("men");
  });

  it("clears a key when set to null and keeps unrelated fields", () => {
    const meta = mergeInventorySectorMeta(
      { category: "tshirts", subCategory: "men", weight: "500g" },
      { subCategory: null }
    );
    expect(meta).toEqual({ category: "tshirts", weight: "500g" });
  });

  it("tolerates garbage input", () => {
    expect(parseInventoryCategory(null)).toBeNull();
    expect(parseInventoryCategory("oops")).toBeNull();
    expect(mergeInventorySectorMeta("oops", { category: "jeans" })).toEqual({
      category: "jeans",
    });
  });
});
