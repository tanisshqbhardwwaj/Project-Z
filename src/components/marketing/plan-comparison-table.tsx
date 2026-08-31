import Link from "next/link";
import { Fragment } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import {
  PLAN_COMPARISON_CATEGORIES,
  comparisonPlanHeaders,
  type ComparisonCell,
} from "@/lib/billing/plan-comparison";
import type { BillingPlan } from "@prisma/client";
import { PLAN_ORDER } from "@/lib/billing/plans";

function ComparisonCellDisplay({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center" title="Included">
        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-label="Included" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className={cn("inline-flex items-center justify-center", mk.muted)} title="Not included">
        <Minus className="h-4 w-4" aria-label="Not included" />
      </span>
    );
  }
  return <span className={cn("text-sm font-medium", mk.bodyStrong)}>{value}</span>;
}

export function PlanComparisonTable() {
  const headers = comparisonPlanHeaders();

  return (
    <div className="space-y-12">
      <div className="max-w-3xl space-y-4">
        <SectionEyebrow>COMPARE PLANS</SectionEyebrow>
        <h1 className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl", mk.heading)}>
          Full feature comparison
        </h1>
        <p className={cn("text-base leading-relaxed sm:text-lg", mk.body)}>
          See exactly what is included in Basic, Starter, Business, and Professional. Add-on
          services are available on custom pricing —{" "}
          <Link href="/pricing#contact" className={cn("font-medium underline-offset-2 hover:underline", mk.heading)}>
            talk to our team
          </Link>
          .
        </p>
      </div>

      {/* Desktop table */}
      <div className={cn("hidden overflow-hidden rounded-2xl border shadow-sm lg:block", mk.card)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className={cn("border-b", mk.sectionBorder, mk.sectionAlt)}>
                <th
                  scope="col"
                  className={cn("sticky left-0 z-10 min-w-[220px] px-6 py-5 text-sm font-semibold", mk.sectionAlt, mk.heading)}
                >
                  Feature
                </th>
                {headers.map((h) => (
                  <th
                    key={h.code}
                    scope="col"
                    className={cn(
                      "min-w-[140px] px-4 py-5 text-center",
                      h.mostPopular && "bg-slate-950 text-white dark:bg-slate-800"
                    )}
                  >
                    <div className="space-y-1">
                      {h.mostPopular ? (
                        <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                          Most popular
                        </span>
                      ) : (
                        <span className="block h-[18px]" aria-hidden />
                      )}
                      <p className="text-sm font-semibold">{h.name}</p>
                      <p className={cn("text-lg font-extrabold", h.mostPopular ? "text-white" : mk.heading)}>
                        {h.price}
                        <span className={cn("text-xs font-medium", h.mostPopular ? "text-slate-400" : mk.muted)}>
                          /mo
                        </span>
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_CATEGORIES.map((category) => (
                <Fragment key={category.id}>
                  <tr className={cn("border-b", mk.sectionBorder, mk.sectionAlt)}>
                    <td
                      colSpan={PLAN_ORDER.length + 1}
                      className={cn("sticky left-0 px-6 py-3 text-xs font-semibold uppercase tracking-wide", mk.muted)}
                    >
                      {category.name}
                    </td>
                  </tr>
                  {category.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn("border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30", mk.sectionBorder)}
                    >
                      <td className={cn("sticky left-0 px-6 py-4 text-sm", mk.sectionBase, mk.bodyStrong)}>
                        {row.feature}
                      </td>
                      {PLAN_ORDER.map((code) => {
                        const header = headers.find((h) => h.code === code);
                        return (
                          <td
                            key={code}
                            className={cn(
                              "px-4 py-4 text-center",
                              header?.mostPopular && "bg-slate-950/5 dark:bg-slate-800/30"
                            )}
                          >
                            <ComparisonCellDisplay value={row.values[code as BillingPlan]} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked by plan */}
      <div className="space-y-6 lg:hidden">
        {headers.map((header) => (
          <article
            key={header.code}
            className={cn(
              "overflow-hidden rounded-2xl border",
              header.mostPopular
                ? "border-slate-900 bg-slate-950 text-white dark:border-slate-600"
                : cn(mk.card, mk.heading)
            )}
          >
            <div className={cn("border-b px-6 py-5", header.mostPopular ? "border-slate-800" : mk.sectionBorder)}>
              {header.mostPopular ? (
                <span className="mb-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium">
                  Most popular
                </span>
              ) : null}
              <h2 className="text-lg font-semibold">{header.name}</h2>
              <p className="mt-2 text-2xl font-extrabold">
                {header.price}
                <span className={cn("ml-1 text-sm font-medium", header.mostPopular ? "text-slate-400" : mk.muted)}>
                  /mo
                </span>
              </p>
            </div>
            <div className={cn("divide-y", mk.sectionBorder)}>
              {PLAN_COMPARISON_CATEGORIES.map((category) => (
                <div key={category.id}>
                  <p
                    className={cn(
                      "px-6 py-3 text-xs font-semibold uppercase tracking-wide",
                      header.mostPopular ? "text-slate-400" : mk.muted
                    )}
                  >
                    {category.name}
                  </p>
                  <ul className={cn("px-6 pb-4", header.mostPopular ? "text-slate-200" : mk.bodyStrong)}>
                    {category.rows.map((row) => {
                      const value = row.values[header.code as BillingPlan];
                      return (
                        <li key={row.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                          <span className={header.mostPopular ? "text-slate-300" : mk.body}>{row.feature}</span>
                          <span className="shrink-0 text-right">
                            {value === true ? (
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  header.mostPopular ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
                                )}
                              />
                            ) : value === false ? (
                              <X className={cn("h-4 w-4", mk.muted)} />
                            ) : (
                              <span className={cn("text-xs font-medium", header.mostPopular ? "text-white" : mk.heading)}>
                                {value}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className={cn("text-sm sm:text-base", mk.muted)}>
        Project management, partners, and web access are included on all plans. iOS app coming soon.
        WhatsApp invoicing is available as an add-on from Basic. Multi-store is available as an
        add-on from Business. Need custom setup?{" "}
        <Link href="/pricing#contact" className={cn("font-medium underline-offset-2 hover:underline", mk.heading)}>
          Contact us for add-on pricing
        </Link>
        .
      </p>
    </div>
  );
}
