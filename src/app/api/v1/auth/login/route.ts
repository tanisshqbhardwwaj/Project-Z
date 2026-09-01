import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import {
  isNativeClientRequest,
  issueNativeTokenPair,
} from "@/lib/auth/native-tokens-server";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    await enforceRateLimit(request, "auth:login", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();
    const data = schema.parse(body);

    try {
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (isNativeClientRequest(request)) {
        const user = await prisma.user.findUnique({
          where: { email: data.email.toLowerCase().trim() },
          select: { id: true },
        });
        if (!user) {
          return NextResponse.json(
            { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
            { status: 401 }
          );
        }
        const tokens = await issueNativeTokenPair(user.id);
        return NextResponse.json({ data: { success: true, native: tokens } });
      }

      return NextResponse.json({ data: { success: true } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid credentials";
      if (message.includes("EMAIL_NOT_VERIFIED") || message === "EMAIL_NOT_VERIFIED") {
        return NextResponse.json(
          { error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email first" } },
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
