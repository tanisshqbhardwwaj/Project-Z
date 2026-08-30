import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { setStaffAttendancePin } from "@/services/attendance-checkin.service";
import { prisma } from "@/lib/db/prisma";

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const { id } = await params;
    const body = pinSchema.parse(await request.json());
    await setStaffAttendancePin({
      organizationId: ctx.organizationId,
      staffId: id,
      pin: body.pin,
      userId: ctx.userId,
    });
    return apiSuccess({ ok: true });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const { id } = await params;
    const row = await prisma.staffMember.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Staff member not found");
    await prisma.staffMember.update({
      where: { id },
      data: { attendancePinHash: null },
    });
    return apiSuccess({ ok: true });
  });
}
