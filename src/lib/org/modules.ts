import type { BusinessType } from "@prisma/client";
import type { ShopSector } from "@prisma/client";
import type { OrgRole } from "@prisma/client";
import {
  UsersRound,
  ShoppingCart,
  Package,
  HardHat,
  Ruler,
  Palette,
  Truck,
  Wallet,
  ClipboardList,
  CalendarDays,
  FileText,
  Gift,
  Percent,
  UtensilsCrossed,
  ChefHat,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions/rbac";
import { hasPermission } from "@/lib/permissions/rbac";
import { catalogLabelForSectors } from "@/lib/shop/branch/sector-mode";
import {
  isServiceModuleKey,
  isServiceVerticalEnabled,
  stripDisabledServiceModules,
} from "@/lib/org/service-vertical";

export type ModuleKey =
  | "staff"
  | "shop_sales"
  | "shop_inventory"
  | "shop_udhaar"
  | "shop_purchases"
  | "shop_expenses"
  | "shop_activity"
  | "service_appointments"
  | "service_packages"
  | "service_contracts"
  | "service_commissions"
  | "deliveries"
  | "restaurant_tables"
  | "restaurant_kitchen"
  | "contractor_boq"
  | "contractor_material"
  | "architect_stages";

export type ModuleDefinition = {
  key: ModuleKey;
  label: Record<BusinessType, string>;
  description: string;
  icon: LucideIcon;
  route: string;
  /** Override route for specific business types */
  routeByBusinessType?: Partial<Record<BusinessType, string>>;
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
      SERVICE: "Staff",
      CONTRACTOR: "Labour",
      ARCHITECT: "Staff",
    },
    description: "People, daily attendance, and monthly payroll",
    icon: UsersRound,
    route: "/staff",
    availableFor: ["SHOPKEEPER", "SERVICE", "CONTRACTOR", "ARCHITECT"],
    defaultOn: { SHOPKEEPER: false, SERVICE: false },
    requiredPermission: "staff.view",
  },
  {
    key: "shop_sales",
    label: {
      SHOPKEEPER: "Invoices",
      SERVICE: "Invoices",
      CONTRACTOR: "Counter Sales",
      ARCHITECT: "Counter Sales",
    },
    description: "Recent invoices and shop billing",
    icon: ShoppingCart,
    route: "/shop/invoices",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: true, SERVICE: true },
    requiredPermission: "shop.sales",
  },
  {
    key: "shop_inventory",
    label: {
      SHOPKEEPER: "Inventory",
      SERVICE: "Services",
      CONTRACTOR: "Inventory",
      ARCHITECT: "Inventory",
    },
    description: "Stock levels and low-stock alerts",
    icon: Package,
    route: "/shop/inventory",
    routeByBusinessType: { SERVICE: "/service/catalog" },
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: true, SERVICE: true },
    requiredPermission: "shop.inventory.manage",
  },
  {
    key: "shop_udhaar",
    label: {
      SHOPKEEPER: "Udhaar",
      SERVICE: "Udhaar",
      CONTRACTOR: "Udhaar",
      ARCHITECT: "Udhaar",
    },
    description: "Customer credit ledger (udhaar)",
    icon: UsersRound,
    route: "/shop/udhaar",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: false, SERVICE: false },
    requiredPermission: "financial.view",
  },
  {
    key: "shop_purchases",
    label: {
      SHOPKEEPER: "Purchases",
      SERVICE: "Purchases",
      CONTRACTOR: "Purchases",
      ARCHITECT: "Purchases",
    },
    description: "Stock purchase entry and supplier bills",
    icon: Truck,
    route: "/shop/purchases",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: true, SERVICE: true },
    requiredPermission: "shop.purchase.view",
  },
  {
    key: "shop_expenses",
    label: {
      SHOPKEEPER: "Expenses",
      SERVICE: "Expenses",
      CONTRACTOR: "Expenses",
      ARCHITECT: "Expenses",
    },
    description: "Daily and monthly store expenses",
    icon: Wallet,
    route: "/shop/expenses",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: true, SERVICE: true },
    requiredPermission: "shop.expense.view",
  },
  {
    key: "shop_activity",
    label: {
      SHOPKEEPER: "Activity Trail",
      SERVICE: "Activity Trail",
      CONTRACTOR: "Activity Trail",
      ARCHITECT: "Activity Trail",
    },
    description: "Owner audit trail of shop actions with filters",
    icon: ClipboardList,
    route: "/shop/activity",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: true, SERVICE: true },
    requiredPermission: "shop.activity.view",
  },
  {
    key: "service_appointments",
    label: {
      SHOPKEEPER: "Appointments",
      SERVICE: "Bookings",
      CONTRACTOR: "Appointments",
      ARCHITECT: "Appointments",
    },
    description: "Schedule and manage service appointments",
    icon: CalendarDays,
    route: "/service/appointments",
    availableFor: ["SERVICE"],
    defaultOn: { SERVICE: false },
    requiredPermission: "service.appointments.manage",
  },
  {
    key: "service_packages",
    label: {
      SHOPKEEPER: "Packages",
      SERVICE: "Packages",
      CONTRACTOR: "Packages",
      ARCHITECT: "Packages",
    },
    description: "Service packages and memberships",
    icon: Gift,
    route: "/service/packages",
    availableFor: ["SERVICE"],
    defaultOn: { SERVICE: false },
    requiredPermission: "service.packages.manage",
  },
  {
    key: "service_contracts",
    label: {
      SHOPKEEPER: "AMC Contracts",
      SERVICE: "AMC Contracts",
      CONTRACTOR: "Contracts",
      ARCHITECT: "Contracts",
    },
    description: "Annual maintenance and recurring service contracts",
    icon: FileText,
    route: "/service/contracts",
    availableFor: ["SERVICE"],
    defaultOn: { SERVICE: false },
    requiredPermission: "service.contracts.manage",
  },
  {
    key: "service_commissions",
    label: {
      SHOPKEEPER: "Commissions",
      SERVICE: "Commissions",
      CONTRACTOR: "Commissions",
      ARCHITECT: "Commissions",
    },
    description: "Staff commission by service",
    icon: Percent,
    route: "/service/commissions",
    availableFor: ["SERVICE"],
    defaultOn: { SERVICE: false },
    requiredPermission: "service.commission.view",
  },
  {
    key: "deliveries",
    label: {
      SHOPKEEPER: "Deliveries",
      SERVICE: "Deliveries",
      CONTRACTOR: "Deliveries",
      ARCHITECT: "Deliveries",
    },
    description: "Delivery assignment and tracking",
    icon: MapPin,
    route: "/deliveries",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: false, SERVICE: false },
    requiredPermission: "delivery.manage",
  },
  {
    key: "restaurant_tables",
    label: {
      SHOPKEEPER: "Tables",
      SERVICE: "Tables",
      CONTRACTOR: "Tables",
      ARCHITECT: "Tables",
    },
    description: "Restaurant table and floor management",
    icon: UtensilsCrossed,
    route: "/restaurant/tables",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: false, SERVICE: false },
    requiredPermission: "shop.sales",
    sectorOnly: ["RESTAURANT"],
  },
  {
    key: "restaurant_kitchen",
    label: {
      SHOPKEEPER: "Kitchen",
      SERVICE: "Kitchen",
      CONTRACTOR: "Kitchen",
      ARCHITECT: "Kitchen",
    },
    description: "Kitchen display and KOT queue",
    icon: ChefHat,
    route: "/restaurant/kitchen",
    availableFor: ["SHOPKEEPER", "SERVICE"],
    defaultOn: { SHOPKEEPER: false, SERVICE: false },
    requiredPermission: "shop.sales",
    sectorOnly: ["RESTAURANT"],
  },
  {
    key: "contractor_boq",
    label: {
      SHOPKEEPER: "BOQ",
      SERVICE: "BOQ",
      CONTRACTOR: "BOQ & Measurements",
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
      SERVICE: "Material",
      CONTRACTOR: "Material Issue",
      ARCHITECT: "Material",
    },
    description: "Material issue and consumption tracking",
    icon: HardHat,
    route: "/contractor/material",
    availableFor: ["CONTRACTOR"],
    defaultOn: { CONTRACTOR: true },
    requiredPermission: "expense.create",
  },
  {
    key: "architect_stages",
    label: {
      SHOPKEEPER: "Design Stages",
      SERVICE: "Design Stages",
      CONTRACTOR: "Design Stages",
      ARCHITECT: "Design Stages",
    },
    description: "Design milestones and drawing revisions",
    icon: Palette,
    route: "/architect/stages",
    availableFor: ["ARCHITECT"],
    defaultOn: { ARCHITECT: true },
    requiredPermission: "project.view_all",
  },
];

export type OrgSettingsJson = {
  modules?: Partial<Record<ModuleKey, boolean>>;
  weeklyOffDays?: number[];
  unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
  payrollRoundTo?: number;
  /** Optional shop geofence for staff check-in (lat/lng + radius in meters). */
  attendanceGeofence?: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    required?: boolean;
  };
  shop?: {
    brandName?: string;
    logoUrl?: string | null;
    invoice?: import("@/lib/org/shop-settings").ShopInvoiceSettings;
    multiStore?: import("@/lib/shop/branch/multi-store").MultiStoreSettings;
  };
};

export function moduleRoute(
  def: ModuleDefinition,
  businessType: BusinessType
): string {
  if (
    def.key === "shop_inventory" &&
    businessType === "SERVICE" &&
    !isServiceVerticalEnabled()
  ) {
    return def.route;
  }
  return def.routeByBusinessType?.[businessType] ?? def.route;
}

export function getModuleDefinition(key: ModuleKey): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key);
}

export function modulesForBusinessType(
  businessType: BusinessType,
  shopSector?: ShopSector | null
): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => {
    if (!m.availableFor.includes(businessType)) return false;
    if (!isServiceVerticalEnabled() && isServiceModuleKey(m.key)) return false;
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
  return stripDisabledServiceModules(merged);
}

export function moduleLabel(
  key: ModuleKey,
  businessType: BusinessType,
  shopSectors?: readonly string[] | null
): string {
  if (key === "shop_inventory" && shopSectors?.length) {
    return catalogLabelForSectors(shopSectors);
  }
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
