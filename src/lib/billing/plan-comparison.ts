import type { BillingPlan } from "@prisma/client";
import { BILLING_PLANS, PLAN_ORDER, formatINRFromPaise } from "@/lib/billing/plans";

export type ComparisonCell = boolean | string;

export type ComparisonRow = {
  id: string;
  feature: string;
  /** Per-plan cell: true = included, false = not included, string = custom label */
  values: Record<BillingPlan, ComparisonCell>;
};

export type ComparisonCategory = {
  id: string;
  name: string;
  rows: ComparisonRow[];
};

function yes(): ComparisonCell {
  return true;
}

function no(): ComparisonCell {
  return false;
}

/** Full feature matrix for public plan comparison — keep in sync with `BILLING_PLANS`. */
export const PLAN_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    id: "billing",
    name: "Billing & Sales",
    rows: [
      {
        id: "invoice-generation",
        feature: "Professional invoice generation",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "customer-management",
        feature: "Customer management",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "sales",
        feature: "Sales management",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "invoice-history",
        feature: "Invoice history",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "pdf-print",
        feature: "PDF & print invoices",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "returns",
        feature: "Returns & exchanges",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "offers",
        feature: "Offers & discounts",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "hold-bill",
        feature: "Hold bill (30 minutes)",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory & Products",
    rows: [
      {
        id: "inventory",
        feature: "Product inventory",
        values: {
          BASIC: "100 SKUs",
          BUSINESS: "200 SKUs",
          PROFESSIONAL: "Unlimited",
          BUSINESS_PRO: "Unlimited",
        },
      },
      {
        id: "barcode-scan",
        feature: "Barcode scanner",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "barcode-print",
        feature: "Barcode generation & printing",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "low-stock",
        feature: "Low-stock alerts",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "import-export",
        feature: "Excel / CSV import & export",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "purchases",
    name: "Purchases & Suppliers",
    rows: [
      {
        id: "purchases",
        feature: "Purchase management",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "suppliers",
        feature: "Supplier management",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "customers",
    name: "Customers & Credit",
    rows: [
      {
        id: "udhaar",
        feature: "Customer ledger (udhaar)",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "staff",
    name: "Staff & Payroll",
    rows: [
      {
        id: "staff",
        feature: "Staff management",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "attendance",
        feature: "Attendance tracking",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "payroll",
        feature: "Payroll",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    rows: [
      {
        id: "profit-reports",
        feature: "Profit reports",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "advanced-reports",
        feature: "Advanced reports",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: yes() },
      },
      {
        id: "customer-analytics",
        feature: "Customer analytics",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "product-analytics",
        feature: "Product analytics",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: yes() },
      },
      {
        id: "activity-trail",
        feature: "Activity trail",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "expenses",
    name: "Expenses & Cash",
    rows: [
      {
        id: "expenses",
        feature: "Business expense management",
        values: { BASIC: no(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "payment-reminders",
        feature: "Payment reminders",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: yes() },
      },
      {
        id: "cash-denomination",
        feature: "Cash denomination tracking",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "projects",
    name: "Projects & Partners",
    rows: [
      {
        id: "projects",
        feature: "Project management",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "project-expenses",
        feature: "Project-wise expenses & income",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "partners",
        feature: "Partner management",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "apps",
    name: "Apps & Storage",
    rows: [
      {
        id: "android",
        feature: "Android app (offline sync)",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "windows",
        feature: "Windows desktop app",
        values: { BASIC: yes(), BUSINESS: yes(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
      {
        id: "ios",
        feature: "iOS app",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: no() },
      },
      {
        id: "storage",
        feature: "Cloud storage",
        values: {
          BASIC: BILLING_PLANS.BASIC.storageLabel,
          BUSINESS: BILLING_PLANS.BUSINESS.storageLabel,
          PROFESSIONAL: BILLING_PLANS.PROFESSIONAL.storageLabel,
          BUSINESS_PRO: BILLING_PLANS.BUSINESS_PRO.storageLabel,
        },
      },
      {
        id: "support",
        feature: "Priority support",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: yes(), BUSINESS_PRO: yes() },
      },
    ],
  },
  {
    id: "addons",
    name: "Add-on Services (custom pricing)",
    rows: [
      {
        id: "multi-store",
        feature: "Multi-store facility",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: "Add-on", BUSINESS_PRO: "Add-on" },
      },
      {
        id: "whatsapp",
        feature: "WhatsApp invoicing",
        values: { BASIC: "Add-on", BUSINESS: "Add-on", PROFESSIONAL: "Add-on", BUSINESS_PRO: "Add-on" },
      },
      {
        id: "loyalty",
        feature: "Loyalty / rewards program",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: "Coming soon" },
      },
      {
        id: "gift-cards",
        feature: "Gift cards / store wallet",
        values: { BASIC: no(), BUSINESS: no(), PROFESSIONAL: no(), BUSINESS_PRO: "Coming soon" },
      },
    ],
  },
];

export function comparisonPlanHeaders() {
  return PLAN_ORDER.map((code) => {
    const plan = BILLING_PLANS[code];
    return {
      code,
      name: plan.name,
      price: formatINRFromPaise(plan.monthlyPaise),
      mostPopular: plan.mostPopular ?? false,
    };
  });
}

/** Whether a cell counts as included or available on a plan (check, limit label, add-on, etc.). */
export function isPlanCellAvailable(value: ComparisonCell): boolean {
  if (value === true) return true;
  if (value === false) return false;
  return value.trim().length > 0;
}

/** Row is available on every plan in the matrix. */
export function isUniversalComparisonRow(row: ComparisonRow): boolean {
  return PLAN_ORDER.every((code) => isPlanCellAvailable(row.values[code]));
}

/** Lowest plan tier index where the feature becomes available; PLAN_ORDER.length if never. */
export function minimumPlanTierIndex(row: ComparisonRow): number {
  for (let i = 0; i < PLAN_ORDER.length; i++) {
    if (isPlanCellAvailable(row.values[PLAN_ORDER[i]])) return i;
  }
  return PLAN_ORDER.length;
}

/** Sort rows: all-plan features first, then by lowest unlock tier ascending. */
export function sortComparisonRows(rows: ComparisonRow[]): ComparisonRow[] {
  return [...rows].sort((a, b) => {
    const aUniversal = isUniversalComparisonRow(a);
    const bUniversal = isUniversalComparisonRow(b);
    if (aUniversal !== bUniversal) return aUniversal ? -1 : 1;

    const tierA = minimumPlanTierIndex(a);
    const tierB = minimumPlanTierIndex(b);
    if (tierA !== tierB) return tierA - tierB;

    return a.feature.localeCompare(b.feature);
  });
}

export type ComparisonRowGroup = {
  label: string | null;
  rows: ComparisonRow[];
};

/** Split sorted rows into labeled groups for clearer section stacking in the UI. */
export function groupComparisonRows(rows: ComparisonRow[]): ComparisonRowGroup[] {
  const sorted = sortComparisonRows(rows);
  const universal = sorted.filter(isUniversalComparisonRow);
  const tiered = sorted.filter((row) => !isUniversalComparisonRow(row) && minimumPlanTierIndex(row) < PLAN_ORDER.length);
  const unavailable = sorted.filter(
    (row) => !isUniversalComparisonRow(row) && minimumPlanTierIndex(row) >= PLAN_ORDER.length
  );

  const groups: ComparisonRowGroup[] = [];
  if (universal.length > 0) {
    groups.push({ label: "Included on all plans", rows: universal });
  }
  if (tiered.length > 0) {
    groups.push({ label: "Unlocks on higher plans", rows: tiered });
  }
  if (unavailable.length > 0) {
    groups.push({ label: null, rows: unavailable });
  }
  return groups;
}

export function getSortedPlanComparisonCategories(): ComparisonCategory[] {
  return PLAN_COMPARISON_CATEGORIES.map((category) => ({
    ...category,
    rows: sortComparisonRows(category.rows),
  }));
}
