"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ScanBarcode,
  Bell,
  User,
  CreditCard,
<<<<<<< HEAD
  Cloud,
  Shield,
  Tag,
  RotateCcw,
  Users,
  Building2,
  UsersRound,
=======
  Shield,
  Tag,
>>>>>>> origin/master
  type LucideIcon,
} from "lucide-react";
import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessType } from "@/hooks/use-business-type";
import { useModuleNav } from "@/hooks/use-module-nav";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { canAccessProjectsNav, hasPermission } from "@/lib/permissions/rbac";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { CASHIER_HOME_ICON } from "@/lib/staff/cashier-mode";

export type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  key: string;
};

export type NavGroups = {
  core: NavItem[];
  modules: NavItem[];
  tools: NavItem[];
  showProjects: boolean;
};

export function useNavGroups(): NavGroups {
  const biz = useBusinessType();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  const enabledModules = useAuthStore((s) => s.enabledModules);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin);
  const moduleNav = useModuleNav();
  const { active: cashierMode, navItems: cashierNav } = useCashierMode();
  const isShopkeeper = activeBusinessType === "SHOPKEEPER";
  const showProjects =
    role && !isShopkeeper ? canAccessProjectsNav(role) : false;
  const showDashboard =
    (role && canAccessProjectsNav(role)) || isShopkeeper;

  return useMemo(() => {
    if (cashierMode) {
      const modules: NavItem[] = [
        {
          href: "/cashier",
          icon: CASHIER_HOME_ICON,
          label: "Cashier home",
          key: "cashier_home",
        },
        ...cashierNav.map((item) => ({
          href: item.href,
          icon: item.icon,
          label: item.label,
          key: item.key,
        })),
      ];
      return { core: [], modules, tools: [], showProjects: false };
    }

    const core: NavItem[] = [];

    if (showDashboard) {
      core.push({
        href: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        key: "dashboard",
      });
    }

    if (showProjects) {
      core.push({
        href: "/projects",
        icon: FolderKanban,
        label: biz.workItemPlural,
        key: "projects",
      });
    }

    const modules: NavItem[] = [];
    for (const m of moduleNav) {
      modules.push({
        href: m.href,
        icon: m.icon,
        label: m.label,
        key: String(m.key),
      });
      if (
        m.key === "shop_sales" &&
        isShopkeeper &&
        isModuleEnabled(enabledModules, "shop_sales") &&
        role &&
        hasPermission(role, "shop.sales")
      ) {
        modules.push({
          href: "/shop/offers",
          icon: Tag,
          label: "Offers",
          key: "shop_offers",
        });
<<<<<<< HEAD
        modules.push({
          href: "/shop/returns",
          icon: RotateCcw,
          label: "Returns",
          key: "shop_returns",
        });
        modules.push({
          href: "/shop/customers",
          icon: Users,
          label: "Customers",
          key: "shop_customers",
        });
=======
>>>>>>> origin/master
      }
    }

    const tools: NavItem[] = [];

    if (
      isShopkeeper &&
      (isModuleEnabled(enabledModules, "shop_sales") ||
        isModuleEnabled(enabledModules, "shop_inventory"))
    ) {
      tools.push({
        href: "/shop/scan",
        icon: ScanBarcode,
        label: "Scan",
        key: "scan",
      });
    }

    if (role === "OWNER") {
      tools.push({
<<<<<<< HEAD
        href: "/settings/organization",
        icon: Building2,
        label: "Organization",
        key: "organization",
      });
      tools.push({
        href: "/settings/members",
        icon: UsersRound,
        label: "Members",
        key: "members",
      });
      tools.push({
        href: "/settings/storage",
        icon: Cloud,
        label: "Storage & Sync",
        key: "storage",
      });
      tools.push({
=======
>>>>>>> origin/master
        href: "/settings/billing",
        icon: CreditCard,
        label: "Billing",
        key: "billing",
      });
    }

    if (isPlatformAdmin) {
      tools.push({
        href: "/ops",
        icon: Shield,
        label: "Ops",
        key: "ops",
      });
    }

    tools.push(
      {
        href: "/notifications",
        icon: Bell,
        label: "Notifications",
        key: "notifications",
      },
      { href: "/settings/profile", icon: User, label: "Profile", key: "profile" }
    );

    return { core, modules, tools, showProjects };
  }, [
    cashierMode,
    cashierNav,
    showDashboard,
    showProjects,
    biz.workItemPlural,
    moduleNav,
    isShopkeeper,
    enabledModules,
    role,
    isPlatformAdmin,
  ]);
}
