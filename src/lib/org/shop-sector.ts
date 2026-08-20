import type { ShopSector } from "@prisma/client";

export type { ShopSector };

export const SHOP_SECTORS = [
  "GROCERY",
  "HARDWARE",
  "ELECTRONICS",
  "CLOTHING",
  "PHARMACY",
  "RESTAURANT",
  "GENERAL",
] as const satisfies readonly ShopSector[];

export type ShopSectorConfig = {
  id: ShopSector;
  label: string;
  description: string;
  expenseCategories: string[];
  capabilities: string[];
  inventoryFields?: string[];
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
    label: "Clothing / Fashion",
    description: "Apparel, textiles, footwear",
    capabilities: ["size_color_matrix"],
    inventoryFields: ["size", "color"],
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
    label: "General / Other",
    description: "Any other shop type",
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
