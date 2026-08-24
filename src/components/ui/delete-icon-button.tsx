import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Touch-friendly delete control for tables and lists. */
export function DeleteIconButton({
  className,
  iconClassName,
  label = "Delete",
  showLabel = false,
  ...props
}: ButtonProps & {
  iconClassName?: string;
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive",
        showLabel ? "h-10 min-h-10 gap-2 px-3" : "h-10 min-h-10 w-10 min-w-10 px-0",
        className
      )}
      {...props}
    >
      <Trash2 className={cn("h-4 w-4", iconClassName)} />
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
