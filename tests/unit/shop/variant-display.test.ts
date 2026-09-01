import { describe, it, expect } from "vitest";
import {
  buildVariantSku,
  hasVariantAttributes,
  matchesVariantSearch,
  variantAttributeChips,
  variantDisplayName,
  variantOptionLabel,
  variantSearchHaystack,
  variantSubtitle,
} from "@/lib/shop/inventory/variant-display";

describe("variantDisplayName", () => {
  it("appends size and colour so sizes of one product stay distinguishable", () => {
    expect(
      variantDisplayName({
        productName: "Premium Cotton T-Shirt",
        color: "Black",
        size: "M",
      })
    ).toBe("Premium Cotton T-Shirt — Black — Size M");
  });

  it("shows size alone when colour is not recorded", () => {
    expect(
      variantDisplayName({ productName: "Polo T-Shirt", size: "XXL" })
    ).toBe("Polo T-Shirt — Size XXL");
  });

  it("shows just the product name when there are no variant attributes", () => {
    expect(variantDisplayName({ productName: "Rice 5 kg" })).toBe("Rice 5 kg");
    expect(variantDisplayName({ name: "Bluetooth Speaker" })).toBe(
      "Bluetooth Speaker"
    );
  });

  it("prefers an explicit variant label over size", () => {
    expect(
      variantDisplayName({
        productName: "Gift Hamper",
        size: "L",
        variantLabel: "Festive pack",
      })
    ).toBe("Gift Hamper — Festive pack");
  });

  it("ignores blank and whitespace-only attributes", () => {
    expect(
      variantDisplayName({ productName: "Notebook", size: "   ", color: "" })
    ).toBe("Notebook");
  });

  it("falls back to a placeholder rather than rendering nothing", () => {
    expect(variantDisplayName({})).toBe("Item");
  });
});

describe("variantSubtitle and hasVariantAttributes", () => {
  it("returns an empty subtitle for non-variant products", () => {
    expect(variantSubtitle({ productName: "Sugar 1 kg" })).toBe("");
    expect(hasVariantAttributes({ productName: "Sugar 1 kg" })).toBe(false);
  });

  it("joins the qualifiers for variant products", () => {
    expect(
      variantSubtitle({ productName: "Shirt", color: "White", size: "40" })
    ).toBe("White · Size 40");
    expect(
      hasVariantAttributes({ productName: "Shirt", color: "White", size: "40" })
    ).toBe(true);
  });
});

describe("variantOptionLabel", () => {
  it("includes the barcode so the scanned SKU is confirmable", () => {
    expect(
      variantOptionLabel(
        { productName: "T-Shirt", color: "Black", size: "M", barcode: "BAR002" },
        { suffix: "₹499" }
      )
    ).toBe("T-Shirt — Black — Size M — BAR002 ₹499");
  });

  it("falls back to the SKU when there is no barcode", () => {
    expect(
      variantOptionLabel({ productName: "T-Shirt", size: "L", sku: "TSH-L-03" })
    ).toBe("T-Shirt — Size L — TSH-L-03");
  });
});

describe("variantAttributeChips", () => {
  it("surfaces brand, size, colour, SKU and business-type attributes", () => {
    const chips = variantAttributeChips({
      productName: "Running Shoe",
      brand: "Nike",
      size: "9",
      color: "Grey",
      sku: "RUN-GRE-9-01",
      attributes: { material: "Mesh", gender: "Men" },
    });
    expect(chips).toEqual([
      { label: "Brand", value: "Nike" },
      { label: "Size", value: "9" },
      { label: "Colour", value: "Grey" },
      { label: "SKU", value: "RUN-GRE-9-01" },
      { label: "Material", value: "Mesh" },
      { label: "Gender", value: "Men" },
    ]);
  });

  it("returns nothing for a product without attributes", () => {
    expect(variantAttributeChips({ productName: "Bread" })).toEqual([]);
  });
});

describe("variant search", () => {
  const haystack = variantSearchHaystack({
    productName: "Premium Cotton T-Shirt",
    brand: "Nike",
    color: "Black",
    size: "M",
    sku: "PRE-COT-M-02",
    barcode: "8901234000029",
    categoryLabel: "T-Shirts",
  });

  it("matches every term, so 'T-Shirt M' narrows to the M variant", () => {
    expect(matchesVariantSearch(haystack, "t-shirt m")).toBe(true);
    expect(matchesVariantSearch(haystack, "tshirt xxl")).toBe(false);
  });

  it("matches on barcode, SKU, brand and category", () => {
    expect(matchesVariantSearch(haystack, "8901234000029")).toBe(true);
    expect(matchesVariantSearch(haystack, "PRE-COT")).toBe(true);
    expect(matchesVariantSearch(haystack, "nike black")).toBe(true);
    expect(matchesVariantSearch(haystack, "t-shirts")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesVariantSearch(haystack, "   ")).toBe(true);
  });
});

describe("buildVariantSku", () => {
  it("builds a readable, per-variant SKU", () => {
    expect(
      buildVariantSku({
        productName: "Premium Cotton T-Shirt",
        color: "Black",
        size: "M",
        index: 2,
      })
    ).toBe("PRE-COT-BLA-M-02");
  });

  it("works for single-word products with no variant attributes", () => {
    expect(buildVariantSku({ productName: "Rice", index: 1 })).toBe("RICE-01");
  });
});
