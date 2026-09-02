import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { resolveAuthenticatedUserId } from "@/lib/auth/resolve-session";
import { modulesPayloadForClient } from "@/lib/org/require-module";
import { isPlatformAdminEmail } from "@/lib/billing/platform-admin";
import { updateProfileSchema } from "@/lib/validation/fields";

export async function GET() {
  return handleApi(async () => {
    const headerStore = await headers();
    const userId = await resolveAuthenticatedUserId(headerStore.get("authorization"));
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
                plan: true,
                subscriptionStatus: true,
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
          plan: m.organization.plan,
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

    return NextResponse.json({
      data: serializeBigInt({
        ...enriched,
        isPlatformAdmin: isPlatformAdminEmail(user.email),
      }),
    });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const headerStore = await headers();
    const userId = await resolveAuthenticatedUserId(headerStore.get("authorization"));
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: userId },
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
