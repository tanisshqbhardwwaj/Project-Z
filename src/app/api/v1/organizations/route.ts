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
          invoice: z
            .object({
              headerTitle: z.string().max(120).optional(),
              displayName: z.string().max(120).optional(),
              address: z.string().max(500).optional(),
              phone: z.string().max(30).optional(),
              email: z.string().max(120).optional(),
              gstin: z.string().max(20).optional(),
              footerText: z.string().max(300).optional(),
              termsText: z.string().max(500).optional(),
              showLogo: z.boolean().optional(),
              showBarcode: z.boolean().optional(),
              showCashier: z.boolean().optional(),
              showSalesStaff: z.boolean().optional(),
              showCustomerPhone: z.boolean().optional(),
              showCustomerGstin: z.boolean().optional(),
              showPaymentMethod: z.boolean().optional(),
              showSubtotal: z.boolean().optional(),
              billPrefix: z.string().max(10).optional(),
              defaultTaxRatePercent: z.number().min(0).max(100).optional(),
              discountBasis: z.enum(["subtotal", "total"]).optional(),
              defaultStaffMonthlyTargetRupees: z.number().min(0).optional(),
              staffMonthlyTargets: z.record(z.string(), z.number()).optional(),
              paperSize: z.enum(["58mm", "80mm", "A4"]).optional(),
              printMarginMm: z.number().min(0).max(30).optional(),
              defaultCopies: z.number().int().min(1).max(5).optional(),
            })
            .optional(),
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
