/** Public marketing and auth paths that do not require a session. */
export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/project-invite",
  "/onboarding",
] as const;

/** Known authenticated app areas (first path segment). */
export const PROTECTED_APP_PREFIXES = [
  "/activity",
  "/architect",
  "/builder",
  "/cashier",
  "/contractor",
  "/dashboard",
  "/deliveries",
  "/documents",
  "/expenses",
  "/notifications",
  "/partners",
  "/payments",
  "/projects",
  "/reports",
  "/restaurant",
  "/service",
  "/settings",
  "/shop",
  "/staff",
  "/vendors",
  "/work-orders",
  "/ops",
] as const;

/** Marketing pages that support Accept: text/markdown negotiation. */
export const MARKETING_PATH_PREFIXES = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Paths that are neither public nor a known protected app route. */
export function isUnknownPublicPath(pathname: string): boolean {
  const base = pathname.endsWith(".md") ? stripMarkdownSuffix(pathname) : pathname;
  return !isPublicPath(base) && !isProtectedAppPath(base);
}

export function isMarketingPath(pathname: string): boolean {
  return MARKETING_PATH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Strip trailing `.md` from a pathname (e.g. `/pricing.md` → `/pricing`, `/index.md` → `/`). */
export function stripMarkdownSuffix(pathname: string): string {
  if (!pathname.endsWith(".md")) return pathname;
  const stripped = pathname.slice(0, -3);
  if (stripped === "" || stripped === "/index") return "/";
  return stripped;
}
