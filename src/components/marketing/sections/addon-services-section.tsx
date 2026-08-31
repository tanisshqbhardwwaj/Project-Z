import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta } from "@/components/marketing/cta";
import { mk } from "@/components/marketing/marketing-theme";

const ADDON_SERVICES = [
  "Multi-store functionality",
  "Advanced analytics",
  "Loyalty / rewards",
  "Gift cards / store wallet",
  "Advanced staff capabilities",
  "Multiple-user expansion",
  "WhatsApp invoicing",
  "Premium support",
  "Other custom business requirements",
] as const;

function AddonServicesContent() {
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed p-8 lg:p-12",
        "border-slate-300 bg-[#f6f7fb] dark:border-slate-700 dark:bg-slate-900/50"
      )}
    >
      <div className="max-w-2xl space-y-4">
        <p className={cn("text-xs font-semibold tracking-[0.18em]", mk.muted)}>ADD-ON SERVICES</p>
        <h2 className={cn("text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl", mk.heading)}>
          Build Your Own Plan
        </h2>
        <p className={cn("text-base leading-relaxed sm:text-lg", mk.body)}>
          Start with what you need and add services as your business grows. WhatsApp invoicing is
          available as an add-on from Basic. Multi-store and other capabilities have custom
          pricing — not a separate subscription tier.
        </p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADDON_SERVICES.map((item) => (
          <li key={item} className={cn("rounded-xl border px-5 py-4 text-sm sm:text-base", mk.card, mk.bodyStrong)}>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Button asChild className={cn(navyCta, "h-12 px-6")}>
          <Link href="/pricing#contact">
            Custom Pricing — Talk to Our Team
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AddonServicesSection() {
  return (
    <section className={cn("border-b", mk.sectionBorder, mk.sectionBase)}>
      <div className={cn(mk.container, "py-16 lg:py-20")}>
        <AddonServicesContent />
      </div>
    </section>
  );
}

/** Inline block for /pricing page (no section wrapper). */
export function AddonServicesBlock() {
  return <AddonServicesContent />;
}
