export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "pz-theme";

const themeListeners = new Set<() => void>();

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  themeListeners.add(onStoreChange);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (getStoredTheme() !== "system") return;
    applyTheme("system");
    notifyThemeListeners();
  };

  media.addEventListener("change", onSystemChange);

  return () => {
    themeListeners.delete(onStoreChange);
    media.removeEventListener("change", onSystemChange);
  };
}

export function getThemeSnapshot(): ResolvedTheme {
  return getResolvedTheme();
}

export function getThemeServerSnapshot(): ResolvedTheme {
  return "light";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);

  if (theme === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  root.style.colorScheme = resolved;
  notifyThemeListeners();
  return resolved;
}

export function getResolvedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function toggleTheme(): ResolvedTheme {
  const next = getResolvedTheme() === "dark" ? "light" : "dark";
  return applyTheme(next);
}

export function initThemeListener(onChange?: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getStoredTheme() !== "system") return;
    const resolved = applyTheme("system");
    onChange?.(resolved);
  };

  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
