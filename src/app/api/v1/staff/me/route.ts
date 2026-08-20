import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { getLinkedStaffMember } from "@/services/staff.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "attendance.view_own");

    const staff = await getLinkedStaffMember(ctx.organizationId, ctx.userId);
    if (!staff) {
      throw new ApiError(
        404,
        "NOT_LINKED",
        "Your login is not linked to a staff profile. Ask the owner to link your account."
      );
    }

    return apiSuccess(serializeBigInt(staff));
  });
}
