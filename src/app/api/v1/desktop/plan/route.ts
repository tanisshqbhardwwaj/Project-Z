import { handleApi, apiSuccess, getAuthContext, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import { getPlanDefinition, formatStorageBytes } from "@/lib/billing/plans";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    const planDef = getPlanDefinition(org.plan);
    return apiSuccess(
      serializeBigInt({
        plan: org.plan,
        planName: planDef.name,
        subscriptionStatus: org.subscriptionStatus,
        storageQuotaBytes: org.storageQuotaBytes,
        storageUsedBytes: org.storageUsedBytes,
        storageQuotaLabel: formatStorageBytes(org.storageQuotaBytes),
        storageUsedLabel: formatStorageBytes(org.storageUsedBytes),
        cloudEnabled: subscriptionAllowsCloudSync(org.subscriptionStatus),
        currentPeriodEnd: org.currentPeriodEnd,
      })
    );
  });
}
