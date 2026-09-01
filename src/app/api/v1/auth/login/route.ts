import { NextResponse } from "next/server";
import { signIn, TOTP_REQUIRED_PREFIX } from "@/lib/auth";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const totpSchema = z.object({
  mfaToken: z.string().min(10),
  totpCode: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(request, "auth:login", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();

    if (body.mfaToken) {
      const data = totpSchema.parse(body);
      try {
        await signIn("credentials", {
          mfaToken: data.mfaToken,
          totpCode: data.totpCode.replace(/\s/g, ""),
          redirect: false,
        });
        return NextResponse.json({ data: { success: true } });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Invalid code";
        if (message.includes("INVALID_TOTP")) {
          return NextResponse.json(
            { error: { code: "INVALID_TOTP", message: "Invalid authenticator code" } },
            { status: 401 }
          );
        }
        if (message.includes("MFA_TOKEN_EXPIRED") || message.includes("INVALID_MFA_TOKEN")) {
          return NextResponse.json(
            { error: { code: "MFA_TOKEN_EXPIRED", message: "Session expired — sign in again" } },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: { code: "INVALID_TOTP", message: "Could not verify authenticator code" } },
          { status: 401 }
        );
      }
    }

    const data = schema.parse(body);

    try {
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      return NextResponse.json({ data: { success: true } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid credentials";
      if (message.startsWith(TOTP_REQUIRED_PREFIX)) {
        return NextResponse.json({
          data: {
            requiresTotp: true,
            mfaToken: message.slice(TOTP_REQUIRED_PREFIX.length),
          },
        });
      }
      if (message.includes("EMAIL_NOT_VERIFIED") || message === "EMAIL_NOT_VERIFIED") {
        return NextResponse.json(
          { error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email first" } },
          { status: 403 }
        );
      }
      if (message.includes("TOTP_SETUP_INCOMPLETE")) {
        return NextResponse.json(
          {
            error: {
              code: "TOTP_SETUP_INCOMPLETE",
              message:
                "Finish Google Authenticator setup — register again if you did not scan the QR code",
            },
          },
          { status: 403 }
        );
      }
      if (message.includes("USER_NOT_FOUND") || message.includes("INVALID_PASSWORD")) {
        return NextResponse.json(
          { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }
  });
}
