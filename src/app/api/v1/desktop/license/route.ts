import { handleApi, apiSuccess, getAuthContext, ApiError } from "@/lib/api/context";
import { subscriptionAllowsProductUse } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { subscriptionStatus: true, plan: true, cancelledAt: true },
    });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    const licensed = subscriptionAllowsProductUse(org.subscriptionStatus);
    return apiSuccess({
      licensed,
      subscriptionStatus: org.subscriptionStatus,
      plan: org.plan,
      cancelledAt: org.cancelledAt,
    });
  });
}
