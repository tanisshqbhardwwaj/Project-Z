"use client";

import { useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  BUSINESSOS_MARK_DARK_PATH,
  BUSINESSOS_MARK_LIGHT_PATH,
  BUSINESSOS_MARK_PATH,
  BUSINESSOS_LOGO_PATH,
  ECONSOLE_MARK_DARK_PATH,
  ECONSOLE_MARK_LIGHT_PATH,
  ECONSOLE_MARK_PATH,
  ECONSOLE_LOGO_PATH,
} from "@/lib/brand/constants";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme/theme";

type BrandMarkProps = {
  className?: string;
};

function useResolvedTheme() {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
}

function ThemeMark({
  className,
  lightSrc,
  darkSrc,
  fallbackSrc,
  alt = "",
}: BrandMarkProps & {
  lightSrc: string;
  darkSrc: string;
  fallbackSrc: string;
  alt?: string;
}) {
  const theme = useResolvedTheme();
  const preferred = theme === "dark" ? darkSrc : lightSrc;
  const [src, setSrc] = useState(preferred);

  useEffect(() => {
    setSrc(preferred);
  }, [preferred]);

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      onError={() => {
        if (src !== fallbackSrc) setSrc(fallbackSrc);
      }}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

/** Company icon mark (E-console) — switches for light/dark theme. */
export function EConsoleMark({ className }: BrandMarkProps) {
  return (
    <ThemeMark
      className={className}
      lightSrc={ECONSOLE_MARK_LIGHT_PATH}
      darkSrc={ECONSOLE_MARK_DARK_PATH}
      fallbackSrc={ECONSOLE_MARK_PATH}
    />
  );
}

/** Product/app icon mark (BusinessOS B). Internal name retained for compatibility. */
export function ProjectZMark({ className }: BrandMarkProps) {
  return (
    <ThemeMark
      className={className}
      lightSrc={BUSINESSOS_MARK_LIGHT_PATH}
      darkSrc={BUSINESSOS_MARK_DARK_PATH}
      fallbackSrc={BUSINESSOS_MARK_PATH}
    />
  );
}

/** Full E-console logo lockup (icon + wordmark + tagline). */
export function EConsoleLogo({ className }: BrandMarkProps) {
  return (
    <img
      src={ECONSOLE_LOGO_PATH}
      alt="E-console — Powering Digital Possibilities"
      className={cn("h-auto w-full max-w-[280px] object-contain", className)}
    />
  );
}

/** Full BusinessOS logo lockup (icon + wordmark + tagline). */
export function BusinessOSLogo({ className }: BrandMarkProps) {
  return (
    <img
      src={BUSINESSOS_LOGO_PATH}
      alt="BusinessOS — Manage. Automate. Grow."
      className={cn("h-auto w-full max-w-[320px] object-contain", className)}
    />
  );
}
