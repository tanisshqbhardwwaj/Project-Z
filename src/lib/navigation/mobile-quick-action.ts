import { Receipt, FilePlus2 } from "lucide-react";
import type { BusinessTypeConfig } from "@/lib/org/business-type";
import { getBusinessTypeConfig } from "@/lib/org/business-type";

const PROJECT_DETAIL = /^\/projects\/(?!new(?:\/|$))([^/]+)/;

export type MobileQuickAction = {
  href: string;
  label: string;
  ariaLabel: string;
  Icon: typeof Receipt;
};

/** Context-aware mobile + button: expense inside a work item, new item on dashboard/list. */
export function getMobileQuickAction(
  pathname: string,
  biz: BusinessTypeConfig = getBusinessTypeConfig("CONTRACTOR")
): MobileQuickAction {
  const projectMatch = pathname.match(PROJECT_DETAIL);
  if (projectMatch) {
    const projectId = projectMatch[1];
    return {
      href: `/expenses/new?projectId=${projectId}`,
      label: "Expense",
      ariaLabel: "Add expense",
      Icon: Receipt,
    };
  }

  if (
    pathname === "/dashboard" ||
    pathname === "/projects" ||
    pathname.startsWith("/work-orders")
  ) {
    return {
      href: "/work-orders/new",
      label: biz.workItemSingular,
      ariaLabel: biz.newWorkItemLabel,
      Icon: FilePlus2,
    };
  }

  return {
    href: "/work-orders/new",
    label: biz.workItemSingular,
    ariaLabel: biz.newWorkItemLabel,
    Icon: FilePlus2,
  };
}
