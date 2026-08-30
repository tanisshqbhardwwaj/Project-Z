import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { completeAppointmentToInvoice } from "@/services/service/appointments.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "service.appointments.manage");
    await requireModule(ctx.organizationId, "service_appointments");
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await completeAppointmentToInvoice({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      appointmentId: id,
      ...body,
    });
    return NextResponse.json({ data: serializeBigInt(result) }, { status: 201 });
  });
}
