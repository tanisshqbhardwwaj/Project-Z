import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";
import { isServiceVerticalEnabled } from "@/lib/org/service-vertical";

const INDUSTRIES = [
  {
    title: "Store Management",
    items: ["Billing", "Inventory", "Customers", "Sales", "Purchases", "Expenses"],
  },
  {
    title: "Service Management",
    items: [
      "Customer management",
      "Invoices & payments",
      "Restaurants & cafes",
      "Salons & repairs",
      "Expenses",
      "Business records",
    ],
    hiddenWhenServiceDisabled: true,
  },
  {
    title: "Contractors",
    items: ["Work orders", "Project expenses", "Partners", "Client billing", "Profit tracking"],
  },
  {
    title: "Architects",
    items: ["Design projects", "Client billing", "Partner management", "Expenses", "Project tracking"],
  },
] as const;

export function IndustriesSection() {
  const industries = INDUSTRIES.filter(
    (industry) =>
      !("hiddenWhenServiceDisabled" in industry && industry.hiddenWhenServiceDisabled) ||
      isServiceVerticalEnabled()
  );

  return (
    <SectionShell
      id="industries"
      eyebrow="FOR EVERY BUSINESS"
      title="One Platform. Different Businesses."
      description="Whether you run a store, serve clients, or manage projects — start with billing and add what you need as you grow."
      className={mk.sectionAlt}
    >
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => (
          <article key={industry.title} className={cn("rounded-2xl border p-6 shadow-sm", mk.card)}>
            <h3 className={cn("text-base font-semibold lg:text-lg", mk.heading)}>{industry.title}</h3>
            <ul className="mt-4 space-y-3">
              {industry.items.map((item) => (
                <li key={item} className={cn("flex items-center gap-2.5 text-sm sm:text-base", mk.body)}>
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
