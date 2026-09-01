import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createMeasurement, listMeasurements } from "@/services/projects/contractor.service";
import {
  requireAssignedProjectView,
  requireAssignedProjectWrite,
} from "@/lib/org/project-api-access";

const createMeasurementSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  date: z.string().min(1),
  boqItemId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const projectId = await requireAssignedProjectView(
      ctx,
      new URL(request.url).searchParams.get("projectId")
    );

    const entries = await listMeasurements(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(entries));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const body = await request.json();
    const data = createMeasurementSchema.parse(body);
    await requireAssignedProjectWrite(ctx, data.projectId);

    const entry = await createMeasurement({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(entry) }, { status: 201 });
  });
}
