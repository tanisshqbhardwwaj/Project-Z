import { encode, decode } from "@auth/core/jwt";
import { randomBytes } from "node:crypto";

const ACCESS_MAX_AGE = 30 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is required for native tokens");
  return secret;
}

export type NativeTokenPayload = {
  sub: string;
  type: "native_access" | "native_refresh";
  jti: string;
};

const ACCESS_SALT = "businessos.native.access";
const REFRESH_SALT = "businessos.native.refresh";

export async function issueNativeTokenPair(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}> {
  const accessJti = randomBytes(16).toString("hex");
  const refreshJti = randomBytes(16).toString("hex");
  const secret = authSecret();

  const accessToken = await encode({
    token: { sub: userId, type: "native_access", jti: accessJti },
    secret,
    salt: ACCESS_SALT,
    maxAge: ACCESS_MAX_AGE,
  });

  const refreshToken = await encode({
    token: { sub: userId, type: "native_refresh", jti: refreshJti },
    secret,
    salt: REFRESH_SALT,
    maxAge: REFRESH_MAX_AGE,
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: ACCESS_MAX_AGE,
    refreshExpiresIn: REFRESH_MAX_AGE,
  };
}

export async function verifyNativeAccessToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const payload = (await decode({
      token,
      secret: authSecret(),
      salt: ACCESS_SALT,
    })) as NativeTokenPayload | null;
    if (!payload?.sub || payload.type !== "native_access") return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function verifyNativeRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const payload = (await decode({
      token,
      secret: authSecret(),
      salt: REFRESH_SALT,
    })) as NativeTokenPayload | null;
    if (!payload?.sub || payload.type !== "native_refresh") return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export function isNativeClientRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.includes("BusinessOSNative")) return true;
  return request.headers.get("x-businessos-client") === "native";
}
