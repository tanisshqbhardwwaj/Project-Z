import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    q: "Is BusinessOS only for shops?",
    a: "No. Billing and invoicing is the starting point for every business. Retailers use inventory and sales; contractors and architects add project management, expenses, and partner tracking on the same platform.",
  },
  {
    q: "Are GST invoices and PDF printing included?",
    a: "Yes. Set your business profile and tax rate once, then create GST-ready invoices from day one. Print thermal or A4 bills, or save as PDF.",
  },
  {
    q: "Does it work offline?",
    a: "Yes on Android and Windows — create bills offline and sync when the network returns. The web app needs connectivity.",
  },
  {
    q: "Which plan do I need for inventory vs projects?",
    a: "Basic covers billing and limited inventory. Starter adds staff, udhaar ledger, activity trail, expenses, and import/export. Business adds full inventory, purchases, customer analytics, attendance, returns, and offers. Professional adds payroll, payment reminders, and advanced reports. Project management is available across plans.",
  },
  {
    q: "When are payment reminders available?",
    a: "Payment reminders are included on the Professional plan (₹1,499/mo).",
  },
  {
    q: "Can I manage multiple projects?",
    a: "Yes. Create separate projects with their own clients, partners, expenses, and payments — all inside one account.",
  },
] as const;

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      eyebrow="FAQ"
      title="Common Questions"
      className={mk.sectionAlt}
      centered
    >
      <dl className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2">
        {FAQ.map((item) => (
          <div key={item.q} className={cn(mk.card, "p-6")}>
            <dt className={cn("text-base font-semibold lg:text-lg", mk.heading)}>{item.q}</dt>
            <dd className={cn("mt-3 text-sm leading-relaxed sm:text-base", mk.body)}>{item.a}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
