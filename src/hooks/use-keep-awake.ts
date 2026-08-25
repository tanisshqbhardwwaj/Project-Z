"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "@/lib/platform/native";

/** Keep the screen on while the cashier is billing (Android counter). */
export function useKeepAwake(active = true) {
  useEffect(() => {
    if (!active || !isCapacitorNative()) return;
    let released = false;
    void (async () => {
      try {
        const mod = await import("@capacitor-community/keep-awake");
        await mod.KeepAwake.keepAwake();
      } catch {
        /* optional plugin */
      }
    })();
    return () => {
      if (released) return;
      released = true;
      void (async () => {
        try {
          const mod = await import("@capacitor-community/keep-awake");
          await mod.KeepAwake.allowSleep();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [active]);
}
