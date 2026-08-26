import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import { serializeBigInt } from "@/lib/db/prisma";
import { listOpsUsers } from "@/services/ops.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const skip = searchParams.get("skip")
      ? Number(searchParams.get("skip"))
      : undefined;
    const take = searchParams.get("take")
      ? Number(searchParams.get("take"))
      : undefined;

    const result = await listOpsUsers({ q, skip, take });
    return apiSuccess(serializeBigInt(result));
  });
}
