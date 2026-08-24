import {
  defaultVariantAxisForSectors,
  inventoryFieldsForSectors,
  usesSizeColorMatrix,
} from "@/lib/org/shop-sector";

/** Parse a single CSV line respecting quoted fields */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvText(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

export type BulkImportRow = {
  name: string;
  brand?: string | null;
  category?: string | null;
  subCategory?: string | null;
  unit?: string | null;
  supplier?: string | null;
  description?: string | null;
  variant?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  quantity?: number;
  sellRupees?: number | null;
  costRupees?: number | null;
  barcode?: string | null;
  reorderLevel?: number;
  expiryDate?: string | null;
  batch?: string | null;
  serial?: string | null;
  weight?: string | null;
};

export type BulkImportProductGroup = {
  name: string;
  brand?: string | null;
  category?: string | null;
  subCategory?: string | null;
  unit: string;
  supplier?: string | null;
  description?: string | null;
  hasVariants: boolean;
  variantAxis: string;
  variants: Array<{
    size?: string | null;
    color?: string | null;
    variantLabel?: string | null;
    sku?: string | null;
    barcode?: string | null;
    quantity: number;
    reorderLevel: number;
    sellRupees?: number | null;
    costRupees?: number | null;
    expiryDate?: string | null;
    attributes?: Record<string, string>;
  }>;
};

const BASE_HEADERS = [
  "name",
  "brand",
  "category",
  "sub category",
  "unit",
  "supplier",
  "description",
  "variant",
  "colour",
  "sku",
  "quantity",
  "sell price",
  "cost",
  "barcode",
  "reorder level",
] as const;

const EXTRA_HEADER_FIELDS: Record<string, string> = {
  expiryDate: "expiry date",
  batch: "batch",
  serial: "serial",
  weight: "weight",
};

const HEADER_ALIASES: Record<string, keyof BulkImportRow> = {
  name: "name",
  product: "name",
  "product name": "name",
  brand: "brand",
  category: "category",
  subcategory: "subCategory",
  "sub category": "subCategory",
  unit: "unit",
  supplier: "supplier",
  description: "description",
  desc: "description",
  variant: "variant",
  size: "size",
  color: "color",
  colour: "color",
  sku: "sku",
  qty: "quantity",
  quantity: "quantity",
  stock: "quantity",
  price: "sellRupees",
  sell: "sellRupees",
  "sell price": "sellRupees",
  mrp: "sellRupees",
  cost: "costRupees",
  barcode: "barcode",
  reorder: "reorderLevel",
  "reorder level": "reorderLevel",
  expiry: "expiryDate",
  "expiry date": "expiryDate",
  batch: "batch",
  serial: "serial",
  weight: "weight",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/_/g, " ");
}

export function templateHeadersForSectors(
  businessTypes: readonly string[] = ["GENERAL"]
): string[] {
  const fields = inventoryFieldsForSectors(businessTypes);
  const headers = [...BASE_HEADERS];
  if (usesSizeColorMatrix(businessTypes)) {
    const variantIdx = headers.indexOf("variant");
    if (variantIdx >= 0) headers[variantIdx] = "size";
  }
  for (const field of fields) {
    const header = EXTRA_HEADER_FIELDS[field];
    if (header && !headers.includes(header as (typeof BASE_HEADERS)[number])) {
      headers.push(header);
    }
  }
  return headers;
}

export function sampleRowsForSectors(
  businessTypes: readonly string[] = ["GENERAL"]
): string[][] {
  const headers = templateHeadersForSectors(businessTypes);
  const row = (cells: Record<string, string>) =>
    headers.map((h) => cells[h] ?? "");

  const primary = businessTypes[0] ?? "GENERAL";
  if (primary === "GROCERY" || primary === "PHARMACY") {
    return [
      row({
        name: "Basmati Rice",
        brand: "India Gate",
        category: "staples",
        "sub category": "rice",
        unit: "kg",
        variant: "5kg",
        quantity: "20",
        "sell price": "450",
        cost: "400",
        "reorder level": "10",
        "expiry date": "2026-12-31",
      }),
      row({
        name: "Sunflower Oil",
        brand: "Fortune",
        category: "staples",
        "sub category": "oil",
        unit: "L",
        variant: "1L",
        quantity: "15",
        "sell price": "180",
        cost: "155",
        "reorder level": "5",
      }),
    ];
  }
  if (primary === "ELECTRONICS") {
    return [
      row({
        name: "Wireless Earbuds",
        brand: "boAt",
        category: "accessories",
        unit: "pcs",
        variant: "Black",
        sku: "BOAT-AIR-01",
        quantity: "8",
        "sell price": "1499",
        cost: "1100",
        "reorder level": "3",
      }),
    ];
  }
  if (usesSizeColorMatrix(businessTypes)) {
    return [
      row({
        name: "Cotton T-Shirt",
        brand: "Local",
        category: "men",
        "sub category": "tshirts",
        unit: "pcs",
        size: "M",
        colour: "Black",
        quantity: "10",
        "sell price": "899",
        cost: "650",
        "reorder level": "5",
      }),
      row({
        name: "Cotton T-Shirt",
        brand: "Local",
        category: "men",
        "sub category": "tshirts",
        unit: "pcs",
        size: "L",
        colour: "Black",
        quantity: "8",
        "sell price": "899",
        cost: "650",
        "reorder level": "5",
      }),
    ];
  }
  return [
    row({
      name: "General Item",
      brand: "Store brand",
      category: "general",
      unit: "pcs",
      variant: "Standard",
      quantity: "25",
      "sell price": "199",
      cost: "120",
      "reorder level": "5",
    }),
  ];
}

export function buildCsvTemplate(businessTypes: readonly string[] = ["GENERAL"]): string {
  const headers = templateHeadersForSectors(businessTypes);
  const rows = sampleRowsForSectors(businessTypes);
  const escape = (v: string) => (v.includes(",") ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function downloadCsvTemplate(businessTypes: readonly string[] = ["GENERAL"]) {
  const blob = new Blob([buildCsvTemplate(businessTypes)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory-import-template.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function csvRowsToImport(rows: string[][]): {
  items: BulkImportRow[];
  errors: string[];
} {
  if (rows.length === 0) return { items: [], errors: ["File is empty"] };

  const [headerRow, ...dataRows] = rows;
  const headerMap: Partial<Record<number, keyof BulkImportRow>> = {};
  headerRow.forEach((h, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (key) headerMap[idx] = key;
  });

  if (!Object.values(headerMap).includes("name")) {
    return { items: [], errors: ['CSV must have a "name" column'] };
  }

  const items: BulkImportRow[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIdx) => {
    const lineNum = rowIdx + 2;
    const item: BulkImportRow = { name: "" };

    for (const [idx, key] of Object.entries(headerMap)) {
      const raw = row[Number(idx)] ?? "";
      if (!raw) continue;
      switch (key) {
        case "name":
          item.name = raw;
          break;
        case "brand":
          item.brand = raw;
          break;
        case "category":
          item.category = raw;
          break;
        case "subCategory":
          item.subCategory = raw;
          break;
        case "unit":
          item.unit = raw;
          break;
        case "supplier":
          item.supplier = raw;
          break;
        case "description":
          item.description = raw;
          break;
        case "variant":
          item.variant = raw;
          break;
        case "size":
          item.size = raw;
          break;
        case "color":
          item.color = raw;
          break;
        case "sku":
          item.sku = raw;
          break;
        case "quantity":
          item.quantity = Number(raw);
          break;
        case "sellRupees":
          item.sellRupees = Number(raw);
          break;
        case "costRupees":
          item.costRupees = Number(raw);
          break;
        case "barcode":
          item.barcode = raw;
          break;
        case "reorderLevel":
          item.reorderLevel = Number(raw);
          break;
        case "expiryDate":
          item.expiryDate = raw;
          break;
        case "batch":
          item.batch = raw;
          break;
        case "serial":
          item.serial = raw;
          break;
        case "weight":
          item.weight = raw;
          break;
      }
    }

    if (!item.name.trim()) {
      errors.push(`Row ${lineNum}: name is required`);
      return;
    }
    items.push(item);
  });

  return { items, errors };
}

function productGroupKey(row: BulkImportRow): string {
  return [
    row.name.trim().toLowerCase(),
    (row.brand ?? "").trim().toLowerCase(),
    (row.category ?? "").trim().toLowerCase(),
    (row.subCategory ?? "").trim().toLowerCase(),
  ].join("|");
}

/** Group flat CSV rows into parent products with variant lines. */
export function groupImportRowsIntoProducts(
  rows: BulkImportRow[],
  businessTypes: readonly string[] = ["GENERAL"]
): BulkImportProductGroup[] {
  const defaultAxis = defaultVariantAxisForSectors(businessTypes);
  const map = new Map<string, BulkImportProductGroup>();

  for (const row of rows) {
    const key = productGroupKey(row);
    let group = map.get(key);
    const variantValue = row.size ?? row.variant ?? null;
    const hasVariantColumn = !!(variantValue || row.color);

    if (!group) {
      group = {
        name: row.name.trim(),
        brand: row.brand?.trim() || null,
        category: row.category?.trim() || null,
        subCategory: row.subCategory?.trim() || null,
        unit: row.unit?.trim() || "pcs",
        supplier: row.supplier?.trim() || null,
        description: row.description?.trim() || null,
        hasVariants: hasVariantColumn,
        variantAxis: defaultAxis,
        variants: [],
      };
      map.set(key, group);
    }

    const attributes: Record<string, string> = {};
    if (row.batch) attributes.batch = row.batch;
    if (row.serial) attributes.serial = row.serial;
    if (row.weight) attributes.weight = row.weight;

    if (hasVariantColumn || group.hasVariants) {
      group.hasVariants = true;
      group.variants.push({
        size: variantValue,
        color: row.color?.trim() || null,
        variantLabel: variantValue && !row.size ? variantValue : null,
        sku: row.sku?.trim() || null,
        barcode: row.barcode?.trim() || null,
        quantity: row.quantity ?? 0,
        reorderLevel: row.reorderLevel ?? 0,
        sellRupees: row.sellRupees,
        costRupees: row.costRupees,
        expiryDate: row.expiryDate ?? null,
        attributes: Object.keys(attributes).length ? attributes : undefined,
      });
    } else {
      group.variants.push({
        barcode: row.barcode?.trim() || null,
        sku: row.sku?.trim() || null,
        quantity: row.quantity ?? 0,
        reorderLevel: row.reorderLevel ?? 0,
        sellRupees: row.sellRupees,
        costRupees: row.costRupees,
        expiryDate: row.expiryDate ?? null,
        attributes: Object.keys(attributes).length ? attributes : undefined,
      });
    }
  }

  return [...map.values()];
}
