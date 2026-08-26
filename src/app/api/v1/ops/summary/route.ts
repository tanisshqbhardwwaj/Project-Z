import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
<<<<<<< HEAD
import { getOpsSummary } from "@/services/billing.service";
=======
import {
  getOpsSummary,
  listRecentOpsOrganizations,
} from "@/services/billing.service";
>>>>>>> origin/master
import { serializeBigInt } from "@/lib/db/prisma";
import { formatINRFromPaise } from "@/lib/billing/plans";

export async function GET() {
  return handleApi(async () => {
    await requirePlatformAdmin();
<<<<<<< HEAD
    const summary = await getOpsSummary();
=======
    const [summary, recentOrganizations] = await Promise.all([
      getOpsSummary(),
      listRecentOpsOrganizations(8).catch(() => []),
    ]);
>>>>>>> origin/master
    return apiSuccess(
      serializeBigInt({
        ...summary,
        mrrLabel: formatINRFromPaise(summary.mrrPaise),
<<<<<<< HEAD
=======
        recentOrganizations,
>>>>>>> origin/master
      })
    );
  });
}
