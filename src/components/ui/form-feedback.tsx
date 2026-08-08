"use client";

import { cn } from "@/lib/utils";

export function FormWarning({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900",
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}

export function FormError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}

export function FormFeedback({
  warning,
  error,
  className,
}: {
  warning?: string;
  error?: string;
  className?: string;
}) {
  if (warning) return <FormWarning className={className}>{warning}</FormWarning>;
  if (error) return <FormError className={className}>{error}</FormError>;
  return null;
}
