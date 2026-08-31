import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { mk } from "@/components/marketing/marketing-theme";

type FlowStepProps = {
  steps: string[];
  className?: string;
  compact?: boolean;
};

export function FlowStep({ steps, className, compact }: FlowStepProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center",
        className
      )}
    >
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2 sm:flex-row">
          <span
            className={cn(
              "rounded-xl border px-4 py-2.5 text-center font-medium shadow-sm",
              mk.card,
              mk.heading,
              compact ? "text-xs" : "text-sm"
            )}
          >
            {step}
          </span>
          {i < steps.length - 1 ? (
            <>
              <ArrowDown className={cn("h-4 w-4 shrink-0 sm:hidden", mk.muted)} aria-hidden />
              <ArrowRight className={cn("hidden h-4 w-4 shrink-0 sm:block", mk.muted)} aria-hidden />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
