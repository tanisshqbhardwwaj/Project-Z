import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import { marketingPageMetadata } from "@/lib/agent/marketing-metadata";
import {
  COMPANY_LINE,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  DEFAULT_PRODUCTION_APP_URL,
  PRODUCT_BY_COMPANY,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/brand/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = marketingPageMetadata({
  title: "About — E-console",
  description:
    "E-console builds BusinessOS on econsole.in — GST billing, inventory, udhaar, staff, and industry modules for Indian businesses.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <article className={cn(mk.container, "max-w-3xl py-16 lg:py-24")}>
        <SectionEyebrow>ABOUT US</SectionEyebrow>
        <h1 className={cn("mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl", mk.heading)}>
          {COMPANY_LINE}
        </h1>
        <p className={cn("mt-6 text-base leading-relaxed sm:text-lg", mk.body)}>
          {COMPANY_NAME} is the company behind <strong className={mk.heading}>{PRODUCT_NAME}</strong>, an
          all-in-one business management platform hosted at{" "}
          <a href={DEFAULT_PRODUCTION_APP_URL} className="text-blue-700 underline dark:text-blue-400">
            econsole.in
          </a>
          . {COMPANY_TAGLINE}. {PRODUCT_TAGLINE}
        </p>
        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>What we build</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          {PRODUCT_BY_COMPANY} helps Indian retail shops, wholesalers, contractors, architects, and service
          businesses replace manual registers and scattered spreadsheets with one system. GST-ready billing,
          inventory and purchase management, customer credit (udhaar) ledgers, staff attendance, expenses, and
          industry-specific modules — accessible on web, Android (with offline billing), and Windows.
        </p>
        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Built for Indian businesses</h2>
        <p className={cn("mt-4 text-base leading-relaxed", mk.body)}>
          We design around real shop-floor workflows: fast counter billing, barcode scanning, hold and cancel
          bills, print templates, multi-branch inventory transfers, and plan-based module access for growing
          teams. Support is available Monday to Saturday, 9:00 AM to 7:00 PM IST via admin@econsole.in.
        </p>
        <h2 className={cn("mt-10 text-xl font-bold", mk.heading)}>Our product modules</h2>
        <ul className={cn("mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed", mk.body)}>
          <li>
            <strong className={mk.heading}>Shop</strong> — Billing, inventory, purchases, returns, udhaar,
            offers, and reports
          </li>
          <li>
            <strong className={mk.heading}>Staff</strong> — Attendance, roles, and payslips
          </li>
          <li>
            <strong className={mk.heading}>Contractor</strong> — BOQ and material tracking
          </li>
          <li>
            <strong className={mk.heading}>Architect</strong> — Project stages and documentation
          </li>
          <li>
            <strong className={mk.heading}>Service</strong> — Appointments, contracts, packages, and commissions
          </li>
        </ul>
      </article>
      <MarketingFooter />
    </div>
  );
}
