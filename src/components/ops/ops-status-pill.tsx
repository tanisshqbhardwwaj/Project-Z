"use client";

import { cn } from "@/lib/utils";

const STATUS_TOKENS: Record<string, string> = {
  ACTIVE:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/25",
  TRIAL: "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/25",
  PENDING_PAYMENT:
    "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/25",
  PAST_DUE:
    "bg-orange-500/15 text-orange-800 dark:text-orange-300 ring-1 ring-orange-500/25",
  CANCELLED:
    "bg-muted text-muted-foreground ring-1 ring-border",
};

export function OpsStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_TOKENS[status] ?? "bg-muted text-muted-foreground ring-1 ring-border",
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function OpsPlanPill({
  plan,
  className,
}: {
  plan: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20",
        className
      )}
    >
      {plan.replace(/_/g, " ")}
    </span>
  );
}
