import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
  requireOwner,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getOrgBillingSnapshot, billingModulesForOrg } from "@/services/billing.service";
import { getPlanDefinition, formatStorageBytes, formatINRFromPaise } from "@/lib/billing/plans";
import { getStorageUsageBreakdown } from "@/services/storage-quota.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    requireOwner(ctx);

    const org = await getOrgBillingSnapshot(ctx.organizationId);
    const planDef = getPlanDefinition(org.plan);
    const storage = await getStorageUsageBreakdown(ctx.organizationId);
    const enabledModules = billingModulesForOrg(org);

    return apiSuccess(
      serializeBigInt({
        organizationId: org.id,
        organizationName: org.name,
        plan: org.plan,
        planName: planDef.name,
        monthlyPaise: planDef.monthlyPaise,
        monthlyLabel: formatINRFromPaise(planDef.monthlyPaise),
        subscriptionStatus: org.subscriptionStatus,
<<<<<<< HEAD
        storageQuotaBytes: storage.quotaBytes,
        storageUsedBytes: storage.usedBytes,
        storageQuotaLabel: formatStorageBytes(storage.quotaBytes),
        storageUsedLabel: formatStorageBytes(storage.usedBytes),
=======
        storageQuotaBytes: org.storageQuotaBytes,
        storageUsedBytes: org.storageUsedBytes,
        storageQuotaLabel: formatStorageBytes(org.storageQuotaBytes),
        storageUsedLabel: formatStorageBytes(org.storageUsedBytes),
>>>>>>> origin/master
        storageBreakdown: storage,
        billingCycle: org.billingCycle,
        currentPeriodEnd: org.currentPeriodEnd,
        setupFeePaise: org.setupFeePaise,
        setupFeeStatus: org.setupFeeStatus,
        earlyBirdSetup: org.earlyBirdSetup,
        cancelledAt: org.cancelledAt,
        cancelReason: org.cancelReason,
        pendingRequest: org.planRequests[0] ?? null,
        enabledModules,
      })
    );
  });
}
