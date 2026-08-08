import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createVerificationTokenAndSendEmail } from "@/lib/email/verification";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  return handleApi(async () => {
    enforceRateLimit(request, "auth:resend-verification", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({
        data: { message: "If the email exists, a verification link has been sent" },
      });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { error: { code: "ALREADY_VERIFIED", message: "Email is already verified" } },
        { status: 400 }
      );
    }

    try {
      await createVerificationTokenAndSendEmail({
        email: user.email,
        name: user.name,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email";
      return NextResponse.json(
        { error: { code: "EMAIL_SEND_FAILED", message } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: { message: "Verification email sent. Check your inbox." },
    });
  });
}
