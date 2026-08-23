"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";

export function ThemeScript() {
  const injected = useRef(false);

  useServerInsertedHTML(() => {
    if (injected.current) return null;
    injected.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  return null;
}
