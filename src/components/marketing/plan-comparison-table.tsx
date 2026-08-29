import Link from "next/link";
import { Fragment } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
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
        <Check className="h-5 w-5 text-emerald-600" aria-label="Included" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-slate-300" title="Not included">
        <Minus className="h-4 w-4" aria-label="Not included" />
      </span>
    );
  }
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

export function PlanComparisonTable() {
  const headers = comparisonPlanHeaders();

  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <SectionEyebrow>COMPARE PLANS</SectionEyebrow>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Full feature comparison
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          See exactly what is included in Basic, Starter, Business, and Professional. Add-on
          services are available on custom pricing —{" "}
          <Link href="/pricing#contact" className="font-medium text-slate-950 underline-offset-2 hover:underline">
            talk to our team
          </Link>
          .
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f6f7fb]">
                <th scope="col" className="sticky left-0 z-10 min-w-[220px] bg-[#f6f7fb] px-5 py-4 text-sm font-semibold text-slate-950">
                  Feature
                </th>
                {headers.map((h) => (
                  <th
                    key={h.code}
                    scope="col"
                    className={cn(
                      "min-w-[140px] px-4 py-4 text-center",
                      h.mostPopular && "bg-slate-950 text-white"
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
                      <p className={cn("text-lg font-extrabold", h.mostPopular ? "text-white" : "text-slate-950")}>
                        {h.price}
                        <span className={cn("text-xs font-medium", h.mostPopular ? "text-slate-400" : "text-slate-500")}>
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
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td
                      colSpan={PLAN_ORDER.length + 1}
                      className="sticky left-0 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {category.name}
                    </td>
                  </tr>
                  {category.rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="sticky left-0 bg-white px-5 py-3.5 text-sm text-slate-700">{row.feature}</td>
                      {PLAN_ORDER.map((code) => {
                        const header = headers.find((h) => h.code === code);
                        return (
                          <td
                            key={code}
                            className={cn(
                              "px-4 py-3.5 text-center",
                              header?.mostPopular && "bg-slate-950/5"
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
              header.mostPopular ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white"
            )}
          >
            <div className={cn("border-b px-5 py-4", header.mostPopular ? "border-slate-800" : "border-slate-100")}>
              {header.mostPopular ? (
                <span className="mb-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium">
                  Most popular
                </span>
              ) : null}
              <h2 className="text-lg font-semibold">{header.name}</h2>
              <p className="mt-1 text-2xl font-extrabold">
                {header.price}
                <span className={cn("ml-1 text-sm font-medium", header.mostPopular ? "text-slate-400" : "text-slate-500")}>
                  /mo
                </span>
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {PLAN_COMPARISON_CATEGORIES.map((category) => (
                <div key={category.id}>
                  <p
                    className={cn(
                      "px-5 py-2 text-xs font-semibold uppercase tracking-wide",
                      header.mostPopular ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {category.name}
                  </p>
                  <ul className={cn("px-5 pb-3", header.mostPopular ? "text-slate-200" : "text-slate-700")}>
                    {category.rows.map((row) => {
                      const value = row.values[header.code as BillingPlan];
                      return (
                        <li key={row.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                          <span className={header.mostPopular ? "text-slate-300" : "text-slate-600"}>
                            {row.feature}
                          </span>
                          <span className="shrink-0 text-right">
                            {value === true ? (
                              <Check className={cn("h-4 w-4", header.mostPopular ? "text-emerald-400" : "text-emerald-600")} />
                            ) : value === false ? (
                              <X className="h-4 w-4 text-slate-400" />
                            ) : (
                              <span className={cn("text-xs font-medium", header.mostPopular ? "text-white" : "text-slate-900")}>
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

      <p className="text-sm text-slate-500">
        Project management, partners, and web access are included on all plans. iOS app coming soon.
        WhatsApp invoicing is available as an add-on from Basic. Multi-store is available as an
        add-on from Business. Need custom setup?{" "}
        <Link href="/pricing#contact" className="font-medium text-slate-950 underline-offset-2 hover:underline">
          Contact us for add-on pricing
        </Link>
        .
      </p>
    </div>
  );
}
