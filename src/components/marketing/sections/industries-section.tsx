import { Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";
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
      className="bg-[#f6f7fb]"
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => (
          <article
            key={industry.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-950">{industry.title}</h3>
            <ul className="mt-3 space-y-2">
              {industry.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
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
