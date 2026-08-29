import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta } from "@/components/marketing/cta";

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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-[#f6f7fb] p-8 lg:p-10">
      <div className="max-w-xl space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">ADD-ON SERVICES</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Build Your Own Plan
        </h2>
        <p className="text-base leading-relaxed text-slate-600">
          Start with what you need and add services as your business grows. WhatsApp invoicing is
          available as an add-on from Basic. Multi-store and other capabilities have custom
          pricing — not a separate subscription tier.
        </p>
      </div>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADDON_SERVICES.map((item) => (
          <li
            key={item}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <Button asChild className={cn(navyCta, "h-11 px-5")}>
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
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:py-16">
        <AddonServicesContent />
      </div>
    </section>
  );
}

/** Inline block for /pricing page (no section wrapper). */
export function AddonServicesBlock() {
  return <AddonServicesContent />;
}
