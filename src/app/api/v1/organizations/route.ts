import { NextResponse } from "next/server";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import {
  handleApi,
  getAuthContext,
  requirePermission,
} from "@/lib/api/context";
import { z } from "zod";
import { createOrganization, updateOrganization } from "@/services/organization.service";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { BUSINESS_TYPES } from "@/lib/org/business-type";
import { SHOP_SECTORS } from "@/lib/org/shop-sector";

const schema = z.object({
  name: z.string().min(2).max(100),
  businessType: z.enum(BUSINESS_TYPES).default("CONTRACTOR"),
  shopSector: z.enum(SHOP_SECTORS).optional().nullable(),
  enableStaff: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  shopSector: z.enum(SHOP_SECTORS).optional().nullable(),
  enableStaff: z.boolean().optional(),
  timezone: z.string().optional(),
  defaultCompletionDays: z.number().int().min(1).max(3650).optional(),
  settings: z
    .object({
      modules: z.record(z.string(), z.boolean()).optional(),
      weeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
      unmarkedDayPolicy: z.enum(["PRESENT", "ABSENT", "EXCLUDED"]).optional(),
      shop: z
        .object({
          brandName: z.string().max(80).optional(),
          logoUrl: z.string().max(500_000).optional().nullable(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, businessType, shopSector, enableStaff } = schema.parse(body);

    if (businessType === "SHOPKEEPER" && !shopSector) {
      return NextResponse.json(
        {
          error: {
            code: "SHOP_SECTOR_REQUIRED",
            message: "Please select your shop sector",
          },
        },
        { status: 400 }
      );
    }

    const count = await prisma.organizationMember.count({
      where: { userId: session.user.id, status: "ACTIVE" },
    });
    if (count >= MAX_ORGANIZATIONS) {
      return NextResponse.json(
        {
          error: {
            code: "ORG_LIMIT",
            message: `You can belong to at most ${MAX_ORGANIZATIONS} organizations`,
          },
        },
        { status: 409 }
      );
    }

    const org = await createOrganization({
      name,
      userId: session.user.id,
      businessType,
      shopSector,
      enableStaff,
    });
    return NextResponse.json({ data: serializeBigInt(org) }, { status: 201 });
  });
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
    return NextResponse.json({ data: serializeBigInt(org) });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "org.manage");

    const body = await request.json();
    const data = updateSchema.parse(body);

    const org = await updateOrganization({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(org) });
  });
}
