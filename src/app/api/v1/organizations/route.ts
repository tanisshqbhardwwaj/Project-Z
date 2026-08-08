import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { handleApi } from "@/lib/api/context";
import { z } from "zod";
import { createOrganization } from "@/services/organization.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";

const schema = z.object({ name: z.string().min(2).max(100) });

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
    const { name } = schema.parse(body);

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

    const org = await createOrganization({ name, userId: session.user.id });
    return NextResponse.json({ data: serializeBigInt(org) }, { status: 201 });
  });
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await import("@/lib/api/context").then((m) =>
      m.getAuthContext(request.headers.get("X-Organization-Id"))
    );
    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });
    return NextResponse.json({ data: serializeBigInt(org) });
  });
}
