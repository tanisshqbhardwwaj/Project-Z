import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createMeasurement, listMeasurements } from "@/services/contractor.service";

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
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");

    const entries = await listMeasurements(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(entries));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createMeasurementSchema.parse(body);

    const entry = await createMeasurement({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(entry) }, { status: 201 });
  });
}
