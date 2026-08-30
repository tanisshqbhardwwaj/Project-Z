import type { ShopSector } from "@prisma/client";
import { capabilitiesForSectors } from "@/lib/org/shop-sector";

export type ShopItemKind = "PRODUCT" | "SERVICE" | "MENU_ITEM";

export function hasServiceCatalog(sectors: readonly (ShopSector | string)[]): boolean {
  return capabilitiesForSectors(sectors).includes("service_catalog");
}

export function hasMenuBilling(sectors: readonly (ShopSector | string)[]): boolean {
  return capabilitiesForSectors(sectors).includes("menu");
}

export function hasKot(sectors: readonly (ShopSector | string)[]): boolean {
  return capabilitiesForSectors(sectors).includes("kot");
}

export function hasRecipeConsumption(sectors: readonly (ShopSector | string)[]): boolean {
  return capabilitiesForSectors(sectors).includes("recipe_consumption");
}

export function isNonStockItemKind(kind: ShopItemKind): boolean {
  return kind === "SERVICE" || kind === "MENU_ITEM";
}

export function defaultItemKindForSectors(
  sectors: readonly (ShopSector | string)[]
): ShopItemKind {
  if (hasMenuBilling(sectors) && !hasServiceCatalog(sectors)) return "MENU_ITEM";
  if (hasServiceCatalog(sectors) && !hasMenuBilling(sectors)) return "SERVICE";
  return "PRODUCT";
}

export function catalogLabelForSectors(sectors: readonly (ShopSector | string)[]): string {
  if (hasMenuBilling(sectors) && !hasServiceCatalog(sectors)) return "Menu";
  if (hasServiceCatalog(sectors) && !hasMenuBilling(sectors)) return "Services";
  if (hasMenuBilling(sectors) && hasServiceCatalog(sectors)) return "Catalog";
  return "Inventory";
}

export function addItemLabelForKind(kind: ShopItemKind): string {
  if (kind === "MENU_ITEM") return "Add menu item";
  if (kind === "SERVICE") return "Add service";
  return "Add product";
}
