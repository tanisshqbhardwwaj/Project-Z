import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isAllowedApiOrigin,
  isAllowedNativeOrigin,
  isSameOriginRequest,
  NATIVE_CORS_HEADERS,
  NATIVE_CORS_METHODS,
} from "@/lib/security/native-cors";
import { isNativeAppUserAgent } from "@/lib/platform/native";

function newCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

function isMarketingPath(pathname: string) {
  return pathname === "/" || pathname === "/pricing" || pathname.startsWith("/pricing/");
}

const publicPaths = [
  "/",
  "/pricing",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/project-invite",
  "/onboarding",
];

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": NATIVE_CORS_METHODS,
    "Access-Control-Allow-Headers": NATIVE_CORS_HEADERS,
    Vary: "Origin",
  };
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  if (pathname.startsWith("/api")) {
    const correlationId =
      request.headers.get("x-correlation-id")?.trim() ||
      request.headers.get("x-request-id")?.trim() ||
      newCorrelationId();

    const requestOrigin = request.nextUrl.origin;

    if (request.method === "OPTIONS") {
      if (!origin || !isAllowedApiOrigin(requestOrigin, origin)) {
        return new NextResponse(null, { status: 403 });
      }
      if (isSameOriginRequest(requestOrigin, origin)) {
        return new NextResponse(null, { status: 204 });
      }
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const response = NextResponse.next();
    response.headers.set("x-correlation-id", correlationId);

    if (origin) {
      if (!isAllowedApiOrigin(requestOrigin, origin)) {
        return NextResponse.json(
          { error: { code: "CORS_FORBIDDEN", message: "Origin not allowed" } },
          { status: 403 }
        );
      }
      if (
        isAllowedNativeOrigin(origin) &&
        !isSameOriginRequest(requestOrigin, origin)
      ) {
        for (const [key, value] of Object.entries(corsHeaders(origin))) {
          response.headers.set(key, value);
        }
      }
    }

    return response;
  }

  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (isNativeAppUserAgent(request.headers.get("user-agent")) && isMarketingPath(pathname)) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ??
      request.cookies.get("__Secure-authjs.session-token")?.value;
    const dest = new URL(sessionToken ? "/dashboard" : "/login", request.url);
    return NextResponse.redirect(dest);
  }


  const isPublic = publicPaths.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(`${p}/`);
  });

  if (!isPublic) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ??
      request.cookies.get("__Secure-authjs.session-token")?.value;
    const bearer = request.headers.get("authorization")?.startsWith("Bearer ");

    if (!sessionToken && !bearer) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
