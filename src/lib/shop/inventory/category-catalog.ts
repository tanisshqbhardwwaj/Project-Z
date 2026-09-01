import type { ShopSector } from "@prisma/client";
import { SHOP_SECTORS, getShopSectorConfig } from "@/lib/org/shop-sector";

export type CatalogSubCategory = {
  key: string;
  label: string;
};

export type CatalogCategory = {
  key: string;
  label: string;
  /** Business type this category was predefined for. */
  sector: ShopSector;
  subcategories: CatalogSubCategory[];
};

function sub(key: string, label: string): CatalogSubCategory {
  return { key, label };
}

const GENERIC_SUBS: CatalogSubCategory[] = [
  sub("general", "General"),
  sub("misc", "Miscellaneous"),
];

/** Men / Women / Kids / Unisex split reused by most apparel categories. */
const WEAR_SUBS: CatalogSubCategory[] = [
  sub("men", "Men"),
  sub("women", "Women"),
  sub("kids", "Kids"),
  sub("unisex", "Unisex"),
  ...GENERIC_SUBS,
];

function cat(
  sector: ShopSector,
  key: string,
  label: string,
  subcategories: CatalogSubCategory[] = GENERIC_SUBS
): CatalogCategory {
  return { sector, key, label, subcategories };
}

/**
 * Predefined categories per business type. This is configuration data only —
 * no feature branches on business type live anywhere in the transaction logic.
 * Orgs may select several business types and add their own categories on top.
 */
export const CATEGORY_CATALOG: Record<ShopSector, CatalogCategory[]> = {
  CLOTHING: [
    cat("CLOTHING", "tshirts", "T-Shirts", WEAR_SUBS),
    cat("CLOTHING", "shirts", "Shirts", WEAR_SUBS),
    cat("CLOTHING", "jeans", "Jeans", WEAR_SUBS),
    cat("CLOTHING", "trousers", "Trousers", WEAR_SUBS),
    cat("CLOTHING", "shorts", "Shorts", WEAR_SUBS),
    cat("CLOTHING", "jackets", "Jackets", WEAR_SUBS),
    cat("CLOTHING", "sweaters", "Sweaters", WEAR_SUBS),
    cat("CLOTHING", "hoodies", "Hoodies", WEAR_SUBS),
    cat("CLOTHING", "innerwear", "Innerwear", [
      sub("men-inner", "Men"),
      sub("women-inner", "Women"),
      sub("socks", "Socks"),
      ...GENERIC_SUBS,
    ]),
    cat("CLOTHING", "ethnic", "Ethnic Wear", [
      sub("sherwani", "Sherwani & Kurta"),
      sub("lehenga", "Lehenga & Suit"),
      sub("sarees", "Sarees"),
      sub("dupatta", "Dupatta & Stole"),
      ...GENERIC_SUBS,
    ]),
    cat("CLOTHING", "kids", "Kids Wear", [
      sub("boys", "Boys"),
      sub("girls", "Girls"),
      sub("infants", "Infants"),
      ...GENERIC_SUBS,
    ]),
    cat("CLOTHING", "accessories", "Accessories", [
      sub("bags", "Bags"),
      sub("belts", "Belts"),
      sub("watches", "Watches"),
      sub("caps", "Caps & Hats"),
      ...GENERIC_SUBS,
    ]),
    cat("CLOTHING", "clothing-footwear", "Footwear", [
      sub("men-shoes", "Men"),
      sub("women-shoes", "Women"),
      sub("kids-shoes", "Kids"),
      ...GENERIC_SUBS,
    ]),
    cat("CLOTHING", "other", "Other"),
  ],
  FOOTWEAR: [
    cat("FOOTWEAR", "casual-shoes", "Casual Shoes", WEAR_SUBS),
    cat("FOOTWEAR", "formal-shoes", "Formal Shoes", WEAR_SUBS),
    cat("FOOTWEAR", "sports-shoes", "Sports Shoes", WEAR_SUBS),
    cat("FOOTWEAR", "sandals", "Sandals & Slippers", WEAR_SUBS),
    cat("FOOTWEAR", "boots", "Boots", WEAR_SUBS),
    cat("FOOTWEAR", "school-shoes", "School Shoes", [
      sub("boys", "Boys"),
      sub("girls", "Girls"),
      ...GENERIC_SUBS,
    ]),
    cat("FOOTWEAR", "footwear-care", "Shoe Care & Accessories", [
      sub("polish", "Polish & Cream"),
      sub("insoles", "Insoles"),
      sub("laces", "Laces"),
      ...GENERIC_SUBS,
    ]),
    cat("FOOTWEAR", "other", "Other"),
  ],
  GROCERY: [
    cat("GROCERY", "staples", "Staples & Rice", [
      sub("rice", "Rice"),
      sub("atta", "Atta & Flour"),
      sub("dal", "Dal & Pulses"),
      sub("oil", "Cooking oil"),
      sub("sugar", "Sugar & Salt"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "snacks", "Snacks & Biscuits", [
      sub("biscuits", "Biscuits"),
      sub("chips", "Chips & Namkeen"),
      sub("chocolates", "Chocolates"),
      sub("instant", "Instant noodles"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "beverages", "Beverages", [
      sub("soft-drinks", "Soft drinks"),
      sub("juices", "Juices"),
      sub("tea-coffee", "Tea & Coffee"),
      sub("water", "Water"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "dairy", "Dairy & Bread", [
      sub("milk", "Milk"),
      sub("curd", "Curd & Paneer"),
      sub("bread", "Bread & Bakery"),
      sub("eggs", "Eggs"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "personal-care", "Personal Care", [
      sub("soap", "Soap & Bath"),
      sub("shampoo", "Hair care"),
      sub("oral", "Oral care"),
      sub("skincare", "Skin care"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "household", "Household", [
      sub("cleaning", "Cleaning"),
      sub("detergent", "Detergent"),
      sub("utensils", "Utensils"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "spices", "Spices & Masala", [
      sub("whole", "Whole spices"),
      sub("powder", "Powder masala"),
      sub("ready-mix", "Ready mix"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "frozen", "Frozen & Cold", [
      sub("ice-cream", "Ice cream"),
      sub("frozen-veg", "Frozen veg"),
      sub("cold-drinks", "Cold drinks"),
      ...GENERIC_SUBS,
    ]),
    cat("GROCERY", "other", "Other"),
  ],
  ELECTRONICS: [
    cat("ELECTRONICS", "mobile", "Mobile & Tablets", [
      sub("smartphones", "Smartphones"),
      sub("feature-phones", "Feature phones"),
      sub("tablets", "Tablets"),
      ...GENERIC_SUBS,
    ]),
    cat("ELECTRONICS", "electronics-accessories", "Accessories", [
      sub("cases", "Cases & covers"),
      sub("chargers", "Chargers & cables"),
      sub("earphones", "Earphones"),
      sub("power-banks", "Power banks"),
      ...GENERIC_SUBS,
    ]),
    cat("ELECTRONICS", "appliances", "Appliances", [
      sub("kitchen", "Kitchen"),
      sub("cooling", "Cooling & fans"),
      sub("small", "Small appliances"),
      ...GENERIC_SUBS,
    ]),
    cat("ELECTRONICS", "computer", "Computer & IT", [
      sub("laptops", "Laptops"),
      sub("desktops", "Desktops"),
      sub("storage", "Storage & memory"),
      sub("peripherals", "Peripherals"),
      ...GENERIC_SUBS,
    ]),
    cat("ELECTRONICS", "audio", "Audio & TV", [
      sub("tv", "Television"),
      sub("speakers", "Speakers"),
      sub("home-theatre", "Home theatre"),
      ...GENERIC_SUBS,
    ]),
    cat("ELECTRONICS", "other", "Other"),
  ],
  COSMETICS: [
    cat("COSMETICS", "skincare", "Skin Care", [
      sub("face-wash", "Face wash"),
      sub("moisturiser", "Moisturiser"),
      sub("sunscreen", "Sunscreen"),
      ...GENERIC_SUBS,
    ]),
    cat("COSMETICS", "makeup", "Makeup", [
      sub("face", "Face"),
      sub("eyes", "Eyes"),
      sub("lips", "Lips"),
      sub("nails", "Nails"),
      ...GENERIC_SUBS,
    ]),
    cat("COSMETICS", "haircare", "Hair Care", [
      sub("shampoo", "Shampoo"),
      sub("oil", "Hair oil"),
      sub("colour", "Hair colour"),
      ...GENERIC_SUBS,
    ]),
    cat("COSMETICS", "fragrance", "Fragrance", [
      sub("perfume", "Perfume"),
      sub("deodorant", "Deodorant"),
      ...GENERIC_SUBS,
    ]),
    cat("COSMETICS", "grooming", "Men's Grooming", [
      sub("shaving", "Shaving"),
      sub("beard", "Beard care"),
      ...GENERIC_SUBS,
    ]),
    cat("COSMETICS", "other", "Other"),
  ],
  PHARMACY: [
    cat("PHARMACY", "otc", "OTC Medicines", [
      sub("pain", "Pain relief"),
      sub("cold", "Cold & cough"),
      sub("digestive", "Digestive"),
      sub("first-aid", "First aid"),
      ...GENERIC_SUBS,
    ]),
    cat("PHARMACY", "prescription", "Prescription", [
      sub("tablets", "Tablets"),
      sub("syrups", "Syrups"),
      sub("injections", "Injections"),
      ...GENERIC_SUBS,
    ]),
    cat("PHARMACY", "vitamins", "Vitamins & Supplements", [
      sub("multivitamin", "Multivitamins"),
      sub("protein", "Protein & health"),
      sub("ayurvedic", "Ayurvedic"),
      ...GENERIC_SUBS,
    ]),
    cat("PHARMACY", "pharmacy-personal-care", "Personal Care", [
      sub("skin", "Skin care"),
      sub("baby", "Baby care"),
      sub("sanitary", "Sanitary"),
      ...GENERIC_SUBS,
    ]),
    cat("PHARMACY", "devices", "Medical Devices", [
      sub("bp", "BP & monitors"),
      sub("diabetes", "Diabetes care"),
      sub("masks", "Masks & PPE"),
      ...GENERIC_SUBS,
    ]),
    cat("PHARMACY", "other", "Other"),
  ],
  RESTAURANT: [
    cat("RESTAURANT", "starters", "Starters", [
      sub("veg", "Veg"),
      sub("non-veg", "Non-veg"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "main-course", "Main Course", [
      sub("veg", "Veg"),
      sub("non-veg", "Non-veg"),
      sub("rice", "Rice & biryani"),
      sub("breads", "Breads"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "beverages", "Beverages", [
      sub("soft", "Soft drinks"),
      sub("juice", "Juices"),
      sub("tea-coffee", "Tea & coffee"),
      sub("shakes", "Shakes"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "desserts", "Desserts", [
      sub("ice-cream", "Ice cream"),
      sub("sweets", "Sweets"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "raw", "Raw Ingredients", [
      sub("vegetables", "Vegetables"),
      sub("meat", "Meat & seafood"),
      sub("grains", "Grains & flour"),
      sub("dairy", "Dairy"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "packaging", "Packaging", [
      sub("boxes", "Boxes & bags"),
      sub("containers", "Containers"),
      sub("disposables", "Disposables"),
      ...GENERIC_SUBS,
    ]),
    cat("RESTAURANT", "other", "Other"),
  ],
  HARDWARE: [
    cat("HARDWARE", "tools", "Tools", [
      sub("hand-tools", "Hand tools"),
      sub("power-tools", "Power tools"),
      sub("measuring", "Measuring"),
      ...GENERIC_SUBS,
    ]),
    cat("HARDWARE", "plumbing", "Plumbing", [
      sub("pipes", "Pipes & fittings"),
      sub("taps", "Taps & valves"),
      sub("tanks", "Tanks & pumps"),
      ...GENERIC_SUBS,
    ]),
    cat("HARDWARE", "electrical", "Electrical", [
      sub("wires", "Wires & cables"),
      sub("switches", "Switches & sockets"),
      sub("lighting", "Lighting"),
      ...GENERIC_SUBS,
    ]),
    cat("HARDWARE", "paint", "Paint", [
      sub("interior", "Interior"),
      sub("exterior", "Exterior"),
      sub("brushes", "Brushes & tools"),
      ...GENERIC_SUBS,
    ]),
    cat("HARDWARE", "building", "Building Material", [
      sub("cement", "Cement & sand"),
      sub("steel", "Steel & rods"),
      sub("tiles", "Tiles & stone"),
      ...GENERIC_SUBS,
    ]),
    cat("HARDWARE", "other", "Other"),
  ],
  FURNITURE: [
    cat("FURNITURE", "living", "Living Room", [
      sub("sofas", "Sofas"),
      sub("tables", "Centre tables"),
      sub("tv-units", "TV units"),
      ...GENERIC_SUBS,
    ]),
    cat("FURNITURE", "bedroom", "Bedroom", [
      sub("beds", "Beds"),
      sub("wardrobes", "Wardrobes"),
      sub("mattress", "Mattresses"),
      ...GENERIC_SUBS,
    ]),
    cat("FURNITURE", "dining", "Dining", [
      sub("dining-sets", "Dining sets"),
      sub("chairs", "Chairs"),
      ...GENERIC_SUBS,
    ]),
    cat("FURNITURE", "office", "Office", [
      sub("desks", "Desks"),
      sub("office-chairs", "Chairs"),
      sub("storage", "Storage"),
      ...GENERIC_SUBS,
    ]),
    cat("FURNITURE", "furnishing", "Furnishing & Decor", [
      sub("curtains", "Curtains"),
      sub("bedsheets", "Bedsheets"),
      sub("decor", "Decor"),
      ...GENERIC_SUBS,
    ]),
    cat("FURNITURE", "other", "Other"),
  ],
  STATIONERY: [
    cat("STATIONERY", "books", "Books", [
      sub("school", "School books"),
      sub("competitive", "Competitive exams"),
      sub("general-reading", "General reading"),
      ...GENERIC_SUBS,
    ]),
    cat("STATIONERY", "notebooks", "Notebooks & Paper", [
      sub("notebooks", "Notebooks"),
      sub("registers", "Registers"),
      sub("sheets", "Sheets & charts"),
      ...GENERIC_SUBS,
    ]),
    cat("STATIONERY", "writing", "Writing", [
      sub("pens", "Pens"),
      sub("pencils", "Pencils"),
      sub("markers", "Markers"),
      ...GENERIC_SUBS,
    ]),
    cat("STATIONERY", "office-supplies", "Office Supplies", [
      sub("files", "Files & folders"),
      sub("adhesives", "Adhesives"),
      sub("printing", "Printing & toner"),
      ...GENERIC_SUBS,
    ]),
    cat("STATIONERY", "art", "Art & Craft", [
      sub("colours", "Colours"),
      sub("craft", "Craft material"),
      ...GENERIC_SUBS,
    ]),
    cat("STATIONERY", "other", "Other"),
  ],
  JEWELLERY: [
    cat("JEWELLERY", "gold", "Gold", [
      sub("chains", "Chains"),
      sub("rings", "Rings"),
      sub("bangles", "Bangles"),
      sub("earrings", "Earrings"),
      ...GENERIC_SUBS,
    ]),
    cat("JEWELLERY", "silver", "Silver", [
      sub("silver-chains", "Chains"),
      sub("anklets", "Anklets"),
      sub("utensils", "Utensils & gifts"),
      ...GENERIC_SUBS,
    ]),
    cat("JEWELLERY", "diamond", "Diamond & Stones", [
      sub("solitaire", "Solitaire"),
      sub("studded", "Studded"),
      ...GENERIC_SUBS,
    ]),
    cat("JEWELLERY", "imitation", "Imitation & Fashion", [
      sub("fashion-sets", "Sets"),
      sub("fashion-earrings", "Earrings"),
      ...GENERIC_SUBS,
    ]),
    cat("JEWELLERY", "other", "Other"),
  ],
  GENERAL: [
    cat("GENERAL", "daily", "Daily Needs", [
      sub("essentials", "Essentials"),
      sub("snacks", "Snacks"),
      sub("drinks", "Drinks"),
      ...GENERIC_SUBS,
    ]),
    cat("GENERAL", "home", "Home & Kitchen", [
      sub("cookware", "Cookware"),
      sub("storage", "Storage"),
      sub("decor", "Decor"),
      ...GENERIC_SUBS,
    ]),
    cat("GENERAL", "personal", "Personal Care", [
      sub("hygiene", "Hygiene"),
      sub("grooming", "Grooming"),
      ...GENERIC_SUBS,
    ]),
    cat("GENERAL", "seasonal", "Seasonal", [
      sub("festive", "Festive"),
      sub("summer", "Summer"),
      sub("winter", "Winter"),
      ...GENERIC_SUBS,
    ]),
    cat("GENERAL", "other", "Other"),
  ],
  SERVICES: [
    cat("SERVICES", "repair", "Repair & Maintenance", [
      sub("electronics-repair", "Electronics"),
      sub("appliance-repair", "Appliances"),
      sub("vehicle-repair", "Vehicles"),
      ...GENERIC_SUBS,
    ]),
    cat("SERVICES", "salon", "Salon & Wellness", [
      sub("hair", "Hair"),
      sub("skin", "Skin"),
      sub("spa", "Spa & massage"),
      ...GENERIC_SUBS,
    ]),
    cat("SERVICES", "professional", "Professional Services", [
      sub("consulting", "Consulting"),
      sub("design", "Design"),
      sub("tax", "Tax & compliance"),
      ...GENERIC_SUBS,
    ]),
    cat("SERVICES", "amc", "Plans & AMC", [
      sub("annual", "Annual"),
      sub("monthly", "Monthly"),
      ...GENERIC_SUBS,
    ]),
    cat("SERVICES", "other", "Other"),
  ],
  OTHER: [
    cat("OTHER", "products", "Products"),
    cat("OTHER", "services", "Services"),
    cat("OTHER", "other", "Other"),
  ],
};

/**
 * Category keys retired from the catalog but still present on older products.
 * Kept so historical rows keep a readable label instead of showing a raw key.
 */
export const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  men: "Men",
  women: "Women",
  kids: "Kids Wear",
  footwear: "Footwear",
  accessories: "Accessories",
  ethnic: "Ethnic Wear",
  innerwear: "Innerwear",
  mobile: "Mobile & Tablets",
  "personal-care": "Personal Care",
};

const CATALOG_BY_KEY = new Map<string, CatalogCategory>();
for (const sector of SHOP_SECTORS) {
  for (const category of CATEGORY_CATALOG[sector]) {
    if (!CATALOG_BY_KEY.has(category.key)) CATALOG_BY_KEY.set(category.key, category);
  }
}

export function catalogCategory(key: string | null | undefined) {
  if (!key) return undefined;
  return CATALOG_BY_KEY.get(key);
}

export function catalogCategoryLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return CATALOG_BY_KEY.get(key)?.label ?? LEGACY_CATEGORY_LABELS[key] ?? null;
}

export function catalogSubCategoryLabel(
  categoryKey: string | null | undefined,
  subKey: string | null | undefined
): string | null {
  if (!subKey) return null;
  const category = catalogCategory(categoryKey);
  const match = category?.subcategories.find((s) => s.key === subKey);
  if (match) return match.label;
  // Sub-keys are shared across categories; fall back to a catalog-wide lookup.
  for (const category of CATALOG_BY_KEY.values()) {
    const hit = category.subcategories.find((s) => s.key === subKey);
    if (hit) return hit.label;
  }
  return null;
}

/**
 * Merged, de-duplicated category list for every business type the org selected.
 * Order follows the order the business types were selected in, so a
 * clothing-first shop sees clothing categories first.
 */
export function categoriesForSectors(
  sectors: readonly (ShopSector | string)[]
): CatalogCategory[] {
  const list = sectors.length > 0 ? sectors : ["GENERAL"];
  const seen = new Set<string>();
  const result: CatalogCategory[] = [];
  for (const sector of list) {
    const key = getShopSectorConfig(sector).id;
    for (const category of CATEGORY_CATALOG[key] ?? []) {
      // "other" exists in every sector; keep the first one only.
      if (seen.has(category.key)) continue;
      seen.add(category.key);
      result.push(category);
    }
  }
  return result;
}

/** Slugify a user-entered category name into a stable, org-unique key. */
export function customCategoryKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug ? `custom-${slug}` : `custom-${Date.now().toString(36)}`;
}

export function isCustomCategoryKey(key: string | null | undefined): boolean {
  return typeof key === "string" && key.startsWith("custom-");
}
