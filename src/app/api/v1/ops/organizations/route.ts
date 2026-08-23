import { z } from "zod";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import { listOpsOrganizations } from "@/services/billing.service";
import { serializeBigInt } from "@/lib/db/prisma";
import type { BillingPlan, SubscriptionStatus } from "@prisma/client";

const querySchema = z.object({
  q: z.string().optional(),
  plan: z.enum(["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"]).optional(),
  status: z
    .enum(["TRIAL", "PENDING_PAYMENT", "ACTIVE", "PAST_DUE", "CANCELLED"])
    .optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const result = await listOpsOrganizations({
      q: q.q,
      plan: q.plan as BillingPlan | undefined,
      status: q.status as SubscriptionStatus | undefined,
      skip: q.skip,
      take: q.take,
    });
    return apiSuccess(serializeBigInt(result));
  });
}
