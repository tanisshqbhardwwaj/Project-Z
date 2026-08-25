"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { enabledNavModules, moduleLabel } from "@/lib/org/modules";
import type { BusinessType } from "@/lib/org/business-type";
import { hasPermission } from "@/lib/permissions/rbac";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import type { OrgRole } from "@prisma/client";

export function useModuleNav() {
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const shopSector = useAuthStore((s) => s.activeShopSector);
  const enabledModules = useAuthStore((s) => s.enabledModules);
  const role = useAuthStore((s) => s.role);
  const linkedStaffId = useAuthStore((s) => s.linkedStaffId);
  const linkedStaffCanViewAttendance = useAuthStore(
    (s) => s.linkedStaffCanViewAttendance
  );

  return useMemo(() => {
    if (!businessType) return [];
    const modules = enabledNavModules({
      businessType,
      shopSector,
      enabledModules,
      role: role as OrgRole | null,
    }).map((m) => ({
      href: m.route,
      icon: m.icon,
      label: moduleLabel(m.key, businessType as BusinessType),
      key: m.key,
    }));

    const canViewOwnAttendance =
      linkedStaffId &&
      role &&
      (hasPermission(role as OrgRole, "attendance.view_own") ||
        linkedStaffCanViewAttendance);

    if (
      canViewOwnAttendance &&
      isModuleEnabled(enabledModules, "staff")
    ) {
      modules.push({
        href: "/staff/me",
        icon: CalendarDays,
        label: "My Attendance",
        key: "staff_me" as never,
      });
    }

    return modules;
  }, [
    businessType,
    shopSector,
    enabledModules,
    role,
    linkedStaffId,
    linkedStaffCanViewAttendance,
  ]);
}
