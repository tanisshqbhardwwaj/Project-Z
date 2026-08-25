import { formatINR, paiseToRupees } from "@/lib/finance/money";
import type { BarcodeLabelData } from "@/components/shop/barcode-label";
import type { ShopLabelBranding } from "@/lib/org/shop-settings";

type InventoryLabelItem = {
  name: string;
  barcode: string;
  description?: string | null;
  size?: string | null;
  unit?: string;
  sellPaise?: string | null;
  costPaise?: string | null;
};

export function buildBarcodeLabelData(
  item: InventoryLabelItem,
  branding: ShopLabelBranding
): BarcodeLabelData {
  const priceLabel = item.sellPaise ? formatINR(item.sellPaise) : undefined;
  let mrpLabel: string | undefined;

  if (item.costPaise && item.sellPaise) {
    const cost = paiseToRupees(BigInt(item.costPaise));
    const sell = paiseToRupees(BigInt(item.sellPaise));
    if (cost > sell) {
      mrpLabel = formatINR(item.costPaise);
    }
  }

  return {
    name: item.name,
    barcode: item.barcode,
    description: item.description ?? null,
    priceLabel,
    mrpLabel,
    productSize: item.size ?? null,
    unit: item.unit ?? "pcs",
    branding,
    headerMode: "both",
  };
}
