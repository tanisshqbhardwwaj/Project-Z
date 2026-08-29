import { Check } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { FlowStep } from "@/components/marketing/shared/flow-step";

const OPERATIONS_FEATURES = [
  "Product & inventory management",
  "Barcode scanner",
  "Barcode generation & printing",
  "Purchase management",
  "Supplier management",
  "Low-stock alerts",
  "Customer ledger (udhaar)",
  "Profit reports",
  "Excel / CSV import & export",
  "Cash management",
] as const;

const FLOW_STEPS = ["Products", "Inventory", "Sales", "Invoice", "Payment", "Profit"];

export function OperationsFlowSection() {
  return (
    <SectionShell
      id="operations"
      eyebrow="BUSINESS OPERATIONS"
      title="More Than Just Billing"
      description="After creating invoices, manage the operations behind those invoices — products, stock, purchases, and profit — all connected."
      className="bg-[#f6f7fb]"
    >
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <p className="mb-6 text-center text-sm font-medium text-slate-500">
          How your business flows through Project Z
        </p>
        <FlowStep steps={[...FLOW_STEPS]} />
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATIONS_FEATURES.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
