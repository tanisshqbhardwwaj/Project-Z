import type { BusinessType } from "@prisma/client";

export type { BusinessType };

export const BUSINESS_TYPES = [
  "CONTRACTOR",
  "ARCHITECT",
  "BUILDER",
  "SHOPKEEPER",
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
  BUILDER: {
    id: "BUILDER",
    label: "Builder",
    description: "Site projects, budgets, vendors, and partner accounting",
    workItemPlural: "Sites",
    workItemSingular: "Site",
    workItemSingularLower: "site",
    newWorkItemLabel: "New Site",
    uploadWorkItemLabel: "Upload Site Order",
    manualCreateLabel: "Manual Site",
    contractTotalLabel: "Total Contract",
    activeCountLabel: "Active Sites",
    recentListLabel: "Recent Sites",
    emptyActiveMessage: "No active sites.",
    emptyCompletedMessage: "No completed sites yet.",
    partnerLabel: "Partner",
    partnerPluralLabel: "Partners",
    teamHint:
      "Org-level access. To add partners to a specific site, use the Partners button on that project.",
    onboardingBlurb: "Manage sites, budgets, vendors, and partner settlements",
    showDocumentUpload: true,
    showManualCreate: true,
    showPartners: true,
    expenseCategories: CONSTRUCTION_CATEGORIES,
  },
  SHOPKEEPER: {
    id: "SHOPKEEPER",
    label: "Shopkeeper",
    description: "Shop orders, purchases, expenses, and co-owner shares",
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
      "Org-level access. To add co-owners to a specific order, use the Partners button on that order.",
    onboardingBlurb: "Track orders, purchases, expenses, and co-owner shares",
    showDocumentUpload: true,
    showManualCreate: true,
    showPartners: true,
    expenseCategories: SHOP_CATEGORIES,
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
