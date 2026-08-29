import { Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";

const GROWTH_BENEFITS = [
  "Professional invoices improve customer experience",
  "Digital records improve organization",
  "Inventory visibility reduces mistakes",
  "Expense tracking improves financial control",
  "Reports help understand business performance",
  "Project-wise tracking helps identify profitable projects",
  "Better records support better decisions",
] as const;

export function GrowthSection() {
  return (
    <SectionShell
      eyebrow="BUSINESS GROWTH"
      title="Built Not Just to Manage Your Business — But to Help It Grow."
      description="Practical tools that help you run better today and make smarter decisions tomorrow."
      className="bg-white"
      innerClassName="lg:py-16"
    >
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {GROWTH_BENEFITS.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
