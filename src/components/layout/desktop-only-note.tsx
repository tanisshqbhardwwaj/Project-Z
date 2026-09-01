"use client";

import { isCapacitorAndroid } from "@/platform/common/native";

export function DesktopOnlyNote({
  feature = "this screen",
}: {
  feature?: string;
}) {
  if (typeof window === "undefined" || !isCapacitorAndroid()) return null;
  return (
    <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
      {feature} is easier on the Windows counter PC. You can still view it here;
      dense tables and bulk CSV work best on desktop.
    </p>
  );
}
