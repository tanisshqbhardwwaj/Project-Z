import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import { marketingPageMetadata } from "@/lib/agent/marketing-metadata";
import {
  COMPANY_NAME,
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_PRODUCTION_APP_URL,
  PRODUCT_BY_COMPANY,
  PRODUCT_NAME,
} from "@/lib/brand/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = marketingPageMetadata({
  title: "Privacy Policy — E-console",
  description:
    "Privacy policy for BusinessOS by E-console (econsole.in) — how we collect, use, and protect your account and business data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <article className={cn(mk.container, "max-w-3xl py-16 lg:py-24")}>
        <SectionEyebrow>PRIVACY</SectionEyebrow>
        <h1 className={cn("mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl", mk.heading)}>
          Privacy Policy
        </h1>
        <p className={cn("mt-4 text-sm", mk.muted)}>Last updated: September 2026</p>
        <p className={cn("mt-6 text-base leading-relaxed", mk.body)}>
          {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;) operates {PRODUCT_NAME} at{" "}
          <a href={DEFAULT_PRODUCTION_APP_URL} className="text-blue-700 underline dark:text-blue-400">
            {DEFAULT_PRODUCTION_APP_URL}
          </a>
          . This policy explains how we handle information when you use {PRODUCT_BY_COMPANY}.
        </p>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Information we collect</h2>
        <ul className={cn("mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed", mk.body)}>
          <li>
            <strong className={mk.heading}>Account data</strong> — Name, email, and organization details from
            registration.
          </li>
          <li>
            <strong className={mk.heading}>Business data</strong> — Invoices, inventory, customers, expenses,
            staff records, and other data you enter to run your business.
          </li>
          <li>
            <strong className={mk.heading}>Usage data</strong> — IP address, browser, device info, and access
            logs for security and reliability.
          </li>
          <li>
            <strong className={mk.heading}>Authentication</strong> — Session cookies and tokens to keep you
            signed in securely.
          </li>
        </ul>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>How we use information</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          We use your data to provide and maintain the service, manage subscriptions, send transactional
          emails, improve security, and respond to support requests. We do not sell your business data to
          third parties.
        </p>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Data storage and security</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          Business data is stored on secure cloud infrastructure with encryption in transit (HTTPS/TLS) and
          tenant isolation per organization. Offline Android data is stored on your device and synchronized
          when connectivity is available.
        </p>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Cookies</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          We use essential cookies for authentication and session management. These are required for the app
          to function and are not used for third-party advertising.
        </p>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Your rights</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          You may request access, correction, or deletion of your account data by contacting{" "}
          <a href={`mailto:${DEFAULT_CONTACT_EMAIL}`} className="text-blue-700 underline dark:text-blue-400">
            {DEFAULT_CONTACT_EMAIL}
          </a>
          . Organization owners can export data through the application.
        </p>

        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Contact</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          Privacy questions:{" "}
          <a href={`mailto:${DEFAULT_CONTACT_EMAIL}`} className="text-blue-700 underline dark:text-blue-400">
            {DEFAULT_CONTACT_EMAIL}
          </a>
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}
