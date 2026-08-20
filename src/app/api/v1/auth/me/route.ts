import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { modulesPayloadForClient } from "@/lib/org/require-module";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export async function GET() {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        locale: true,
        emailVerifiedAt: true,
        organizationMembers: {
          where: { status: "ACTIVE" },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                businessType: true,
                shopSector: true,
                enableStaff: true,
                timezone: true,
                settings: true,
              },
            },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "SESSION_STALE",
            message: "Your login session is out of date. Please log in again.",
          },
        },
        { status: 401 }
      );
    }

    const enriched = {
      ...user,
      organizationMembers: user.organizationMembers.map((m) => {
        const { enabledModules, settings } = modulesPayloadForClient({
          businessType: m.organization.businessType,
          shopSector: m.organization.shopSector,
          settings: m.organization.settings,
          enableStaff: m.organization.enableStaff,
        });
        return {
          ...m,
          organization: {
            ...m.organization,
            enabledModules,
            orgSettings: settings,
          },
        };
      }),
    };

    return NextResponse.json({ data: serializeBigInt(enriched) });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        locale: true,
        emailVerifiedAt: true,
        organizationMembers: {
          where: { status: "ACTIVE" },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                businessType: true,
                shopSector: true,
                enableStaff: true,
                timezone: true,
                settings: true,
              },
            },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return apiSuccess(serializeBigInt(user));
  });
}
