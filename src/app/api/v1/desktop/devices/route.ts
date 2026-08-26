import { z } from "zod";
import { handleApi, apiSuccess, getAuthContext, requireOwner, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { generateToken } from "@/lib/utils";
import { subscriptionAllowsProductUse } from "@/lib/billing/entitlements";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const startSchema = z.object({
  deviceType: z.enum(["WINDOWS", "ANDROID", "IOS", "MAC"]).default("ANDROID"),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { subscriptionStatus: true, name: true },
    });
    if (!org || !subscriptionAllowsProductUse(org.subscriptionStatus)) {
      throw new ApiError(403, "SUBSCRIPTION_INACTIVE", "Active subscription required.");
    }

    const body = startSchema.parse(await request.json());
    const token = generateToken(6).slice(0, 6).toUpperCase();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const device = await prisma.device.create({
      data: {
        organizationId: ctx.organizationId,
        deviceType: body.deviceType,
        name: body.name ?? `${body.deviceType} device`,
        pairingToken: token,
        pairingExpires: expires,
        status: "PENDING",
      },
    });

    return apiSuccess({
      deviceId: device.id,
      pairingToken: token,
      expiresAt: expires,
      organizationName: org.name,
    });
  });
}

const pairSchema = z.object({
  pairingToken: z.string().min(4).max(12),
  deviceId: z.string().uuid(),
});

export async function PATCH(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(request, "desktop:pair", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);

    const body = pairSchema.parse(await request.json());
    const device = await prisma.device.findUnique({ where: { id: body.deviceId } });
    if (!device || device.pairingToken !== body.pairingToken.toUpperCase()) {
      throw new ApiError(400, "INVALID_PAIRING", "Invalid pairing code.");
    }
    if (device.pairingExpires && device.pairingExpires < new Date()) {
      throw new ApiError(400, "PAIRING_EXPIRED", "Pairing code expired.");
    }

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: {
        status: "ACTIVE",
        pairingToken: null,
        pairingExpires: null,
        lastSeenAt: new Date(),
      },
    });

    return apiSuccess({ deviceId: updated.id, status: updated.status });
  });
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const devices = await prisma.device.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ devices });
  });
}
