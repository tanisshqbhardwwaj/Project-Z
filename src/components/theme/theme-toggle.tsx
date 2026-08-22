"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
  toggleTheme,
} from "@/lib/theme/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => toggleTheme()}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
