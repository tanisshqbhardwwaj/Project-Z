import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navyCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import type { PublicMarketingConfig } from "@/lib/marketing/public-config";

type ContactSalesProps = {
  config: PublicMarketingConfig;
};

export function ContactSales({ config }: ContactSalesProps) {
  const email = config.email ?? config.billingFallback;

  return (
    <section
      id="contact"
      className="scroll-mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16"
      aria-labelledby="contact-heading"
    >
      <div className="space-y-6">
        <SectionEyebrow>CONTACT US</SectionEyebrow>
        <h2 id="contact-heading" className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl", mk.heading)}>
          Let us help you get started.
        </h2>
        <p className={cn("max-w-lg text-base leading-relaxed sm:text-lg", mk.body)}>
          Questions about plans, yearly billing, or more than one shop? Email us and we will get back
          to you.
        </p>
        {config.emailUrl ? (
          <Button asChild className={cn(navyCta, "h-11 px-5")}>
            <a href={config.emailUrl}>
              <Mail className="h-4 w-4" />
              Email us
            </a>
          </Button>
        ) : (
          <Button disabled className={cn(navyCta, "h-11 px-5")} title="Email not configured">
            <Mail className="h-4 w-4" />
            Email us
          </Button>
        )}
      </div>
      <div className="grid gap-4">
        <article className={cn("rounded-2xl border p-6", mk.card)}>
          <p className={cn("text-xs font-semibold tracking-[0.14em]", mk.muted)}>EMAIL</p>
          <p className={cn("mt-3 text-sm font-medium sm:text-base", mk.heading)}>{email}</p>
        </article>
        <article className="rounded-2xl border border-slate-900 bg-slate-950 p-6 text-white dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">SUPPORT</p>
          <p className="mt-3 text-sm font-medium sm:text-base">Monday to Saturday, 9:00 AM to 7:00 PM IST</p>
        </article>
      </div>
    </section>
  );
}
