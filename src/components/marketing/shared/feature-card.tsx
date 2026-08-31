import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mk } from "@/components/marketing/marketing-theme";

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
        "rounded-2xl border p-6",
        emphasis
          ? "border-slate-900 bg-slate-950 text-white dark:border-slate-700"
          : cn(mk.card, "text-slate-900 dark:text-slate-100"),
        compact && "p-5"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          emphasis ? "bg-white/10" : "bg-[#f6f7fb] dark:bg-slate-800"
        )}
      >
        <Icon className={cn("h-5 w-5", emphasis ? "text-white" : "text-slate-700 dark:text-slate-200")} />
      </span>
      <h3 className={cn("mt-4 font-semibold", compact ? "text-sm" : "text-base lg:text-lg")}>{title}</h3>
      <p
        className={cn(
          "mt-2 leading-relaxed",
          compact ? "text-sm" : "text-sm lg:text-base",
          emphasis ? "text-slate-300" : mk.body
        )}
      >
        {body}
      </p>
    </article>
  );
}
