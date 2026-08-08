import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { handleApi } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    enforceRateLimit(request, "auth:login", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    const body = await request.json();
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
      if (message === "EMAIL_NOT_VERIFIED") {
        return NextResponse.json(
          { error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email first" } },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }
  });
}
