/** Canonical public HTTPS origin for links, native shells, and deep links. */

function trimUrl(value: string | undefined): string {
  return value?.trim().replace(/\/$/, "") ?? "";
}

/** Server-side public app URL (NEXT_PUBLIC_APP_URL or AUTH_URL). */
export function getPublicAppUrl(): string {
  const fromEnv =
    trimUrl(process.env.NEXT_PUBLIC_APP_URL) || trimUrl(process.env.AUTH_URL);
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "";
}

/** Remote WebView URL for Capacitor Android (CAPACITOR_SERVER_URL or public app URL). */
export function getCapacitorServerUrl(): string {
  return trimUrl(process.env.CAPACITOR_SERVER_URL) || getPublicAppUrl();
}

/** Native Android/Windows shells open sign-in, not the public landing page. */
export function withNativeAppEntryUrl(originOrUrl: string): string {
  const trimmed = originOrUrl.trim();
  if (!trimmed) return "/login";
  try {
    const url = new URL(trimmed);
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${trimUrl(trimmed)}/login`;
  }
}

/** Hostname for Android intent filters (no scheme/path). */
export function getPublicAppHost(): string | null {
  const url = getCapacitorServerUrl() || getPublicAppUrl();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
