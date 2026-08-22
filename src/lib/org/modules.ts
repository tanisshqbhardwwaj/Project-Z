import type { BusinessType } from "@prisma/client";
import type { ShopSector } from "@prisma/client";
import type { OrgRole } from "@prisma/client";
import {
  UsersRound,
  ShoppingCart,
  Package,
  HardHat,
  Ruler,
  Building2,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions/rbac";
import { hasPermission } from "@/lib/permissions/rbac";

export type ModuleKey =
  | "staff"
  | "shop_sales"
  | "shop_inventory"
  | "shop_udhaar"
  | "contractor_boq"
  | "contractor_material"
  | "architect_stages"
  | "builder_units";

export type ModuleDefinition = {
  key: ModuleKey;
  label: Record<BusinessType, string>;
  description: string;
  icon: LucideIcon;
  route: string;
  availableFor: BusinessType[];
  /** Default on when org is created with this business type */
  defaultOn: Partial<Record<BusinessType, boolean>>;
  requiredPermission: Permission;
  sectorOnly?: ShopSector[];
};

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    key: "staff",
    label: {
      SHOPKEEPER: "Staff",
      CONTRACTOR: "Labour",
      BUILDER: "Labour",
      ARCHITECT: "Staff",
    },
    description: "People, daily attendance, and monthly payroll",
    icon: UsersRound,
    route: "/staff",
    availableFor: ["SHOPKEEPER", "CONTRACTOR", "BUILDER", "ARCHITECT"],
    defaultOn: { SHOPKEEPER: false },
    requiredPermission: "staff.view",
  },
  {
    key: "shop_sales",
    label: {
      SHOPKEEPER: "Counter Sales",
      CONTRACTOR: "Counter Sales",
      BUILDER: "Counter Sales",
      ARCHITECT: "Counter Sales",
    },
    description: "Quick billing and daily sales",
    icon: ShoppingCart,
    route: "/shop/sales",
    availableFor: ["SHOPKEEPER"],
    defaultOn: { SHOPKEEPER: true },
    requiredPermission: "shop.sales",
  },
  {
    key: "shop_inventory",
    label: {
      SHOPKEEPER: "Inventory",
      CONTRACTOR: "Inventory",
      BUILDER: "Inventory",
      ARCHITECT: "Inventory",
    },
    description: "Stock levels and low-stock alerts",
    icon: Package,
    route: "/shop/inventory",
    availableFor: ["SHOPKEEPER"],
    defaultOn: { SHOPKEEPER: true },
    requiredPermission: "shop.inventory.manage",
  },
  {
    key: "shop_udhaar",
    label: {
      SHOPKEEPER: "Udhaar",
      CONTRACTOR: "Udhaar",
      BUILDER: "Udhaar",
      ARCHITECT: "Udhaar",
    },
    description: "Customer credit ledger",
    icon: UsersRound,
    route: "/shop/udhaar",
    availableFor: ["SHOPKEEPER"],
    defaultOn: { SHOPKEEPER: false },
    requiredPermission: "financial.view",
    sectorOnly: ["GROCERY", "GENERAL", "PHARMACY"],
  },
  {
    key: "contractor_boq",
    label: {
      SHOPKEEPER: "BOQ",
      CONTRACTOR: "BOQ & Measurements",
      BUILDER: "BOQ",
      ARCHITECT: "BOQ",
    },
    description: "Bill of quantities and measurement book",
    icon: Ruler,
    route: "/contractor/boq",
    availableFor: ["CONTRACTOR"],
    defaultOn: { CONTRACTOR: true },
    requiredPermission: "project.view_all",
  },
  {
    key: "contractor_material",
    label: {
      SHOPKEEPER: "Material",
      CONTRACTOR: "Material Issue",
      BUILDER: "Material",
      ARCHITECT: "Material",
    },
    description: "Material issue and consumption tracking",
    icon: HardHat,
    route: "/contractor/material",
    availableFor: ["CONTRACTOR", "BUILDER"],
    defaultOn: { CONTRACTOR: true, BUILDER: true },
    requiredPermission: "expense.create",
  },
  {
    key: "architect_stages",
    label: {
      SHOPKEEPER: "Design Stages",
      CONTRACTOR: "Design Stages",
      BUILDER: "Design Stages",
      ARCHITECT: "Design Stages",
    },
    description: "Design milestones and drawing revisions",
    icon: Palette,
    route: "/architect/stages",
    availableFor: ["ARCHITECT"],
    defaultOn: { ARCHITECT: true },
    requiredPermission: "project.view_all",
  },
  {
    key: "builder_units",
    label: {
      SHOPKEEPER: "Units",
      CONTRACTOR: "Units",
      BUILDER: "Units & Bookings",
      ARCHITECT: "Units",
    },
    description: "Flat inventory, bookings, and collections",
    icon: Building2,
    route: "/builder/units",
    availableFor: ["BUILDER"],
    defaultOn: { BUILDER: true },
    requiredPermission: "project.view_all",
  },
];

export type OrgSettingsJson = {
  modules?: Partial<Record<ModuleKey, boolean>>;
  weeklyOffDays?: number[];
  unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
  payrollRoundTo?: number;
  shop?: {
    brandName?: string;
    logoUrl?: string | null;
  };
};

export function getModuleDefinition(key: ModuleKey): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key);
}

export function modulesForBusinessType(
  businessType: BusinessType,
  shopSector?: ShopSector | null
): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => {
    if (!m.availableFor.includes(businessType)) return false;
    if (m.sectorOnly && shopSector && !m.sectorOnly.includes(shopSector)) return false;
    return true;
  });
}

export function defaultEnabledModules(
  businessType: BusinessType,
  shopSector?: ShopSector | null
): Record<ModuleKey, boolean> {
  const result = {} as Record<ModuleKey, boolean>;
  for (const m of modulesForBusinessType(businessType, shopSector)) {
    result[m.key] = m.defaultOn[businessType] ?? false;
  }
  return result;
}

export function resolveEnabledModules(input: {
  businessType: BusinessType;
  shopSector?: ShopSector | null;
  settings?: OrgSettingsJson | null;
  enableStaffLegacy?: boolean;
}): Record<ModuleKey, boolean> {
  const defaults = defaultEnabledModules(input.businessType, input.shopSector);
  const fromSettings = input.settings?.modules ?? {};
  const merged = { ...defaults, ...fromSettings } as Record<ModuleKey, boolean>;
  if (input.enableStaffLegacy) merged.staff = true;
  for (const m of MODULE_REGISTRY) {
    if (!modulesForBusinessType(input.businessType, input.shopSector).some((x) => x.key === m.key)) {
      merged[m.key] = false;
    }
  }
  return merged;
}

export function moduleLabel(
  key: ModuleKey,
  businessType: BusinessType
): string {
  const def = getModuleDefinition(key);
  return def?.label[businessType] ?? key;
}

export function enabledNavModules(input: {
  businessType: BusinessType;
  shopSector?: ShopSector | null;
  enabledModules: Partial<Record<ModuleKey, boolean>>;
  role?: OrgRole | null;
}): ModuleDefinition[] {
  return modulesForBusinessType(input.businessType, input.shopSector).filter(
    (m) => {
      if (!input.enabledModules[m.key]) return false;
      if (input.role && !hasPermission(input.role, m.requiredPermission)) {
        return false;
      }
      return true;
    }
  );
}
