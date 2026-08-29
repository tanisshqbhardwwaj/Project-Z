import {
  FileText,
  History,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  Share2,
  ShoppingCart,
  Users,
} from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { FeatureCard } from "@/components/marketing/shared/feature-card";

const BILLING_FEATURES: Array<{
  icon: typeof Receipt;
  title: string;
  body: string;
  emphasis?: boolean;
}> = [
  {
    icon: Receipt,
    title: "Professional Invoice Generation",
    body: "Create clean, GST-ready invoices that look professional and build customer trust.",
    emphasis: true,
  },
  {
    icon: Users,
    title: "Customer Management",
    body: "Keep customer details, purchase history, and contact info organized in one place.",
  },
  {
    icon: ShoppingCart,
    title: "Sales Management",
    body: "Record every sale at the counter with items, quantities, and payment method.",
  },
  {
    icon: History,
    title: "Invoice History",
    body: "Find any past bill instantly — search by customer, date, or invoice number.",
  },
  {
    icon: Printer,
    title: "PDF & Print Invoices",
    body: "Print thermal or A4 invoices, or save as PDF for records and sharing.",
  },
  {
    icon: Share2,
    title: "Digital Billing",
    body: "Share invoices digitally and keep paperless records for every transaction.",
  },
  {
    icon: FileText,
    title: "Payment Tracking & Reminders",
    body: "Track outstanding payments and send reminders on Professional plans and above.",
  },
  {
    icon: RotateCcw,
    title: "Returns & Exchanges",
    body: "Process returns with stock restored correctly — no manual adjustments needed.",
  },
  {
    icon: Percent,
    title: "Offers & Discounts",
    body: "Apply discounts and promotional offers directly at billing time.",
  },
];

export function BillingFeaturesSection() {
  return (
    <SectionShell
      id="billing"
      eyebrow="BILLING & SALES"
      title="Everything You Need for Better Billing"
      description="A complete billing platform — not just a basic invoice generator. Create, manage, and track every sale with confidence."
      className="bg-white"
      innerClassName="lg:py-24"
      headingClassName="sm:text-[2.75rem]"
    >
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BILLING_FEATURES.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} emphasis={f.emphasis} />
        ))}
      </div>
    </SectionShell>
  );
}
