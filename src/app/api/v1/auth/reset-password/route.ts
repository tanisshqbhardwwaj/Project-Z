import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/fields";

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(
      request,
      "auth:reset-password",
      RATE_LIMITS.auth.limit,
      RATE_LIMITS.auth.windowMs
    );
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    await prisma.passwordResetToken.deleteMany({ where: { email: resetToken.email } });

    return NextResponse.json({ data: { success: true } });
  });
}
