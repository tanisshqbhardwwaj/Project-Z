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
  introMonthPaise?: number;
  introLabel?: string;
};

/** Setup / onboarding is no longer billed. Kept at 0 for older callers. */
export const SETUP_FEE_REGULAR_PAISE = 0;
export const SETUP_FEE_EARLY_BIRD_PAISE = 0;
export const EARLY_BIRD_SETUP_LIMIT = 0;

const GB = 1024 * 1024 * 1024;

export const BILLING_PLANS: Record<BillingPlan, PlanDefinition> = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    monthlyPaise: 39_900,
    storageBytes: 2 * GB,
    storageLabel: "2 GB",
    tagline: "For small businesses getting started",
    features: [
      "Invoice generation",
      "Customer management",
      "Basic sales",
      "Invoice history",
      "PDF / print invoice",
      "Limited inventory (200 SKUs)",
      "Android app support",
      "2 GB cloud storage",
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
    tagline: "All the essentials for growing retail",
    mostPopular: true,
    features: [
      "Everything in Basic",
      "Full inventory",
      "Barcode scanner",
      "Barcode generation & printing",
      "Purchase management",
      "Customer ledger (udhaar)",
      "Profit reports",
      "Low-stock alerts",
      "Returns & exchanges",
      "Offers & discounts",
      "Hold bill (30 minutes)",
      "Excel / CSV import & export",
      "Staff management",
      "iOS app support",
      "5 GB cloud storage",
    ],
    modules: [
      "shop_sales",
      "shop_inventory",
      "shop_udhaar",
      "shop_purchases",
      "staff",
    ],
    inventorySkuCap: null,
  },
  PROFESSIONAL: {
    code: "PROFESSIONAL",
    name: "Professional",
    monthlyPaise: 149_900,
    storageBytes: 10 * GB,
    storageLabel: "10 GB",
    tagline: "Advanced management for growing teams",
    introMonthPaise: 99_900,
    introLabel: "₹999 for the 1st month only",
    features: [
      "Everything in Business",
      "Attendance",
      "Payroll",
      "Advanced reports",
      "Customer analytics",
      "Product analytics",
      "Activity trail",
      "Expense management",
      "Cash denomination",
      "Payment reminders",
      "Priority support",
      "10 GB cloud storage",
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
    storageLabel: "Higher storage on request",
    tagline: "For growing and multi-store businesses",
    features: [
      "Everything in Professional",
      "Multi-store facility",
      "Advanced business analytics",
      "Advanced staff reports",
      "Higher cloud storage (on request)",
      "Multiple-user expansion",
      "WhatsApp invoicing integrations",
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
    comingSoon: ["Loyalty / rewards program", "Gift cards / store wallet"],
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

export function formatStorageBytes(bytes: bigint | number | string): string {
  const n = Number(bytes);
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
