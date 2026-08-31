import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { AddonServicesBlock } from "@/components/marketing/sections/addon-services-section";
import { mk } from "@/components/marketing/marketing-theme";
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
    <div className="space-y-16">
      <section className="space-y-12" aria-labelledby="pricing-heading">
        <div className="max-w-2xl space-y-4">
          <SectionEyebrow>PRICING</SectionEyebrow>
          <h1 id="pricing-heading" className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl", mk.heading)}>
            Simple plans. Clear monthly rates.
          </h1>
          <p className={cn("text-base leading-relaxed sm:text-lg", mk.body)}>
            Starting rates for a single business. Talk to us for yearly billing or more than one location.
          </p>
          <Link
            href="/pricing/compare"
            className={cn("inline-flex text-sm font-medium underline-offset-2 hover:underline sm:text-base", mk.heading)}
          >
            Compare all features →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {PLAN_ORDER.map((code) => {
            const plan = BILLING_PLANS[code];
            const featured = Boolean(plan.mostPopular);
            return (
              <article
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 lg:p-8",
                  featured
                    ? "border-slate-900 bg-slate-950 text-white dark:border-slate-600"
                    : cn(mk.card, mk.heading)
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold lg:text-lg">{plan.name}</h2>
                  {featured ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-200">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-extrabold tracking-tight lg:text-4xl">
                  {formatINRFromPaise(plan.monthlyPaise)}
                  <span className={cn("ml-1 text-sm font-medium", featured ? "text-slate-400" : mk.muted)}>
                    /mo
                  </span>
                </p>
                {plan.introLabel ? (
                  <p className={cn("mt-2 text-sm font-medium", featured ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-400")}>
                    {plan.introLabel}
                  </p>
                ) : null}
                <p className={cn("mt-2 text-sm", featured ? "text-slate-400" : mk.muted)}>
                  {plan.storageLabel} cloud · {plan.tagline}
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm sm:text-base">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          featured ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      />
                      <span className={featured ? "text-slate-200" : mk.body}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={cn(
                    "mt-auto pt-8 text-sm font-medium hover:underline sm:text-base",
                    featured ? "text-white" : mk.heading
                  )}
                >
                  Contact for more details →
                </a>
              </article>
            );
          })}
        </div>
        {showSetup ? (
          <p className={cn("text-xs sm:text-sm", mk.muted)}>
            Setup: {formatINRFromPaise(SETUP_FEE_EARLY_BIRD_PAISE)} early bird (first 100) ·{" "}
            {formatINRFromPaise(SETUP_FEE_REGULAR_PAISE)} regular
          </p>
        ) : null}
      </section>
      <AddonServicesBlock />
    </div>
  );
}
