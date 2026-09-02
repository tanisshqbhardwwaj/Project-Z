import { isCapacitorNative, isNativeShell, isTauriRuntime, tauriInvoke } from "@/platform/common/native";

export type NativeTokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
};

const STORAGE_KEY = "businessos.native.tokens";

async function readFromCapacitor(): Promise<NativeTokenPair | null> {
  if (!isCapacitorNative()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return null;
    return JSON.parse(value) as NativeTokenPair;
  } catch {
    return null;
  }
}

async function writeToCapacitor(tokens: NativeTokenPair | null): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (!tokens) {
      await Preferences.remove({ key: STORAGE_KEY });
      return;
    }
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(tokens) });
  } catch {
    /* ignore */
  }
}

async function readFromTauri(): Promise<NativeTokenPair | null> {
  if (!isTauriRuntime()) return null;
  const raw = await tauriInvoke<string | null>("load_native_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NativeTokenPair;
  } catch {
    return null;
  }
}

async function writeToTauri(tokens: NativeTokenPair | null): Promise<void> {
  if (!isTauriRuntime()) return;
  if (!tokens) {
    await tauriInvoke("clear_native_tokens");
    return;
  }
  await tauriInvoke("save_native_tokens", { payload: JSON.stringify(tokens) });
}

export async function loadNativeTokens(): Promise<NativeTokenPair | null> {
  if (!isNativeShell()) return null;
  if (isTauriRuntime()) return readFromTauri();
  if (isCapacitorNative()) return readFromCapacitor();
  return null;
}

export async function saveNativeTokens(tokens: NativeTokenPair): Promise<void> {
  if (!isNativeShell()) return;
  if (isTauriRuntime()) await writeToTauri(tokens);
  else if (isCapacitorNative()) await writeToCapacitor(tokens);
}

export async function clearNativeTokens(): Promise<void> {
  if (!isNativeShell()) return;
  if (isTauriRuntime()) await writeToTauri(null);
  else if (isCapacitorNative()) await writeToCapacitor(null);
}

export async function getNativeAccessToken(): Promise<string | null> {
  const tokens = await loadNativeTokens();
  return tokens?.accessToken ?? null;
}
