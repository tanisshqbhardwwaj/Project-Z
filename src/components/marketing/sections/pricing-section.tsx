import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { outlineCta } from "@/components/marketing/cta";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import {
  BILLING_PLANS,
  PLAN_ORDER,
  formatINRFromPaise,
  type PlanDefinition,
} from "@/lib/billing/plans";

function PlanCard({ plan, featured }: { plan: PlanDefinition; featured?: boolean }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-6 shadow-sm",
        featured
          ? "border-slate-900 bg-slate-950 text-white shadow-lg"
          : "border-slate-200 bg-white text-slate-900"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{plan.name}</h3>
        {featured ? (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
            Most popular
          </span>
        ) : null}
      </div>
      <p className={cn("mt-1 text-sm", featured ? "text-slate-400" : "text-slate-500")}>
        {plan.storageLabel} cloud · {plan.tagline}
      </p>
      <p className="mt-4 text-3xl font-extrabold tracking-tight">
        {formatINRFromPaise(plan.monthlyPaise)}
        <span className={cn("ml-1 text-sm font-medium", featured ? "text-slate-400" : "text-slate-500")}>
          /mo
        </span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.slice(0, 6).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-emerald-400" : "text-emerald-600")}
            />
            <span className={featured ? "text-slate-200" : "text-slate-600"}>{f}</span>
          </li>
        ))}
        {plan.features.length > 6 ? (
          <li className={cn("text-sm", featured ? "text-slate-400" : "text-slate-500")}>
            + {plan.features.length - 6} more features
          </li>
        ) : null}
      </ul>
      <Button
        asChild
        className={cn(
          "mt-6 w-full rounded-full",
          featured ? "bg-white text-slate-950 hover:bg-slate-100" : outlineCta
        )}
        variant={featured ? "default" : "outline"}
      >
        <Link href="/register">Start with {plan.name}</Link>
      </Button>
    </article>
  );
}

export function PricingSection() {
  return (
    <SectionShell
      id="pricing"
      eyebrow="PRICING"
      title="Simple Plans. Clear Monthly Rates."
      description="Starting rates for a single business. Talk to us for yearly billing, multiple locations, or custom requirements."
      className="bg-[#f6f7fb]"
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((code) => {
          const plan = BILLING_PLANS[code];
          return (
            <PlanCard key={plan.code} plan={plan} featured={plan.mostPopular} />
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/pricing/compare" className="font-medium text-slate-950 underline-offset-2 hover:underline">
          Compare all features
        </Link>
        {" · "}
        Need help choosing?{" "}
        <Link href="/pricing#contact" className="font-medium text-slate-950 underline-offset-2 hover:underline">
          Talk to our team
        </Link>
      </p>
    </SectionShell>
  );
}
