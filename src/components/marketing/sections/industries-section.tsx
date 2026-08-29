import { Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";

const INDUSTRIES = [
  {
    title: "Retail & Stores",
    items: ["Billing", "Inventory", "Customers", "Sales", "Expenses"],
  },
  {
    title: "Contractors",
    items: ["Project management", "Project expenses", "Partners", "Billing", "Profit tracking"],
  },
  {
    title: "Architects",
    items: ["Client billing", "Project expenses", "Partner management", "Project tracking"],
  },
  {
    title: "Builders & Renovation Teams",
    items: ["Project-wise expenses", "Billing", "Partners", "Payments", "Profit tracking"],
  },
  {
    title: "Service Businesses",
    items: ["Customer management", "Invoices", "Payments", "Expenses", "Business records"],
  },
] as const;

export function IndustriesSection() {
  return (
    <SectionShell
      id="industries"
      eyebrow="FOR EVERY BUSINESS"
      title="One Platform. Different Businesses."
      description="Whether you run a shop, manage construction sites, or serve clients — start with billing and add what you need as you grow."
      className="bg-[#f6f7fb]"
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((industry) => (
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
