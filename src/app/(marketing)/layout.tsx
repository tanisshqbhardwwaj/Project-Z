import { MarketingHeader } from "@/components/marketing/marketing-header";
import { JsonLdScript } from "@/components/marketing/json-ld-script";
import { NativeMarketingGate } from "@/components/marketing/native-marketing-gate";
import {
  marketingMetadataBase,
  sharedMarketingOpenGraph,
} from "@/lib/agent/marketing-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: marketingMetadataBase,
  title: {
    default: "E-console — Powering Digital Possibilities",
    template: "%s · E-console",
  },
  description:
    "E-console on econsole.in — Powering Digital Possibilities. BusinessOS by E-console: billing, inventory, staff, and projects for Indian businesses.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...sharedMarketingOpenGraph,
    title: "E-console — Powering Digital Possibilities",
    description:
      "BusinessOS by E-console on econsole.in — billing, inventory, staff, and projects for Indian businesses.",
    url: "/",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <NativeMarketingGate>
      <JsonLdScript />
      <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50">
        <MarketingHeader />
        {children}
      </div>
    </NativeMarketingGate>
  );
}
