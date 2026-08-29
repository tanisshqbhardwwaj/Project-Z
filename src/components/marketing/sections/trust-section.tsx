import { Check, Cloud, FileText, Layers, Shield, Sliders, Sparkles } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";

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
      eyebrow="WHY PROJECT Z"
      title="Simple, Professional, Organized"
      description="No unnecessary complexity — just the tools your business needs to bill better and stay organized."
      className="bg-white"
      innerClassName="lg:py-16"
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-200 bg-[#f6f7fb] p-5"
          >
            <Icon className="h-5 w-5 text-slate-700" aria-hidden />
            <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
        No setup fee · GST-ready · Offline on Android
      </p>
    </SectionShell>
  );
}
