import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
<<<<<<< HEAD
=======
  requirePermission,
>>>>>>> origin/master
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createMeasurement, listMeasurements } from "@/services/contractor.service";
<<<<<<< HEAD
import {
  requireAssignedProjectView,
  requireAssignedProjectWrite,
} from "@/lib/org/project-api-access";
=======
>>>>>>> origin/master

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
<<<<<<< HEAD
    const projectId = await requireAssignedProjectView(
      ctx,
      new URL(request.url).searchParams.get("projectId")
    );
=======
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");
>>>>>>> origin/master

    const entries = await listMeasurements(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(entries));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
<<<<<<< HEAD
    const body = await request.json();
    const data = createMeasurementSchema.parse(body);
    await requireAssignedProjectWrite(ctx, data.projectId);
=======
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createMeasurementSchema.parse(body);
>>>>>>> origin/master

    const entry = await createMeasurement({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(entry) }, { status: 201 });
  });
}
