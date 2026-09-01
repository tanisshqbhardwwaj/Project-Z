import { MarketingHeader } from "@/components/marketing/marketing-header";
import { NativeMarketingGate } from "@/components/marketing/native-marketing-gate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "E-console — Powering Digital Possibilities",
    template: "%s · E-console",
  },
  description:
    "E-console on econsole.in — Powering Digital Possibilities. BusinessOS: billing, inventory, staff, and projects for Indian businesses.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <NativeMarketingGate>
      <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50">
        <MarketingHeader />
        {children}
      </div>
    </NativeMarketingGate>
  );
}
