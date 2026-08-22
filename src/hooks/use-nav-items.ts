"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ScanBarcode,
  Bell,
  User,
  type LucideIcon,
} from "lucide-react";
import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessType } from "@/hooks/use-business-type";
import { useModuleNav } from "@/hooks/use-module-nav";
import { canAccessProjectsNav } from "@/lib/permissions/rbac";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";

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
  const moduleNav = useModuleNav();
  const isShopkeeper = activeBusinessType === "SHOPKEEPER";
  const showProjects =
    role && !isShopkeeper ? canAccessProjectsNav(role) : false;
  const showDashboard =
    (role && canAccessProjectsNav(role)) || isShopkeeper;

  return useMemo(() => {
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

    const modules: NavItem[] = moduleNav.map((m) => ({
      href: m.href,
      icon: m.icon,
      label: m.label,
      key: String(m.key),
    }));

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
  }, [showDashboard, showProjects, biz.workItemPlural, moduleNav, isShopkeeper, enabledModules]);
}
