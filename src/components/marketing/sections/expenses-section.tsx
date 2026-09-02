import { ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";

const EXPENSE_FEATURES = [
  "Business expenses",
  "Project-wise expenses",
  "Expense categorization",
  "Cash tracking",
  "Profit visibility",
  "Expense history",
  "Digital records",
] as const;

function VerticalFlow({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-3">
          <span className={cn("rounded-xl border px-5 py-2.5 text-sm font-medium shadow-sm sm:text-base", mk.card, mk.heading)}>
            {step}
          </span>
          {i < steps.length - 1 ? (
            <ArrowDown className={cn("h-4 w-4", mk.muted)} aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ExpensesSection() {
  return (
    <SectionShell
      eyebrow="EXPENSE MANAGEMENT"
      title="Know Where Your Money Goes"
      description="Track expenses digitally instead of relying on notebooks, paper bills, or scattered records."
      className={mk.sectionBase}
    >
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className={cn("rounded-2xl border p-8 text-center", mk.card, mk.sectionAlt)}>
          <p className={cn("mb-6 text-xs font-semibold uppercase tracking-wide", mk.muted)}>General business</p>
          <VerticalFlow steps={["Income", "Expenses", "Profit"]} />
        </div>
        <div className={cn("rounded-2xl border p-8 text-center", mk.card, mk.sectionAlt)}>
          <p className={cn("mb-6 text-xs font-semibold uppercase tracking-wide", mk.muted)}>
            Project-based businesses
          </p>
          <VerticalFlow steps={["Project Income", "Project Expenses", "Project Profit"]} />
        </div>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPENSE_FEATURES.map((item) => (
          <li key={item} className={cn("rounded-2xl border p-5 shadow-sm", mk.card)}>
            <div className={cn("flex items-start gap-3 text-sm sm:text-base", mk.bodyStrong)}>
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {item}
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
