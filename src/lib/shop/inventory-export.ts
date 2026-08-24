import type { InventoryStockItem } from "@/components/shop/inventory-stock-list";
import { formatINR } from "@/lib/finance/money";
import {
  inventoryCategoryLabel,
  inventorySubcategoryLabel,
  parseInventoryCategory,
  parseInventorySubcategory,
  type SectorsInput,
} from "@/lib/shop/inventory-categories";

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildBarcodeExportCsv(
  items: InventoryStockItem[],
  shopSector: SectorsInput
): string {
  const header = [
    "name",
    "size",
    "barcode",
    "price",
    "quantity",
    "category",
    "subCategory",
    "expiryDate",
  ].join(",");

  const rows = items
    .filter((i) => i.barcode)
    .map((item) => {
      const category = parseInventoryCategory(item.sectorMeta);
      const subCategory = parseInventorySubcategory(item.sectorMeta);
      return [
        csvCell(item.name),
        csvCell(item.size),
        csvCell(item.barcode),
        csvCell(item.sellPaise ? formatINR(item.sellPaise) : ""),
        csvCell(item.quantity),
        csvCell(category ? inventoryCategoryLabel(shopSector, category) : ""),
        csvCell(
          subCategory
            ? inventorySubcategoryLabel(shopSector, category, subCategory)
            : ""
        ),
        csvCell(
          item.expiryDate
            ? new Date(item.expiryDate).toISOString().slice(0, 10)
            : ""
        ),
      ].join(",");
    });

  return [header, ...rows].join("\n");
}

export function downloadBarcodeExportCsv(
  items: InventoryStockItem[],
  shopSector: SectorsInput,
  filename = "inventory-barcodes.csv"
) {
  const csv = buildBarcodeExportCsv(items, shopSector);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
