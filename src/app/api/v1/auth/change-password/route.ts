import { NextResponse } from "next/server";
import { auth, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { changePasswordSchema } from "@/lib/validation/fields";

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    if (currentPassword === newPassword) {
      throw new ApiError(400, "VALIDATION_ERROR", "New password must be different from your current password");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new ApiError(400, "NO_PASSWORD", "This account has no password set");
    }

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      throw new ApiError(400, "INVALID_PASSWORD", "Current password is incorrect");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return apiSuccess({ message: "Password updated successfully" });
  });
}
