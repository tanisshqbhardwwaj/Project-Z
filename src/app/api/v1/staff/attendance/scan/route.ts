import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import {
  applyBarcodeScan,
  AttendanceScanError,
} from "@/services/staff/attendance-scan.service";
import { requireModule } from "@/lib/org/require-module";
import { hasPermission } from "@/lib/permissions/rbac";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";

const scanSchema = z.object({
  barcode: z.string().min(3),
  confirmCheckout: z.boolean().optional(),
  eventId: z.string().uuid().optional(),
  deviceId: z.string().optional().nullable(),
});

async function assertCanScanAttendance(ctx: Awaited<ReturnType<typeof getAuthContext>>) {
  await requireModule(ctx.organizationId, "staff");
  if (hasPermission(ctx.role, "attendance.mark")) return;
  if (shopStaffAccessApplies(ctx)) return;
  throw new ApiError(403, "FORBIDDEN", "Not allowed to scan staff attendance");
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await assertCanScanAttendance(ctx);
    const body = scanSchema.parse(await request.json());

    try {
      const result = await applyBarcodeScan({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        barcode: body.barcode,
        confirmCheckout: body.confirmCheckout,
        eventId: body.eventId,
        deviceId: body.deviceId,
      });
      return apiSuccess(result);
    } catch (err) {
      if (err instanceof AttendanceScanError) {
        throw new ApiError(400, err.code, err.message);
      }
      throw err;
    }
  });
}
