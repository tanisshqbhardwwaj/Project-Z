import type { BillingPlan } from "@prisma/client";
import { BILLING_PLANS, PLAN_ORDER } from "@/lib/billing/plans";

/** Report features aligned with `plan-comparison.ts` row ids. */
export type ReportFeatureId =
  | "profit-reports"
  | "customer-analytics"
  | "product-analytics"
  | "advanced-reports"
  | "activity-trail"
  | "cash-denomination"
  | "payment-reminders";

const REPORT_FEATURE_MIN_PLAN: Record<ReportFeatureId, BillingPlan> = {
  "profit-reports": "BUSINESS",
  "activity-trail": "BUSINESS",
  "customer-analytics": "PROFESSIONAL",
  "product-analytics": "BUSINESS_PRO",
  "advanced-reports": "BUSINESS_PRO",
  "cash-denomination": "PROFESSIONAL",
  "payment-reminders": "BUSINESS_PRO",
};

export function planMeetsMinimum(
  current: BillingPlan,
  minimum: BillingPlan
): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(minimum);
}

export function canAccessReportFeature(
  plan: BillingPlan | null | undefined,
  feature: ReportFeatureId
): boolean {
  if (!plan) return false;
  return planMeetsMinimum(plan, REPORT_FEATURE_MIN_PLAN[feature]);
}

export function minimumPlanForReportFeature(
  feature: ReportFeatureId
): BillingPlan {
  return REPORT_FEATURE_MIN_PLAN[feature];
}

export function minimumPlanLabelForReportFeature(
  feature: ReportFeatureId
): string {
  return BILLING_PLANS[REPORT_FEATURE_MIN_PLAN[feature]].name;
}

export function reportFeatureLabel(feature: ReportFeatureId): string {
  const labels: Record<ReportFeatureId, string> = {
    "profit-reports": "Profit reports",
    "customer-analytics": "Customer analytics",
    "product-analytics": "Product analytics",
    "advanced-reports": "Advanced reports",
    "activity-trail": "Activity trail",
    "cash-denomination": "Cash denomination tracking",
    "payment-reminders": "Payment reminders",
  };
  return labels[feature];
}

export function reportFeatureMinPlan(feature: ReportFeatureId): BillingPlan {
  return REPORT_FEATURE_MIN_PLAN[feature];
}
