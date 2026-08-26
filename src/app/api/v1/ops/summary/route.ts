import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import {
  getOpsSummary,
  listRecentOpsOrganizations,
} from "@/services/billing.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { formatINRFromPaise } from "@/lib/billing/plans";

export async function GET() {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const [summary, recentOrganizations] = await Promise.all([
      getOpsSummary(),
      listRecentOpsOrganizations(8).catch(() => []),
    ]);
    return apiSuccess(
      serializeBigInt({
        ...summary,
        mrrLabel: formatINRFromPaise(summary.mrrPaise),
        recentOrganizations,
      })
    );
  });
}
