import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireReportFeature } from "@/lib/billing/require-report-feature";
import {
  mergeShopOrgSettings,
  parsePaymentReminderSettings,
  resolvedPaymentReminderSettings,
} from "@/lib/org/shop-settings";
import {
  findUdhaarReminderCandidates,
  orgEligibleForPaymentReminders,
} from "@/services/shop-payment-reminder.service";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  minBalanceRupees: z.number().min(0).max(1_000_000).optional(),
  daysBetweenReminders: z.number().int().min(1).max(90).optional(),
  idleDaysBeforeReminder: z.number().int().min(0).max(90).optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "financial.view");
    await requireReportFeature(ctx.organizationId, "payment-reminders");

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { settings: true, plan: true },
    });
    if (!org) throw new Error("Organization not found");

    const settings = resolvedPaymentReminderSettings(org.settings);
    const eligible = await orgEligibleForPaymentReminders(ctx.organizationId);
    const candidates = eligible
      ? await findUdhaarReminderCandidates(ctx.organizationId)
      : [];

    return apiSuccess(
      serializeBigInt({
        settings,
        eligible,
        dueCount: candidates.length,
        dueTotalPaise: candidates
          .reduce((sum, c) => sum + c.balancePaise, BigInt(0))
          .toString(),
      })
    );
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    await requireReportFeature(ctx.organizationId, "payment-reminders");

    const body = await request.json();
    const patch = patchSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { settings: true },
    });
    if (!org) throw new Error("Organization not found");

    const existing = (org.settings ?? {}) as Record<string, unknown>;
    const nextSettings = mergeShopOrgSettings(existing, {
      paymentReminders: {
        ...parsePaymentReminderSettings(org.settings),
        ...patch,
      },
    });

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { settings: JSON.parse(JSON.stringify(nextSettings)) },
    });

    return apiSuccess({
      settings: resolvedPaymentReminderSettings(nextSettings),
    });
  });
}
