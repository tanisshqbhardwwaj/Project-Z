import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { updateStaffMember } from "@/services/staff/staff.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { updateStaffSchema } from "@/lib/validation/staff";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.manage");
    const { id } = await params;
    const body = await request.json();
    const data = updateStaffSchema.parse(body);
    const { userId: linkUserId, ...rest } = data;

    const staff = await updateStaffMember({
      organizationId: ctx.organizationId,
      staffId: id,
      actorUserId: ctx.userId,
      linkUserId,
      ...rest,
    });

    return apiSuccess(serializeBigInt(staff));
  });
}
