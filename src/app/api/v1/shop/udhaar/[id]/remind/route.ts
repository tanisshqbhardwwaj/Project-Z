import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireReportFeature } from "@/lib/billing/require-report-feature";
import { recordUdhaarReminderSent } from "@/services/shop/shop-payment-reminder.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "financial.view");
    await requireReportFeature(ctx.organizationId, "payment-reminders");

    const { id } = await params;
    const result = await recordUdhaarReminderSent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      creditId: id,
    });

    return apiSuccess(serializeBigInt(result));
  });
}
