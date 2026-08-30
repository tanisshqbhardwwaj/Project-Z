import { z } from "zod";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  activatePlanAfterPayment,
  cancelOrganizationSubscription,
  markSetupFeePaid,
  reactivateOrganization,
  updateOrgBillingFromOps,
} from "@/services/billing.service";
import { grantOrgAddon, revokeOrgAddon } from "@/lib/billing/org-addon.service";
import { getOpsOrganizationDetail, updateOpsOrganizationModules } from "@/services/ops.service";

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
  accessExpiresAt: z.string().datetime().nullable().optional(),
  extendPeriodDays: z.number().int().min(1).max(365).optional(),
  suspend: z.boolean().optional(),
  settings: z
    .object({
      modules: z.record(z.string(), z.boolean()).optional(),
    })
    .optional(),
  grantAddon: z
    .object({
      addonKey: z.string().min(1).max(80),
      quantity: z.number().int().min(1).max(99).optional(),
      validUntil: z.string().datetime().nullable().optional(),
    })
    .optional(),
  revokeAddon: z.string().min(1).max(80).optional(),
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

    if (body.suspend) {
      await cancelOrganizationSubscription({
        organizationId: id,
        userId: admin.userId,
        reason: "Suspended by platform ops",
      });
      const detail = await getOpsOrganizationDetail(id);
      return apiSuccess(serializeBigInt(detail));
    }

    if (body.settings?.modules) {
      await updateOpsOrganizationModules({
        organizationId: id,
        modules: body.settings.modules,
      });
    }

    if (body.grantAddon) {
      await grantOrgAddon({
        organizationId: id,
        addonKey: body.grantAddon.addonKey,
        quantity: body.grantAddon.quantity,
        validUntil: body.grantAddon.validUntil
          ? new Date(body.grantAddon.validUntil)
          : null,
      });
    }

    if (body.revokeAddon) {
      await revokeOrgAddon(id, body.revokeAddon);
    }

    const hasBillingPatch =
      body.plan !== undefined ||
      body.subscriptionStatus !== undefined ||
      body.storageQuotaBytes !== undefined ||
      body.onboardingComplete !== undefined ||
      body.accessExpiresAt !== undefined ||
      body.extendPeriodDays !== undefined;

    if (hasBillingPatch) {
      await updateOrgBillingFromOps({
        organizationId: id,
        actorUserId: admin.userId,
        plan: body.plan,
        subscriptionStatus: body.subscriptionStatus,
        storageQuotaBytes: body.storageQuotaBytes ? BigInt(body.storageQuotaBytes) : undefined,
        onboardingComplete: body.onboardingComplete,
        accessExpiresAt:
          body.accessExpiresAt === undefined
            ? undefined
            : body.accessExpiresAt
              ? new Date(body.accessExpiresAt)
              : null,
        extendPeriodDays: body.extendPeriodDays,
      });
    }

    const detail = await getOpsOrganizationDetail(id);
    return apiSuccess(serializeBigInt(detail));
  });
}
