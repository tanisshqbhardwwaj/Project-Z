import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { outlineCta } from "@/components/marketing/cta";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";
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
        "flex flex-col rounded-2xl border p-6 shadow-sm lg:p-7",
        featured
          ? "border-slate-900 bg-slate-950 text-white dark:border-slate-600"
          : cn(mk.card, mk.heading)
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold lg:text-lg">{plan.name}</h3>
        {featured ? (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
            Most popular
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 text-sm", featured ? "text-slate-400" : mk.muted)}>
        {plan.storageLabel} cloud · {plan.tagline}
      </p>
      <p className="mt-5 text-3xl font-extrabold tracking-tight lg:text-4xl">
        {formatINRFromPaise(plan.monthlyPaise)}
        <span className={cn("ml-1 text-sm font-medium", featured ? "text-slate-400" : mk.muted)}>
          /mo
        </span>
      </p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.slice(0, 6).map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm sm:text-base">
            <Check
              className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400")}
            />
            <span className={featured ? "text-slate-200" : mk.body}>{f}</span>
          </li>
        ))}
        {plan.features.length > 6 ? (
          <li className={cn("text-sm", featured ? "text-slate-400" : mk.muted)}>
            + {plan.features.length - 6} more features
          </li>
        ) : null}
      </ul>
      <Button
        asChild
        className={cn(
          "mt-8 w-full rounded-full",
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
      className={mk.sectionAlt}
    >
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((code) => {
          const plan = BILLING_PLANS[code];
          return <PlanCard key={plan.code} plan={plan} featured={plan.mostPopular} />;
        })}
      </div>
      <p className={cn("mt-8 text-center text-sm sm:text-base", mk.muted)}>
        <Link href="/pricing/compare" className={cn("font-medium underline-offset-2 hover:underline", mk.heading)}>
          Compare all features
        </Link>
        {" · "}
        Need help choosing?{" "}
        <Link href="/pricing#contact" className={cn("font-medium underline-offset-2 hover:underline", mk.heading)}>
          Talk to our team
        </Link>
      </p>
    </SectionShell>
  );
}
