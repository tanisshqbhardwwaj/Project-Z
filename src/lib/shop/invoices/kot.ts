import { capabilitiesForSectors } from "@/lib/org/shop-sector";
import type { ShopItemKind } from "@/lib/shop/branch/sector-mode";

export type KotLine = {
  name: string;
  qty: number;
  size?: string;
  variantLabel?: string;
  unit?: string;
};

export type KotPayload = {
  ticketNo: number;
  billNumber: string | null;
  customerName: string | null;
  lines: KotLine[];
  createdAt: string;
};

export function hasKotCapability(sectors: readonly string[]): boolean {
  return capabilitiesForSectors(sectors).includes("kot");
}

export function hasRecipeConsumptionCapability(sectors: readonly string[]): boolean {
  return capabilitiesForSectors(sectors).includes("recipe_consumption");
}

export function buildKotPayload(input: {
  ticketNo: number;
  billNumber: string | null;
  customerName: string | null;
  lines: Array<{
    name: string;
    qty: number;
    size?: string | null;
    variantLabel?: string | null;
    unit?: string | null;
    itemKind?: ShopItemKind | null;
  }>;
}): KotPayload | null {
  const menuLines: KotLine[] = [];
  for (const line of input.lines) {
    if (line.itemKind && line.itemKind !== "MENU_ITEM") continue;
    menuLines.push({
      name: line.name,
      qty: line.qty,
      ...(line.size ? { size: line.size } : {}),
      ...(line.variantLabel ? { variantLabel: line.variantLabel } : {}),
      ...(line.unit ? { unit: line.unit } : {}),
    });
  }
  if (menuLines.length === 0) return null;
  return {
    ticketNo: input.ticketNo,
    billNumber: input.billNumber,
    customerName: input.customerName,
    lines: menuLines,
    createdAt: new Date().toISOString(),
  };
}

export function parseKotPayload(raw: unknown): KotPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.lines)) return null;
  return {
    ticketNo: Number(o.ticketNo ?? 0),
    billNumber: typeof o.billNumber === "string" ? o.billNumber : null,
    customerName: typeof o.customerName === "string" ? o.customerName : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    lines: o.lines
      .filter((l) => l && typeof l === "object")
      .map((l) => {
        const row = l as Record<string, unknown>;
        return {
          name: String(row.name ?? ""),
          qty: Number(row.qty ?? 0),
          size: typeof row.size === "string" ? row.size : undefined,
          variantLabel:
            typeof row.variantLabel === "string" ? row.variantLabel : undefined,
          unit: typeof row.unit === "string" ? row.unit : undefined,
        };
      })
      .filter((l) => l.name && l.qty > 0),
  };
}
