import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { createVerificationTokenAndSendEmail } from "@/lib/email/verification";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    enforceRateLimit(request, "auth:register", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "Email already registered" } },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
      },
    });

    try {
      await createVerificationTokenAndSendEmail({
        email: user.email,
        name: user.name,
      });
    } catch (e) {
      await prisma.user.delete({ where: { id: user.id } });
      const message =
        e instanceof Error ? e.message : "Failed to send verification email";
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_SEND_FAILED",
            message: `Could not send verification email: ${message}. Check EMAIL_FROM uses a verified Resend domain or onboarding@resend.dev for testing.`,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: { id: user.id, email: user.email, message: "Verification email sent" },
    });
  });
}
