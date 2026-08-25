import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { createMaterialIssue, listMaterialIssues } from "@/services/contractor.service";
import {
  requireAssignedProjectView,
  requireAssignedProjectWrite,
} from "@/lib/org/project-api-access";

const createMaterialSchema = z.object({
  projectId: z.string().uuid(),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  date: z.string().min(1),
  issuedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const projectId = await requireAssignedProjectView(
      ctx,
      new URL(request.url).searchParams.get("projectId")
    );

    const issues = await listMaterialIssues(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(issues));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "expense.create");
    const body = await request.json();
    const data = createMaterialSchema.parse(body);
    await requireAssignedProjectWrite(ctx, data.projectId);

    const issue = await createMaterialIssue({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(issue) }, { status: 201 });
  });
}
