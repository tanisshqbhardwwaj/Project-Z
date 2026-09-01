import type { AuthContext } from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";

/** Counter staff must not receive customer PII on sales APIs. */
export function shouldRedactSaleCustomerDetails(ctx: AuthContext): boolean {
  if (ctx.role === "OWNER") return false;
  if (!shopStaffAccessApplies(ctx)) return false;
  if (hasPermission(ctx.role, "shop.sales")) return false;
  return true;
}

export function redactSaleCustomerFields<
  T extends {
    customerName?: string | null;
    customerPhone?: string | null;
    customerGstin?: string | null;
    customerId?: string | null;
  },
>(sale: T): T {
  return {
    ...sale,
    customerName: null,
    customerPhone: null,
    customerGstin: null,
    customerId: null,
  };
}
