import { NextResponse } from "next/server";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  issueNativeTokenPair,
  verifyNativeRefreshToken,
} from "@/lib/auth/native-tokens-server";
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(
      request,
      "auth:refresh",
      RATE_LIMITS.auth.limit,
      RATE_LIMITS.auth.windowMs
    );
    const body = await request.json();
    const { refreshToken } = schema.parse(body);
    const verified = await verifyNativeRefreshToken(refreshToken);
    if (!verified) {
      return NextResponse.json(
        { error: { code: "INVALID_REFRESH", message: "Session expired — sign in again" } },
        { status: 401 }
      );
    }
    const tokens = await issueNativeTokenPair(verified.userId);
    return apiSuccess(tokens);
  });
}
