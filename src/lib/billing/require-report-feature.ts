import type { BillingPlan } from "@prisma/client";

import type { ReportFeatureId } from "@/lib/billing/report-entitlements";

import { requireEntitledReportFeature } from "@/lib/billing/entitlement-engine";



export async function requireReportFeature(

  organizationId: string,

  feature: ReportFeatureId

): Promise<BillingPlan> {

  return requireEntitledReportFeature(organizationId, feature);

}

