import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>
  );
}
