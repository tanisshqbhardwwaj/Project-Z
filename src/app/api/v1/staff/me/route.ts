import {
  getAuthContext,
  handleApi,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { getLinkedStaffMember } from "@/services/staff/staff.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireOwnAttendance } from "@/lib/staff/shop-access";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireOwnAttendance(ctx);

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
