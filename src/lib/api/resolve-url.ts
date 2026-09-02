import { getPublicAppUrl } from "@/lib/app/public-url";
import { isNativeShell } from "@/platform/common/native";

function trimOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function isLocalNativeOrigin(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeShell()) return false;
  const { protocol, hostname } = window.location;
  if (protocol === "capacitor:" || protocol === "tauri:") return true;
  if (hostname === "localhost" || hostname === "tauri.localhost") return true;
  return false;
}

/** Resolve API path for web vs bundled native shells. */
export function resolveAppFetchUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!isLocalNativeOrigin()) return normalized;
  const base = trimOrigin(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || getPublicAppUrl() || "https://www.econsole.in"
  );
  return `${base}${normalized}`;
}

export function nativeFetchInit(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers);
  if (isNativeShell()) {
    headers.set("X-BusinessOS-Client", "native");
  }
  return {
    ...options,
    headers,
    credentials: isLocalNativeOrigin() ? "include" : options.credentials,
  };
}
