"use client";

import { useSyncExternalStore } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import {
  cycleThemePreference,
  getThemePreferenceServerSnapshot,
  getThemePreferenceSnapshot,
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme/theme";
import { cn } from "@/lib/utils";

const PREFERENCE_LABEL = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemePreferenceSnapshot,
    getThemePreferenceServerSnapshot
  );
  const resolved = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const Icon =
    preference === "system" ? Laptop : resolved === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={`Appearance: ${PREFERENCE_LABEL[preference]}. Click to switch`}
      title={`Appearance: ${PREFERENCE_LABEL[preference]}`}
      onClick={() => cycleThemePreference()}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:h-11 sm:w-11",
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}
