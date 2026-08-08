import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { handleApi } from "@/lib/api/context";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await request.json();
    const { token, password } = schema.parse(body);

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

    return NextResponse.json({ data: { success: true } });
  });
}
