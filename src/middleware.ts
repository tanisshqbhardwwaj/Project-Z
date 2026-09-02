import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  appendVaryAccept,
  preferredType,
  PRODUCES,
} from "@/lib/agent/accept-negotiation";
import { createNotFoundResponse } from "@/lib/agent/not-found-content";
import {
  isMarketingPath,
  isPublicPath,
  isUnknownPublicPath,
  stripMarkdownSuffix,
} from "@/lib/agent/site-routes";
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

function hasSession(request: NextRequest): boolean {
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;
  const bearer = request.headers.get("authorization")?.startsWith("Bearer ");
  return Boolean(sessionToken || bearer);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": NATIVE_CORS_METHODS,
    "Access-Control-Allow-Headers": NATIVE_CORS_HEADERS,
    Vary: "Origin",
  };
}

function notAcceptableResponse(): Response {
  return new Response(
    `Not Acceptable\n\nAvailable: ${PRODUCES.join(", ")}\n`,
    {
      status: 406,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept, Accept-Encoding",
      },
    }
  );
}

function rewriteToMarkdown(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/api/markdown${pathname === "/" ? "" : pathname}`;
  const rewritten = NextResponse.rewrite(url);
  appendVaryAccept(rewritten.headers);
  return rewritten;
}

function handleMarketingNegotiation(request: NextRequest, pathname: string): NextResponse | Response | null {
  if (!isMarketingPath(pathname)) return null;

  const acceptHeader = request.headers.get("accept");

  if (pathname.endsWith(".md")) {
    const stripped = stripMarkdownSuffix(pathname);
    if (!isMarketingPath(stripped)) {
      return createNotFoundResponse(acceptHeader);
    }
    return rewriteToMarkdown(request, stripped);
  }

  const chosen = preferredType(acceptHeader);

  if (chosen === "text/markdown") {
    return rewriteToMarkdown(request, pathname);
  }

  if (chosen === null && acceptHeader) {
    return notAcceptableResponse();
  }

  return null;
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

  if (isUnknownPublicPath(pathname) && !hasSession(request)) {
    return createNotFoundResponse(request.headers.get("accept"));
  }

  const negotiated = handleMarketingNegotiation(request, pathname);
  if (negotiated) return negotiated;

  if (!isPublicPath(pathname) && !hasSession(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (isMarketingPath(pathname) || isPublicPath(pathname)) {
    appendVaryAccept(response.headers);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/:path*.md",
  ],
};
