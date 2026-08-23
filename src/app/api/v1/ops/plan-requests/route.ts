import { z } from "zod";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import {
  approvePlanRequest,
  listPendingPlanRequests,
  rejectPlanRequest,
} from "@/services/billing.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET() {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const items = await listPendingPlanRequests();
    return apiSuccess(serializeBigInt(items));
  });
}

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  requestId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  storageQuotaBytes: z.string().optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requirePlatformAdmin();
    const body = actionSchema.parse(await request.json());

    if (body.action === "approve") {
      const org = await approvePlanRequest({
        requestId: body.requestId,
        reviewerId: admin.userId,
        payment: { provider: "manual" },
        storageQuotaBytes: body.storageQuotaBytes
          ? BigInt(body.storageQuotaBytes)
          : undefined,
      });
      return apiSuccess(serializeBigInt(org));
    }

    const req = await rejectPlanRequest({
      requestId: body.requestId,
      reviewerId: admin.userId,
      reason: body.reason,
    });
    return apiSuccess(serializeBigInt(req));
  });
}
