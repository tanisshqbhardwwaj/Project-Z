import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
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
    <section className="relative overflow-hidden border-b border-slate-200/80">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.08),transparent)]"
        aria-hidden
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div className="relative space-y-6">
          <SectionEyebrow>PROJECT Z</SectionEyebrow>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem]">
            Create Professional Invoices.
            <br />
            Manage Your Business.
            <br />
            Grow With Confidence.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            Create professional digital invoices, manage customers and sales, track inventory and
            expenses, and keep your business organized—all from one simple platform.
          </p>
          <p className="text-sm font-medium text-slate-500">
            Start with Billing. Grow into Complete Business Management.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className={cn(navyCta, "h-12 px-6")}>
              <Link href="/register">
                Create Your First Invoice
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className={cn(outlineCta, "h-12 px-6")}>
              <Link href="/#billing">Explore Features</Link>
            </Button>
          </div>
          <ul className="grid gap-x-4 gap-y-2 pt-1 sm:grid-cols-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-slate-600">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <MarketingInvoicePreview />
      </div>
    </section>
  );
}
