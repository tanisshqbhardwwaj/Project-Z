import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  requireProjectAccess,
  apiSuccess,
} from "@/lib/api/context";
import { createProject, listProjects, getProjectSummary } from "@/services/project.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  contractAmountPaise: z.union([z.string(), z.number()]).optional(),
  contractAmount: z.number().optional(),
  budgetAmount: z.number().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  expectedStartDate: z.string().optional(),
  expectedCompletionDate: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  workOrder: z
    .object({
      workOrderNumber: z.string(),
      workOrderDate: z.string(),
      clientName: z.string(),
      headOfAccount: z.string().optional(),
      timeOfCompletion: z.string().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);
    const projects = await listProjects(ctx.organizationId, ctx.userId, ctx.role, {
      cursor: searchParams.get("cursor") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });
    return apiSuccess(serializeBigInt(projects));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.create");

    const body = await request.json();
    const data = createSchema.parse(body);

    const contractPaise = data.contractAmount
      ? rupeesToPaise(data.contractAmount)
      : data.contractAmountPaise
        ? BigInt(data.contractAmountPaise)
        : BigInt(0);

    const project = await createProject({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: data.name,
      contractAmountPaise: contractPaise,
      budgetAmountPaise: data.budgetAmount ? rupeesToPaise(data.budgetAmount) : contractPaise,
      location: data.location,
      description: data.description,
      expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : undefined,
      expectedCompletionDate: data.expectedCompletionDate
        ? new Date(data.expectedCompletionDate)
        : undefined,
      memberIds: data.memberIds,
      workOrder: data.workOrder
        ? {
            ...data.workOrder,
            workOrderDate: new Date(data.workOrder.workOrderDate),
          }
        : undefined,
    });

    return NextResponse.json({ data: serializeBigInt(project) }, { status: 201 });
  });
}
