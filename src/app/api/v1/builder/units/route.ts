import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createBuilderUnit,
  listBuilderUnits,
  updateBuilderUnit,
} from "@/services/builder.service";

const createUnitSchema = z.object({
  projectId: z.string().uuid(),
  unitNumber: z.string().min(1),
  floor: z.string().optional().nullable(),
  areaSqft: z.number().positive().optional().nullable(),
  priceRupees: z.number().min(0).optional().nullable(),
});

const updateUnitSchema = z.object({
  unitId: z.string().uuid(),
  floor: z.string().optional().nullable(),
  areaSqft: z.number().positive().optional().nullable(),
  priceRupees: z.number().min(0).optional().nullable(),
  status: z.enum(["AVAILABLE", "BOOKED", "SOLD"]).optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");

    const units = await listBuilderUnits(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(units));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createUnitSchema.parse(body);

    const unit = await createBuilderUnit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(unit) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateUnitSchema.parse(body);

    const unit = await updateBuilderUnit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(unit));
  });
}
