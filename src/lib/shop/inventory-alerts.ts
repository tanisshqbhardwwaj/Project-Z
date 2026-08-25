import { isInfiniteStock } from "@/lib/shop/inventory";

export const EXPIRING_SOON_DAYS = 30;

export type InventoryAlertItem = {
  id: string;
  name: string;
  size: string | null;
  quantity: number;
  reorderLevel: number;
  barcode: string | null;
  expiryDate: Date | null;
};

export type LowStockAlertItem = {
  id: string;
  label: string;
  quantity: number;
  reorderLevel: number;
};

export type ExpiringAlertItem = {
  id: string;
  label: string;
  expiryDate: Date;
};

export type NoBarcodeAlertItem = {
  id: string;
  label: string;
};

function itemLabel(name: string, size: string | null): string {
  return size ? `${name} (Size ${size})` : name;
}

export function isExpiringSoonDate(
  expiryDate: Date | string | null | undefined,
  withinDays = EXPIRING_SOON_DAYS
): boolean {
  if (!expiryDate) return false;
  const exp = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return exp >= now && exp <= limit;
}

export function computeInventoryAlerts(items: InventoryAlertItem[]) {
  const lowStock: LowStockAlertItem[] = [];
  const expiringSoon: ExpiringAlertItem[] = [];
  const noBarcode: NoBarcodeAlertItem[] = [];

  for (const item of items) {
    const label = itemLabel(item.name, item.size);

    if (!isInfiniteStock(item.quantity) && item.quantity <= item.reorderLevel) {
      lowStock.push({
        id: item.id,
        label,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
      });
    }

    if (item.expiryDate && isExpiringSoonDate(item.expiryDate)) {
      expiringSoon.push({
        id: item.id,
        label,
        expiryDate: item.expiryDate instanceof Date ? item.expiryDate : new Date(item.expiryDate),
      });
    }

    if (!item.barcode) {
      noBarcode.push({ id: item.id, label });
    }
  }

  lowStock.sort((a, b) => a.label.localeCompare(b.label));
  expiringSoon.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  noBarcode.sort((a, b) => a.label.localeCompare(b.label));

  return { lowStock, expiringSoon, noBarcode };
}

export function formatAlertListLines(
  lines: string[],
  maxLines = 8
): { text: string; extra: number } {
  if (lines.length === 0) return { text: "", extra: 0 };
  const shown = lines.slice(0, maxLines);
  const extra = Math.max(0, lines.length - maxLines);
  return { text: shown.join("\n"), extra };
}
