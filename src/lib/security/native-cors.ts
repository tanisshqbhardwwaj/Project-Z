const DEFAULT_NATIVE_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",
  "capacitor://localhost",
  "http://tauri.localhost",
];

export function nativeCorsAllowlist(): string[] {
  const fromEnv = process.env.NATIVE_CORS_ORIGINS?.split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_NATIVE_ORIGINS;
}

export function isAllowedNativeOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return nativeCorsAllowlist().includes(origin);
}

/** True when the browser Origin matches the URL serving this API request. */
export function isSameOriginRequest(
  requestOrigin: string,
  origin: string | null
): boolean {
  if (!origin) return false;
  return requestOrigin === origin;
}

/** Cross-origin requests must be from a native shell; same-origin web is always OK. */
export function isAllowedApiOrigin(
  requestOrigin: string,
  origin: string | null
): boolean {
  if (!origin) return true;
  if (isSameOriginRequest(requestOrigin, origin)) return true;
  return isAllowedNativeOrigin(origin);
}

export const NATIVE_CORS_HEADERS =
  "Content-Type, Authorization, X-Organization-Id, X-Branch-Id, X-BusinessOS-Client, X-Correlation-Id";

export const NATIVE_CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
