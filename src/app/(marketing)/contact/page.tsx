import type { Metadata } from "next";
import { ContactSales } from "@/components/marketing/contact-sales";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import { marketingPageMetadata } from "@/lib/agent/marketing-metadata";
import { PRODUCT_BY_COMPANY } from "@/lib/brand/constants";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = marketingPageMetadata({
  title: "Contact — E-console",
  description:
    "Contact BusinessOS by E-console for plan questions, yearly billing, multi-shop setup, and support at admin@econsole.in.",
  path: "/contact",
});

export default function ContactPage() {
  const config = getPublicMarketingConfig();

  return (
    <div className="flex flex-1 flex-col">
      <div className={cn(mk.container, "py-16 lg:py-24")}>
        <p className={cn("mb-4 text-sm", mk.muted)}>{PRODUCT_BY_COMPANY}</p>
        <ContactSales config={config} />
        <p className={cn("mt-12 max-w-2xl text-base leading-relaxed", mk.body)}>
          Whether you are opening your first shop or managing multiple branches, our team can help you choose
          the right plan, set up yearly billing, and onboard your staff. Email us at the address above — we
          typically respond within one business day during support hours (Monday to Saturday, 9:00 AM to 7:00
          PM IST).
        </p>
      </div>
      <MarketingFooter />
    </div>
  );
}
