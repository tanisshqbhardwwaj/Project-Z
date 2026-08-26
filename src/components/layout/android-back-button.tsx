"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/platform/native";

export function AndroidBackButton() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    let remove: (() => void) | undefined;

    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            router.back();
          } else {
            void App.minimizeApp();
          }
        })
      )
      .then((handle) => {
        if (cancelled) void handle?.remove();
        else remove = () => void handle?.remove();
      })
      .catch(() => {
        /* @capacitor/app not available in this shell */
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
