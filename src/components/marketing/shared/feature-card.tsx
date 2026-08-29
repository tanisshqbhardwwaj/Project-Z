import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  emphasis?: boolean;
  compact?: boolean;
};

export function FeatureCard({ icon: Icon, title, body, emphasis, compact }: FeatureCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-5",
        emphasis
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-900",
        compact && "p-4"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          emphasis ? "bg-white/10" : "bg-[#f6f7fb]"
        )}
      >
        <Icon className={cn("h-4 w-4", emphasis ? "text-white" : "text-slate-700")} />
      </span>
      <h3 className={cn("mt-3 font-semibold", compact ? "text-sm" : "text-base")}>{title}</h3>
      <p
        className={cn(
          "mt-2 leading-relaxed",
          compact ? "text-xs" : "text-sm",
          emphasis ? "text-slate-300" : "text-slate-600"
        )}
      >
        {body}
      </p>
    </article>
  );
}
