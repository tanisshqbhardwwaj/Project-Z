import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { FlowStep } from "@/components/marketing/shared/flow-step";
import { mk } from "@/components/marketing/marketing-theme";

const PROJECT_FEATURES = [
  "Create and manage multiple projects",
  "Track project-wise income",
  "Track project-wise expenses",
  "Manage project partners",
  "Keep partner information separate by project",
  "Track payments and expenses",
  "Understand project profitability",
  "Maintain organized digital records",
] as const;

const PROJECT_A_STEPS = ["Client", "Partners", "Expenses", "Payments", "Profit"];
const PROJECT_B_STEPS = ["Client", "Partners", "Expenses", "Payments", "Profit"];

export function ProjectsSection() {
  return (
    <SectionShell
      id="projects"
      eyebrow="PROJECT MANAGEMENT"
      title="Running Projects? Manage Them Too."
      description="Built for contractors, architects, and project-based businesses that need more than billing."
      className={mk.sectionAlt}
    >
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className={cn("rounded-2xl border p-6 lg:p-8", mk.card)}>
          <p className={cn("mb-6 text-xs font-semibold uppercase tracking-wide", mk.muted)}>Project A</p>
          <FlowStep steps={PROJECT_A_STEPS} compact />
        </div>
        <div className={cn("rounded-2xl border p-6 lg:p-8", mk.card)}>
          <p className={cn("mb-6 text-xs font-semibold uppercase tracking-wide", mk.muted)}>Project B</p>
          <FlowStep steps={PROJECT_B_STEPS} compact />
        </div>
      </div>
      <p className={cn("mt-6 text-center text-sm sm:text-base", mk.muted)}>
        Manage multiple projects independently inside one account.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {PROJECT_FEATURES.map((item) => (
          <li key={item} className={cn("flex items-start gap-3 text-sm sm:text-base", mk.body)}>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
