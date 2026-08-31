import { Check, Cloud, FileText, Layers, Shield, Sliders, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";

const TRUST_ITEMS = [
  { icon: Shield, title: "Secure digital records", body: "Your business data stored safely in the cloud." },
  { icon: Cloud, title: "Cloud-based access", body: "Same login on web, Android, and Windows." },
  { icon: FileText, title: "Professional invoices", body: "GST-ready bills that look the part." },
  { icon: Sparkles, title: "Easy-to-use interface", body: "Designed for busy shop floors and offices." },
  { icon: Layers, title: "Business data organization", body: "Customers, stock, expenses, and projects in one place." },
  { icon: Sliders, title: "Flexible plans", body: "Start with billing and add features as you grow." },
] as const;

export function TrustSection() {
  return (
    <SectionShell
      eyebrow="WHY E-CONSOLE"
      title="Simple, Professional, Organized"
      description="No unnecessary complexity — just the tools your business needs to bill better and stay organized."
      className={mk.sectionBase}
    >
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className={cn("rounded-2xl border p-6", mk.card, mk.sectionAlt)}
          >
            <Icon className={cn("h-5 w-5", mk.bodyStrong)} aria-hidden />
            <h3 className={cn("mt-4 font-semibold lg:text-lg", mk.heading)}>{title}</h3>
            <p className={cn("mt-2 text-sm leading-relaxed sm:text-base", mk.body)}>{body}</p>
          </article>
        ))}
      </div>
      <p className={cn("mt-8 flex items-center gap-2 text-sm sm:text-base", mk.muted)}>
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        No setup fee · GST-ready · Offline on Android
      </p>
    </SectionShell>
  );
}
