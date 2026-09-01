import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  PRODUCT_NAME,
  PRODUCT_SUBTITLE,
  PRODUCT_TAGLINE,
} from "@/lib/brand/constants";
import { MarketingInvoicePreview } from "@/components/marketing/marketing-invoice-preview";

const TRUST_ITEMS = [
  "Professional invoices",
  "PDF & print invoices",
  "Digital invoice sharing",
  "Customer management",
  "Invoice history",
  "Faster billing",
  "Paperless records",
  "Better business presentation",
] as const;

export function HeroSection() {
  return (
    <section className={cn("relative overflow-hidden border-b", mk.sectionBorder, mk.sectionBase)}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.15),transparent)]"
        aria-hidden
      />
      <div className={cn(mk.container, "grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-16 xl:gap-20 2xl:gap-16 lg:py-28")}>
        <div className="relative space-y-8 lg:max-w-none xl:pr-4">
          <SectionEyebrow>econsole.in</SectionEyebrow>
          <h1 className={cn("text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]", mk.heading)}>
            {COMPANY_NAME}
          </h1>
          <p className={cn("text-xl font-semibold sm:text-2xl", mk.bodyStrong)}>{COMPANY_TAGLINE}</p>
          <p className={cn("max-w-2xl text-base leading-relaxed sm:text-lg lg:text-xl", mk.body)}>
            Run billing, inventory, expenses, and projects from one place on econsole.in — built for
            Indian retailers, contractors, architects, and service businesses.
          </p>

          <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-blue-50/50 p-6 shadow-sm dark:border-violet-900/50 dark:from-violet-950/40 dark:to-blue-950/30">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-violet-200/60 dark:bg-slate-900 dark:ring-violet-800/60">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-700/80 dark:text-violet-300/80">
                  Our software
                </p>
                <p className={cn("text-lg font-bold tracking-tight lg:text-xl", mk.heading)}>{PRODUCT_NAME}</p>
                <p className={cn("text-sm", mk.body)}>{PRODUCT_TAGLINE}</p>
                <p className={cn("text-xs font-medium", mk.muted)}>{PRODUCT_SUBTITLE}</p>
                <p className={cn("text-sm", mk.muted)}>
                  The product you sign in to — invoices, POS, inventory, payroll, and partner
                  accounting in one system.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className={cn(navyCta, "inline-flex h-12 items-center gap-2 px-6")}>
              <Link href="/register" className="inline-flex items-center gap-2">
                Get started on {PRODUCT_NAME}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className={cn(outlineCta, "inline-flex h-12 items-center px-6")}>
              <Link href="/#billing">Explore {PRODUCT_NAME}</Link>
            </Button>
          </div>
          <ul className="grid gap-x-6 gap-y-3 pt-2 sm:grid-cols-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className={cn("flex items-center gap-2 text-sm sm:text-base", mk.body)}>
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 lg:justify-self-end">
          <MarketingInvoicePreview />
        </div>
      </div>
    </section>
  );
}
