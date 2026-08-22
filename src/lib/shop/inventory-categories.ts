import type { ShopSector } from "@prisma/client";

export type InventorySubCategory = {
  id: string;
  label: string;
};

export type InventoryCategory = {
  id: string;
  label: string;
  subcategories: InventorySubCategory[];
};

const OTHER_SUB: InventorySubCategory[] = [
  { id: "general", label: "General" },
  { id: "misc", label: "Miscellaneous" },
];

function cat(
  id: string,
  label: string,
  subcategories: InventorySubCategory[]
): InventoryCategory {
  return { id, label, subcategories };
}

const BY_SECTOR: Record<ShopSector, InventoryCategory[]> = {
  GROCERY: [
    cat("staples", "Staples & Rice", [
      { id: "rice", label: "Rice" },
      { id: "atta", label: "Atta & Flour" },
      { id: "dal", label: "Dal & Pulses" },
      { id: "oil", label: "Cooking oil" },
      { id: "sugar", label: "Sugar & Salt" },
      ...OTHER_SUB,
    ]),
    cat("snacks", "Snacks & Biscuits", [
      { id: "biscuits", label: "Biscuits" },
      { id: "chips", label: "Chips & Namkeen" },
      { id: "chocolates", label: "Chocolates" },
      { id: "instant", label: "Instant noodles" },
      ...OTHER_SUB,
    ]),
    cat("beverages", "Beverages", [
      { id: "soft-drinks", label: "Soft drinks" },
      { id: "juices", label: "Juices" },
      { id: "tea-coffee", label: "Tea & Coffee" },
      { id: "water", label: "Water" },
      ...OTHER_SUB,
    ]),
    cat("dairy", "Dairy & Bread", [
      { id: "milk", label: "Milk" },
      { id: "curd", label: "Curd & Paneer" },
      { id: "bread", label: "Bread & Bakery" },
      { id: "eggs", label: "Eggs" },
      ...OTHER_SUB,
    ]),
    cat("personal-care", "Personal Care", [
      { id: "soap", label: "Soap & Bath" },
      { id: "shampoo", label: "Hair care" },
      { id: "oral", label: "Oral care" },
      { id: "skincare", label: "Skin care" },
      ...OTHER_SUB,
    ]),
    cat("household", "Household", [
      { id: "cleaning", label: "Cleaning" },
      { id: "detergent", label: "Detergent" },
      { id: "utensils", label: "Utensils" },
      ...OTHER_SUB,
    ]),
    cat("spices", "Spices & Masala", [
      { id: "whole", label: "Whole spices" },
      { id: "powder", label: "Powder masala" },
      { id: "ready-mix", label: "Ready mix" },
      ...OTHER_SUB,
    ]),
    cat("frozen", "Frozen & Cold", [
      { id: "ice-cream", label: "Ice cream" },
      { id: "frozen-veg", label: "Frozen veg" },
      { id: "cold-drinks", label: "Cold drinks" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  CLOTHING: [
    cat("men", "Men", [
      { id: "shirts", label: "Shirts" },
      { id: "tshirts", label: "T-shirts" },
      { id: "trousers", label: "Trousers & Jeans" },
      { id: "formal", label: "Formal wear" },
      ...OTHER_SUB,
    ]),
    cat("women", "Women", [
      { id: "sarees", label: "Sarees" },
      { id: "kurtis", label: "Kurtis & Tops" },
      { id: "dresses", label: "Dresses" },
      { id: "leggings", label: "Leggings & Bottoms" },
      ...OTHER_SUB,
    ]),
    cat("kids", "Kids", [
      { id: "boys", label: "Boys" },
      { id: "girls", label: "Girls" },
      { id: "infants", label: "Infants" },
      ...OTHER_SUB,
    ]),
    cat("footwear", "Footwear", [
      { id: "men-shoes", label: "Men" },
      { id: "women-shoes", label: "Women" },
      { id: "kids-shoes", label: "Kids" },
      { id: "slippers", label: "Slippers & Sandals" },
      ...OTHER_SUB,
    ]),
    cat("accessories", "Accessories", [
      { id: "bags", label: "Bags" },
      { id: "belts", label: "Belts" },
      { id: "watches", label: "Watches" },
      { id: "jewellery", label: "Jewellery" },
      ...OTHER_SUB,
    ]),
    cat("ethnic", "Ethnic wear", [
      { id: "sherwani", label: "Sherwani & Kurta" },
      { id: "lehenga", label: "Lehenga & Suit" },
      { id: "dupatta", label: "Dupatta & Stole" },
      ...OTHER_SUB,
    ]),
    cat("innerwear", "Innerwear", [
      { id: "men-inner", label: "Men" },
      { id: "women-inner", label: "Women" },
      { id: "socks", label: "Socks" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  PHARMACY: [
    cat("otc", "OTC medicines", [
      { id: "pain", label: "Pain relief" },
      { id: "cold", label: "Cold & cough" },
      { id: "digestive", label: "Digestive" },
      { id: "first-aid", label: "First aid" },
      ...OTHER_SUB,
    ]),
    cat("prescription", "Prescription", [
      { id: "tablets", label: "Tablets" },
      { id: "syrups", label: "Syrups" },
      { id: "injections", label: "Injections" },
      ...OTHER_SUB,
    ]),
    cat("vitamins", "Vitamins & supplements", [
      { id: "multivitamin", label: "Multivitamins" },
      { id: "protein", label: "Protein & health" },
      { id: "ayurvedic", label: "Ayurvedic" },
      ...OTHER_SUB,
    ]),
    cat("personal-care", "Personal care", [
      { id: "skin", label: "Skin care" },
      { id: "baby", label: "Baby care" },
      { id: "sanitary", label: "Sanitary" },
      ...OTHER_SUB,
    ]),
    cat("devices", "Medical devices", [
      { id: "bp", label: "BP & monitors" },
      { id: "diabetes", label: "Diabetes care" },
      { id: "masks", label: "Masks & PPE" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  HARDWARE: [
    cat("tools", "Tools", [
      { id: "hand-tools", label: "Hand tools" },
      { id: "power-tools", label: "Power tools" },
      { id: "measuring", label: "Measuring" },
      ...OTHER_SUB,
    ]),
    cat("plumbing", "Plumbing", [
      { id: "pipes", label: "Pipes & fittings" },
      { id: "taps", label: "Taps & valves" },
      { id: "tanks", label: "Tanks & pumps" },
      ...OTHER_SUB,
    ]),
    cat("electrical", "Electrical", [
      { id: "wires", label: "Wires & cables" },
      { id: "switches", label: "Switches & sockets" },
      { id: "lighting", label: "Lighting" },
      ...OTHER_SUB,
    ]),
    cat("paint", "Paint", [
      { id: "interior", label: "Interior" },
      { id: "exterior", label: "Exterior" },
      { id: "brushes", label: "Brushes & tools" },
      ...OTHER_SUB,
    ]),
    cat("building", "Building material", [
      { id: "cement", label: "Cement & sand" },
      { id: "steel", label: "Steel & rods" },
      { id: "tiles", label: "Tiles & stone" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  ELECTRONICS: [
    cat("mobile", "Mobile & tablets", [
      { id: "smartphones", label: "Smartphones" },
      { id: "feature-phones", label: "Feature phones" },
      { id: "tablets", label: "Tablets" },
      ...OTHER_SUB,
    ]),
    cat("accessories", "Accessories", [
      { id: "cases", label: "Cases & covers" },
      { id: "chargers", label: "Chargers & cables" },
      { id: "earphones", label: "Earphones" },
      ...OTHER_SUB,
    ]),
    cat("appliances", "Appliances", [
      { id: "kitchen", label: "Kitchen" },
      { id: "cooling", label: "Cooling & fans" },
      { id: "small", label: "Small appliances" },
      ...OTHER_SUB,
    ]),
    cat("computer", "Computer & IT", [
      { id: "laptops", label: "Laptops" },
      { id: "desktops", label: "Desktops" },
      { id: "storage", label: "Storage & memory" },
      ...OTHER_SUB,
    ]),
    cat("audio", "Audio & TV", [
      { id: "tv", label: "Television" },
      { id: "speakers", label: "Speakers" },
      { id: "home-theatre", label: "Home theatre" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  RESTAURANT: [
    cat("raw", "Raw ingredients", [
      { id: "vegetables", label: "Vegetables" },
      { id: "meat", label: "Meat & seafood" },
      { id: "grains", label: "Grains & flour" },
      { id: "dairy", label: "Dairy" },
      ...OTHER_SUB,
    ]),
    cat("beverages", "Beverages", [
      { id: "soft", label: "Soft drinks" },
      { id: "juice", label: "Juices" },
      { id: "tea-coffee", label: "Tea & coffee" },
      ...OTHER_SUB,
    ]),
    cat("packaging", "Packaging", [
      { id: "boxes", label: "Boxes & bags" },
      { id: "containers", label: "Containers" },
      { id: "disposables", label: "Disposables" },
      ...OTHER_SUB,
    ]),
    cat("consumables", "Consumables", [
      { id: "spices", label: "Spices & sauces" },
      { id: "oil-ghee", label: "Oil & ghee" },
      { id: "cleaning", label: "Cleaning" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
  GENERAL: [
    cat("daily", "Daily needs", [
      { id: "essentials", label: "Essentials" },
      { id: "snacks", label: "Snacks" },
      { id: "drinks", label: "Drinks" },
      ...OTHER_SUB,
    ]),
    cat("home", "Home & kitchen", [
      { id: "cookware", label: "Cookware" },
      { id: "storage", label: "Storage" },
      { id: "decor", label: "Decor" },
      ...OTHER_SUB,
    ]),
    cat("personal", "Personal care", [
      { id: "hygiene", label: "Hygiene" },
      { id: "grooming", label: "Grooming" },
      ...OTHER_SUB,
    ]),
    cat("seasonal", "Seasonal", [
      { id: "festive", label: "Festive" },
      { id: "summer", label: "Summer" },
      { id: "winter", label: "Winter" },
      ...OTHER_SUB,
    ]),
    cat("other", "Other", OTHER_SUB),
  ],
};

export function inventoryCategoriesForSector(
  sector: ShopSector | null | undefined
): InventoryCategory[] {
  if (sector && sector in BY_SECTOR) {
    return BY_SECTOR[sector as ShopSector];
  }
  return BY_SECTOR.GENERAL;
}

export function inventorySubcategoriesForCategory(
  sector: ShopSector | null | undefined,
  categoryId: string | null | undefined
): InventorySubCategory[] {
  if (!categoryId) return OTHER_SUB;
  const category = inventoryCategoriesForSector(sector).find((c) => c.id === categoryId);
  return category?.subcategories ?? OTHER_SUB;
}

export function findInventoryCategory(
  sector: ShopSector | null | undefined,
  categoryId: string | null | undefined
): InventoryCategory | undefined {
  if (!categoryId) return undefined;
  return inventoryCategoriesForSector(sector).find((c) => c.id === categoryId);
}

export function inventoryCategoryLabel(
  sector: ShopSector | null | undefined,
  categoryId: string | null | undefined
): string {
  if (!categoryId) return "Uncategorized";
  return findInventoryCategory(sector, categoryId)?.label ?? categoryId;
}

export function inventorySubcategoryLabel(
  sector: ShopSector | null | undefined,
  categoryId: string | null | undefined,
  subCategoryId: string | null | undefined
): string {
  if (!subCategoryId) return "";
  const subs = inventorySubcategoriesForCategory(sector, categoryId);
  return subs.find((s) => s.id === subCategoryId)?.label ?? subCategoryId;
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
  sector: ShopSector | null | undefined,
  categoryId: string
): string {
  return inventorySubcategoriesForCategory(sector, categoryId)[0]?.id ?? "general";
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
