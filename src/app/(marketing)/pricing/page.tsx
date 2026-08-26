import type { Metadata } from "next";
import { ContactSales } from "@/components/marketing/contact-sales";
import { DownloadApps } from "@/components/marketing/download-apps";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PublicPricing } from "@/components/marketing/public-pricing";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "Pricing — Project Z",
  description: "Simple monthly plans for shops. Contact us for yearly or multi-shop rates.",
};

export default function PricingPage() {
  const config = getPublicMarketingConfig();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 lg:pt-20">
        <PublicPricing />
      </div>
      <div className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
          <ContactSales config={config} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <DownloadApps config={config} />
      </div>
      <MarketingFooter />
    </div>
  );
}
