import { Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { FlowStep } from "@/components/marketing/shared/flow-step";

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
      className="bg-[#f6f7fb]"
      headingClassName="text-2xl sm:text-3xl"
      innerClassName="lg:py-16"
    >
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project A
          </p>
          <FlowStep steps={PROJECT_A_STEPS} compact />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project B
          </p>
          <FlowStep steps={PROJECT_B_STEPS} compact />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Manage multiple projects independently inside one account.
      </p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {PROJECT_FEATURES.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
