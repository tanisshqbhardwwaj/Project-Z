"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  cycleThemePreference,
  getThemePreferenceServerSnapshot,
  getThemePreferenceSnapshot,
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme/theme";
import { Button } from "@/components/ui/button";
import { Laptop, Moon, Sun } from "lucide-react";

const PREFERENCE_LABEL = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

type AppearanceMenuProps = {
  className?: string;
  /** Compact icon-only trigger (header / corner). */
  variant?: "icon" | "button";
};

/** Cycles Light → Dark → System on each click (no dropdown). */
export function AppearanceMenu({ className, variant = "icon" }: AppearanceMenuProps) {
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

  const ActiveIcon =
    preference === "system" ? Laptop : resolved === "dark" ? Moon : Sun;

  const label = `Appearance: ${PREFERENCE_LABEL[preference]}. Click for next`;

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        title={PREFERENCE_LABEL[preference]}
        onClick={() => cycleThemePreference()}
        className={cn("inline-flex h-9 items-center gap-2 px-3", className)}
      >
        <ActiveIcon className="h-4 w-4 shrink-0" aria-hidden />
        Appearance
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={PREFERENCE_LABEL[preference]}
      onClick={() => cycleThemePreference()}
      className={cn("h-9 w-9 shrink-0 rounded-xl text-muted-foreground", className)}
    >
      <ActiveIcon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
    </Button>
  );
}
