import type { BusinessType } from "@prisma/client";

export type { BusinessType };

export const BUSINESS_TYPES = [
  "CONTRACTOR",
  "ARCHITECT",
  "SHOPKEEPER",
  "SERVICE",
] as const satisfies readonly BusinessType[];

export type BusinessTypeConfig = {
  id: BusinessType;
  label: string;
  description: string;
  /** Nav + list title for the main work items */
  workItemPlural: string;
  workItemSingular: string;
  workItemSingularLower: string;
  newWorkItemLabel: string;
  uploadWorkItemLabel: string;
  manualCreateLabel: string;
  contractTotalLabel: string;
  activeCountLabel: string;
  recentListLabel: string;
  emptyActiveMessage: string;
  emptyCompletedMessage: string;
  partnerLabel: string;
  partnerPluralLabel: string;
  teamHint: string;
  onboardingBlurb: string;
  showDocumentUpload: boolean;
  showManualCreate: boolean;
  showPartners: boolean;
  expenseCategories: string[];
};

const CONSTRUCTION_CATEGORIES = [
  "Paint",
  "Labour",
  "Material",
  "Transport",
  "Equipment",
  "Electricity",
  "Food",
  "Accommodation",
  "Fuel",
  "Tools",
  "Contractor",
  "Miscellaneous",
];

const ARCHITECT_CATEGORIES = [
  "Design fees",
  "Site visit",
  "Printing",
  "Software",
  "Labour",
  "Material",
  "Transport",
  "Consultant",
  "Miscellaneous",
];

const SHOP_CATEGORIES = [
  "Purchase",
  "Inventory",
  "Rent",
  "Utilities",
  "Packaging",
  "Delivery",
  "Staff wages",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];

const SERVICE_CATEGORIES = [
  "Consumables",
  "Rent",
  "Utilities",
  "Staff wages",
  "Marketing",
  "Travel",
  "Miscellaneous",
];

/** Shop-style verticals: retail, service business, etc. */
export function isShopVertical(
  type: BusinessType | string | null | undefined
): boolean {
  return type === "SHOPKEEPER" || type === "SERVICE";
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  CONTRACTOR: {
    id: "CONTRACTOR",
    label: "Contractor",
    description: "Civil / electrical / finishing work orders and partner splits",
    workItemPlural: "Work Orders",
    workItemSingular: "Work Order",
    workItemSingularLower: "work order",
    newWorkItemLabel: "New Work Order",
    uploadWorkItemLabel: "Upload Work Order",
    manualCreateLabel: "Manual Project",
    contractTotalLabel: "Total Contract",
    activeCountLabel: "Active Work Orders",
    recentListLabel: "Recent Work Orders",
    emptyActiveMessage: "No active work orders.",
    emptyCompletedMessage: "No completed work orders yet.",
    partnerLabel: "Partner",
    partnerPluralLabel: "Partners",
    teamHint:
      "Org-level access. To add partners to a specific work order, use the Partners button on that project.",
    onboardingBlurb: "Manage work orders, expenses, vendors, and partner settlements",
    showDocumentUpload: true,
    showManualCreate: true,
    showPartners: true,
    expenseCategories: CONSTRUCTION_CATEGORIES,
  },
  ARCHITECT: {
    id: "ARCHITECT",
    label: "Architect",
    description: "Design projects, client fees, and collaborator splits",
    workItemPlural: "Projects",
    workItemSingular: "Project",
    workItemSingularLower: "project",
    newWorkItemLabel: "New Project",
    uploadWorkItemLabel: "Upload Contract",
    manualCreateLabel: "Manual Project",
    contractTotalLabel: "Total Fees",
    activeCountLabel: "Active Projects",
    recentListLabel: "Recent Projects",
    emptyActiveMessage: "No active projects.",
    emptyCompletedMessage: "No completed projects yet.",
    partnerLabel: "Collaborator",
    partnerPluralLabel: "Collaborators",
    teamHint:
      "Org-level access. To add collaborators to a specific project, use the Partners button on that project.",
    onboardingBlurb: "Track design projects, fees, expenses, and collaborator shares",
    showDocumentUpload: true,
    showManualCreate: true,
    showPartners: true,
    expenseCategories: ARCHITECT_CATEGORIES,
  },
  SHOPKEEPER: {
    id: "SHOPKEEPER",
    label: "Retail Store Management",
    description: "Retail sales, inventory, purchases, expenses, and co-owner shares",
    workItemPlural: "Orders",
    workItemSingular: "Order",
    workItemSingularLower: "order",
    newWorkItemLabel: "New Order",
    uploadWorkItemLabel: "Upload Bill / Order",
    manualCreateLabel: "Manual Order",
    contractTotalLabel: "Total Order Value",
    activeCountLabel: "Active Orders",
    recentListLabel: "Recent Orders",
    emptyActiveMessage: "No active orders.",
    emptyCompletedMessage: "No completed orders yet.",
    partnerLabel: "Co-owner",
    partnerPluralLabel: "Co-owners",
    teamHint:
      "Add people from Staff. Each person only sees what you enable on their profile — attendance, billing, or both.",
    onboardingBlurb: "Track orders, purchases, expenses, and co-owner shares",
    showDocumentUpload: true,
    showManualCreate: true,
    showPartners: true,
    expenseCategories: SHOP_CATEGORIES,
  },
  SERVICE: {
    id: "SERVICE",
    label: "Service Business",
    description: "Salon, repairs, consulting — services, staff, and billing",
    workItemPlural: "Bookings",
    workItemSingular: "Booking",
    workItemSingularLower: "booking",
    newWorkItemLabel: "New Booking",
    uploadWorkItemLabel: "Upload Invoice",
    manualCreateLabel: "Manual Booking",
    contractTotalLabel: "Total Service Value",
    activeCountLabel: "Active Bookings",
    recentListLabel: "Recent Bookings",
    emptyActiveMessage: "No active bookings.",
    emptyCompletedMessage: "No completed bookings yet.",
    partnerLabel: "Co-owner",
    partnerPluralLabel: "Co-owners",
    teamHint:
      "Add people from Staff. Each person only sees what you enable on their profile — attendance, billing, or both.",
    onboardingBlurb: "Bill services, track staff, expenses, and customer credit",
    showDocumentUpload: false,
    showManualCreate: false,
    showPartners: true,
    expenseCategories: SERVICE_CATEGORIES,
  },
};

export function getBusinessTypeConfig(
  type: BusinessType | string | null | undefined
): BusinessTypeConfig {
  if (type && type in BUSINESS_TYPE_CONFIG) {
    return BUSINESS_TYPE_CONFIG[type as BusinessType];
  }
  return BUSINESS_TYPE_CONFIG.CONTRACTOR;
}

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && BUSINESS_TYPES.includes(value as BusinessType);
}
