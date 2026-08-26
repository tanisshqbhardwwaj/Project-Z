import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function newCorrelationId(): string {
  return globalThis.crypto.randomUUID();
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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    if (pathname.startsWith("/api")) {
      const correlationId =
        request.headers.get("x-correlation-id")?.trim() ||
        request.headers.get("x-request-id")?.trim() ||
        newCorrelationId();
      const response = NextResponse.next();
      response.headers.set("x-correlation-id", correlationId);
      return response;
    }
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(`${p}/`);
  });

  if (!isPublic) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ??
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isPublic && pathname === "/login") {
    // Do not bounce cookie-holders away from login — stale JWTs (e.g. after
    // switching DBs) must be able to reach the login page and sign in again.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
