import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

const FEATURES = [
  {
    n: "01",
    title: "Trust layer",
    body: "GST invoices, bill history, and a clear paper trail so every sale is accountable.",
  },
  {
    n: "02",
    title: "Operational clarity",
    body: "Barcode, inventory, purchases, and udhaar stay in one counter flow — not five notebooks.",
  },
  {
    n: "03",
    title: "Team presence",
    body: "Staff, attendance, and payroll so the shop keeps running when you are not at the till.",
  },
  {
    n: "04",
    title: "One connected system",
    body: "Web, Android, and Windows share the same login. Bill offline, sync when the line is back.",
    emphasis: true,
  },
] as const;

const PREVIEW_ROWS = [
  { name: "Walk-in · #1042", meta: "Invoice", status: "Paid", tone: "ok" },
  { name: "Ravi Traders", meta: "Udhaar", status: "Due", tone: "warn" },
  { name: "Cotton shirt × 2", meta: "Sale", status: "Done", tone: "ok" },
] as const;

export function LandingPage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 pb-20 lg:grid-cols-2 lg:py-20 lg:pb-28">
        <div className="space-y-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">PROJECT Z</p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem]">
            Run your shop
            <br />
            with confidence.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            Billing, inventory, staff, and projects for Indian shopkeepers, contractors, architects,
            and builders — one platform, from A to Z.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className={cn(navyCta, "h-12 px-6")}>
              <Link href="/register">
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className={cn(outlineCta, "h-12 px-6")}>
              <Link href="/login">Log into account</Link>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
            Same login on web, Android, and Windows
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Today at the counter</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              Search bill, customer, or SKU
            </div>
            <ul className="mt-4 space-y-3">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.meta}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      row.tone === "ok"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    )}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="absolute -bottom-5 left-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg sm:left-8">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium">Bill saved</p>
              <p className="text-xs text-slate-500">GST included · print ready</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-20">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">ABOUT PROJECT Z</p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built to make shop work calm, clear, and reliable.
            </h2>
            <p className="max-w-md text-slate-600">
              One structured flow from inquiry to invoice. Verified stock, transparent ledgers, and
              the same books on every device.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className={cn(navyCta)}>
                <Link href="/register">
                  Start with Project Z
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className={outlineCta}>
                <Link href="/pricing#contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article
                key={f.n}
                className={cn(
                  "rounded-2xl border p-5",
                  f.emphasis
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-900"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold",
                    f.emphasis ? "text-slate-400" : "text-slate-400"
                  )}
                >
                  {f.n}
                </p>
                <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                <p className={cn("mt-2 text-sm", f.emphasis ? "text-slate-300" : "text-slate-600")}>
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
