import type { BusinessType, OrgRole, SubscriptionStatus } from "@prisma/client";
import { isShopVertical } from "@/lib/org/business-type";

const NUDGE_STATUSES: SubscriptionStatus[] = ["TRIAL", "PAST_DUE", "PENDING_PAYMENT"];

export function shouldShowBillingInSidebar(input: {
  role: OrgRole | string | null;
  businessType: BusinessType | null;
  subscriptionStatus: SubscriptionStatus | null;
}): boolean {
  if (input.role !== "OWNER") return false;
  if (!input.businessType || !isShopVertical(input.businessType)) return false;
  if (!input.subscriptionStatus) return false;
  return NUDGE_STATUSES.includes(input.subscriptionStatus);
}

export function billingNudgeBadge(
  subscriptionStatus: SubscriptionStatus | null
): string | undefined {
  if (subscriptionStatus === "TRIAL") return "Trial";
  if (subscriptionStatus === "PAST_DUE") return "Past due";
  if (subscriptionStatus === "PENDING_PAYMENT") return "Payment due";
  return undefined;
}
