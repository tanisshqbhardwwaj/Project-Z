/** Shared Content-Security-Policy for web, Android WebView, and Tauri. */

export const APP_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: blob: ipc: http://ipc.localhost https://ipc.localhost http://127.0.0.1:* http://localhost:*",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
] as const;

export const APP_CONTENT_SECURITY_POLICY = APP_CSP_DIRECTIVES.join("; ");

export function capacitorNetworkFlags(env?: {
  CAPACITOR_SERVER_URL?: string;
  CAPACITOR_ALLOW_CLEARTEXT?: string;
}) {
  const url = (env?.CAPACITOR_SERVER_URL ?? process.env.CAPACITOR_SERVER_URL)?.trim() || "";
  const allowCleartext =
    (env?.CAPACITOR_ALLOW_CLEARTEXT ?? process.env.CAPACITOR_ALLOW_CLEARTEXT) === "true";
  if (url.startsWith("http://") && !allowCleartext) {
    throw new Error(
      "CAPACITOR_SERVER_URL must use https:// for a shipping Android build. Set CAPACITOR_ALLOW_CLEARTEXT=true only for LAN debug."
    );
  }
  return {
    url: url || undefined,
    cleartext: allowCleartext,
    allowMixedContent: false,
  };
}
