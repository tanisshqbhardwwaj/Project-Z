import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { AddonServicesBlock } from "@/components/marketing/sections/addon-services-section";
import {
  BILLING_PLANS,
  PLAN_ORDER,
  SETUP_FEE_EARLY_BIRD_PAISE,
  SETUP_FEE_REGULAR_PAISE,
  formatINRFromPaise,
} from "@/lib/billing/plans";

export function PublicPricing() {
  const showSetup = SETUP_FEE_REGULAR_PAISE > 0 || SETUP_FEE_EARLY_BIRD_PAISE > 0;

  return (
    <div className="space-y-12">
    <section className="space-y-10" aria-labelledby="pricing-heading">
      <div className="max-w-xl space-y-3">
        <SectionEyebrow>PRICING</SectionEyebrow>
        <h1 id="pricing-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Simple plans. Clear monthly rates.
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Starting rates for a single business. Talk to us for yearly billing or more than one location.
        </p>
        <Link
          href="/pricing/compare"
          className="inline-flex text-sm font-medium text-slate-950 underline-offset-2 hover:underline"
        >
          Compare all features →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLAN_ORDER.map((code) => {
          const plan = BILLING_PLANS[code];
          const featured = Boolean(plan.mostPopular);
          return (
            <article
              key={plan.code}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                featured
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{plan.name}</h2>
                {featured ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-200">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">
                {formatINRFromPaise(plan.monthlyPaise)}
                <span
                  className={cn(
                    "ml-1 text-sm font-medium",
                    featured ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  /mo
                </span>
              </p>
              {plan.introLabel ? (
                <p className={cn("mt-1 text-sm font-medium", featured ? "text-emerald-300" : "text-emerald-700")}>
                  {plan.introLabel}
                </p>
              ) : null}
              <p className={cn("mt-1 text-sm", featured ? "text-slate-400" : "text-slate-500")}>
                {plan.storageLabel} cloud · {plan.tagline}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        featured ? "text-emerald-400" : "text-emerald-600"
                      )}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={cn(
                  "mt-auto pt-6 text-sm font-medium hover:underline",
                  featured ? "text-white" : "text-slate-950"
                )}
              >
                Contact for more details →
              </a>
            </article>
          );
        })}
      </div>
      {showSetup ? (
        <p className="text-xs text-slate-500">
          Setup: {formatINRFromPaise(SETUP_FEE_EARLY_BIRD_PAISE)} early bird (first 100) ·{" "}
          {formatINRFromPaise(SETUP_FEE_REGULAR_PAISE)} regular
        </p>
      ) : null}
    </section>
    <AddonServicesBlock />
    </div>
  );
}
