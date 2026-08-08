import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { handleApi, apiSuccess } from "@/lib/api/context";

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
            organization: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: serializeBigInt(user) });
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
            organization: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return apiSuccess(serializeBigInt(user));
  });
}
