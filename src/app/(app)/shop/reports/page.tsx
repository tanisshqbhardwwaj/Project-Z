"use client";

import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import { ReportsHub } from "@/components/shop/reports-hub";

export default function ShopReportsPage() {
  const { enabledModules } = useAuthStore();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const expensesEnabled = isModuleEnabled(enabledModules, "shop_expenses");
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const activityEnabled = isModuleEnabled(enabledModules, "shop_activity");

  const canAccess =
    role &&
    (hasPermission(role, "shop.sales") || hasPermission(role, "shop.profit.view")) &&
    (salesEnabled || expensesEnabled || inventoryEnabled || activityEnabled);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Reports unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enable shop modules and ensure your role has sales or profit access.
        </p>
      </div>
    );
  }

  return <ReportsHub />;
}
