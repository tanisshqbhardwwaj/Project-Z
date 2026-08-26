import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import type { PublicMarketingConfig } from "@/lib/marketing/public-config";

type ContactSalesProps = {
  config: PublicMarketingConfig;
};

export function ContactSales({ config }: ContactSalesProps) {
  return (
    <section
      id="contact"
      className="scroll-mt-20 grid gap-10 lg:grid-cols-2"
      aria-labelledby="contact-heading"
    >
      <div className="space-y-5 px-0">
        <SectionEyebrow>CONTACT US</SectionEyebrow>
        <h2 id="contact-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Let us help you get started.
        </h2>
        <p className="max-w-md text-slate-600">
          Questions about plans, yearly billing, or more than one shop? Share a message and we will
          get back to you.
        </p>
        <div className="flex flex-wrap gap-3">
          {config.whatsappUrl ? (
            <Button asChild className={navyCta}>
              <a href={config.whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled className={navyCta} title="WhatsApp number not configured">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
          {config.phoneUrl ? (
            <Button asChild variant="outline" className={outlineCta}>
              <a href={config.phoneUrl}>
                <Phone className="h-4 w-4" />
                Call
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline" className={outlineCta} title="Phone number not configured">
              <Phone className="h-4 w-4" />
              Call
            </Button>
          )}
          {config.emailUrl ? (
            <Button asChild variant="outline" className={outlineCta}>
              <a href={config.emailUrl}>
                <Mail className="h-4 w-4" />
                Email
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline" className={outlineCta} title="Email not configured">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">EMAIL</p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {config.email ?? "Ask us when you call or WhatsApp"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">PHONE</p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {config.phoneDisplay ?? config.whatsappDisplay ?? config.billingFallback}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">SUPPORT</p>
          <p className="mt-2 text-sm font-medium">Monday to Saturday, 9:00 AM to 7:00 PM IST</p>
        </article>
      </div>
    </section>
  );
}
