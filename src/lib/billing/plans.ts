import type { BillingPlan } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";

export type PlanDefinition = {
  code: BillingPlan;
  name: string;
  monthlyPaise: number;
  storageBytes: number;
  storageLabel: string;
  tagline: string;
  mostPopular?: boolean;
  features: string[];
  /** Modules allowed at this tier (shop). Higher tiers inherit lower. */
  modules: ModuleKey[];
  inventorySkuCap: number | null;
  comingSoon?: string[];
};

export const SETUP_FEE_REGULAR_PAISE = 1_899_900;
export const SETUP_FEE_EARLY_BIRD_PAISE = 1_499_900;
export const EARLY_BIRD_SETUP_LIMIT = 100;

const GB = 1024 * 1024 * 1024;

export const BILLING_PLANS: Record<BillingPlan, PlanDefinition> = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    monthlyPaise: 39_900,
    storageBytes: 2 * GB,
    storageLabel: "2 GB",
    tagline: "Small businesses getting started",
    features: [
      "Invoice generation",
      "Customer management",
      "Basic sales & history",
      "Basic reports",
      "PDF / print invoice",
      "Limited inventory (200 SKUs)",
      "Email sharing",
    ],
    modules: ["shop_sales", "shop_inventory"],
    inventorySkuCap: 200,
  },
  BUSINESS: {
    code: "BUSINESS",
    name: "Business",
    monthlyPaise: 99_900,
    storageBytes: 5 * GB,
    storageLabel: "5 GB",
    tagline: "Growing retail businesses",
    mostPopular: true,
    features: [
      "Everything in Basic",
      "Full inventory",
      "Barcode scanner & labels",
      "Purchase & supplier management",
      "Customer udhaar / ledger",
      "Daily & monthly expenses",
      "Profit reports & low-stock alerts",
      "Returns, offers & hold bills",
      "Excel / CSV import & export",
    ],
    modules: [
      "shop_sales",
      "shop_inventory",
      "shop_udhaar",
      "shop_purchases",
      "shop_expenses",
    ],
    inventorySkuCap: null,
  },
  PROFESSIONAL: {
    code: "PROFESSIONAL",
    name: "Professional",
    monthlyPaise: 149_900,
    storageBytes: 10 * GB,
    storageLabel: "10 GB",
    tagline: "Staff management & advanced control",
    features: [
      "Everything in Business",
      "Staff management",
      "Attendance & payroll",
      "Customer & product analytics",
      "Activity / audit log",
      "Cash denomination",
      "WhatsApp payment reminders",
      "Priority support",
    ],
    modules: [
      "shop_sales",
      "shop_inventory",
      "shop_udhaar",
      "shop_purchases",
      "shop_expenses",
      "shop_activity",
      "staff",
    ],
    inventorySkuCap: null,
  },
  BUSINESS_PRO: {
    code: "BUSINESS_PRO",
    name: "Business Pro",
    monthlyPaise: 249_900,
    storageBytes: 20 * GB,
    storageLabel: "Custom storage",
    tagline: "Established businesses — full suite",
    features: [
      "Everything in Professional",
      "Advanced business analytics",
      "Higher cloud storage (on request)",
      "Multiple users & devices",
      "Premium support",
    ],
    modules: [
      "shop_sales",
      "shop_inventory",
      "shop_udhaar",
      "shop_purchases",
      "shop_expenses",
      "shop_activity",
      "staff",
    ],
    inventorySkuCap: null,
    comingSoon: [
      "Loyalty / rewards program",
      "Gift cards / store wallet",
      "Advanced cash reconciliation",
      "Advanced integrations",
    ],
  },
};

export const PLAN_ORDER: BillingPlan[] = [
  "BASIC",
  "BUSINESS",
  "PROFESSIONAL",
  "BUSINESS_PRO",
];

export function getPlanDefinition(plan: BillingPlan): PlanDefinition {
  return BILLING_PLANS[plan];
}

export function planMonthlyRupees(plan: BillingPlan): number {
  return BILLING_PLANS[plan].monthlyPaise / 100;
}

export function defaultStorageQuotaBytes(plan: BillingPlan): bigint {
  return BigInt(BILLING_PLANS[plan].storageBytes);
}

export function formatStorageBytes(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n >= GB) return `${(n / GB).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`;
  return `${n} B`;
}

export function formatINRFromPaise(paise: number | bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function modulesForPlan(plan: BillingPlan): Set<ModuleKey> {
  return new Set(BILLING_PLANS[plan].modules);
}

export function isModuleAllowedByPlan(plan: BillingPlan, moduleKey: ModuleKey): boolean {
  return modulesForPlan(plan).has(moduleKey);
}

export function billingContact(): string {
  return (
    process.env.BILLING_CONTACT ??
    process.env.NEXT_PUBLIC_BILLING_CONTACT ??
    "Contact support to complete payment"
  );
}
