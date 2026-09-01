import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPageHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function SettingsTwoColumn({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-8",
        className
      )}
    >
      <div className="min-w-0 space-y-5">{left}</div>
      <div className="min-w-0 space-y-5">{right}</div>
    </div>
  );
}

export const settingsCardClass = "rounded-2xl border-0 shadow-md";

export function SettingsCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 auto-rows-min items-start gap-4 lg:grid-cols-2 lg:gap-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettingsScrollPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-h-[min(70vh,720px)] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin]",
        className
      )}
    >
      {children}
    </div>
  );
}
