import { handleApi, apiSuccess, getAuthContext, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import { getPlanDefinition, formatStorageBytes } from "@/lib/billing/plans";
import { serializeBigInt } from "@/lib/db/prisma";
<<<<<<< HEAD
import { getStorageUsageBreakdown } from "@/services/storage-quota.service";
=======
>>>>>>> origin/master

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    const planDef = getPlanDefinition(org.plan);
<<<<<<< HEAD
    const storage = await getStorageUsageBreakdown(ctx.organizationId);
=======
>>>>>>> origin/master
    return apiSuccess(
      serializeBigInt({
        plan: org.plan,
        planName: planDef.name,
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
        cloudEnabled: subscriptionAllowsCloudSync(org.subscriptionStatus),
        currentPeriodEnd: org.currentPeriodEnd,
      })
    );
  });
}
