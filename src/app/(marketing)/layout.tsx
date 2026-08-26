import { MarketingHeader } from "@/components/marketing/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-950 antialiased">
      <MarketingHeader />
      {children}
    </div>
  );
}
