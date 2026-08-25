import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { createVerificationTokenAndSendEmail } from "@/lib/email/verification";
import { isTestEmailAllowlisted } from "@/lib/email/test-allowlist";
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
    await enforceRateLimit(request, "auth:register", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
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
    const autoVerify = await isTestEmailAllowlisted(data.email);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        ...(autoVerify ? { emailVerifiedAt: new Date() } : {}),
      },
    });

    if (autoVerify) {
      return NextResponse.json({
        data: {
          id: user.id,
          email: user.email,
          message: "Account created — email auto-verified for beta testing. You can log in now.",
        },
      });
    }

    try {
      await createVerificationTokenAndSendEmail({
        email: user.email,
        name: user.name,
      });
    } catch (e) {
      // Keep the account in development so local setup works when Resend blocks the recipient.
      if (process.env.NODE_ENV === "development") {
        const token = await prisma.verificationToken.findFirst({
          where: { identifier: user.email },
          orderBy: { expires: "desc" },
        });
        const verifyUrl = token
          ? `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token.token}`
          : null;
        return NextResponse.json({
          data: {
            id: user.id,
            email: user.email,
            message:
              "Account created. Resend could not deliver email in development — use the verification link from the server console (or verifyUrl below).",
            verifyUrl,
            emailWarning:
              e instanceof Error ? e.message : "Failed to send verification email",
          },
        });
      }

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
