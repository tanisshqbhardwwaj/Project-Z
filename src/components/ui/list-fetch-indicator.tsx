"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ListFetchIndicatorProps = {
  active: boolean;
  className?: string;
};

/** Small inline indicator while a list refetches without unmounting the page. */
export function ListFetchIndicator({ active, className }: ListFetchIndicatorProps) {
  if (!active) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      Updating…
    </span>
  );
}
