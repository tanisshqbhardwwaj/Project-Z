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
  category?: string | null;
  subCategory?: string | null;
  size?: string | null;
  quantity?: number;
  sellRupees?: number | null;
  costRupees?: number | null;
  barcode?: string | null;
  description?: string | null;
  reorderLevel?: number;
  expiryDate?: string | null;
};

const HEADER_ALIASES: Record<string, keyof BulkImportRow> = {
  name: "name",
  product: "name",
  "product name": "name",
  category: "category",
  subcategory: "subCategory",
  "sub category": "subCategory",
  size: "size",
  qty: "quantity",
  quantity: "quantity",
  stock: "quantity",
  price: "sellRupees",
  sell: "sellRupees",
  "sell price": "sellRupees",
  mrp: "sellRupees",
  cost: "costRupees",
  barcode: "barcode",
  description: "description",
  desc: "description",
  reorder: "reorderLevel",
  "reorder level": "reorderLevel",
  expiry: "expiryDate",
  "expiry date": "expiryDate",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/_/g, " ");
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
        case "category":
          item.category = raw;
          break;
        case "subCategory":
          item.subCategory = raw;
          break;
        case "size":
          item.size = raw;
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
        case "description":
          item.description = raw;
          break;
        case "reorderLevel":
          item.reorderLevel = Number(raw);
          break;
        case "expiryDate":
          item.expiryDate = raw;
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

export const BULK_IMPORT_TEMPLATE = `name,category,subCategory,size,quantity,sell price,cost,barcode,description,reorder level,expiry date
T Shirt,men,tshirts,M,10,899,650,,Cotton slim fit,5,
Rice 5kg,staples,rice,,20,450,400,,Basmati,10,2026-12-31
`;

export function downloadCsvTemplate() {
  const blob = new Blob([BULK_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory-import-template.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
