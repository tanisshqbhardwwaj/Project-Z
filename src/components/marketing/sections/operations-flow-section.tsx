import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { FlowStep } from "@/components/marketing/shared/flow-step";
import { mk } from "@/components/marketing/marketing-theme";

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
      className={mk.sectionAlt}
    >
      <div className={cn("mt-12 rounded-2xl border p-8 lg:p-10", mk.card)}>
        <p className={cn("mb-8 text-center text-sm font-medium sm:text-base", mk.muted)}>
          How your business flows through BusinessOS
        </p>
        <FlowStep steps={[...FLOW_STEPS]} />
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATIONS_FEATURES.map((item) => (
          <li
            key={item}
            className={cn("flex items-start gap-3 rounded-xl border px-5 py-4 text-sm sm:text-base", mk.card, mk.bodyStrong)}
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
