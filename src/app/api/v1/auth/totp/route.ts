import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { auth, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { ensureUserSchema } from "@/lib/db/ensure-user-schema";
import {
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSetup,
  isTotpEnabled,
  verifyTotpCode,
} from "@/lib/auth/totp";

export async function GET() {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    await ensureUserSchema();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totpEnabledAt: true, totpSecretEnc: true },
    });

    return apiSuccess({ enabled: isTotpEnabled(user) });
  });
}

const enableSchema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "setup";

    await ensureUserSchema();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        totpEnabledAt: true,
        totpSecretEnc: true,
      },
    });
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    if (action === "setup") {
      if (isTotpEnabled(user)) {
        throw new ApiError(400, "TOTP_ENABLED", "Authenticator is already enabled");
      }

      const setup = generateTotpSetup(user.email);
      const encrypted = encryptTotpSecret(setup.secret);
      await prisma.user.update({
        where: { id: user.id },
        data: { totpSecretEnc: encrypted, totpEnabledAt: null },
      });

      const qrDataUrl = await QRCode.toDataURL(setup.otpauthUrl, {
        margin: 1,
        width: 220,
      });

      return apiSuccess({
        secret: setup.secret,
        qrDataUrl,
        otpauthUrl: setup.otpauthUrl,
      });
    }

    if (action === "enable") {
      const body = enableSchema.parse(await request.json());
      if (!user.totpSecretEnc) {
        throw new ApiError(400, "TOTP_NOT_SETUP", "Run setup first");
      }
      if (isTotpEnabled(user)) {
        throw new ApiError(400, "TOTP_ENABLED", "Authenticator is already enabled");
      }

      const secret = decryptTotpSecret(user.totpSecretEnc);
      if (!verifyTotpCode(secret, body.code)) {
        throw new ApiError(401, "INVALID_TOTP", "Invalid authenticator code");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { totpEnabledAt: new Date() },
      });

      return apiSuccess({ enabled: true });
    }

    if (action === "disable") {
      const body = z
        .object({
          code: z.string().min(6).max(8),
          password: z.string().min(1),
        })
        .parse(await request.json());

      if (!isTotpEnabled(user)) {
        throw new ApiError(400, "TOTP_NOT_ENABLED", "Authenticator is not enabled");
      }
      if (!user.passwordHash) {
        throw new ApiError(400, "NO_PASSWORD", "Password login required");
      }

      const valid = await verifyPassword(user.passwordHash, body.password);
      if (!valid) {
        throw new ApiError(401, "INVALID_PASSWORD", "Incorrect password");
      }

      const secret = decryptTotpSecret(user.totpSecretEnc!);
      if (!verifyTotpCode(secret, body.code)) {
        throw new ApiError(401, "INVALID_TOTP", "Invalid authenticator code");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { totpSecretEnc: null, totpEnabledAt: null },
      });

      return apiSuccess({ enabled: false });
    }

    throw new ApiError(400, "INVALID_ACTION", "Unknown action");
  });
}
