import { Receipt, FilePlus2 } from "lucide-react";

const PROJECT_DETAIL = /^\/projects\/(?!new(?:\/|$))([^/]+)/;

export type MobileQuickAction = {
  href: string;
  label: string;
  ariaLabel: string;
  Icon: typeof Receipt;
};

/** Context-aware mobile + button: expense inside a work order, new WO on dashboard/list. */
export function getMobileQuickAction(pathname: string): MobileQuickAction {
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
      label: "Work order",
      ariaLabel: "New work order",
      Icon: FilePlus2,
    };
  }

  return {
    href: "/work-orders/new",
    label: "Work order",
    ariaLabel: "New work order",
    Icon: FilePlus2,
  };
}
