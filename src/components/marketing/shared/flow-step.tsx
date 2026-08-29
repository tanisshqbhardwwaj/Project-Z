import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStepProps = {
  steps: string[];
  className?: string;
  compact?: boolean;
};

export function FlowStep({ steps, className, compact }: FlowStepProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center",
        className
      )}
    >
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2 sm:flex-row">
          <span
            className={cn(
              "rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-medium text-slate-900 shadow-sm",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {step}
          </span>
          {i < steps.length - 1 ? (
            <>
              <ArrowDown className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" aria-hidden />
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
