import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { bulkGenerateStaffAttendanceBarcodes } from "@/services/staff/attendance-scan.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const body = await request.json().catch(() => ({}));
    const regenerate = Boolean(body?.regenerate);
    const staffIds = Array.isArray(body?.staffIds)
      ? body.staffIds.filter((id: unknown) => typeof id === "string")
      : undefined;
    const result = await bulkGenerateStaffAttendanceBarcodes({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      regenerate,
      staffIds,
    });
    return apiSuccess(serializeBigInt(result));
  });
}
