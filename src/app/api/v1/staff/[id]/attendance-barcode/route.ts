import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  generateStaffAttendanceBarcodeForMember,
  revokeStaffAttendanceBarcode,
} from "@/services/staff/attendance-scan.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const regenerate = Boolean(body?.regenerate);
    const result = await generateStaffAttendanceBarcodeForMember({
      organizationId: ctx.organizationId,
      staffId: id,
      userId: ctx.userId,
      regenerate,
    });
    return apiSuccess(serializeBigInt(result));
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const { id } = await params;
    await revokeStaffAttendanceBarcode({
      organizationId: ctx.organizationId,
      staffId: id,
      userId: ctx.userId,
    });
    return apiSuccess({ ok: true });
  });
}
