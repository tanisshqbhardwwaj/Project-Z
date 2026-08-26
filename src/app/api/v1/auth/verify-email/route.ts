import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ token: z.string() });

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(
      request,
      "auth:verify-email",
      RATE_LIMITS.auth.limit,
      RATE_LIMITS.auth.windowMs
    );
    const body = await request.json();
    const { token } = schema.parse(body);

    const verification = await prisma.verificationToken.findUnique({ where: { token } });
    if (!verification || verification.expires < new Date()) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { emailVerifiedAt: new Date() },
    });
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ data: { success: true } });
  });
}
