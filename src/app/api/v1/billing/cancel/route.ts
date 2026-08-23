import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
  requireOwner,
  ApiError,
} from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { cancelOrganizationSubscription } from "@/services/billing.service";

const schema = z.object({
  confirmName: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);

    const body = schema.parse(await request.json());
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, subscriptionStatus: true },
    });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    if (org.subscriptionStatus === "CANCELLED") {
      throw new ApiError(400, "ALREADY_CANCELLED", "Already cancelled.");
    }
    if (body.confirmName.trim() !== org.name.trim()) {
      throw new ApiError(400, "CONFIRM_MISMATCH", "Organization name does not match.");
    }

    await cancelOrganizationSubscription({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      reason: body.reason,
    });

    return apiSuccess({ cancelled: true });
  });
}
