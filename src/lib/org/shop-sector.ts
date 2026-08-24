import type { ShopSector } from "@prisma/client";

export type { ShopSector };

export const SHOP_SECTORS = [
  "CLOTHING",
  "FOOTWEAR",
  "GROCERY",
  "ELECTRONICS",
  "COSMETICS",
  "PHARMACY",
  "RESTAURANT",
  "HARDWARE",
  "FURNITURE",
  "STATIONERY",
  "JEWELLERY",
  "GENERAL",
  "SERVICES",
  "OTHER",
] as const satisfies readonly ShopSector[];

export type ShopSectorConfig = {
  id: ShopSector;
  label: string;
  description: string;
  expenseCategories: string[];
  capabilities: string[];
  /**
   * Product attributes this business type cares about. Drives which optional
   * fields the product form shows — nothing is hard-coded per sector elsewhere.
   */
  inventoryFields?: string[];
  /** Whether size/variant matrices are the norm for this business type. */
  variantsByDefault?: boolean;
};

export const SHOP_SECTOR_CONFIG: Record<ShopSector, ShopSectorConfig> = {
  GROCERY: {
    id: "GROCERY",
    label: "Grocery / Kirana",
    description: "Daily essentials, FMCG, provisions",
    capabilities: ["udhaar", "weight_units", "expiry_tracking"],
    inventoryFields: ["weight", "expiryDate"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Delivery",
      "Staff wages",
      "Packaging",
      "Miscellaneous",
    ],
  },
  HARDWARE: {
    id: "HARDWARE",
    label: "Hardware / Building material",
    description: "Tools, cement, plumbing, electrical goods",
    capabilities: ["variants", "quotations"],
    inventoryFields: ["brand", "size"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Transport",
      "Rent",
      "Utilities",
      "Staff wages",
      "Maintenance",
      "Miscellaneous",
    ],
  },
  ELECTRONICS: {
    id: "ELECTRONICS",
    label: "Electronics",
    description: "Mobiles, appliances, accessories",
    capabilities: ["serial_tracking", "warranty"],
    inventoryFields: ["serial", "warrantyMonths"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Delivery",
      "Miscellaneous",
    ],
  },
  CLOTHING: {
    id: "CLOTHING",
    label: "Clothing & Fashion",
    description: "Apparel, textiles, ethnic wear",
    capabilities: ["size_color_matrix", "udhaar"],
    inventoryFields: ["brand", "size", "color", "material", "gender"],
    variantsByDefault: true,
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Packaging",
      "Miscellaneous",
    ],
  },
  FOOTWEAR: {
    id: "FOOTWEAR",
    label: "Footwear",
    description: "Shoes, sandals, sports footwear",
    capabilities: ["size_color_matrix", "udhaar"],
    inventoryFields: ["brand", "size", "color", "material", "gender"],
    variantsByDefault: true,
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Packaging",
      "Miscellaneous",
    ],
  },
  COSMETICS: {
    id: "COSMETICS",
    label: "Cosmetics & Beauty",
    description: "Skincare, makeup, personal care",
    capabilities: ["batch_expiry", "udhaar"],
    inventoryFields: ["brand", "shade", "volume", "batch", "expiryDate"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Packaging",
      "Miscellaneous",
    ],
  },
  FURNITURE: {
    id: "FURNITURE",
    label: "Furniture & Home",
    description: "Furniture, furnishing, home decor",
    capabilities: ["variants", "quotations"],
    inventoryFields: ["brand", "material", "dimensions", "color"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Transport",
      "Rent",
      "Utilities",
      "Staff wages",
      "Maintenance",
      "Miscellaneous",
    ],
  },
  STATIONERY: {
    id: "STATIONERY",
    label: "Stationery & Books",
    description: "Books, school and office supplies",
    capabilities: ["basic_inventory", "udhaar"],
    inventoryFields: ["brand", "author", "publisher"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Packaging",
      "Miscellaneous",
    ],
  },
  JEWELLERY: {
    id: "JEWELLERY",
    label: "Jewellery",
    description: "Gold, silver, imitation jewellery",
    capabilities: ["weight_units", "hallmark"],
    inventoryFields: ["metal", "purity", "grossWeight", "netWeight", "size"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Making charges",
      "Rent",
      "Utilities",
      "Staff wages",
      "Insurance",
      "Miscellaneous",
    ],
  },
  SERVICES: {
    id: "SERVICES",
    label: "Services",
    description: "Repairs, salon, consulting and other services",
    capabilities: ["service_catalog"],
    inventoryFields: ["duration"],
    expenseCategories: [
      "Consumables",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Travel",
      "Miscellaneous",
    ],
  },
  OTHER: {
    id: "OTHER",
    label: "Other / Custom",
    description: "Tell us what your business actually is",
    capabilities: ["basic_inventory"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Marketing",
      "Miscellaneous",
    ],
  },
  PHARMACY: {
    id: "PHARMACY",
    label: "Pharmacy",
    description: "Medicines and medical supplies",
    capabilities: ["batch_expiry", "prescription_register"],
    inventoryFields: ["batch", "expiryDate"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Staff wages",
      "Compliance",
      "Delivery",
      "Miscellaneous",
    ],
  },
  RESTAURANT: {
    id: "RESTAURANT",
    label: "Restaurant / Cafe",
    description: "Food service and hospitality",
    capabilities: ["menu", "kot", "recipe_consumption"],
    inventoryFields: ["recipeYield"],
    expenseCategories: [
      "Purchase",
      "Kitchen supplies",
      "Rent",
      "Utilities",
      "Staff wages",
      "Packaging",
      "Marketing",
      "Miscellaneous",
    ],
  },
  GENERAL: {
    id: "GENERAL",
    label: "General Retail",
    description: "Mixed retail — a bit of everything",
    capabilities: ["basic_inventory"],
    expenseCategories: [
      "Purchase",
      "Inventory",
      "Rent",
      "Utilities",
      "Packaging",
      "Delivery",
      "Staff wages",
      "Marketing",
      "Maintenance",
      "Miscellaneous",
    ],
  },
};

export function getShopSectorConfig(
  sector: ShopSector | string | null | undefined
): ShopSectorConfig {
  if (sector && sector in SHOP_SECTOR_CONFIG) {
    return SHOP_SECTOR_CONFIG[sector as ShopSector];
  }
  return SHOP_SECTOR_CONFIG.GENERAL;
}

export function isShopSector(value: unknown): value is ShopSector {
  return typeof value === "string" && SHOP_SECTORS.includes(value as ShopSector);
}

/** Union of the product attributes every selected business type asks for. */
export function inventoryFieldsForSectors(
  sectors: readonly (ShopSector | string)[]
): string[] {
  const fields = new Set<string>();
  for (const sector of sectors) {
    for (const field of getShopSectorConfig(sector).inventoryFields ?? []) {
      fields.add(field);
    }
  }
  return [...fields];
}

/** True when any selected business type normally sells size/variant products. */
export function variantsExpectedForSectors(
  sectors: readonly (ShopSector | string)[]
): boolean {
  return sectors.some((s) => getShopSectorConfig(s).variantsByDefault === true);
}

/** Whether any selected type uses the apparel size/colour matrix. */
export function usesSizeColorMatrix(
  sectors: readonly (ShopSector | string)[]
): boolean {
  return sectors.some((s) =>
    getShopSectorConfig(s).capabilities.includes("size_color_matrix")
  );
}

/** Default variant axis label for new products (e.g. size, pack, model). */
export function defaultVariantAxisForSectors(
  sectors: readonly (ShopSector | string)[]
): string {
  if (usesSizeColorMatrix(sectors)) return "size";
  if (sectors.some((s) => getShopSectorConfig(s).capabilities.includes("weight_units")))
    return "pack";
  if (sectors.some((s) => getShopSectorConfig(s).capabilities.includes("serial_tracking")))
    return "model";
  return "variant";
}

/** Human-readable label for a variant axis key. */
export function variantAxisLabel(axis: string | null | undefined): string {
  const key = (axis ?? "variant").trim().toLowerCase();
  const labels: Record<string, string> = {
    size: "Size",
    color: "Colour",
    colour: "Colour",
    pack: "Pack",
    variant: "Variant",
    model: "Model",
    weight: "Weight",
    volume: "Volume",
  };
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export type SizePreset = { label: string; sizes: string[] };

/** Quick-add presets tailored to the shop's business types. */
export function sizePresetsForSectors(
  sectors: readonly (ShopSector | string)[]
): SizePreset[] {
  if (usesSizeColorMatrix(sectors)) {
    return [
      { label: "Apparel S–XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
      { label: "Apparel XS–3XL", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
      { label: "Waist 28–40", sizes: ["28", "30", "32", "34", "36", "38", "40"] },
      { label: "Shoes 6–11", sizes: ["6", "7", "8", "9", "10", "11"] },
      { label: "Kids 2–12y", sizes: ["2y", "4y", "6y", "8y", "10y", "12y"] },
    ];
  }
  if (sectors.some((s) => s === "GROCERY" || s === "PHARMACY")) {
    return [
      { label: "Weight packs", sizes: ["250g", "500g", "1kg", "2kg", "5kg"] },
      { label: "Volume", sizes: ["100ml", "250ml", "500ml", "1L"] },
    ];
  }
  if (sectors.some((s) => s === "HARDWARE" || s === "FURNITURE")) {
    return [
      { label: "Dimensions", sizes: ["Small", "Medium", "Large"] },
      { label: "Length ft", sizes: ["4ft", "6ft", "8ft", "10ft"] },
    ];
  }
  if (sectors.some((s) => s === "ELECTRONICS")) {
    return [
      { label: "Storage", sizes: ["64GB", "128GB", "256GB", "512GB"] },
      { label: "Screen", sizes: ['5.5"', '6.1"', '6.7"'] },
    ];
  }
  return [{ label: "Common options", sizes: ["Small", "Medium", "Large", "Standard"] }];
}

/** Union of capability flags across selected business types. */
export function capabilitiesForSectors(
  sectors: readonly (ShopSector | string)[]
): string[] {
  const caps = new Set<string>();
  for (const sector of sectors) {
    for (const c of getShopSectorConfig(sector).capabilities) caps.add(c);
  }
  return [...caps];
}
