import type { ShopSector } from "@prisma/client";
import { SHOP_SECTORS } from "@/lib/org/shop-sector";

export type ShopOfferingKind = "PRODUCTS" | "SERVICES" | "FOOD" | "MIXED";

export const OFFERING_OPTIONS: Array<{
  id: ShopOfferingKind;
  label: string;
  description: string;
}> = [
  {
    id: "PRODUCTS",
    label: "Physical products",
    description: "Retail — clothing, grocery, hardware, electronics, and more",
  },
  {
    id: "SERVICES",
    label: "Services",
    description: "Salon, repairs, consulting — bill by service, not stock",
  },
  {
    id: "FOOD",
    label: "Food & beverage",
    description: "Restaurant, cafe, cloud kitchen — menu-based billing",
  },
  {
    id: "MIXED",
    label: "Mixed / multiple",
    description: "Pick specific sectors that apply to your business",
  },
];

const RETAIL_SECTORS = SHOP_SECTORS.filter(
  (s) => s !== "RESTAURANT" && s !== "SERVICES"
) as ShopSector[];

export function sectorsForOffering(offering: ShopOfferingKind): ShopSector[] {
  switch (offering) {
    case "SERVICES":
      return ["SERVICES"];
    case "FOOD":
      return ["RESTAURANT"];
    case "MIXED":
      return [...SHOP_SECTORS];
    case "PRODUCTS":
    default:
      return [...RETAIL_SECTORS];
  }
}

export function defaultSectorsForOffering(offering: ShopOfferingKind): ShopSector[] {
  switch (offering) {
    case "SERVICES":
      return ["SERVICES"];
    case "FOOD":
      return ["RESTAURANT"];
    case "MIXED":
      return ["GENERAL"];
    case "PRODUCTS":
    default:
      return ["CLOTHING"];
  }
}
