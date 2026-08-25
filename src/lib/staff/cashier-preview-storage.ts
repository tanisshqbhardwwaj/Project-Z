const KEY = "pz-cashier-preview";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function readCashierPreviewEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCashierPreviewEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function subscribeCashierPreview(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) onChange();
    };
    window.addEventListener("storage", handler);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", handler);
    };
  }
  return () => listeners.delete(onChange);
}
