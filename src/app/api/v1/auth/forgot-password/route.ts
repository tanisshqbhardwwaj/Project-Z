import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";
import { generateToken } from "@/lib/utils";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(request, "auth:forgot-password", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = generateToken(48);
      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: passwordResetEmailHtml(user.name, url),
        devLink: url,
      });
    }

    return NextResponse.json({
      data: { message: "If the email exists, a reset link has been sent" },
    });
  });
}
