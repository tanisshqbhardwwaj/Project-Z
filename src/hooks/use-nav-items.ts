"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ScanBarcode,
  Bell,
  User,
  CreditCard,
  Cloud,
  Shield,
  Tag,
  RotateCcw,
  Users,
  BarChart3,
  Building2,
  UsersRound,
  CalendarDays,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessType } from "@/hooks/use-business-type";
import { useModuleNav } from "@/hooks/use-module-nav";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { isShopVertical } from "@/lib/org/business-type";
import { isServiceVerticalEnabled } from "@/lib/org/service-vertical";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";
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
  const activeShopSector = useAuthStore((s) => s.activeShopSector);
  const activeOrgSettings = useAuthStore((s) => s.activeOrgSettings);
  const enabledModules = useAuthStore((s) => s.enabledModules);
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin);
  const moduleNav = useModuleNav();
  const { active: cashierMode, navItems: cashierNav } = useCashierMode();
  const isShopVerticalOrg = isShopVertical(activeBusinessType);
  const isServiceOrg = activeBusinessType === "SERVICE" && isServiceVerticalEnabled();
  const shopSectors = resolveShopBusinessTypes(activeOrgSettings?.shop, activeShopSector);
  const isRestaurantSector = shopSectors.includes("RESTAURANT");
  const showProjects =
    role && !isShopVerticalOrg ? canAccessProjectsNav(role) : false;
  const showDashboard =
    (role && canAccessProjectsNav(role)) || isShopVerticalOrg;

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
        isShopVerticalOrg &&
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
        modules.push({
          href: "/shop/returns",
          icon: RotateCcw,
          label: "Returns",
          key: "shop_returns",
        });
        modules.push({
          href: isServiceOrg ? "/shop/customers" : "/shop/customers",
          icon: Users,
          label: "Customers",
          key: "shop_customers",
        });
        if (hasPermission(role, "shop.sales") || hasPermission(role, "shop.profit.view")) {
          modules.push({
            href: "/shop/reports",
            icon: BarChart3,
            label: "Reports",
            key: "shop_reports",
          });
        }
      }

      if (
        isServiceOrg &&
        m.key === "service_appointments" &&
        isModuleEnabled(enabledModules, "service_appointments") &&
        role &&
        hasPermission(role, "service.appointments.manage")
      ) {
        modules.push({
          href: "/service/appointments/new",
          icon: CalendarDays,
          label: "New booking",
          key: "service_new_booking",
        });
      }

      if (
        isServiceOrg &&
        m.key === "deliveries" &&
        isModuleEnabled(enabledModules, "deliveries") &&
        role &&
        hasPermission(role, "delivery.view_own")
      ) {
        modules.push({
          href: "/deliveries/me",
          icon: MapPin,
          label: "My deliveries",
          key: "deliveries_me",
        });
      }
    }

    const tools: NavItem[] = [];

    if (
      isShopVerticalOrg &&
      !isServiceOrg &&
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

    if (
      isRestaurantSector &&
      isModuleEnabled(enabledModules, "deliveries") &&
      role &&
      hasPermission(role, "delivery.manage")
    ) {
      tools.push({
        href: "/deliveries",
        icon: MapPin,
        label: "Delivery board",
        key: "delivery_board",
      });
    }

    if (role === "OWNER") {
      tools.push({
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
    isShopVerticalOrg,
    isServiceOrg,
    isRestaurantSector,
    enabledModules,
    role,
    isPlatformAdmin,
    activeOrgSettings,
    activeShopSector,
  ]);
}
