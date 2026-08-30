import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { listCustomerPackages } from "@/services/service/customer-packages.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.packages.manage");
    await requireModule(ctx.organizationId, "service_packages");
    const { searchParams } = new URL(request.url);
    const data = await listCustomerPackages({
      organizationId: ctx.organizationId,
      customerId: searchParams.get("customerId") ?? undefined,
      packageId: searchParams.get("packageId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 25),
    });
    return apiSuccess(serializeBigInt(data));
  });
}
