import { ArrowDown, Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";

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
    <div className="flex flex-col items-center gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm">
            {step}
          </span>
          {i < steps.length - 1 ? (
            <ArrowDown className="h-4 w-4 text-slate-400" aria-hidden />
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
      className="bg-white"
    >
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-[#f6f7fb] p-6 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            General business
          </p>
          <VerticalFlow steps={["Income", "Expenses", "Profit"]} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#f6f7fb] p-6 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project-based businesses
          </p>
          <VerticalFlow steps={["Project Income", "Project Expenses", "Project Profit"]} />
        </div>
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPENSE_FEATURES.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-[#f6f7fb] px-4 py-3 text-sm text-slate-700"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
