import { z } from "zod";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  activatePlanAfterPayment,
  markSetupFeePaid,
  reactivateOrganization,
  updateOrgBillingFromOps,
} from "@/services/billing.service";
import { getOpsOrganizationDetail } from "@/services/ops.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const { id } = await params;
    const detail = await getOpsOrganizationDetail(id);
    return apiSuccess(serializeBigInt(detail));
  });
}

const patchSchema = z.object({
  plan: z.enum(["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"]).optional(),
  subscriptionStatus: z
    .enum(["TRIAL", "PENDING_PAYMENT", "ACTIVE", "PAST_DUE", "CANCELLED"])
    .optional(),
  storageQuotaBytes: z.string().optional(),
  setupFeeStatus: z.enum(["UNPAID", "PAID", "WAIVED"]).optional(),
  onboardingComplete: z.boolean().optional(),
  activatePlan: z.boolean().optional(),
  reactivate: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  return handleApi(async () => {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    if (body.reactivate && body.plan) {
      const org = await reactivateOrganization({
        organizationId: id,
        plan: body.plan,
        actorUserId: admin.userId,
        storageQuotaBytes: body.storageQuotaBytes
          ? BigInt(body.storageQuotaBytes)
          : undefined,
      });
      return apiSuccess(serializeBigInt(org));
    }

    if (body.activatePlan && body.plan) {
      const org = await activatePlanAfterPayment(id, body.plan, admin.userId, {
        provider: "manual",
      }, {
        storageQuotaBytes: body.storageQuotaBytes
          ? BigInt(body.storageQuotaBytes)
          : undefined,
      });
      return apiSuccess(serializeBigInt(org));
    }

    if (body.setupFeeStatus) {
      await markSetupFeePaid({
        organizationId: id,
        actorUserId: admin.userId,
        status: body.setupFeeStatus,
      });
    }

    const org = await updateOrgBillingFromOps({
      organizationId: id,
      actorUserId: admin.userId,
      plan: body.plan,
      subscriptionStatus: body.subscriptionStatus,
      storageQuotaBytes: body.storageQuotaBytes ? BigInt(body.storageQuotaBytes) : undefined,
      setupFeeStatus: body.setupFeeStatus,
      onboardingComplete: body.onboardingComplete,
    });

    return apiSuccess(serializeBigInt(org));
  });
}
