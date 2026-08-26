import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Barcode,
  Building2,
  Check,
  Receipt,
  RotateCcw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { MarketingFooter, SectionEyebrow } from "@/components/marketing/marketing-footer";
import {
  BILLING_PLANS,
  formatINRFromPaise,
  type PlanDefinition,
} from "@/lib/billing/plans";

const TRUST_ITEMS = [
  "GST-ready invoices",
  "Offline on Android",
  "Same login everywhere",
  "No setup fee",
] as const;

const FEATURES = [
  {
    n: "01",
    title: "Trust layer",
    body: "GST invoices, bill history, and a clear paper trail so every sale is accountable.",
    icon: Receipt,
  },
  {
    n: "02",
    title: "Operational clarity",
    body: "Barcode, inventory, purchases, and udhaar stay in one counter flow — not five notebooks.",
    icon: Barcode,
  },
  {
    n: "03",
    title: "Team presence",
    body: "Staff, attendance, and payroll so the shop keeps running when you are not at the till.",
    icon: Users,
  },
  {
    n: "04",
    title: "One connected system",
    body: "Web, Android, and Windows share the same login. Bill offline, sync when the line is back.",
    icon: Smartphone,
    emphasis: true,
  },
  {
    n: "05",
    title: "Returns & profit",
    body: "Process returns and exchanges with stock restored correctly. See margin and low-stock alerts.",
    icon: RotateCcw,
  },
  {
    n: "06",
    title: "Projects & sites",
    body: "Contractors and builders track work orders, vendors, expenses, and partner settlements.",
    icon: Building2,
  },
  {
    n: "07",
    title: "Offers & hold bills",
    body: "Run discounts at the counter, hold a bill while the customer fetches cash, duplicate repeat orders fast.",
    icon: TrendingUp,
  },
  {
    n: "08",
    title: "Reports you can trust",
    body: "Sales, purchases, udhaar, and staff activity in one place — export when your CA asks.",
    icon: BarChart3,
  },
] as const;

const PREVIEW_ROWS = [
  { name: "INV-4-26-27-00042", meta: "Walk-in · Cash", amount: "₹1,150", status: "Paid" },
  { name: "Ravi Traders", meta: "Udhaar balance", amount: "₹4,200", status: "Due" },
  { name: "Cotton shirt · M", meta: "Stock −2", amount: "₹599", status: "Sold" },
] as const;

const FAQ = [
  {
    q: "Does it work offline?",
    a: "Yes on Android and Windows — create bills offline and sync when the network returns. The web app needs connectivity.",
  },
  {
    q: "Is GST billing included?",
    a: "Yes. Set your shop profile and tax rate once, then print or share GST-ready invoices from day one.",
  },
  {
    q: "Can I manage staff and udhaar?",
    a: "On Business and above: staff records, attendance hooks, customer credit (udhaar) ledger, and purchase tracking.",
  },
  {
    q: "Who is Project Z for?",
    a: "Shopkeepers, contractors, architects, and builders who want one calm system from inquiry to invoice.",
  },
] as const;

/** Home pricing teaser — Basic + Business; full catalog on /pricing. */
const LANDING_PLANS: PlanDefinition[] = [
  BILLING_PLANS.BASIC,
  BILLING_PLANS.BUSINESS,
];

function PlanTeaserCard({ plan, featured }: { plan: PlanDefinition; featured?: boolean }) {
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
      {plan.introLabel ? (
        <p className={cn("mt-1 text-sm font-medium", featured ? "text-emerald-300" : "text-emerald-700")}>
          {plan.introLabel}
        </p>
      ) : null}
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-emerald-400" : "text-emerald-600")}
            />
            <span className={featured ? "text-slate-200" : "text-slate-600"}>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className={cn(
          "mt-6 w-full rounded-full",
          featured
            ? "bg-white text-slate-950 hover:bg-slate-100"
            : outlineCta
        )}
        variant={featured ? "default" : "outline"}
      >
        <Link href="/register">Start with {plan.name}</Link>
      </Button>
    </article>
  );
}

export function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/80">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.08),transparent)]"
          aria-hidden
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="relative space-y-6">
            <SectionEyebrow>PROJECT Z</SectionEyebrow>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem]">
              Run your shop
              <br />
              with confidence.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              Billing, inventory, staff, and projects for Indian shopkeepers, contractors,
              architects, and builders — one platform, from A to Z.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className={cn(navyCta, "h-12 px-6")}>
                <Link href="/register">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={cn(outlineCta, "h-12 px-6")}>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:justify-self-end">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.2)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Today at the counter</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                <Barcode className="h-4 w-4 shrink-0 opacity-60" />
                Scan barcode or search bill…
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {PREVIEW_ROWS.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.meta}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{row.amount}</p>
                      <span
                        className={cn(
                          "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          row.status === "Due"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:left-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">Bill saved</p>
                <p className="text-xs text-slate-500">GST included · print ready</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About + features */}
      <section id="about" className="scroll-mt-20 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
          <div className="mx-auto max-w-2xl space-y-5 text-center">
            <SectionEyebrow>ABOUT PROJECT Z</SectionEyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Built to make shop work calm, clear, and reliable.
            </h2>
            <p className="leading-relaxed text-slate-600">
              One structured flow from inquiry to invoice. Verified stock, transparent ledgers,
              and the same books on every device — for shops and project teams.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button asChild className={cn(navyCta, "h-11 px-5")}>
                <Link href="/register">
                  Start with Project Z
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className={cn(outlineCta, "h-11 px-5")}>
                <Link href="/pricing#contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const emphasis = "emphasis" in f && f.emphasis;
              return (
                <article
                  key={f.n}
                  className={cn(
                    "rounded-2xl border p-5",
                    emphasis
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-slate-200 bg-[#f6f7fb] text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        emphasis ? "bg-white/10" : "bg-white shadow-sm"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", emphasis ? "text-white" : "text-slate-700")} />
                    </span>
                    <p className="text-xs font-semibold text-slate-400">{f.n}</p>
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-relaxed",
                      emphasis ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    {f.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="scroll-mt-20 border-b border-slate-200 bg-[#f6f7fb]">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
          <div className="max-w-xl space-y-3">
            <SectionEyebrow>PRICING</SectionEyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Simple plans. Clear monthly rates.
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              Starting rates for a single shop. Talk to us for yearly billing or more than one
              location.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {LANDING_PLANS.map((plan) => (
              <PlanTeaserCard
                key={plan.code}
                plan={plan}
                featured={plan.mostPopular}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Need Professional or multi-location?{" "}
            <Link href="/pricing" className="font-medium text-slate-950 underline-offset-2 hover:underline">
              See all plans
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>FAQ</SectionEyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Common questions
            </h2>
          </div>
          <dl className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-200 bg-[#f6f7fb] p-5"
              >
                <dt className="font-semibold text-slate-950">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center lg:py-20">
          <Smartphone className="h-10 w-10 text-slate-400" aria-hidden />
          <h2 className="max-w-lg text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to bill with confidence?
          </h2>
          <p className="max-w-md text-slate-400">
            Create your account in minutes. Import products, print your first GST invoice, and
            sync across devices.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
              <Link href="/register">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-slate-600 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
