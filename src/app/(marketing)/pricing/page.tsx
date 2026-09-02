import type { Metadata } from "next";
import { ContactSales } from "@/components/marketing/contact-sales";
import { DownloadApps } from "@/components/marketing/download-apps";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PublicPricing } from "@/components/marketing/public-pricing";
import { mk } from "@/components/marketing/marketing-theme";
import { marketingPageMetadata } from "@/lib/agent/marketing-metadata";
import { cn } from "@/lib/utils";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";

export const metadata: Metadata = marketingPageMetadata({
  title: "Pricing — E-console",
  description: "Simple monthly plans for shops. Contact us for yearly or multi-shop rates.",
  path: "/pricing",
});

export default function PricingPage() {
  const config = getPublicMarketingConfig();

  return (
    <div className="flex flex-1 flex-col">
      <div className={cn(mk.container, "pt-16 lg:pt-24")}>
        <PublicPricing />
      </div>
      <div className={cn("mt-20 border-t", mk.sectionBorder, mk.sectionBase)}>
        <div className={cn(mk.container, "py-20 lg:py-28")}>
          <ContactSales config={config} />
        </div>
      </div>
      <div className={cn(mk.container, "py-20 lg:py-28")}>
        <DownloadApps config={config} />
      </div>
      <MarketingFooter />
    </div>
  );
}
