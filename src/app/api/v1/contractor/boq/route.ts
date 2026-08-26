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
  createBoqItem,
  listBoqItems,
  updateBoqItem,
} from "@/services/contractor.service";

const createBoqSchema = z.object({
  projectId: z.string().uuid(),
  itemCode: z.string().optional().nullable(),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  rateRupees: z.number().min(0),
});

const updateBoqSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  rateRupees: z.number().min(0).optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");

    const items = await listBoqItems(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(items));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createBoqSchema.parse(body);

    const item = await createBoqItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(item) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateBoqSchema.parse(body);

    const item = await updateBoqItem({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(item));
  });
}
