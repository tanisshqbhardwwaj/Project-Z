import type { OrgRole } from "@prisma/client";
import { isShopVertical } from "@/lib/org/business-type";

/** Shop/service non-owners (and any CASHIER) are gated by staff toggles, not RBAC. */
export function shopStaffAccessApplies(input: {
  role: OrgRole | null | undefined;
  businessType?: string | null;
}): boolean {
  if (!input.role || input.role === "OWNER") return false;
  if (isShopVertical(input.businessType)) return true;
  return input.role === "CASHIER";
}

export const SHOP_STAFF_ONLY_INVITE_MESSAGE =
  "Add people from Staff. Organization Team invites are not used for store management.";

/** Org-team POST/link is blocked for shop verticals unless the Staff login path created it. */
export function canCreateOrgTeamInvite(
  businessType: string | null | undefined,
  fromStaff = false
): boolean {
  if (fromStaff) return true;
  return !isShopVertical(businessType);
}
