export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  );
}

export function isCapacitorNative(): boolean {
  const cap = (
    globalThis as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function capacitorPlatform(): string | null {
  const cap = (
    globalThis as unknown as {
      Capacitor?: { getPlatform?: () => string };
    }
  ).Capacitor;
  return cap?.getPlatform?.() ?? null;
}

export function isCapacitorAndroid(): boolean {
  return capacitorPlatform() === "android";
}

export function isNativeShell(): boolean {
  return isTauriRuntime() || isCapacitorNative();
}

export const NATIVE_APP_UA_MARK = "BusinessOSNative";

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauriRuntime()) return null;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: { invoke?: (c: string, a?: unknown) => Promise<T> };
    __TAURI__?: { core?: { invoke?: (c: string, a?: unknown) => Promise<T> } };
  };
  const invoke = w.__TAURI_INTERNALS__?.invoke ?? w.__TAURI__?.core?.invoke;
  if (!invoke) return null;
  return invoke(cmd, args);
}
