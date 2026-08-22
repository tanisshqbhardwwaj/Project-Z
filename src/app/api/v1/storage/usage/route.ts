import { handleApi, apiSuccess, getAuthContext, requireOwner, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import { getStorageUsageBreakdown } from "@/services/storage-quota.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { getPlanDefinition } from "@/lib/billing/plans";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    requireOwner(ctx);
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    const usage = await getStorageUsageBreakdown(ctx.organizationId);
    const planDef = getPlanDefinition(org.plan);
    return apiSuccess(
      serializeBigInt({
        ...usage,
        plan: org.plan,
        planName: planDef.name,
        cloudEnabled: subscriptionAllowsCloudSync(org.subscriptionStatus),
      })
    );
  });
}
